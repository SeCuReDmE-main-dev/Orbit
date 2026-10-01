import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { CodexConnection } from '../packages/providers/src/codex-connection.js'
const dirs: string[] = []; const clients: CodexConnection[] = []
function fake(extra = '') {
 const cwd = mkdtempSync(join(tmpdir(), 'orbit-codex-')); dirs.push(cwd)
 writeFileSync(join(cwd, 'app-server'), `let buffer=''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c => { buffer+=c; let i; while((i=buffer.indexOf('\\n'))>=0) { const m=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);if(m.id===undefined)continue;${extra} let result={};if(m.method==='account/read')result={account:{type:'chatgpt',email:'private-not-returned@example.invalid'}};if(m.method==='model/list')result={data:[{id:'gpt-5.6-luna'}],nextCursor:null};process.stdout.write(JSON.stringify({id:m.id,result})+'\\n'); }});`)
 const client=new CodexConnection(process.execPath,cwd,1000,[], ((exe, _args, options) => spawn(exe, ['app-server'], options)) as typeof spawn);clients.push(client);return client
}
afterEach(async()=>{for(const c of clients)await c.close(); for(const d of dirs)rmSync(d,{recursive:true,force:true});dirs.length=0;clients.length=0})
describe('official Codex transport boundary',()=>{
 it('discovers exact model without exposing account personal fields',async()=>{const c=fake();await c.connect();const result=await c.status();expect(result.modelAvailable).toBe(true);expect(JSON.stringify(result)).not.toContain('private-not-returned');expect((await c.status('missing-model')).modelAvailable).toBe(false)})
 it('rejects RPC outside its allowlist',async()=>{const c=fake();await c.connect();await expect(c.request('command/exec',{})).rejects.toThrow('outside')})
 it('bounds a stalled request',async()=>{const c=fake("if(m.method==='model/list')continue;");await c.connect();await expect(c.status()).rejects.toMatchObject({code:'TIMEOUT'})})
 it('rejects pending requests on close',async()=>{const c=fake("if(m.method==='model/list')continue;");await c.connect();const p=c.request('model/list');const assertion=expect(p).rejects.toMatchObject({code:'CANCELED'});await c.close();await assertion})
 it('requires explicit paths',()=>{expect(()=>new CodexConnection('codex','relative')).toThrow('absolute')})
})
