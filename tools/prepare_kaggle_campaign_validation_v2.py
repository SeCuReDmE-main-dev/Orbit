"""Author a private, model-free Kaggle QA notebook without executing tests."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path

from prepare_kaggle_campaign_v2 import ROOT, OUT, ENTRY, setup_code, source_identity, mapping_digest


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--manifest',type=Path,default=ENTRY/'manifest-c.json')
    args=parser.parse_args()
    original=json.loads(args.manifest.read_text(encoding='utf-8'))
    engine,harness,rules=source_identity()
    if original['engineSourceSha256']!=mapping_digest(engine) or original['harnessSha256']!=mapping_digest(harness):
        raise RuntimeError('REFRESH_SOURCE_FINGERPRINTS_BEFORE_QA_PREPARATION')
    config=copy.deepcopy(original)
    # An isolated software-validation snapshot enables host/SDK/source gates.
    # It neither freezes the model campaign nor calls run_campaign/evaluate.
    config['frozen']=True
    config['state']='software-validation-only-no-model-calls'
    config['quotaChecked']=False
    sources=[setup_code(config,'C'),(ROOT/'tools/kaggle_engine_campaign.py').read_text(encoding='utf-8'),
             (ROOT/'tools/kaggle_campaign_validation_v2.py').read_text(encoding='utf-8'),
             'run_software_validation()\n']
    document={'nbformat':4,'nbformat_minor':5,
        'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
        'cells':[{'cell_type':'markdown','metadata':{},'source':[
            '# Orbit campaign v2 — private software validation\n',
            'No model calls. Tests run only in Kaggle. Real source text and reference answers are mounted privately, not embedded.\n',
            'B covers 60 questions and 180 observations: 36 synthetic references/108 scored decisions, plus 24 real questions/72 unscored context-preparation observations.\n']},
            *[{'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],
               'source':source.splitlines(True)} for source in sources]]}
    OUT.mkdir(parents=True,exist_ok=True)
    target=OUT/'orbit-campaign-v2-software-validation.ipynb'
    target.write_text(json.dumps(document,ensure_ascii=False),encoding='utf-8')
    receipt={'format':'orbit-campaign-v2-software-validation-preparation','state':'prepared-not-run',
        'notebook':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'corpusSha256':original['corpusSha256'],'harnessSha256':original['harnessSha256'],
        'validationSourceSha256':hashlib.sha256((ROOT/'tools/kaggle_campaign_validation_v2.py').read_bytes()).hexdigest(),
        'modelCallsExecuted':0,'softwareTestsExecuted':False,'embeddedGold':False,'embeddedCredentials':False}
    (ENTRY/'software-validation-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt))


if __name__=='__main__':main()
