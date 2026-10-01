import type { Dossier } from '../../evidence-review/src/index.js';
import type { Classification, EngineId } from '../../evidence-review/src/classification.js';

export const LEARNING_FORMAT = 'orbit-learning-v1' as const;
export const LEARNING_CONTRACT_VERSION = 'orbit-learning-tools-v1' as const;
export const COLAB_FORMAT = 'orbit-learning-colab-v1' as const;
export type LearningState = 'READY' | 'CONSENT_REQUIRED' | 'STALE_REVISION' | 'NOT_FOUND' | 'UNAVAILABLE' | 'PRESENTED';
export type LearningResult<T = Record<string, unknown>> = { state: LearningState; revision?: number; code?: string; message?: string; data?: T };
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Permission = 'localSave' | 'agentRead' | 'agentPropose' | 'engineSelection' | 'teacherShare' | 'sanityPublish';
export type LearningPermissions = Record<Permission, boolean>;
export const PERMISSIONS: readonly Permission[] = ['localSave', 'agentRead', 'agentPropose', 'engineSelection', 'teacherShare', 'sanityPublish'];
export const emptyPermissions = (): LearningPermissions => ({ localSave: false, agentRead: false, agentPropose: false, engineSelection: false, teacherShare: false, sanityPublish: false });
export type LearningNamespace = { projectId: string; dataset: string; userId?: string; sessionId?: string };
export type SupportMode = 'brainstorm' | 'exploration' | 'teaching' | 'guidance' | 'debugging' | 'critique' | 'transfer' | 'revision';
export const SUPPORT_MODES: readonly SupportMode[] = ['brainstorm', 'exploration', 'teaching', 'guidance', 'debugging', 'critique', 'transfer', 'revision'];
export type SupportLevel = 'conceptual-hint' | 'technical-hint' | 'pseudocode' | 'partial-example' | 'full-solution' | 'explanation';
export const SUPPORT_LEVELS: readonly SupportLevel[] = ['conceptual-hint', 'technical-hint', 'pseudocode', 'partial-example', 'full-solution', 'explanation'];
export type Resource = { title: string; url: string; kind: 'documentation' | 'notebook' | 'lab'; attribution: string };
export type LearningModule = {
  id: number; missionId: string; version: string; title: string; objective: string;
  prerequisites: string[]; concepts: string[]; criteria: string[]; resources: Resource[];
  frontendBrick: string; notebook: string; prediction: string; activity: string[];
  support: Record<SupportLevel, string>; transfer: string; limits: string[];
  soloMinutes: { guided: 120; colab: 30; reflection: 30 }; webinarMinutes: 60;
};
export type ArtifactOrigin = 'provided' | 'learner' | 'assistant' | 'external-colab';
export type ArtifactStatus = 'provided' | 'modified' | 'executed-reported' | 'external-declared' | 'verified-technical' | 'human-reviewed';
export type LearningArtifact = {
  id: string; title: string; moduleId: number; missionId: string; mediaType: string; content: string;
  path?: string; origin: ArtifactOrigin; status: ArtifactStatus; createdAt: string;
  sha256?: string; hashStatus: 'not-checked' | 'matched' | 'mismatch';
  verificationNote?: string; version: number;
};
export type ArtifactInput = {
  id?: string; title: string; moduleId?: number; missionId?: string; mediaType?: string; content: string;
  path?: string; origin?: ArtifactOrigin; sha256?: string;
};
export type LearningExperiment = {
  id: string; moduleId: number; missionId: string; prediction: string; variable: string;
  initialValue: Json; changedValue: Json; controlledConditions: string[]; procedure: string[];
  observations: string[]; restoration: string; limitations: string[]; artifactIds: string[];
  createdAt: string; status: 'planned' | 'observed-reported';
};
export type ExperimentInput = Omit<LearningExperiment, 'id' | 'moduleId' | 'missionId' | 'createdAt' | 'status'> & { id?: string; moduleId?: number };
export type ProposalKind = 'plan' | 'experiment' | 'explanation' | 'reflection' | 'transfer' | 'correction';
export type ProposalPayload = { text: string; artifactIds?: string[]; experimentId?: string; openQuestions?: string[]; observations?: string[]; suggestions?: string[] };
export type LearningProposal = {
  id: string; expectedRevision: number; moduleId: number; kind: ProposalKind; payload: ProposalPayload;
  status: 'pending' | 'accepted' | 'needs-work'; submittedAt: string; attribution: 'agent-declared';
};
export type ProposalInput = { id: string; expectedRevision: number; kind: ProposalKind; payload: ProposalPayload };
export type LearningJournalEntry = {
  id: string; at: string; moduleId: number; kind: 'observation' | 'reflection' | 'question' | 'decision' | 'system';
  text: string; artifactIds: string[]; attribution: 'human-local' | 'agent-declared' | 'system' | 'imported-declared';
};
export type LearningReview = { proposalId: string; decision: 'accepted' | 'needs-work'; note: string; at: string; revision: number; attribution: 'human-local' | 'imported-declared' };
export type LearningEvaluation = { id: string; at: string; learningRevision: number; dossierRevision: number; engines: EngineId[]; results: Classification[]; attribution: 'calculation' | 'imported-declared' };
export type LearningSession = {
  format: typeof LEARNING_FORMAT; id: string; namespace: string; moduleId: number; revision: number;
  permissions: LearningPermissions; sharedArtifactIds: string[]; sharedJournalIds: string[];
  engineSelection: EngineId[]; supportMode: SupportMode; artifacts: LearningArtifact[];
  experiments: LearningExperiment[]; proposals: LearningProposal[]; journal: LearningJournalEntry[];
  reviews: LearningReview[]; evaluations: LearningEvaluation[]; evidenceDossier?: Dossier;
  createdAt: string; updatedAt: string;
};
/** A notebook reports an execution. Import never upgrades this to an independently verified run. */
export type ColabResult = {
  schemaVersion: typeof COLAB_FORMAT; missionId: string; moduleId: number; attemptId: string;
  parameters: { [key: string]: Json }; prediction: string; observations: Json;
  explanation: string; assistance: string[]; limitations: string[]; openQuestion: string;
  status: 'external-declared'; artifacts?: Array<{ id?: string; path: string; content: string; mediaType?: string; sha256?: string }>;
};
export type AgentOperation = { sessionId: string; namespace: string; revision: number; epoch: number };
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export type ToolSchema = Readonly<Record<string, unknown>>;
export type LearningTool = {
  name: string; title: string; description: string; inputSchema: ToolSchema; outputSchema: ToolSchema;
  annotations: { readOnlyHint: boolean; untrustedContentHint: true; consequentialHint: boolean };
  execute(input: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<LearningResult>;
};
