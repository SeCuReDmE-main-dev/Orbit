import { createHash } from 'node:crypto'
import type { Dossier } from '../packages/evidence-review/src/index.js'
import type { CompanionService } from '../services/broker/src/companion.js'
import { pathsInOutline, type ContextReader } from './context-agent.js'

export type KeywordBaseline = {
  format: 'orbit-keyword-baseline-v1'
  status: 'candidate'
  corpusMode: 'frozen-context-plan'
  planProposalId: string
  question: string
  objective: string
  keywords: string[]
  entriesRead: number
  selectedEntries: Array<{ path: string; digest: string; score: number; retrievedAt: string }>
  candidateAnswer: string
  limitations: string[]
  trace: { calls: Array<{ tool: 'initial_context' | 'knowledge_base_read'; paths?: string[]; state: string }>; model: string }
}

const digest = (text: string) => createHash('sha256').update(text).digest('hex')
const textOf = (reply: Awaited<ReturnType<ContextReader['outline']>>) => (reply.content ?? [])
  .filter((block) => block.type === 'text').map((block) => block.text ?? '').join('\n')
const requireReady = (reply: Awaited<ReturnType<ContextReader['outline']>>) => {
  if (reply.state !== 'READY') throw Error(`CONTEXT_UNAVAILABLE: ${reply.reason ?? reply.state}`)
  const text = textOf(reply)
  if (!text.trim()) throw Error('CONTEXT_EMPTY')
  return text
}
const stopWords = new Set(['about','across','after','before','between','could','documented','does','from','have','into','only','rather','require','should','that','their','there','these','this','under','what','when','which','with','would','your'])
const keywordsFor = (question: string) => [...new Set(question.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) ?? [])]
  .filter((word) => !stopWords.has(word)).slice(0, 12)
const score = (text: string, keywords: string[]) => keywords.reduce((total, keyword) => {
  const matches = text.toLowerCase().match(new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'g'))
  return total + (matches?.length ?? 0)
}, 0)
function parseCandidate(text: string): { answer: string; limitations: string[] } {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw Error('BASELINE_INVALID_JSON') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('BASELINE_INVALID_SHAPE')
  const record = value as Record<string, unknown>
  if (typeof record.answer !== 'string' || !record.answer.trim()) throw Error('BASELINE_ANSWER_MISSING')
  if (!Array.isArray(record.limitations) || record.limitations.some((item) => typeof item !== 'string')) throw Error('BASELINE_LIMITATIONS_MISSING')
  return { answer: record.answer.trim(), limitations: record.limitations as string[] }
}

/**
 * A deliberately simple control: the Context paths selected by the pending
 * structured plan are frozen, flattened and ranked by lexical matches. This
 * keeps the same five-entry corpus and model while ignoring hierarchy, tags,
 * and the agent's structured selection reasoning.
 */
export async function runKeywordBaseline(dossier: Dossier, reader: ContextReader, companion: CompanionService, signal: AbortSignal): Promise<KeywordBaseline> {
  if (!dossier.question.trim()) throw Error('QUESTION_REQUIRED')
  const trace: KeywordBaseline['trace'] = { calls: [], model: '' }
  const outlineReply = await reader.outline(signal)
  trace.calls.push({ tool: 'initial_context', state: outlineReply.state })
  const available = pathsInOutline(requireReady(outlineReply))
  const plan = [...dossier.proposals].reverse().find((proposal) => proposal.stage === 'plan' && proposal.knowledgeReads.length > 0)
  if (!plan) throw Error('BASELINE_FROZEN_PLAN_REQUIRED')
  const paths = plan.knowledgeReads.map((read) => read.path)
  if (paths.length > 5 || new Set(paths).size !== paths.length || paths.some((path) => !available.includes(path))) {
    throw Error('BASELINE_FROZEN_PATHS_INVALID')
  }
  const keywords = keywordsFor(dossier.question)
  if (!keywords.length) throw Error('BASELINE_KEYWORDS_EMPTY')
  const entries: Array<{ path: string; text: string; digest: string; retrievedAt: string; score: number }> = []
  for (const path of paths) {
    const reply = await reader.entries([path], signal)
    trace.calls.push({ tool: 'knowledge_base_read', paths: [path], state: reply.state })
    const text = requireReady(reply)
    entries.push({ path, text, digest: digest(text), retrievedAt: reply.retrievedAt ?? new Date().toISOString(), score: score(`${path}\n${text}`, keywords) })
  }
  const selected = entries.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 5)
  const response = await companion.run({
    question: dossier.question,
    objective: dossier.objective,
    flatKeywordMatches: selected.map(({ path, text, score }) => ({ path, score, text: text.slice(0, 8000) })),
  }, 'Produce an unreviewed keyword-baseline candidate from these flat text matches. JSON only: {"answer":"...","limitations":["..."]}. Do not use hierarchy, labels, or entry paths as evidence. Do not claim original linked documents were read. Explicitly say when the flat matches do not establish scope or version.', signal)
  trace.model = response.model
  const candidate = parseCandidate(response.text)
  return {
    format: 'orbit-keyword-baseline-v1', status: 'candidate', corpusMode: 'frozen-context-plan', planProposalId: plan.id,
    question: dossier.question, objective: dossier.objective,
    keywords, entriesRead: entries.length,
    selectedEntries: selected.map(({ path, digest, score, retrievedAt }) => ({ path, digest, score, retrievedAt })),
    candidateAnswer: candidate.answer, limitations: candidate.limitations, trace,
  }
}
