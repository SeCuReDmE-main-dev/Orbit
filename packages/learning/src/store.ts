import { parseDossier, type Dossier } from '../../evidence-review/src/index.js';
import { classifyEvidence, type Classification, type EngineId } from '../../evidence-review/src/classification.js';
import { PERMISSIONS, emptyPermissions, type AgentOperation, type ArtifactInput, type ExperimentInput, type LearningArtifact, type LearningExperiment, type LearningJournalEntry, type LearningNamespace, type LearningResult, type LearningSession, type Permission, type ProposalInput, type StorageLike, type SupportMode } from './contracts.js';
import { assertReferences, choice, clone, createLearningSession, jsonBytes, learningStorageKey, MAX_SESSION_BYTES, moduleId, namespaceKey, parseArtifactInput, parseColabResult, parseEngineSelection, parseExperiment, parseLearningSession, parseProposalInput, sha256, stableSerialize, text, uniqueIds } from './serialization.js';

/** Human commands are separate from agent tools. This store does no network or LLM work. */
export class LearningStore {
  private session: LearningSession;
  private epoch = 0;
  private listeners = new Set<(snapshot: LearningSession) => void>();
  private disposed = false;
  private awaitingLocalDecision = false;
  private clock: () => string;
  readonly namespace: string;
  readonly storageKey: string;
  persistenceError: string | null = null;

  constructor(namespace: string | LearningNamespace, private storage?: StorageLike, options: { id?: string; now?: () => string } = {}) {
    this.namespace = namespaceKey(namespace);
    this.storageKey = learningStorageKey(this.namespace);
    this.clock = options.now ?? (() => new Date().toISOString());
    this.session = createLearningSession({ namespace: this.namespace, id: options.id, now: this.clock() });
    // Reading browser storage is itself explicit: construction never restores old private work.
  }
  snapshot(): LearningSession { return clone(this.session); }
  subscribe(listener: (snapshot: LearningSession) => void): () => void {
    this.assertActive(); this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private assertActive(): void { if (this.disposed) throw new Error('Learning session disposed.'); }
  private persist(): void {
    this.persistenceError = null;
    if (!this.storage || !this.session.permissions.localSave || this.awaitingLocalDecision) return;
    try { this.storage.setItem(this.storageKey, this.exportSession()); }
    catch { this.persistenceError = 'Local saving failed. The session remains in memory; export it before closing.'; }
  }
  private commit(change: (next: LearningSession) => void, invalidate = true): void {
    this.assertActive(); const next = clone(this.session); change(next);
    next.revision += 1; next.updatedAt = this.clock();
    if (jsonBytes(next) > MAX_SESSION_BYTES) throw new Error('Session size limit reached. Export selected work before adding more.');
    this.session = next;
    if (invalidate) this.epoch += 1;
    this.persist(); for (const listener of this.listeners) listener(this.snapshot());
  }
  private response<T>(data: T, state: LearningResult['state'] = 'READY'): LearningResult<T> { return { state, revision: this.session.revision, data }; }
  private unavailable(message: string, code?: string): LearningResult { return { state: 'UNAVAILABLE', revision: this.session.revision, message, ...(code ? { code } : {}) }; }
  setPermission(permission: Permission, allowed: boolean): LearningResult {
    choice(permission, PERMISSIONS); if (typeof allowed !== 'boolean') throw new TypeError('Permission must be boolean.');
    if (permission === 'localSave' && allowed && !this.session.permissions.localSave && this.storage) {
      try { this.awaitingLocalDecision = this.storage.getItem(this.storageKey) !== null; }
      catch { return this.unavailable('Browser storage cannot be read. Keep working in memory and export.', 'LOCAL_STORAGE_UNAVAILABLE'); }
    }
    if (this.session.permissions[permission] !== allowed) {
      this.commit(next => {
        next.permissions[permission] = allowed;
        if (permission === 'agentRead' && !allowed) {
          next.permissions.agentPropose = false; next.permissions.engineSelection = false;
          next.sharedArtifactIds = []; next.sharedJournalIds = [];
        }
      });
      if (permission === 'localSave' && !allowed && this.storage) {
        this.awaitingLocalDecision = false;
        try { this.storage.removeItem(this.storageKey); }
        catch { this.persistenceError = 'Saving is disabled, but the previous browser copy could not be removed. Clear it in browser settings.'; }
      }
    }
    return this.persistenceError ? this.unavailable(this.persistenceError, 'LOCAL_STORAGE_UNAVAILABLE') : this.response({ permission, allowed, savedCopyAvailable: this.awaitingLocalDecision });
  }
  shareSelection(selection: { artifactIds?: string[]; journalIds?: string[] }): LearningResult {
    const artifacts = uniqueIds(selection.artifactIds ?? []); const journal = uniqueIds(selection.journalIds ?? []);
    assertReferences(artifacts, new Set(this.session.artifacts.map(row => row.id)));
    assertReferences(journal, new Set(this.session.journal.map(row => row.id)));
    this.commit(next => { next.sharedArtifactIds = artifacts; next.sharedJournalIds = journal; });
    return this.response({ artifactIds: artifacts, journalIds: journal, readable: this.session.permissions.agentRead });
  }
  switchModule(selected: number): LearningResult {
    const module = moduleId(selected);
    if (this.session.moduleId !== module) this.commit(next => {
      next.moduleId = module; next.permissions.agentRead = false; next.permissions.agentPropose = false; next.permissions.engineSelection = false;
      next.sharedArtifactIds = []; next.sharedJournalIds = []; next.engineSelection = [];
    });
    return this.response({ moduleId: module });
  }
  selectModule(selected: number): LearningResult { return this.switchModule(selected); }
  setModule(selected: number): LearningResult { return this.switchModule(selected); }
  setSupportMode(mode: SupportMode): LearningResult {
    const parsed = choice(mode, ['brainstorm', 'exploration', 'teaching', 'guidance', 'debugging', 'critique', 'transfer', 'revision']);
    if (this.session.supportMode !== parsed) this.commit(next => { next.supportMode = parsed; });
    return this.response({ mode: parsed });
  }
  revokeAgentAccess(): void {
    this.commit(next => { next.permissions.agentRead = false; next.permissions.agentPropose = false; next.permissions.engineSelection = false; next.sharedArtifactIds = []; next.sharedJournalIds = []; });
  }
  invalidateAccess(): void { this.revokeAgentAccess(); }
  beginAgentOperation(): AgentOperation { return { sessionId: this.session.id, namespace: this.namespace, revision: this.session.revision, epoch: this.epoch }; }
  isOperationCurrent(operation: AgentOperation): boolean {
    return !this.disposed && this.session.permissions.agentRead && operation.sessionId === this.session.id && operation.namespace === this.namespace && operation.revision === this.session.revision && operation.epoch === this.epoch;
  }
  isRevisionCurrent(expectedRevision: number): boolean { return !this.disposed && expectedRevision === this.session.revision; }
  addArtifact(input: ArtifactInput): LearningArtifact {
    const parsed = parseArtifactInput(input, this.session.moduleId);
    if (this.session.artifacts.length >= 100) throw new Error('Artifact limit reached.');
    const artifactId = parsed.id ?? crypto.randomUUID();
    if (this.session.artifacts.some(row => row.id === artifactId)) throw new Error('Artifact ID already exists; create a new version explicitly.');
    const artifact: LearningArtifact = {
      ...parsed, id: artifactId, moduleId: parsed.moduleId!, missionId: parsed.missionId!, mediaType: parsed.mediaType!, origin: parsed.origin!,
      status: parsed.origin === 'provided' ? 'provided' : parsed.origin === 'external-colab' ? 'external-declared' : 'modified',
      createdAt: this.clock(), hashStatus: 'not-checked', version: 1,
    };
    this.commit(next => { next.artifacts.push(artifact); }); return clone(artifact);
  }
  addArtifactVersion(artifactId: string, content: string): LearningArtifact {
    const previous = this.session.artifacts.find(row => row.id === artifactId);
    if (!previous) throw new Error('Artifact not found.');
    const result = this.addArtifact({ ...previous, id: crypto.randomUUID(), title: previous.title, content, origin: 'learner', sha256: undefined });
    this.commit(next => { const row = next.artifacts.find(item => item.id === result.id)!; row.version = previous.version + 1; });
    return this.snapshot().artifacts.find(row => row.id === result.id)!;
  }
  async verifyArtifact(artifactId: string): Promise<LearningResult> {
    const artifact = this.session.artifacts.find(row => row.id === artifactId);
    if (!artifact) return { state: 'NOT_FOUND', revision: this.session.revision };
    const operation = this.beginAgentOperation(); const content = artifact.content;
    let measured: string;
    try { measured = await sha256(content); } catch { return this.unavailable('SHA-256 is unavailable in this environment.', 'SHA256_UNAVAILABLE'); }
    if (this.disposed || operation.sessionId !== this.session.id || operation.revision !== this.session.revision || operation.epoch !== this.epoch) return { state: 'STALE_REVISION', revision: this.session.revision, message: 'Work changed while hashing; repeat against the current revision.' };
    const matches = artifact.sha256 === undefined || artifact.sha256 === measured;
    this.commit(next => { const row = next.artifacts.find(item => item.id === artifactId)!; row.hashStatus = matches ? 'matched' : 'mismatch'; if (!row.sha256) row.sha256 = measured; });
    return this.response({ artifactId, sha256: measured, matches, executionVerified: false, understandingVerified: false });
  }
  recordExperiment(input: ExperimentInput): LearningExperiment {
    if (this.session.experiments.length >= 100) throw new Error('Experiment limit reached.');
    const result = parseExperiment(input, this.session.moduleId, this.clock(), crypto.randomUUID());
    assertReferences(result.artifactIds, new Set(this.session.artifacts.map(row => row.id)));
    if (this.session.experiments.some(row => row.id === result.id)) throw new Error('Experiment ID already exists.');
    this.commit(next => { next.experiments.push(result); }); return clone(result);
  }
  addJournalEntry(input: { kind: LearningJournalEntry['kind']; text: string; artifactIds?: string[] }): LearningJournalEntry {
    const kind = choice(input.kind, ['observation', 'reflection', 'question', 'decision']);
    const artifactIds = uniqueIds(input.artifactIds ?? []); assertReferences(artifactIds, new Set(this.session.artifacts.map(row => row.id)));
    const entry: LearningJournalEntry = { id: crypto.randomUUID(), at: this.clock(), moduleId: this.session.moduleId, kind, text: text(input.text, 20_000), artifactIds, attribution: 'human-local' };
    this.commit(next => { next.journal.push(entry); if (next.journal.length > 300) throw new Error('Journal limit reached. Export before adding more.'); }); return clone(entry);
  }
  importColabResult(value: unknown): LearningResult<{ artifactIds: string[]; status: 'external-declared' }> {
    const result = parseColabResult(value);
    const summaryId = `colab-${result.attemptId}`;
    const content = JSON.stringify(result, null, 2);
    const existing = this.session.artifacts.find(row => row.id === summaryId);
    if (existing) {
      if (existing.content !== content) return { state: 'UNAVAILABLE', code: 'ATTEMPT_ID_CONFLICT', revision: this.session.revision, message: 'This attempt ID already identifies different content.' };
      return this.response({ artifactIds: [summaryId, ...this.session.artifacts.filter(row => row.id.startsWith(`${summaryId}:`)).map(row => row.id)], status: 'external-declared' });
    }
    const incoming: LearningArtifact[] = [{ id: summaryId, title: `Colab · module ${result.moduleId} · ${result.attemptId}`, moduleId: result.moduleId, missionId: result.missionId, mediaType: 'application/json', content,
      origin: 'external-colab', status: 'external-declared', createdAt: this.clock(), hashStatus: 'not-checked', version: 1 }];
    for (const [index, file] of (result.artifacts ?? []).entries()) incoming.push({
      id: `${summaryId}:${index + 1}`, title: file.path, path: file.path, moduleId: result.moduleId, missionId: result.missionId, mediaType: file.mediaType ?? 'text/plain', content: file.content,
      ...(file.sha256 ? { sha256: file.sha256 } : {}), origin: 'external-colab', status: 'external-declared', createdAt: this.clock(), hashStatus: 'not-checked', version: 1,
    });
    if (this.session.artifacts.length + incoming.length > 100) throw new Error('Artifact limit reached.');
    this.commit(next => { next.artifacts.push(...incoming); });
    return this.response({ artifactIds: incoming.map(row => row.id), status: 'external-declared' });
  }
  presentProposal(input: ProposalInput): LearningResult {
    if (!this.session.permissions.agentRead || !this.session.permissions.agentPropose) return { state: 'CONSENT_REQUIRED', revision: this.session.revision, message: 'Reading and proposal permissions are distinct and must both be granted.' };
    const parsed = parseProposalInput(input);
    const existing = this.session.proposals.find(row => row.id === parsed.id);
    if (existing) {
      if (existing.moduleId !== this.session.moduleId) return { state: 'NOT_FOUND', revision: this.session.revision };
      if (stableSerialize({ id: existing.id, expectedRevision: existing.expectedRevision, kind: existing.kind, payload: existing.payload }) !== stableSerialize(parsed)) return this.unavailable('A proposal ID cannot identify different content.', 'PROPOSAL_ID_CONFLICT');
      return this.response({ proposal: clone(existing), idempotent: true }, 'PRESENTED');
    }
    if (parsed.expectedRevision !== this.session.revision) return { state: 'STALE_REVISION', revision: this.session.revision, message: 'Read the current mission and submit a new proposal for its revision.' };
    if (this.session.proposals.length >= 100) return this.unavailable('Proposal limit reached.');
    assertReferences(parsed.payload.artifactIds ?? [], new Set(this.session.sharedArtifactIds));
    if (parsed.payload.experimentId) {
      const experiment = this.session.experiments.find(row => row.id === parsed.payload.experimentId);
      if (!experiment || experiment.moduleId !== this.session.moduleId || experiment.artifactIds.some(reference => !this.session.sharedArtifactIds.includes(reference))) return { state: 'NOT_FOUND', revision: this.session.revision };
    }
    const proposal = { ...parsed, moduleId: this.session.moduleId, status: 'pending' as const, submittedAt: this.clock(), attribution: 'agent-declared' as const };
    this.commit(next => { next.proposals.push(proposal); });
    return this.response({ proposal, idempotent: false, humanApproved: false }, 'PRESENTED');
  }
  reviewProposal(proposalId: string, decision: 'accepted' | 'needs-work', note: string): LearningResult {
    choice(decision, ['accepted', 'needs-work']); text(note, 4000);
    const proposal = this.session.proposals.find(row => row.id === proposalId);
    if (!proposal) return { state: 'NOT_FOUND', revision: this.session.revision };
    this.commit(next => {
      next.proposals.find(row => row.id === proposalId)!.status = decision;
      next.reviews.push({ proposalId, decision, note, revision: this.session.revision, at: this.clock(), attribution: 'human-local' });
    });
    return this.response({ proposalId, decision, attribution: 'human-local', publication: false });
  }
  setEvidenceDossier(value: Dossier): LearningResult {
    const dossier = parseDossier(value);
    this.commit(next => {
      next.evidenceDossier = dossier;
      next.permissions.agentRead = false; next.permissions.agentPropose = false; next.permissions.engineSelection = false;
      next.sharedArtifactIds = []; next.sharedJournalIds = [];
    }); return this.response({ dossierId: dossier.id, dossierRevision: dossier.revision });
  }
  setEngineSelection(engines: EngineId[], actor: 'human' | 'agent' = 'human'): LearningResult {
    choice(actor, ['human', 'agent']);
    const selection = actor === 'human' && Array.isArray(engines) && engines.length === 0 ? [] : parseEngineSelection(engines);
    if (actor === 'agent' && (!this.session.permissions.agentRead || !this.session.permissions.engineSelection)) return { state: 'CONSENT_REQUIRED', revision: this.session.revision, message: 'Agent engine selection requires its own permission.' };
    this.commit(next => { next.engineSelection = selection; }); return this.response({ engines: selection, selectedBy: actor, automaticWinner: false });
  }
  selectEngines(engines: EngineId[]): LearningResult { return this.setEngineSelection(engines, 'human'); }
  evaluateEngines(claimIds?: string[]): LearningResult<{ evaluations: Classification[]; engines: EngineId[] }> {
    const dossier = this.session.evidenceDossier;
    if (!dossier) return { state: 'NOT_FOUND', revision: this.session.revision, message: 'Import an evidence dossier first.' };
    if (!this.session.engineSelection.length) return { state: 'CONSENT_REQUIRED', revision: this.session.revision, message: 'Choose one engine or a pair; no engine runs implicitly.' };
    const ids = claimIds === undefined ? dossier.claims.map(row => row.id) : uniqueIds(claimIds, 25);
    if (ids.length > 25 || !ids.length || ids.some(reference => !dossier.claims.some(row => row.id === reference))) return { state: 'NOT_FOUND', revision: this.session.revision, message: 'Select 1–25 claims belonging to this dossier.' };
    const engines = [...this.session.engineSelection];
    const evaluations = engines.flatMap(engine => ids.map(claimId => classifyEvidence(dossier, dossier.claims.find(row => row.id === claimId)!, engine)));
    this.commit(next => {
      next.evaluations.push({ id: crypto.randomUUID(), at: this.clock(), learningRevision: this.session.revision, dossierRevision: dossier.revision, engines, results: evaluations, attribution: 'calculation' });
      if (next.evaluations.length > 100) throw new Error('Evaluation history limit reached.');
    });
    return this.response({ evaluations, engines });
  }
  exportSession(): string {
    const exported = this.snapshot(); exported.permissions = emptyPermissions(); exported.sharedArtifactIds = []; exported.sharedJournalIds = []; exported.engineSelection = [];
    return JSON.stringify(exported, null, 2);
  }
  importSession(value: unknown): LearningResult {
    this.assertActive(); const restored = parseLearningSession(value, { namespace: this.namespace });
    this.session = restored; this.epoch += 1; this.awaitingLocalDecision = false;
    for (const listener of this.listeners) listener(this.snapshot());
    return this.response({ sessionId: restored.id, accessReset: true, declarationsUnverified: true });
  }
  restoreLocal(): LearningResult {
    if (!this.session.permissions.localSave) return { state: 'CONSENT_REQUIRED', revision: this.session.revision, message: 'Allow reading the browser copy explicitly.' };
    if (!this.storage) return this.unavailable('Local storage is unavailable.');
    let saved: string | null;
    try { saved = this.storage.getItem(this.storageKey); } catch { return this.unavailable('Local storage could not be read.'); }
    if (!saved) return { state: 'NOT_FOUND', revision: this.session.revision };
    try { return this.importSession(saved); } catch { return this.unavailable('The saved copy is invalid. Import a valid export; the current work was preserved.'); }
  }
  /** Explicitly choose the current work over an older browser copy; never called by an agent tool. */
  saveCurrentLocally(): LearningResult {
    if (!this.session.permissions.localSave) return { state: 'CONSENT_REQUIRED', revision: this.session.revision };
    if (!this.storage) return this.unavailable('Local storage is unavailable.');
    this.awaitingLocalDecision = false; this.persist();
    return this.persistenceError ? this.unavailable(this.persistenceError, 'LOCAL_STORAGE_UNAVAILABLE') : this.response({ saved: true });
  }
  prepareTeacherExport(artifactIds: string[], journalIds: string[]): LearningResult {
    if (!this.session.permissions.teacherShare) return { state: 'CONSENT_REQUIRED', revision: this.session.revision };
    const selectedArtifacts = uniqueIds(artifactIds); const selectedJournal = uniqueIds(journalIds);
    assertReferences(selectedArtifacts, new Set(this.session.artifacts.map(row => row.id)));
    assertReferences(selectedJournal, new Set(this.session.journal.map(row => row.id)));
    return this.response({ format: 'orbit-learning-handoff-v1', sessionId: this.session.id, revision: this.session.revision,
      artifacts: clone(this.session.artifacts.filter(row => selectedArtifacts.includes(row.id))),
      journal: clone(this.session.journal.filter(row => selectedJournal.includes(row.id))).map(row => ({ ...row, artifactIds: row.artifactIds.filter(reference => selectedArtifacts.includes(reference)) })),
      selectedOnly: true, transmitted: false, teacherAccessGranted: false,
    });
  }
  dispose(): void { if (this.disposed) return; this.epoch += 1; this.session.permissions.agentRead = false; this.session.permissions.agentPropose = false; this.session.permissions.engineSelection = false; this.session.sharedArtifactIds = []; this.session.sharedJournalIds = []; this.listeners.clear(); this.disposed = true; }
}
