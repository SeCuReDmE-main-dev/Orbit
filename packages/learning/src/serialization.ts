import { parseDossier } from '../../evidence-review/src/index.js';
import type { Classification, EngineId } from '../../evidence-review/src/classification.js';
import { COLAB_FORMAT, LEARNING_FORMAT, emptyPermissions, type ArtifactInput, type ColabResult, type Json, type LearningArtifact, type LearningEvaluation, type LearningExperiment, type LearningJournalEntry, type LearningNamespace, type LearningProposal, type LearningReview, type LearningSession, type ProposalInput, type ProposalPayload } from './contracts.js';
import { getLearningModule } from './catalog.js';

export const MAX_SESSION_BYTES = 8_000_000;
export const jsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;
export const clone = <T>(value: T): T => structuredClone(value);
export function object(value: unknown, label = 'value'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 4000, label = 'text', allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || !allowEmpty && !value.trim()) throw new TypeError(`${label} must be ${allowEmpty ? 'a' : 'a nonempty'} string of at most ${max} characters.`);
  return value;
}
export function id(value: unknown, label = 'id'): string {
  const result = text(value, 160, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(result)) throw new TypeError(`${label} has unsupported characters.`);
  return result;
}
export function integer(value: unknown, min: number, max: number, label = 'integer'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be an integer between ${min} and ${max}.`);
  return value;
}
export function strings(value: unknown, max = 40, itemMax = 4000): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Expected at most ${max} strings.`);
  return value.map(entry => text(entry, itemMax));
}
export function uniqueIds(value: unknown, max = 100): string[] {
  const result = strings(value, max, 160).map(entry => id(entry));
  if (new Set(result).size !== result.length) throw new TypeError('References must be unique.');
  return result;
}
export function choice<T extends string>(value: unknown, values: readonly T[], label = 'choice'): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new TypeError(`Invalid ${label}.`);
  return value as T;
}
export function moduleId(value: unknown): number {
  const result = typeof value === 'string' && /^module-[1-8]$/.test(value) ? Number(value.slice(7)) : value;
  return integer(result, 1, 8, 'moduleId');
}
export function json(value: unknown, depth = 0): Json {
  if (depth > 12) throw new TypeError('JSON depth exceeds 12.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return text(value, 200_000, 'JSON text', true);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 1000) throw new TypeError('JSON array exceeds 1000 items.');
    return value.map(entry => json(entry, depth + 1));
  }
  const record = object(value, 'JSON');
  if (Object.keys(record).length > 200) throw new TypeError('JSON object exceeds 200 keys.');
  const result: Record<string, Json> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new TypeError('Unsupported JSON key.');
    text(key, 160, 'JSON key');
    result[key] = json(entry, depth + 1);
  }
  return result;
}
export function timestamp(value: unknown): string {
  const result = text(value, 80, 'timestamp');
  if (!Number.isFinite(Date.parse(result))) throw new TypeError('Invalid timestamp.');
  return result;
}
export function namespaceKey(value: string | LearningNamespace): string {
  if (typeof value === 'string') return text(value, 1000, 'namespace');
  const namespace = object(value, 'namespace');
  const project = text(namespace.projectId, 160, 'projectId');
  const dataset = text(namespace.dataset, 160, 'dataset');
  const user = namespace.userId === undefined ? '' : text(namespace.userId, 200, 'userId');
  const session = namespace.sessionId === undefined ? '' : text(namespace.sessionId, 160, 'sessionId');
  if (!user && !session) throw new TypeError('An anonymous namespace requires a sessionId.');
  return JSON.stringify([project, dataset, user, session]);
}
export const learningStorageKey = (namespace: string | LearningNamespace): string => `orbit.learning.v1:${encodeURIComponent(namespaceKey(namespace))}`;
export function filePath(value: unknown): string {
  const result = text(value, 260, 'path');
  if (result.startsWith('/') || result.includes('\\') || result.split('/').some(part => !part || part === '.' || part === '..') || !/^[A-Za-z0-9_./ -]+$/.test(result)) throw new TypeError('A relative, safe artifact path is required.');
  return result;
}
export function digest(value: unknown): string {
  const result = text(value, 64, 'sha256').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(result)) throw new TypeError('Invalid SHA-256 digest.');
  return result;
}
export async function sha256(content: string | Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA256_UNAVAILABLE: Web Crypto is unavailable in this environment.');
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
  const output = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(output)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
/** Validate the actual selected frontend files, not substitute files from a solved example. */
export async function parseArtifactBundle(resultValue: unknown, filesValue: unknown, manifestValue?: unknown): Promise<{ result: ColabResult; artifacts: Array<{ path: string; content: string; sha256: string; mediaType: string }>; status: 'external-declared'; executionVerified: false }> {
  const result = parseColabResult(resultValue);
  const files = boundedRows(filesValue, 40).map(value => {
    const row = object(value, 'bundle file');
    return { path: filePath(row.path), content: text(row.content, 512_000, 'file content', true), mediaType: row.mediaType === undefined ? 'text/plain' : text(row.mediaType, 120), ...(row.sha256 === undefined ? {} : { declaredDigest: digest(row.sha256) }) };
  });
  if (!files.length || new Set(files.map(file => file.path)).size !== files.length) throw new TypeError('Select a nonempty bundle with unique paths.');
  if (files.reduce((sum, file) => sum + new TextEncoder().encode(file.content).byteLength, 0) > 4_000_000) throw new TypeError('Bundle exceeds 4 MB of selected text.');
  const declarations = new Map<string, string>();
  if (manifestValue !== undefined) {
    const manifest = object(manifestValue, 'manifest');
    for (const value of boundedRows(manifest.files, 100)) {
      const row = object(value); const path = filePath(row.path);
      if (declarations.has(path)) throw new TypeError('Duplicate manifest path.');
      declarations.set(path, digest(row.sha256));
    }
  }
  const artifacts: Array<{ path: string; content: string; sha256: string; mediaType: string }> = [];
  for (const file of files) {
    const measured = await sha256(file.content);
    const declared = file.declaredDigest ?? declarations.get(file.path);
    if (declared !== undefined && declared !== measured) throw new TypeError(`Integrity mismatch for ${file.path}.`);
    artifacts.push({ path: file.path, content: file.content, sha256: measured, mediaType: file.mediaType });
  }
  return { result: { ...result, artifacts }, artifacts, status: 'external-declared', executionVerified: false };
}
export function parseArtifactInput(value: unknown, defaultModule = 1): ArtifactInput {
  const v = object(value, 'artifact');
  const selectedModule = v.moduleId === undefined ? moduleId(defaultModule) : moduleId(v.moduleId);
  const mission = v.missionId === undefined ? `module-${selectedModule}` : id(v.missionId, 'missionId');
  if (mission !== `module-${selectedModule}`) throw new TypeError('Artifact missionId must match moduleId.');
  return {
    ...(v.id === undefined ? {} : { id: id(v.id) }), title: text(v.title, 500, 'title'),
    moduleId: selectedModule, missionId: mission,
    mediaType: v.mediaType === undefined ? 'text/plain' : text(v.mediaType, 120, 'mediaType'),
    content: text(v.content, 512_000, 'content', true),
    ...(v.path === undefined ? {} : { path: filePath(v.path) }),
    origin: v.origin === undefined ? 'learner' : choice(v.origin, ['provided', 'learner', 'assistant', 'external-colab'], 'origin'),
    ...(v.sha256 === undefined ? {} : { sha256: digest(v.sha256) }),
  };
}
/** Re-imported artifacts are external claims, including any previous verification labels. */
export function parseLearningArtifact(value: unknown): LearningArtifact {
  const v = object(value, 'artifact');
  const parsed = parseArtifactInput(v);
  return {
    ...parsed, id: id(v.id), moduleId: parsed.moduleId!, missionId: parsed.missionId!,
    mediaType: parsed.mediaType!, origin: parsed.origin!, createdAt: timestamp(v.createdAt),
    status: 'external-declared', hashStatus: 'not-checked', version: v.version === undefined ? 1 : integer(v.version, 1, 1_000_000, 'version'),
    ...(v.verificationNote === undefined ? {} : { verificationNote: `Imported declaration: ${text(v.verificationNote, 4000)}` }),
  };
}
export function parseProposalInput(value: unknown): ProposalInput {
  const v = object(value, 'proposal');
  const allowed = ['id', 'expectedRevision', 'kind', 'payload'];
  if (Object.keys(v).some(key => !allowed.includes(key))) throw new TypeError('Proposal contains unsupported fields; human approval and publication cannot be supplied.');
  const p = object(v.payload, 'payload');
  if (Object.keys(p).some(key => !['text', 'artifactIds', 'experimentId', 'openQuestions', 'observations', 'suggestions'].includes(key))) throw new TypeError('Unsupported proposal payload field.');
  // Research proposals reuse this envelope; the pedagogical WebMCP schema keeps
  // its smaller 20k text limit while the legacy report/source contract remains importable.
  const payload: ProposalPayload = { text: text(p.text, 64_000),
    ...(p.artifactIds === undefined ? {} : { artifactIds: uniqueIds(p.artifactIds) }),
    ...(p.experimentId === undefined ? {} : { experimentId: id(p.experimentId) }),
    ...(p.openQuestions === undefined ? {} : { openQuestions: strings(p.openQuestions, 20) }),
    ...(p.observations === undefined ? {} : { observations: strings(p.observations, 30) }),
    ...(p.suggestions === undefined ? {} : { suggestions: strings(p.suggestions, 30) }),
  };
  return { id: id(v.id), expectedRevision: integer(v.expectedRevision, 0, 1_000_000, 'expectedRevision'), kind: choice(v.kind, ['plan', 'experiment', 'explanation', 'reflection', 'transfer', 'correction'], 'kind'), payload };
}
const listOrText = (value: unknown): string[] => value === undefined ? [] : typeof value === 'string' ? value.trim() ? [text(value, 10_000)] : [] : strings(value, 40, 10_000);
export function parseColabResult(value: unknown): ColabResult {
  const v = object(value, 'Colab result');
  if (v.schemaVersion !== COLAB_FORMAT) throw new TypeError('Unsupported Colab result format.');
  const selectedModule = moduleId(v.moduleId);
  if (v.missionId !== `module-${selectedModule}`) throw new TypeError('Colab missionId must match moduleId.');
  const parameters = json(v.parameters ?? {});
  if (!parameters || Array.isArray(parameters) || typeof parameters !== 'object') throw new TypeError('Parameters must be an object.');
  const artifacts = v.artifacts === undefined ? undefined : boundedRows(v.artifacts, 40).map(entry => {
    const artifact = object(entry);
    return { ...(artifact.id === undefined ? {} : { id: id(artifact.id) }), path: filePath(artifact.path), content: text(artifact.content, 512_000, 'content', true), ...(artifact.mediaType === undefined ? {} : { mediaType: text(artifact.mediaType, 120) }), ...(artifact.sha256 === undefined ? {} : { sha256: digest(artifact.sha256) }) };
  });
  return { schemaVersion: COLAB_FORMAT, moduleId: selectedModule, missionId: `module-${selectedModule}`, attemptId: id(text(v.attemptId, 120, 'attemptId'), 'attemptId'),
    parameters, prediction: text(v.prediction ?? '', 10_000, 'prediction', true), observations: json(v.observations ?? []),
    explanation: text(v.explanation ?? '', 20_000, 'explanation', true), assistance: listOrText(v.assistance), limitations: listOrText(v.limitations), openQuestion: text(v.openQuestion ?? '', 4000, 'openQuestion', true), status: 'external-declared', ...(artifacts ? { artifacts } : {}) };
}
export function boundedRows(value: unknown, maximum: number): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) throw new TypeError(`Expected at most ${maximum} items.`);
  return value;
}
export function parseExperiment(value: unknown, defaultModule: number, now: string, defaultId: string): LearningExperiment {
  const v = object(value, 'experiment');
  const selectedModule = v.moduleId === undefined ? defaultModule : moduleId(v.moduleId);
  const observations = strings(v.observations, 40, 4000);
  return {
    id: v.id === undefined ? defaultId : id(v.id), moduleId: selectedModule, missionId: `module-${selectedModule}`,
    prediction: text(v.prediction, 10_000), variable: text(v.variable, 500), initialValue: json(v.initialValue), changedValue: json(v.changedValue),
    controlledConditions: strings(v.controlledConditions, 20), procedure: strings(v.procedure, 20), observations,
    restoration: text(v.restoration, 4000), limitations: strings(v.limitations, 20), artifactIds: uniqueIds(v.artifactIds),
    createdAt: now, status: observations.length ? 'observed-reported' : 'planned',
  };
}
export function parseLearningSession(value: unknown, options: { namespace?: string | LearningNamespace } = {}): LearningSession {
  const input = typeof value === 'string' ? JSON.parse(text(value, MAX_SESSION_BYTES, 'session export')) : value;
  const v = object(input, 'learning session');
  if (v.format !== LEARNING_FORMAT) throw new TypeError('Unsupported learning session format.');
  const selectedModule = moduleId(v.moduleId);
  const artifacts = boundedRows(v.artifacts, 100).map(parseLearningArtifact);
  const artifactIds = new Set(artifacts.map(row => row.id));
  if (artifactIds.size !== artifacts.length) throw new TypeError('Duplicate artifact IDs.');
  const experiments = boundedRows(v.experiments, 100).map(entry => {
    const row = object(entry);
    return parseExperiment(row, selectedModule, timestamp(row.createdAt), id(row.id));
  });
  const experimentIds = new Set(experiments.map(row => row.id));
  if (experimentIds.size !== experiments.length) throw new TypeError('Duplicate experiment IDs.');
  const proposals: LearningProposal[] = boundedRows(v.proposals, 100).map(entry => {
    const p = object(entry);
    const parsed = parseProposalInput({ id: p.id, expectedRevision: p.expectedRevision, kind: p.kind, payload: p.payload });
    return { ...parsed, moduleId: moduleId(p.moduleId), status: 'pending', submittedAt: timestamp(p.submittedAt), attribution: 'agent-declared' };
  });
  const proposalIds = new Set(proposals.map(row => row.id));
  if (proposalIds.size !== proposals.length) throw new TypeError('Duplicate proposal IDs.');
  const journal: LearningJournalEntry[] = boundedRows(v.journal, 300).map(entry => {
    const row = object(entry);
    return { id: id(row.id), at: timestamp(row.at), moduleId: moduleId(row.moduleId), kind: choice(row.kind, ['observation', 'reflection', 'question', 'decision', 'system']), text: text(row.text, 20_000), artifactIds: uniqueIds(row.artifactIds), attribution: 'imported-declared' };
  });
  const reviews: LearningReview[] = boundedRows(v.reviews, 100).map(entry => {
    const row = object(entry);
    return { proposalId: id(row.proposalId), decision: choice(row.decision, ['accepted', 'needs-work']), note: text(row.note, 4000), at: timestamp(row.at), revision: integer(row.revision, 0, 1_000_000), attribution: 'imported-declared' };
  });
  const evaluations: LearningEvaluation[] = boundedRows(v.evaluations, 100).map(entry => {
    const row = object(entry);
    const engines = parseEngineSelection(row.engines);
    const results = boundedRows(row.results, 50).map(parseRecordedClassification);
    return { id: id(row.id), at: timestamp(row.at), learningRevision: integer(row.learningRevision, 0, 1_000_000), dossierRevision: integer(row.dossierRevision, 0, 1_000_000), engines, results, attribution: 'imported-declared' };
  });
  for (const experiment of experiments) assertReferences(experiment.artifactIds, artifactIds);
  for (const proposal of proposals) {
    assertReferences(proposal.payload.artifactIds ?? [], artifactIds);
    if (proposal.payload.experimentId && !experimentIds.has(proposal.payload.experimentId)) throw new TypeError('Proposal references an unavailable experiment.');
  }
  for (const entry of journal) assertReferences(entry.artifactIds, artifactIds);
  for (const review of reviews) if (!proposalIds.has(review.proposalId)) throw new TypeError('Review references an unavailable proposal.');
  const session: LearningSession = { format: LEARNING_FORMAT, id: id(v.id), namespace: namespaceKey(options.namespace ?? text(v.namespace, 1000, 'namespace')),
    moduleId: selectedModule, revision: integer(v.revision, 0, 1_000_000), permissions: emptyPermissions(), sharedArtifactIds: [], sharedJournalIds: [], engineSelection: [],
    supportMode: choice(v.supportMode ?? 'guidance', ['brainstorm', 'exploration', 'teaching', 'guidance', 'debugging', 'critique', 'transfer', 'revision']),
    artifacts, experiments, proposals, journal, reviews, evaluations, createdAt: timestamp(v.createdAt), updatedAt: timestamp(v.updatedAt),
    ...(v.evidenceDossier === undefined ? {} : { evidenceDossier: parseDossier(v.evidenceDossier) }) };
  if (jsonBytes(session) > MAX_SESSION_BYTES) throw new TypeError('Session exceeds the export limit.');
  return session;
}
export function parseEngineSelection(value: unknown): EngineId[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) throw new TypeError('Choose one engine or a pair.');
  const engines = value.map(entry => choice(entry, ['baseline', 'n', 'p'], 'engine'));
  if (new Set(engines).size !== engines.length) throw new TypeError('Engine selection must be unique.');
  return engines;
}
export function assertReferences(ids: string[], allowed: Set<string>): void {
  if (ids.some(reference => !allowed.has(reference))) throw new TypeError('Reference is outside the selected session.');
}
function parseRecordedClassification(value: unknown): Classification {
  const row = object(json(value), 'recorded classification');
  choice(row.engine, ['baseline', 'n', 'p']); choice(row.decision, ['ADMIT', 'REJECT', 'HOLD']);
  text(row.engineVersion, 100); integer(row.revision, 0, 1_000_000); integer(row.independentSources, 0, 1000);
  strings(row.reasons, 100); boundedRows(row.truth, 100); boundedRows(row.falsity, 100); boundedRows(row.indeterminacy, 100);
  object(row.representation); choice(row.semanticVerification, ['agent-asserted-relation']);
  // This is a bounded historical declaration. It is never input to approval or engine computation.
  return clone(row) as unknown as Classification;
}
export function stableSerialize(value: unknown): string {
  const order = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(order);
    if (entry && typeof entry === 'object') return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, order(item)]));
    return entry;
  };
  return JSON.stringify(order(value));
}
export function createLearningSession(input: { id?: string; namespace: string | LearningNamespace; now?: string }): LearningSession {
  const at = input.now === undefined ? new Date().toISOString() : timestamp(input.now);
  const sessionId = input.id === undefined ? crypto.randomUUID() : id(input.id);
  if (!getLearningModule(1)) throw new Error('Course catalogue unavailable.');
  return { format: LEARNING_FORMAT, id: sessionId, namespace: namespaceKey(input.namespace), moduleId: 1, revision: 0,
    permissions: emptyPermissions(), sharedArtifactIds: [], sharedJournalIds: [], engineSelection: [], supportMode: 'guidance',
    artifacts: [], experiments: [], proposals: [], journal: [], reviews: [], evaluations: [], createdAt: at, updatedAt: at };
}
