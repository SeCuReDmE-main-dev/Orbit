import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CodexConnection } from '../packages/providers/src/codex-connection.js'

export const MODELS = ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'] as const
export function benchmarkConnection(root = process.cwd()) {
  const binary = join(process.env.APPDATA ?? '', 'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe');
  const config = join(process.env.USERPROFILE ?? '', '.codex/config.toml');
  if (!existsSync(binary) || !existsSync(config)) throw Error('Official installed Codex and its configuration are required.');
  const raw = readFileSync(config, 'utf8');
  const matches = [...raw.matchAll(/^\[mcp_servers\.([A-Za-z0-9_-]+)(?:\.[^\]\r\n]+)?\]/gm)];
  if ((raw.match(/^\[mcp_servers\./gm) ?? []).length !== matches.length) throw Error('Unrecognized MCP configuration; no inherited tools allowed.');
  const cwd = resolve(root, '.orbit/benchmark-agent-sandbox'); mkdirSync(cwd, { recursive: true });
  return new CodexConnection(resolve(binary), cwd, 20000, [...new Set(matches.map(m => m[1]))]);
}
export function consumedPercent(rateLimits: any): number | undefined {
  const values = Object.values(rateLimits?.rateLimitsByLimitId ?? {}).flatMap((entry: any) => [entry.primary?.usedPercent, entry.secondary?.usedPercent]).filter((n): n is number => typeof n === 'number');
  if (!values.length) for (const window of [rateLimits?.rateLimits?.primary, rateLimits?.rateLimits?.secondary]) if (typeof window?.usedPercent === 'number') values.push(window.usedPercent);
  return values.length ? Math.max(...values) : undefined;
}
export async function budgetCheck(client: CodexConnection, longLot = true) {
  const limits = await client.request('account/rateLimits/read'); const percent = consumedPercent(limits);
  if (percent === undefined) throw Error('Quota unavailable: do not start an unbounded campaign.');
  if (percent >= (longLot ? 85 : 89)) throw Error(`QUOTA_STOP: ${percent}% used.`);
  return { usedPercent: percent, stopAt: 89, noNewLongLotAt: 85 };
}
