/** Isolated, public-URL-only network observations; Kaggle owns dispatch.
 * This diagnoses representation/route differences without changing a release,
 * bypassing TLS, injecting browser APIs, or suppressing a digest mismatch.
 */
import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns/promises';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { gunzipSync, inflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const secret = process.env.ORBIT_RELEASE_DIAGNOSTIC_TOKEN;
if (!secret || secret.length < 40) throw Error('MISSION_TOKEN_REQUIRED');
const port = 8003, output = '/home/user/release-network-results';
const origin = 'https://orbit.securedme.ca';
const paths = ['/formation/release.json', '/formation/plugins/orbit-learning-studio-1.0.0.tgz'];
const expectedRelease = '3e68cbb888a76c9dbb791922158082dcfe89ed30c90326707fd4003ce58df420';
const expectedPlugin = 'f2b0dc6897fae7b56e36836e4019eff06e098bf14d35668fa1df84ec6ff9e973';
const headerNames = new Set(['server','date','age','etag','last-modified','cache-control','expires','vary',
  'content-encoding','content-type','content-length','via','cf-cache-status','x-cache','x-cache-status',
  'x-litespeed-cache','x-litespeed-cache-control','x-served-by','x-proxy-cache','x-endurance-cache-level']);
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const safeHeaders = (headers: Record<string, unknown>) => Object.fromEntries(
  Object.entries(headers).filter(([name]) => headerNames.has(name.toLowerCase()))
    .map(([name, value]) => [name.toLowerCase(), String(value).slice(0, 1000)]));
const errorText = (error: unknown) => String(error instanceof Error ? error.message : error)
  .split(secret!).join('[REDACTED]').slice(0, 300);
let retired = false, busy = false;
let status: Record<string, any> = { state: 'idle', host: 'E2B', orchestrator: 'Kaggle',
  scope: 'Two fixed public Orbit resources; read-only network diagnostic.', expectedReleaseSha256: expectedRelease,
  expectedPluginSha256: expectedPlugin, expectedReleaseFiles: 358, observations: [], modelCalls: 0,
  diagnosticsExecuted: false, releaseValidated: false };
function describe(bytes: Buffer, path: string) {
  const sha256 = hash(bytes), result: Record<string, unknown> = { decodedBytes: bytes.length, decodedSha256: sha256,
    expectedSha256: path.endsWith('.json') ? expectedRelease : expectedPlugin,
    matchesExpectedSha256: sha256 === (path.endsWith('.json') ? expectedRelease : expectedPlugin) };
  if (path.endsWith('.json')) {
    try { const document = JSON.parse(bytes.toString('utf8')); result.releaseFiles = Object.keys(document.files ?? {}).length;
      result.manifestPluginSha256 = document.files?.['formation/plugins/orbit-learning-studio-1.0.0.tgz']; }
    catch { result.jsonParseFailed = true; }
  }
  return result;
}
async function nativeFetch(url: URL, path: string, headers: Record<string, string>) {
  const response = await fetch(url, { redirect: 'error', credentials: 'omit', cache: 'no-store',
    headers: { 'cache-control': 'no-cache', ...headers }, signal: AbortSignal.timeout(10_000) });
  const chunks: Buffer[] = []; let count = 0, maximum = path.endsWith('.json') ? 100_000 : 12_000_000;
  if (Number(response.headers.get('content-length')) > maximum) throw Error('RESPONSE_SIZE_BOUND');
  if (response.body) for await (const chunk of response.body as any) {
    count += chunk.length; if (count > maximum) throw Error('RESPONSE_SIZE_BOUND'); chunks.push(Buffer.from(chunk)); }
  return { status: response.status, headers: safeHeaders(Object.fromEntries(response.headers.entries())),
    bodyRepresentation: 'Native fetch automatically decoded response; headers retain server encoding.',
    ...describe(Buffer.concat(chunks), path) };
}
function nativeHttps(url: URL, path: string, family: 4 | 6): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const maximum = path.endsWith('.json') ? 100_000 : 12_000_000;
    const request = httpsRequest(url, { family, rejectUnauthorized: true,
      headers: { 'cache-control': 'no-cache', 'accept-encoding': 'identity', 'user-agent': 'Orbit-Release-Diagnostic/1.0' } }, response => {
      const socket = response.socket as import('node:tls').TLSSocket;
      const route = { remoteAddress: socket.remoteAddress, remoteFamily: socket.remoteFamily,
        tlsAuthorized: socket.authorized, tlsProtocol: socket.getProtocol() };
      const chunks: Buffer[] = []; let count = 0;
      response.on('data', chunk => { count += chunk.length;
        if (count > maximum) { response.destroy(Error('RESPONSE_SIZE_BOUND')); return; } chunks.push(Buffer.from(chunk)); });
      response.on('error', reject);
      response.on('end', () => {
        try { const raw = Buffer.concat(chunks), encoding = String(response.headers['content-encoding'] ?? 'identity');
          const decoded = encoding === 'gzip' ? gunzipSync(raw, { maxOutputLength: maximum })
            : encoding === 'deflate' ? inflateSync(raw, { maxOutputLength: maximum }) : raw;
          if (!['identity','gzip','deflate'].includes(encoding)) throw Error('UNSUPPORTED_CONTENT_ENCODING');
          resolve({ status: response.statusCode, headers: safeHeaders(response.headers), ...route,
            transferredBytes: raw.length, transferredSha256: hash(raw), ...describe(decoded, path) }); }
        catch (error) { reject(error); }
      });
    });
    request.setTimeout(10_000, () => request.destroy(Error('HTTPS_TIME_BOUND')));
    request.on('error', reject); request.end();
  });
}
async function run(runId: string) {
  const start = Date.now(), deadline = start + 125_000;
  const folder = join(output, runId); await mkdir(folder, { recursive: true });
  status = { ...status, state: 'running', runId, observations: [], startedAt: new Date().toISOString(),
    diagnosticsExecuted: true, errors: [] };
  try {
    status.dns = await Promise.race([lookup('orbit.securedme.ca', { all: true }),
      new Promise((_, reject) => setTimeout(() => reject(Error('DNS_TIME_BOUND')), 5000))]);
    const variants: Array<{ name: string; headers?: Record<string, string>; family?: 4 | 6 }> = [
      { name: 'node-fetch-default-encoding' },
      { name: 'node-fetch-identity', headers: { 'accept-encoding': 'identity' } },
      { name: 'node-fetch-identity-python-useragent', headers: { 'accept-encoding': 'identity', 'user-agent': 'Python-urllib/3.12' } },
      { name: 'node-https-identity-ipv4', family: 4 },
      { name: 'node-https-identity-ipv6', family: 6 },
    ];
    for (const path of paths) for (const variant of variants) {
      if (Date.now() >= deadline) throw Error('CAMPAIGN_TIME_BOUND');
      const url = new URL(path, origin); url.searchParams.set('orbit-release-diagnostic', runId);
      url.searchParams.set('variant', variant.name);
      const item: Record<string, unknown> = { observedAt: new Date().toISOString(), path, url: url.href, variant: variant.name };
      try { Object.assign(item, variant.family ? await nativeHttps(url, path, variant.family)
        : await nativeFetch(url, path, variant.headers ?? {})); }
      catch (error) { item.error = errorText(error); }
      status.observations.push(item);
      await writeFile(join(folder, 'status.json'), JSON.stringify(status, null, 2));
    }
    status.completed = true;
  } catch (error) { status.errors.push(errorText(error)); status.completed = false; }
  finally {
    status.state = 'complete'; status.durationMs = Date.now() - start; status.finishedAt = new Date().toISOString();
    status.releaseValidated = false; // A diagnostic matrix never overrides the real release assertions.
    await writeFile(join(folder, 'status.json'), JSON.stringify(status, null, 2));
    await writeFile(join(output, 'status.json'), JSON.stringify(status, null, 2)); busy = false;
  }
}
const server = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json'); response.setHeader('cache-control', 'no-store');
  const actual = Buffer.from(request.headers.authorization ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  if (retired || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    response.statusCode = 401; response.end('{"state":"UNAUTHORIZED"}'); return; }
  if (request.method === 'GET' && request.url === '/status') { response.end(JSON.stringify(status)); return; }
  if (request.method === 'POST' && request.url === '/retire') {
    if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
    retired = true; response.end('{"state":"RETIRED"}'); setTimeout(() => server.close(), 5000).unref(); return; }
  if (request.method !== 'POST' || request.url !== '/run') { response.statusCode = 404; response.end('{}'); return; }
  if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
  try {
    request.setTimeout(6000, () => request.destroy());
    let body = ''; for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 512) throw Error('INPUT_BOUND'); }
    const input = JSON.parse(body || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw Error('INVALID_INPUT');
    if (retired) { response.statusCode = 401; response.end('{"state":"UNAUTHORIZED"}'); return; }
    if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
    busy = true; const runId = `release-network-${randomUUID()}`;
    response.statusCode = 202; response.end(JSON.stringify({ state: 'ACCEPTED', runId, poll: '/status' }));
    void run(runId).catch(() => { busy = false; status.state = 'complete'; status.completed = false;
      status.errors = ['WORKER_STORAGE_FAILURE']; });
  } catch { response.statusCode = 400; response.end('{"state":"INVALID_INPUT"}'); }
});
server.headersTimeout = 10_000; server.requestTimeout = 10_000; server.listen(port, '0.0.0.0');
