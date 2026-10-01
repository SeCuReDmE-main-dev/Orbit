import { describe, it, expect, vi } from 'vitest'
import { startBroker } from '../services/broker/src/server.js'
describe('companion mission boundary', () => {
 it('requires consent, sends bounded selected context, and checkpoints the answer', async () => {
  const run = vi.fn(async () => ({ text: 'Lower orbits require greater circular speed.', model: 'gpt-5.6-luna' }))
  const server = await startBroker({ port: 0, databasePath: ':memory:', writeToken: 'fixture', companion: { status: async () => ({ provider: 'codex', model: 'gpt-5.6-luna', connected: true }), run } })
  const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`
  const post = (path:string,body:unknown) => fetch(base+path,{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify(body)})
  try {
   await post('/missions',{id:'mission_companion',title:'Explain orbital speed'})
   await post('/missions/mission_companion/checkpoints',{label:'before',snapshot:{question:'Explain orbital speed',rawHistory:'PRIVATE HISTORY MUST NOT TRANSFER',sources:[{title:'NASA',uri:'https://nasa.gov/example'}]}})
   expect((await post('/missions/mission_companion/companion',{question:'Why?'})).status).toBe(400)
   expect(run).not.toHaveBeenCalled()
   const response=await post('/missions/mission_companion/companion',{question:'Why?',consent:true})
   expect(response.status).toBe(200)
   expect(await response.json()).toMatchObject({model:'gpt-5.6-luna',transferred:{sources:1,rawHistory:false}})
   expect(JSON.stringify(run.mock.calls)).not.toContain('PRIVATE HISTORY')
   const saved=await (await fetch(base+'/missions/mission_companion',{headers:{authorization:'Bearer fixture'}})).json()
   expect(saved.snapshot.companionResponse).toBe('Lower orbits require greater circular speed.')
   expect((await fetch(base+'/companion/status')).status).toBe(400)
  } finally { server.closeAllConnections(); await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())) }
 })
})
