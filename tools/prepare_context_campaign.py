"""Author a private native Kaggle task notebook; generation executes no tests."""
from pathlib import Path
import base64
import hashlib
import json
import zlib

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / '.orbit/cloud-lab/orbit-kaggle-20260930-v1'

def main():
    payload = (LAB / 'corpus/public-input.json').read_bytes()
    encoded = base64.b64encode(zlib.compress(payload)).decode()
    source = "import base64, hashlib, json, zlib\nfrom pathlib import Path\nif not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_REQUIRED')\n"
    source += 'payload=zlib.decompress(base64.b64decode('+repr(encoded)+'))\n'
    source += 'assert hashlib.sha256(payload).hexdigest()=='+repr(hashlib.sha256(payload).hexdigest())+'\nPUBLIC=json.loads(payload)\n'
    source += (ROOT / 'tools/kaggle_context_campaign.py').read_text()+'\nrun_context_campaign()\n'
    notebook = {'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':[
      {'cell_type':'markdown','metadata':{},'source':['# Orbit — live Sanity Context comparison\nSuite D: 24 paired trajectories on Kaggle. Human audit and corpus parity remain pending; no claim of superiority.']},
      {'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],'source':source.splitlines(True)}]}
    path = LAB / 'orbit-context-campaign.ipynb'
    path.write_text(json.dumps(notebook))
    print(json.dumps({'state':'prepared-not-run','bytes':path.stat().st_size,'planned':24,'sourceSha256':hashlib.sha256(source.encode()).hexdigest()}))

if __name__ == '__main__': main()
