import type { ActionBudget } from "./action-card.js";

export interface MissionBudgetLimits {
  readonly modelCalls: number;
  readonly timeMinutes: number;
  readonly candidateRecords: number;
  readonly claims: number;
  readonly maxDepth: number;
}

/** Exact mission-discovery ceilings required by the Orbit plan. */
export const ORBIT_MISSION_BUDGET = {
  modelCalls: 9,
  timeMinutes: 30,
  candidateRecords: 40,
  claims: 18,
  maxDepth: 2,
} as const satisfies MissionBudgetLimits;

/** Complementary per-action envelopes. Mission ceilings still apply globally. */
export const EXACT_BUDGETS = {
  interactiveRead: {
    wallClockMs: 15_000,
    providerCalls: 3,
    inputTokens: 12_000,
    outputTokens: 2_000,
    knowledgeReads: 20,
    bytesStored: 262_144,
    retries: 1,
    spendUsdCents: 0,
  },
  missionPlan: {
    wallClockMs: 60_000,
    providerCalls: 8,
    inputTokens: 40_000,
    outputTokens: 8_000,
    knowledgeReads: 100,
    bytesStored: 1_048_576,
    retries: 2,
    spendUsdCents: 0,
  },
  approvedExternalAction: {
    wallClockMs: 30_000,
    providerCalls: 1,
    inputTokens: 8_000,
    outputTokens: 2_000,
    knowledgeReads: 10,
    bytesStored: 262_144,
    retries: 0,
    spendUsdCents: 0,
  },
  ccpCheckpoint: {
    wallClockMs: 5_000,
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    knowledgeReads: 0,
    bytesStored: 2_097_152,
    retries: 0,
    spendUsdCents: 0,
  },
} as const satisfies Record<string, ActionBudget>;

export function isWithinBudget(used: ActionBudget, limit: ActionBudget): boolean {
  return (Object.keys(limit) as (keyof ActionBudget)[]).every(
    (key) => used[key] <= limit[key],
  );
}

export function isWithinMissionBudget(
  used: MissionBudgetLimits,
  limit: MissionBudgetLimits = ORBIT_MISSION_BUDGET,
): boolean {
  return (Object.keys(limit) as (keyof MissionBudgetLimits)[]).every(
    (key) => used[key] <= limit[key],
  );
}
