import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { CodexConnection } from '../packages/providers/src/codex-connection'
const dirs: string[] = [], clients: CodexConnection[] = [];
function server(tool = 'orbit_get_capabilities', method = 'item/tool/call') {
  const cwd = mkdtempSync(join(tmpdir(), 'orbit-agent-')); dirs.push(cwd);
  writeFileSync(join(cwd, 'server.cjs'), `let b='';const send=m=>process.stdout.write(JSON.stringify(m)+'\\n');process.stdin.on('data',c=>{b+=c;let i;while((i=b.indexOf('\\n'))>=0){const m=JSON.parse(b.slice(0,i));b=b.slice(i+1);if(m.id===77){send({method:'item/agentMessage/delta',params:{threadId:'t',delta:JSON.stringify(m.result??m.error)}});send({method:'turn/completed',params:{threadId:'t',turn:{status:'completed'}}});continue;}if(!m.method||m.id===undefined)continue;if(m.method==='thread/start'){send({id:m.id,result:{thread:{id:'t'}}});continue;}if(m.method==='turn/start'){send({id:m.id,result:{turn:{id:'turn'}}});send({id:77,method:${JSON.stringify(method)},params:{threadId:'t',turnId:'turn',callId:'call',tool:${JSON.stringify(tool)},arguments:{}}});continue;}send({id:m.id,result:{}});}});`);
  const c = new CodexConnection(process.execPath, cwd, 2000, [], ((exe, _args, options) => spawn(exe, ['server.cjs'], options)) as typeof spawn); clients.push(c); return c;
}
afterEach(async () => { for (const c of clients) await c.close(); for (const d of dirs) rmSync(d, { recursive: true, force: true }); dirs.length = clients.length = 0; });
const spec = [{ name: 'orbit_get_capabilities', description: 'Capabilities', inputSchema: { type: 'object' } }];
describe('experimental dynamic-tool transport', () => {
  it('routes an allowed tool call to the adapter and returns observed data', async () => {
    const c = server(); await c.connect(); const events: any[] = [];
    const result = await c.runAgent('Discover the capabilities.', AbortSignal.timeout(5000), { model: 'exact-model', tools: spec, execute: async () => ({ state: 'READY' }), onCall: e => events.push(e) });
    expect(result.toolCalls).toBe(1); expect(events).toMatchObject([{ tool: spec[0].name, output: { state: 'READY' }, success: true }]);
    expect(result.text).toContain('inputText'); expect(result.tokenUsage).toBeNull();
  });
  it('refuses undeclared tools and server permission requests without invoking the adapter', async () => {
    for (const [name, method] of [['private_tool', 'item/tool/call'], ['orbit_get_capabilities', 'item/commandExecution/requestApproval']]) {
      const c = server(name, method); await c.connect(); let calls = 0;
      const result = await c.runAgent('Discover.', AbortSignal.timeout(5000), { model: 'exact-model', tools: spec, execute: async () => { calls++; return {}; } });
      expect(calls).toBe(0); expect(result.text).toMatch(/BOUNDARY|does not authorize/);
    }
  });
});
