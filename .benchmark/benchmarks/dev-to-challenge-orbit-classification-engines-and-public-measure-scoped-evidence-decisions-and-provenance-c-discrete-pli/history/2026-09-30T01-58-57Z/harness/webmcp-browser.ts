/** Headed Chrome with an isolated disposable profile. No polyfill or page callbacks. */
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { DynamicTool } from '../packages/providers/src/codex-connection.js'

const allowedOrigins = new Set(['https://orbit.securedme.ca', 'http://127.0.0.1:4321']);
type Pending = { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> };
export class BrowserRpc {
  private pending = new Map<number, Pending>(); private id = 0;
  private constructor(private ws: WebSocket) {
    ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)), pending = this.pending.get(message.id); if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(message.id);
      if (message.error) pending.reject(Error('CDP_REQUEST_FAILED')); else pending.resolve(message.result);
    });
    ws.addEventListener('close', () => { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(Error('BROWSER_CLOSED')); } this.pending.clear(); });
  }
  static async connect(url: string) {
    const parsed = new URL(url); if (parsed.protocol !== 'ws:' || !['127.0.0.1','localhost'].includes(parsed.hostname)) throw Error('Loopback debugging only.');
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => { ws.addEventListener('open', () => resolve(), { once: true }); ws.addEventListener('error', () => reject(Error('BROWSER_CONNECTION_FAILED')), { once: true }); });
    return new BrowserRpc(ws);
  }
  call(method: string, params: unknown = {}, sessionId?: string, timeout = 60000): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(Error('BROWSER_CALL_TIMEOUT')); }, timeout);
      this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  }
  close() { this.ws.close(); }
}
export class WebMcpBrowser {
  private constructor(readonly profile: string, readonly origin: string, private child: ChildProcess, private rpc: BrowserRpc, private session: string) {}
  private fingerprint?: string; private names = new Set<string>(); private chromeMajor = 0;
  static async launch(url: string, root = process.cwd()) {
    const parsed = new URL(url); if (!allowedOrigins.has(parsed.origin) || !['/', '/app/'].includes(parsed.pathname)) throw Error('Only Orbit landing or app is allowed.');
    const profile = resolve(root, '.orbit', `benchmark-browser-${Date.now()}`); await mkdir(profile, { recursive: true });
    const binary = join(process.env.PROGRAMFILES ?? 'C:/Program Files', 'Google/Chrome/Application/chrome.exe');
    const child = spawn(binary, [`--user-data-dir=${profile}`, '--remote-debugging-port=0', '--enable-blink-features=WebMCPTesting', '--no-first-run', '--no-default-browser-check', '--disable-sync', 'about:blank'], { windowsHide: true, stdio: 'ignore', shell: false });
    child.on('error', () => undefined);
    let port = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; if (/^\d+$/.test(port)) break; } catch {}
      if (child.exitCode !== null) throw Error('CHROME_START_FAILED');
      await new Promise(r => setTimeout(r, 100));
    }
    if (!port) { child.kill(); throw Error('CHROME_DEBUGGING_UNAVAILABLE'); }
    const info: any = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const rpc = await BrowserRpc.connect(info.webSocketDebuggerUrl);
    const target = await rpc.call('Target.createTarget', { url });
    const attached = await rpc.call('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const browser = new WebMcpBrowser(profile, parsed.origin, child, rpc, attached.sessionId);
    browser.chromeMajor = Number(info.Browser.match(/\/(\d+)/)?.[1]);
    for (let attempt=0;attempt<100;attempt++) {
      try { if (await browser.evaluate(`document.readyState === 'complete' && location.origin === ${JSON.stringify(parsed.origin)}`)) break; } catch {}
      await new Promise(r=>setTimeout(r,100));
    }
    return browser;
  }
  async evaluate(expression: string): Promise<any> {
    const value = await this.rpc.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, this.session);
    if (value.exceptionDetails) throw Error(value.exceptionDetails.exception?.description?.split('\n')[0] ?? 'PAGE_EVALUATION_FAILED');
    return value.result?.value;
  }
  async discover(): Promise<DynamicTool[]> {
    const metadata = await this.evaluate(`(async()=>{ if (!document.modelContext?.getTools || !document.modelContext?.executeTool) throw Error('NATIVE_WEBMCP_UNAVAILABLE'); const tools=await document.modelContext.getTools(); return {url:location.href,tools:tools.map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema,origin:t.origin}))}; })()`);
    const url = new URL(metadata.url); if (url.origin !== this.origin) throw Error('ORIGIN_CHANGED');
    this.fingerprint = `${url.origin}${url.pathname}${url.search}`;
    const tools = metadata.tools.filter((t: any) => /^orbit_[a-z_]+$/.test(t.name) && (!t.origin || t.origin === this.origin));
    this.names = new Set(tools.map((t: any) => t.name));
    if (this.names.size !== tools.length || tools.length > 15) throw Error('TOOL_REGISTRATION_INVALID');
    return tools.map((t: any) => ({ name: t.name, description: t.description, inputSchema: typeof t.inputSchema === 'string' ? JSON.parse(t.inputSchema) : t.inputSchema }));
  }
  async execute(name: string, input: unknown, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted || !this.names.has(name)) throw Error('TOOL_SESSION_BOUNDARY');
    const expected = this.fingerprint;
    const result = await this.evaluate(`(async()=>{
      if(location.origin+location.pathname+location.search!==${JSON.stringify(expected)}) throw Error('PAGE_GENERATION_CHANGED');
      const tools=await document.modelContext.getTools(); const tool=tools.find(t=>t.name===${JSON.stringify(name)} && (!t.origin||t.origin===location.origin));
      if(!tool) throw Error('TOOL_NOT_FOUND');
      const result=await document.modelContext.executeTool(tool,${this.chromeMajor >= 155 ? JSON.stringify(input) : JSON.stringify(JSON.stringify(input))});
      if(location.origin+location.pathname+location.search!==${JSON.stringify(expected)}) throw Error('PAGE_GENERATION_CHANGED');
      return result;
    })()`);
    if (signal.aborted) throw Error('SESSION_REVOKED');
    if (typeof result === 'string') { try { return JSON.parse(result); } catch {} }
    return result;
  }
  async diagnostic() {
    return { chromeMajor: this.chromeMajor, origin: this.origin, headed: true, isolatedProfile: true,
      api: await this.evaluate(`({registerTool:typeof document.modelContext?.registerTool,getTools:typeof document.modelContext?.getTools,executeTool:typeof document.modelContext?.executeTool})`),
      tools: await this.discover() };
  }
  async close() { try { await this.rpc.call('Browser.close', {}, undefined, 3000); } catch {} this.rpc.close(); this.child.kill(); }
}
