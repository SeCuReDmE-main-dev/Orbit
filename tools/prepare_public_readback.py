"""Prepare a Kaggle-only, zero-model-call public release check."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / '.orbit/cloud-lab/orbit-kaggle-20260930-v1'

def main():
    release=json.loads((LAB/'release-package.json').read_text())
    release_id=Path(release['packagePath']).stem
    source='''import json, urllib.request
from pathlib import Path
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_REQUIRED')
observations=[]
for path in ['/','/app/','/studio/','/guide/','/benchmark/','/benchmark/cloud-campaign-status.json','/orbit-release.json','/api/v1/knowledge/outline']:
    with urllib.request.urlopen('https://orbit.securedme.ca'+path,timeout=30) as response:
        data=response.read(2*1024*1024)
        row={'path':path,'status':response.status,'bytes':len(data)}
        assert response.status==200
        if path=='/orbit-release.json':
            row['releaseId']=json.loads(data)['releaseId']
            assert row['releaseId']==__RELEASE__
        if path=='/benchmark/cloud-campaign-status.json':
            status=json.loads(data)
            assert status['status']=='partial-not-validated'
            assert len(status['suites'])==5
            assert status['credentials']['accountE2BKeyEmbedded'] is False
        if path=='/benchmark/':
            assert 'Campagne actuelle' in data.decode()
        observations.append(row)
result={'host':'Kaggle','modelCalls':0,'passed':True,'routes':observations,'releaseId':__RELEASE__}
Path('/kaggle/working/public-release-readback.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
'''.replace('__RELEASE__',repr(release_id))
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':[
        {'cell_type':'markdown','metadata':{},'source':['# Orbit — public release readback\nZero model calls. Runs only in Kaggle. Historical native browser preflight remains in version history. Its temporary access was replaced and retired; credential values are removed from this source. No E2B account key was embedded.']},
        {'cell_type':'code','metadata':{},'source':source.splitlines(True),'outputs':[],'execution_count':None}]}
    target=LAB/'orbit-public-readback.ipynb'; target.write_text(json.dumps(notebook))
    print(json.dumps({'state':'prepared-not-run','releaseId':release_id,'path':str(target)}))

if __name__=='__main__': main()
