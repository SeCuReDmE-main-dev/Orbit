"""Deterministic, public-only corpus import. Dry run by default; existing documents never overwritten."""
from pathlib import Path
import argparse, hashlib, json, math, re, urllib.request, urllib.error
ROOT=Path(__file__).resolve().parents[1]
PROJECT='pzscx4w8'; DATASET='production'
def build_documents():
    records=[]
    manifest=json.loads((ROOT/'fixtures/corpus/manifest.v1.json').read_text())
    for name in manifest['documents']:
        text=(ROOT/'fixtures/corpus'/name).read_text(encoding='utf-8-sig')
        _,head,body=text.split('---',2)
        meta=dict(line.split(': ',1) for line in head.strip().splitlines())
        title=re.search(r'^# (.+)$',body,re.M).group(1)
        key='orbit-source-'+meta['source_id'].lower()
        notes=body.strip().split('\n',1)[1].strip()
        records.append({'_id':key,'_type':'source','title':title,'url':meta['url'],'publisher':'NASA (source); Orbit Companion (summary)','observedAt':meta['accessed_at']+'T00:00:00Z','license':'Original project summary; linked source retains its terms. No NASA endorsement.','notes':notes})
        records.append({'_id':key.replace('source','concept',1),'_type':'concept','title':title,'summary':notes,'sources':[{'_key':'primary','_type':'reference','_ref':key}]})
    for key,value,unit,qualifier,statement in [
      ('mean-radius',6371000,'m','volumetric mean radius; spherical teaching Earth','The teaching model uses the volumetric mean Earth radius.'),
      ('equatorial-radius',6378137,'m','equatorial radius; do not substitute silently','Equatorial and mean radius are different definitions.'),
      ('gravitational-parameter',3.986e14,'m^3/s^2','rounded NASA Earth GM','Gravitational parameter used by this teaching model.'),
      ('circular-speed-400km',math.sqrt(3.986e14/6771000),'m/s','derived, circular two-body orbit, h=400000 m, mean radius','Derived circular speed at 400 km; not flight prediction.')]:
        records.append({'_id':'orbit-claim-'+key,'_type':'claim','statement':statement,'status':'inferred' if key.startswith('circular') else 'confirmed','value':value,'unit':unit,'qualifier':qualifier,'sources':[{'_key':'earth','_type':'reference','_ref':'orbit-source-nasa-earth'}]})
    records.append({'_id':'orbit-lesson-400km','_type':'lesson','title':'Which Earth radius at 400 km?','learningObjective':'Distinguish radius definitions, then compute and label a derived circular speed.','checkpointPrompt':'Why can 6371 km and 6378.137 km both be correct? Which radius did your calculation use?','concepts':[{'_key':'earth','_type':'reference','_ref':'orbit-concept-nasa-earth'}],'sources':[{'_key':'earth','_type':'reference','_ref':'orbit-source-nasa-earth'}]})
    return records

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--apply',action='store_true');args=ap.parse_args()
    docs=build_documents();payload=json.dumps({'mutations':[{'createIfNotExists':d} for d in docs]},ensure_ascii=False).encode()
    out=ROOT/'.orbit/sanity';out.mkdir(parents=True,exist_ok=True)
    (out/'public-corpus.json').write_text(json.dumps(docs,ensure_ascii=False,indent=2),encoding='utf-8')
    receipt={'project':PROJECT,'dataset':DATASET,'documents':len(docs),'sha256':hashlib.sha256(payload).hexdigest(),'mode':'prepared_offline'}
    if args.apply:
        vals={}
        for line in (ROOT/'.env').read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                k,v=line.split('=',1);vals[k.strip()]=v.strip().strip('\"\'')
        token=vals.get('SANITY_API_TOKEN','')
        if not token: raise SystemExit('BLOCKED_EXTERNAL: SANITY_API_TOKEN missing from Orbit .env')
        req=urllib.request.Request(f'https://{PROJECT}.api.sanity.io/v2025-02-19/data/mutate/{DATASET}?returnIds=true',data=payload,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=30) as response: result=json.load(response)
        except urllib.error.HTTPError as e: raise SystemExit(f'Sanity import rejected: HTTP {e.code}; no credential printed')
        receipt.update(mode='mutation_observed',transactionId=result.get('transactionId'),results=result.get('results'))
    (out/'import-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt))
if __name__=='__main__': main()
