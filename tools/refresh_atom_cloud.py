"""Refresh owned preview artifacts; does not execute assertions."""
import json
from pathlib import Path
from e2b import Sandbox
from orbit_cloud_lab import ROOT,DIRECTORY,CAMPAIGN,credentials
key=credentials(Path(r'Z:\SecuredMe Education suite\.env'))
active=Sandbox.list(limit=100,api_key=key).next_items()
control=next(s for s in active if s.metadata.get('campaign')==CAMPAIGN and s.metadata.get('role')=='control')
builder=Sandbox.connect(control.sandbox_id,api_key=key)
for name in ['web/src/pages/app/index.astro','studio/components/OrbitToolMenu.tsx','web/src/layouts/OrbitLayout.astro','packages/ui-preferences/src/index.ts','web/src/components/OrbitMark.astro','web/src/lib/atom-playground.ts','web/src/lib/atom-scene.ts','tools/atom-cloud-check.ts','web/src/lib/landing.ts','web/src/lib/landing-journey.ts','web/src/lib/atom-deformation.ts','web/src/lib/landing-preferences.ts','web/src/styles/atom-games.css','web/src/components/LandingExperience.astro','web/public/brand/securedme-publication-lab-primary-dark.png']:
    builder.files.write('/home/user/orbit/'+name,(ROOT/name).read_bytes())
for command in ['npm run build -w web','npm run build -w studio','npx esbuild tools/atom-cloud-check.ts --bundle --platform=node --format=esm --outfile=/home/user/atom-check.mjs','tar -czf /home/user/atom-web.tar.gz -C /home/user/orbit/web dist']:
    result=builder.commands.run(command,cwd='/home/user/orbit',timeout=120)
    if result.exit_code: raise RuntimeError('Cloud construction failed')
private=json.loads((ROOT/'.orbit/atom-live-20260930/worker-private.json').read_text())
worker=Sandbox.connect(private['sandboxId'],api_key=key)
for name in ['atom-check.mjs','atom-web.tar.gz']:worker.files.write('/home/user/'+name,bytes(builder.files.read('/home/user/'+name,format='bytes')))
worker.commands.run('tar -xzf /home/user/atom-web.tar.gz -C /home/user/atom-stage',timeout=60)
if not any('http.server 4321' in ' '.join(p.args) for p in worker.commands.list()):
    worker.commands.run('python -m http.server 4321 --bind 127.0.0.1 --directory /home/user/atom-stage/dist',background=True,timeout=3600)
for p in worker.commands.list():
    if p.args==['-l','-c','node /home/user/atom-check.mjs']:worker.commands.kill(p.pid)
worker.commands.run('node /home/user/atom-check.mjs',envs={'ORBIT_ATOM_CHECK_TOKEN':private['token']},background=True,timeout=3600)
print(json.dumps({'state':'preview-refreshed','host':'E2B','testsExecuted':False}))
