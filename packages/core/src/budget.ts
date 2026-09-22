export type BudgetLimits = Readonly<{
  modelCalls: number
  timeMinutes: number
  candidateRecords: number
  claims: number
  maxDepth: number
}>

/** The bounded discovery budget: 9 calls + 30 minutes / 40 candidates / 18 claims / depth 2. */
export const DEFAULT_BUDGET: BudgetLimits = Object.freeze({
  modelCalls: 9,
  timeMinutes: 30,
  candidateRecords: 40,
  claims: 18,
  maxDepth: 2,
})

export type BudgetUsage = Partial<BudgetLimits>

export function withinBudget(usage: BudgetUsage, limits: BudgetLimits = DEFAULT_BUDGET): boolean {
  return (Object.keys(limits) as Array<keyof BudgetLimits>).every((key) =>
    (usage[key] ?? 0) <= limits[key],
  )
}

export function exceededBudgetKeys(usage: BudgetUsage, limits: BudgetLimits = DEFAULT_BUDGET): Array<keyof BudgetLimits> {
  return (Object.keys(limits) as Array<keyof BudgetLimits>).filter((key) =>
    (usage[key] ?? 0) > limits[key],
  )
}
