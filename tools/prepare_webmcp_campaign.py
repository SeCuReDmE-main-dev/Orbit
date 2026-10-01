"""Private transport task generation. No account credentials; never publish source."""
from pathlib import Path
import base64,json,zlib,hashlib
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'.orbit/cloud-lab/orbit-kaggle-20260930-v1'

def main():
    source="import base64,json,zlib\nfrom pathlib import Path\nif not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_REQUIRED')\n"
    for variable,path in [('POOL',LAB/'browser-pool.private.json'),('FIXTURES',LAB/'corpus/deterministic-fixtures.json')]:
        data=path.read_bytes(); source+=variable+'=json.loads(zlib.decompress(base64.b64decode('+repr(base64.b64encode(zlib.compress(data)).decode())+')))\n'
    source+=(ROOT/'tools/kaggle_webmcp_campaign.py').read_text()+'\nrun_webmcp_campaign()\n'
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':[
        {'cell_type':'markdown','metadata':{},'source':['# Orbit — native WebMCP missions\nPrivate transport notebook. Mission credentials expire within 24 hours. Never publish this notebook source. Native execution in E2B, models and assertions in Kaggle.']},
        {'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],'source':source.splitlines(True)}]}
    target=LAB/'orbit-webmcp-campaign.private.ipynb'; target.write_text(json.dumps(notebook))
    print(json.dumps({'state':'prepared-not-run','planned':144,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))

if __name__=='__main__': main()
