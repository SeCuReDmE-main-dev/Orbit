"""Private Kaggle transport notebook. Ephemeral mission credential, never E2B key."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.orbit/cloud-lab/orbit-kaggle-20260930-v1'

def main():
    private=json.loads((OUT/'bridge-private.json').read_text())
    source='''import json, urllib.request, urllib.error, time
from pathlib import Path
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_REQUIRED')
URL=__URL__; TOKEN=__TOKEN__
def call(path):
    request=urllib.request.Request(URL+path,data=b'{}',headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=90) as response: return json.loads(response.read(1024*1024))
    except urllib.error.HTTPError as error:
        # Store only this bridge's bounded identifier, never credential headers.
        try: detail=json.loads(error.read(4096))
        except Exception: detail={'error':'TRANSPORT_HTTP_ERROR'}
        return {'httpStatus':error.code,**detail}
started=time.time()
try:
    result=call('/start')
    tools=result.get('tools',[])
    status={'host':'Kaggle','browserHost':'E2B','durationSeconds':time.time()-started,'native':result.get('native',False),'toolCount':len(tools),'passed':len(tools)==15 and result.get('api',{}).get('executeTool')=='function','observed':result,'modelCalls':0}
    Path('/kaggle/working/webmcp-native-preflight.json').write_text(json.dumps(status,indent=2))
    print(json.dumps(status))
    assert status['passed'], 'Native browser compatibility not established; no synthetic replacement permitted.'
finally:
    call('/stop')
    TOKEN=None
'''.replace('__URL__',repr(private['url'])).replace('__TOKEN__',repr(private['token']))
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':[
        {'cell_type':'markdown','metadata':{},'source':['# Orbit native WebMCP transport preflight\nPrivate, expiring credential limited to the isolated public Orbit mission. Do not publish this source. No model call, CDP endpoint or E2B account key is given to an agent.']},
        {'cell_type':'code','metadata':{},'source':source.splitlines(True),'outputs':[],'execution_count':None}]}
    (OUT/'orbit-browser-preflight.private.ipynb').write_text(json.dumps(notebook),encoding='utf-8')
    print(json.dumps({'state':'prepared-not-run','notebookName':'orbit-browser-preflight.private.ipynb'}))

if __name__=='__main__':main()
