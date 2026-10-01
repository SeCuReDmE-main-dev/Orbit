import { writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { benchmarkConnection, budgetCheck, MODELS } from './benchmark-runtime.js'
const output = resolve(process.argv[2] ?? '.orbit/benchmark-preflight.json');
const client = benchmarkConnection();
try {
  await client.connect();
  const quota = await budgetCheck(client, false);
  const models = await Promise.all(MODELS.map(model => client.status(model)));
  const catalog = await client.request('model/list', { limit: 100 });
  const selected = (catalog.data ?? []).filter((m: any) => MODELS.includes(m.id)).map((m: any) => ({ id: m.id, supportedReasoningEfforts: m.supportedReasoningEfforts }));
  const result = { observedAt: new Date().toISOString(), protocol: 'codex-cli-0.149.1', quota, models: models.map(m => ({ model: m.requestedModel, available: m.modelAvailable, accountType: m.accountType })), settings: selected };
  await mkdir(resolve(output, '..'), { recursive: true }); await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await client.close(); }
