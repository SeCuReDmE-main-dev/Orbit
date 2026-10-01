import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { localCodex } from '../services/broker/src/companion.js'
import { parseDossier } from '../packages/evidence-review/src/index.js'
import { proposeContextPlan, proposeContextReport, type ContextReader, type ContextReply } from './context-agent.js'

const [stage, inputPath, outputPath] = process.argv.slice(2)
if (!['plan', 'report'].includes(stage) || !inputPath || !outputPath) {
  throw Error('Usage: npx tsx tools/run-context-agent.ts <plan|report> <input-dossier.json> <new-output-dossier.json>')
}
const base = 'http://127.0.0.1:8788/api/v1/knowledge'
async function read(path: string, signal: AbortSignal): Promise<ContextReply> {
  const response = await fetch(`${base}/${path}`, { signal, headers: { accept: 'application/json' } })
  if (!response.ok) throw Error(`CONTEXT_GATEWAY_HTTP_${response.status}`)
  return await response.json() as ContextReply
}
const reader: ContextReader = {
  outline: (signal) => read('outline', signal),
  entries: (paths, signal) => read(`entries?paths=${encodeURIComponent(JSON.stringify(paths))}`, signal),
}
const input = resolve(inputPath)
const output = resolve(outputPath)
if (input === output) throw Error('Output must be a new file; the original dossier is preserved.')
const dossier = parseDossier(JSON.parse(await readFile(input, 'utf8')))
const companion = localCodex(process.cwd())
const account = await companion.status()
if (!account.connected) throw Error(account.reason ?? 'Official Codex account unavailable.')
const signal = AbortSignal.timeout(120_000)
const result = stage === 'plan'
  ? await proposeContextPlan(dossier, reader, companion, signal)
  : await proposeContextReport(dossier, reader, companion, signal)
dossier.proposals.push(result.proposal)
await writeFile(output, JSON.stringify(dossier, null, 2) + '\n', { flag: 'wx' })
await writeFile(`${output}.trace.json`, JSON.stringify({ stage, question: dossier.question, revision: dossier.revision,
  proposalId: result.proposal.id, trace: result.trace }, null, 2) + '\n', { flag: 'wx' })
process.stdout.write(`Pending ${stage} proposal saved to ${output}; human review is required.\n`)
