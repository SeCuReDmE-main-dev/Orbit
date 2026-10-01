"""Package source and a Kaggle-only validation notebook. Does not execute tests."""
from pathlib import Path
import base64
import hashlib
import io
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.orbit/formation-20261001'
TESTS = ['learning-contract', 'learning-archive', 'learning-webmcp', 'learning-registry', 'learning-studio-publication', 'learning-studio-registry', 'learning-notebooks-bricks', 'classification', 'evidence-review', 'relation-engines', 'relation-regressions', 'webmcp', 'webmcp-classification', 'workshop', 'context-provenance']


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {}
    for folder in ['packages', 'web/src/lib', 'services/broker/src', 'tests']:
        for path in (ROOT / folder).rglob('*.ts'):
            if 'node_modules' not in path.parts:
                files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
    for folder in ['docs/learning/orbit-formation', 'packages/learning-studio']:
        for path in (ROOT / folder).rglob('*'):
            if path.is_file() and not any(part in ['node_modules', 'dist','__pycache__', 'publication'] for part in path.parts):files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
    for name in ['tests/learning-notebooks-test.py','tools/prepare_learning_notebooks.py','vitest.config.ts', 'tools/engine-jsonl.ts', 'tools/course-context-build-policy.mjs', 'tests/course-context-build-policy.test.mjs', 'tools/course-context-source-provenance.mjs', 'tests/course-context-source-provenance.test.mjs']:
        files[name] = (ROOT / name).read_bytes()
    files['package.json'] = json.dumps({'name': 'orbit-kaggle-validation', 'private': True, 'type': 'module',
        'dependencies': {'vitest': '4.0.8', 'tsx': '4.20.6', 'typescript': '5.9.3', 'three': '0.181.2', 'esbuild':'0.25.12'}}).encode()
    hashes = {name: hashlib.sha256(value).hexdigest() for name, value in sorted(files.items())}
    files['source-manifest.json'] = json.dumps(hashes, indent=2).encode()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 9, 30, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    payload = buffer.getvalue()
    digest = hashlib.sha256(payload).hexdigest()
    (OUT / 'validation-source.zip').write_bytes(payload)
    setup = '''import base64, hashlib, io, json, os, shutil, subprocess, tarfile, urllib.request, zipfile
from pathlib import Path
ROOT=Path('/kaggle/temp/orbit-validation'); ROOT.mkdir(parents=True,exist_ok=True)
NODE=shutil.which('node')
if not NODE:
    url='https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz'
    data=urllib.request.urlopen(url, timeout=60).read(64*1024*1024+1)
    if hashlib.sha256(data).hexdigest()!='00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc': raise RuntimeError('Node integrity failure')
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:xz') as archive:
        runtime=Path('/kaggle/temp/orbit-node'); runtime.mkdir(parents=True,exist_ok=True)
        # Vendor archive verified; refuse traversal and links outside this directory.
        archive.extractall(runtime, filter='data')
    bindir=runtime/'node-v22.20.0-linux-x64/bin'
    os.environ['PATH']=str(bindir)+':'+os.environ['PATH']; NODE=str(bindir/'node')
PAYLOAD=base64.b64decode(__PAYLOAD__)
if hashlib.sha256(PAYLOAD).hexdigest()!=__DIGEST__: raise RuntimeError('Source archive integrity failure')
with zipfile.ZipFile(io.BytesIO(PAYLOAD)) as archive:
    for name in archive.namelist():
        target=(ROOT/name).resolve()
        if not target.is_relative_to(ROOT.resolve()): raise RuntimeError('Unsafe source archive')
    archive.extractall(ROOT)
manifest=json.loads((ROOT/'source-manifest.json').read_text())
for name, expected in manifest.items():
    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=expected: raise RuntimeError('Source file integrity failure: '+name)
install=subprocess.run(['npm','install','--ignore-scripts','--no-audit','--no-fund'],cwd=ROOT,capture_output=True,text=True,timeout=600)
(ROOT/'dependency-install.log').write_text(install.stdout+install.stderr)
if install.returncode: raise RuntimeError('Dependencies failed; inspect dependency-install.log')
print(json.dumps({'host':'Kaggle','sourceSha256':__DIGEST__,'verifiedFiles':len(manifest),'node':subprocess.check_output([NODE,'--version'],text=True).strip()}))
'''.replace('__PAYLOAD__', repr(base64.b64encode(payload).decode())).replace('__DIGEST__', repr(digest))
    validation = '''TESTS=__TESTS__
command=['npx','vitest','run',*['tests/'+name+'.test.ts' for name in TESTS],'--reporter=json','--outputFile=software-results.json']
process=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=600)
(ROOT/'software-validation.log').write_text(process.stdout+process.stderr)
result=json.loads((ROOT/'software-results.json').read_text()) if (ROOT/'software-results.json').exists() else {}
status={'suite':'A','host':'Kaggle','exitCode':process.returncode,'sourceSha256':__DIGEST__,'tests':result.get('numTotalTests'),'passed':result.get('numPassedTests'),'failed':result.get('numFailedTests'),'success':result.get('success',False)}
(ROOT/'validation-status.json').write_text(json.dumps(status,indent=2))
print(json.dumps(status))
policy=subprocess.run(['node','--test','tests/course-context-build-policy.test.mjs','tests/course-context-source-provenance.test.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=60)
(ROOT/'course-build-policy.log').write_text(policy.stdout+policy.stderr)
shutil.copy2(ROOT/'course-build-policy.log',Path('/kaggle/working')/'course-build-policy.log')
print(json.dumps({'suite':'course-build-policy','host':'Kaggle','exitCode':policy.returncode}))
if policy.returncode:raise RuntimeError('Course build policy failed')
py=subprocess.run(['python','tests/learning-notebooks-test.py'],cwd=ROOT,capture_output=True,text=True,timeout=120)
(ROOT/'notebook-validation.log').write_text(py.stdout+py.stderr)
shutil.copy2(ROOT/'notebook-validation.log',Path('/kaggle/working')/'notebook-validation.log')
print(json.dumps({'suite':'notebook-software','host':'Kaggle','exitCode':py.returncode,'colabRuntimeVerified':False}))
if py.returncode:raise RuntimeError('Notebook source/export validation failed')
for name in ['software-results.json','validation-status.json','software-validation.log']:
    if (ROOT/name).exists(): shutil.copy2(ROOT/name,Path('/kaggle/working')/name)
if process.returncode: raise RuntimeError('Software validation failed; retained logs and JSON must be reviewed before deployment.')
bundle=subprocess.run(['npx','esbuild','tools/engine-jsonl.ts','--bundle','--platform=node','--format=esm','--outfile=engine.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=60)
if bundle.returncode: raise RuntimeError('Shared engine build failed.')
print('Shared engine built in Kaggle:', hashlib.sha256((ROOT/'engine.mjs').read_bytes()).hexdigest())
'''.replace('__TESTS__', repr(TESTS)).replace('__DIGEST__', repr(digest))
    cells = [
        {'cell_type': 'markdown', 'metadata': {}, 'source': ['# Orbit — cloud software validation\nSource integrity, formation contracts, registry, exports and software regressions and the shared TypeScript engine. No model calls. This notebook does not claim that the full benchmark campaign has run.']},
        *[{'cell_type':'code','metadata':{},'source':code.splitlines(True),'outputs':[],'execution_count':None} for code in [setup,validation]],
    ]
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':cells}
    (OUT/'orbit-formation-validation.ipynb').write_text(json.dumps(notebook),encoding='utf-8')
    (OUT/'validation-package.json').write_text(json.dumps({'state':'prepared-not-run','sourceSha256':digest,'files':len(hashes),'tests':TESTS},indent=2),encoding='utf-8')
    print(json.dumps({'state':'prepared-not-run','notebook':str(OUT/'orbit-formation-validation.ipynb'),'sourceSha256':digest,'files':len(hashes)}))


if __name__ == '__main__': main()
