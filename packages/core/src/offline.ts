import { DEFAULT_BUDGET, type BudgetLimits } from './budget.js'

export type ScheduledTask = Readonly<{
  id: string
  priority: number
  depth: number
}>

/** A pure, deterministic planner: no task can exceed depth two or the call ceiling. */
export function scheduleBounded<T extends ScheduledTask>(tasks: readonly T[], limits: BudgetLimits = DEFAULT_BUDGET): readonly T[] {
  return [...tasks]
    .filter((task) => Number.isFinite(task.priority) && task.depth >= 0 && task.depth <= limits.maxDepth)
    .sort((left, right) => right.priority - left.priority || left.depth - right.depth || left.id.localeCompare(right.id))
    .slice(0, limits.modelCalls)
}

const TRACKING_PARAMETER = /^(utm_.+|fbclid|gclid)$/i

/** Normalizes only HTTP(S) links for fixture-safe, reproducible comparisons. */
export function normalizeLink(raw: string): string | undefined {
  let url: URL
  try { url = new URL(raw) } catch { return undefined }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
  url.protocol = url.protocol.toLowerCase()
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMETER.test(key)) url.searchParams.delete(key)
  const parameters = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  )
  url.search = ''
  for (const [key, value] of parameters) url.searchParams.append(key, value)
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = ''
  return url.toString()
}

export function normalizeLinks(rawLinks: readonly string[]): readonly string[] {
  return [...new Set(rawLinks.map(normalizeLink).filter((link): link is string => link !== undefined))].sort((left, right) => left.localeCompare(right))
}
