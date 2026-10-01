"""Author a private Kaggle notebook; no tests or model calls run here."""
from pathlib import Path
import base64
import hashlib
import json
import zlib
import io
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.orbit/cloud-lab/orbit-kaggle-20260930-v1'


def main():
    validation = json.loads((OUT/'orbit-cloud-validation.ipynb').read_text())
    cells = validation['cells']
    cells[0]['source'] = ['# Orbit — engines and Gemini comparison\nPrivate campaign. Tests and model calls execute only in Kaggle. Real cases awaiting human annotation remain unscored. Equal engine decisions are legitimate.']
    for cell in cells[1:]:
        source = ''.join(cell['source']).replace('/kaggle/working/orbit-validation', '/kaggle/temp/orbit-validation').replace('/kaggle/working/orbit-node', '/kaggle/temp/orbit-node').replace('ROOT.mkdir(exist_ok=True)', 'ROOT.mkdir(parents=True, exist_ok=True)')
        cell['source'] = source.splitlines(True)
    # Suite A already has its own successful Kaggle notebook. Include only
    # the shared engine in this campaign to respect Kaggle's source-size cap.
    buffer=io.BytesIO(); files={}
    for path in (ROOT/'packages/evidence-review/src').glob('*.ts'):
        files[path.relative_to(ROOT).as_posix()]=path.read_bytes()
    files['tools/engine-jsonl.ts']=(ROOT/'tools/engine-jsonl.ts').read_bytes()
    files['package.json']=json.dumps({'name':'orbit-engine-campaign','private':True,'type':'module','dependencies':{'esbuild':'0.25.12'}}).encode()
    files['source-manifest.json']=json.dumps({name:hashlib.sha256(data).hexdigest() for name,data in files.items()}).encode()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in files.items(): archive.writestr(name,data)
    payload=buffer.getvalue(); digest=hashlib.sha256(payload).hexdigest()
    import re
    source=''.join(cells[1]['source'])
    source=re.sub(r"PAYLOAD=base64.b64decode\([^\n]+\)","PAYLOAD=base64.b64decode("+repr(base64.b64encode(payload).decode())+")",source)
    original_digest=json.loads((OUT/'validation-package.json').read_text())['sourceSha256']
    source=source.replace(original_digest,digest)
    cells[1]['source']=source.splitlines(True)
    cells[2]['source']=["bundle=subprocess.run(['npx','esbuild','tools/engine-jsonl.ts','--bundle','--platform=node','--format=esm','--outfile=engine.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=60)\nif bundle.returncode: raise RuntimeError('Shared engine build failed.')\nprint('Shared engine SHA256:',hashlib.sha256((ROOT/'engine.mjs').read_bytes()).hexdigest())\n"]
    inputs = {}
    for variable, name in [('PUBLIC','public-input.json'),('GOLD','private-gold.json'),('FIXTURES','deterministic-fixtures.json')]:
        inputs[variable] = (OUT/'corpus'/name).read_bytes()
    setup = "import zlib\nSOURCE_SHA256=hashlib.sha256(PAYLOAD).hexdigest()\n"
    for variable, data in inputs.items():
        setup += f"{variable}=json.loads(zlib.decompress(base64.b64decode({base64.b64encode(zlib.compress(data)).decode()!r})))\n"
    module = (ROOT/'tools/kaggle_engine_campaign.py').read_text()
    for source in [setup, module, 'run_campaign()\n']:
        cells.append({'cell_type':'code','metadata':{},'source':source.splitlines(True),'outputs':[],'execution_count':None})
    target = OUT/'orbit-engine-campaign.ipynb'
    target.write_text(json.dumps(validation),encoding='utf-8')
    (OUT/'campaign-package.json').write_text(json.dumps({'state':'prepared-not-run','notebookSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'nominalExtractions':60,'nominalComparativeProductions':240},indent=2))
    print(json.dumps({'state':'prepared-not-run','notebook':str(target)}))


if __name__ == '__main__': main()
