import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseDossier } from '../packages/evidence-review/src/index.js'
import { localCodex } from '../services/broker/src/companion.js'
import { runKeywordBaseline } from './context-baseline.js'
import type { ContextReader, ContextReply } from './context-agent.js'

const [inputPath, outputPath] = process.argv.slice(2)
if (!inputPath || !outputPath) throw Error('Usage: npx tsx tools/run-context-baseline.ts <dossier-with-pending-plan.json> <new-output.json>')
const input = resolve(inputPath)
const output = resolve(outputPath)
if (input === output) throw Error('Output must be a new file; the original dossier is preserved.')
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
const dossier = parseDossier(JSON.parse(await readFile(input, 'utf8')))
const companion = localCodex(process.cwd())
const account = await companion.status()
if (!account.connected) throw Error(account.reason ?? 'Official Codex account unavailable.')
const result = await runKeywordBaseline(dossier, reader, companion, AbortSignal.timeout(120_000))
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
process.stdout.write(`Keyword baseline candidate saved to ${output}; human comparison is required.\n`)
