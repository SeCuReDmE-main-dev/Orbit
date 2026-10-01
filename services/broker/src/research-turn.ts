import type { ExaSearchResult } from '@orbit/providers'
import type { CompanionService } from './companion.js'

export type ResearchResult = ExaSearchResult & Readonly<{ text?: string }>
export type ResearchTurnInput = Readonly<{ companion: CompanionService; search: (query: string, signal: AbortSignal) => Promise<readonly ResearchResult[]>; context: unknown; question: string; signal: AbortSignal }>
export type ResearchTurnResult = Readonly<{ axes: readonly string[]; queries: readonly string[]; sources: readonly ResearchResult[]; report: string; model: string; attempts: number }>
type Plan = Readonly<{ axes: readonly string[]; queries: readonly string[] }>

const PLAN_PROMPT = 'Return JSON only with exactly this shape: {"axes":["..."],"queries":["..."]}. Provide exactly 9 task-specific research axes and no more than 6 bounded search queries. Do not include markdown or commentary.'

export async function researchTurn(input: ResearchTurnInput): Promise<ResearchTurnResult> {
  if (input.signal.aborted) throw abortError()
  const planned = await input.companion.run(input.context, `${PLAN_PROMPT}\nResearch question: ${input.question}`, input.signal)
  const plan = parsePlan(planned.text)
  const found = new Map<string, ResearchResult>(); let attempts = 0
  for (const query of plan.queries) {
    if (input.signal.aborted) throw abortError()
    attempts += 1
    for (const item of await input.search(query, input.signal)) {
      if (!isHttpUrl(item.url)) continue
      const url = new URL(item.url); url.hash = ''
      if (!found.has(url.toString())) found.set(url.toString(), { ...item, url: url.toString(), status: 'discovered', trust: 'untrusted' })
      if (found.size >= 30) break
    }
    if (found.size >= 30) break
  }
  if (input.signal.aborted) throw abortError()
  const sources = [...found.values()].slice(0, 30)
  const synthesis = await input.companion.run({ researchQuestion: input.question, axes: plan.axes, queries: plan.queries, discoveredSources: sources, evidenceStatus: 'discovered metadata and bounded provider excerpts only; no arbitrary URL fetch' }, 'Synthesize a cited report from the supplied results only. Do not invent page contents, citations, readings, facts, or results. Mark every URL as discovered unless its bounded excerpt is present. State missing evidence and one next action. Return readable report text.', input.signal)
  return { axes: plan.axes, queries: plan.queries, sources, report: synthesis.text, model: synthesis.model, attempts }
}

function parsePlan(raw: string): Plan {
  let value: unknown; try { value = JSON.parse(raw) } catch { throw new Error('RESEARCH_PLAN_INVALID_JSON') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('RESEARCH_PLAN_INVALID_SHAPE')
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.axes) || record.axes.length !== 9 || record.axes.some((axis) => typeof axis !== 'string' || !axis.trim())) throw new Error('RESEARCH_PLAN_REQUIRES_9_AXES')
  if (!Array.isArray(record.queries) || record.queries.length < 1 || record.queries.length > 6 || record.queries.some((query) => typeof query !== 'string' || !query.trim() || Buffer.byteLength(query) > 2000)) throw new Error('RESEARCH_PLAN_REQUIRES_1_TO_6_QUERIES')
  return { axes: record.axes.map((axis) => String(axis).trim()), queries: record.queries.map((query) => String(query).trim()) }
}

function isHttpUrl(value: string): boolean { try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password } catch { return false } }
function abortError(): Error { return Object.assign(new Error('RESEARCH_TURN_ABORTED'), { name: 'AbortError' }) }
