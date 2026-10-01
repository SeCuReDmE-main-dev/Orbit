"""Prepare E-only native-boundary/parallel QA; execute exclusively in Kaggle."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from prepare_kaggle_campaign_v2 import ENTRY, OUT, ROOT, setup_code, source_identity, mapping_digest


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--manifest',type=Path,required=True)
    args=parser.parse_args()
    original=json.loads(args.manifest.read_text(encoding='utf-8'))
    engine,harness,rules=source_identity()
    if original['engineSourceSha256']!=mapping_digest(engine) or original['harnessSha256']!=mapping_digest(harness):
        raise RuntimeError('REFRESH_E_FINGERPRINTS_BEFORE_QA_PREPARATION')
    config=copy.deepcopy(original)
    config['frozen']=True;config['executableSuites']=['E']
    config['state']='E-native-boundary-software-validation-only-no-model-calls'
    config['quotaChecked']=False
    campaign=(ROOT/'tools/kaggle_webmcp_campaign.py').read_text(encoding='utf-8')
    run="""parallel=run_parallel_validation(RUN_CONFIG)
boundary=run_boundary_validation(CAMPAIGN_SOURCE,POOL[0],RUN_CONFIG,bridge) if parallel['state']=='PASS' else {'state':'NOT_RUN'}
preflight=[]
if parallel['state']=='PASS' and boundary['state']=='PASS':
    for index,worker in enumerate(POOL):
        setup=bridge(worker,'/start',{'dossier':FIXTURES[0]['dossier'],'engine':'baseline','configuration':'baseline',
            'scenario':'preflight','read':True,'write':False,'expectedReleaseId':RUN_CONFIG['releaseId'],
            'expectedReleaseSha256':RUN_CONFIG['releaseManifestSha256']})
        observed=bridge(worker,'/call',{'name':'orbit_get_capabilities','arguments':{}})
        # Test a model credential against a controller-only route, without
        # exposing either credential in outputs or granting a role transition.
        denied=bridge({**worker,'controlToken':worker['token']},'/role',{'role':'coordination'})
        closed=bridge(worker,'/stop',{})
        passed=(setup.get('native') is True and setup.get('registeredToolCount')==15
            and setup.get('chromeMajor')==RUN_CONFIG['browserMajor']
            and setup.get('releaseSha256')==RUN_CONFIG['releaseManifestSha256']
            and observed.get('result',{}).get('state')=='READY'
            and denied.get('httpStatus')==401 and closed.get('state')=='closed')
        preflight.append({'worker':index,'passed':passed,
            'native':setup.get('native'),'registeredToolCount':setup.get('registeredToolCount'),
            'chromeMajor':setup.get('chromeMajor'),'releaseSha256':setup.get('releaseSha256'),
            'capabilitiesState':observed.get('result',{}).get('state'),
            'modelCredentialRoleChangeRefused':denied.get('httpStatus')==401,
            'profileStop':closed.get('state')})
receipt={'format':'orbit-e-nativebounds1-qualification','host':'Kaggle','modelCalls':0,
    'state':'PASS' if parallel['state']=='PASS' and boundary['state']=='PASS' and len(preflight)==8 and all(row['passed'] for row in preflight) else 'FAIL',
    'parallel':parallel,'boundary':boundary,'nativePool':preflight,
    'harnessSha256':RUN_CONFIG['harnessSha256'],'campaignSourceSha256':hashlib.sha256(CAMPAIGN_SOURCE.encode()).hexdigest(),
    'releaseManifestSha256':RUN_CONFIG['releaseManifestSha256'],'fullMissionComplete':False}
target=Path('/kaggle/working/orbit-e-nativebounds1-qualification.json')
target.write_text(json.dumps(public_observation(receipt),indent=2))
print(json.dumps(public_observation(receipt)))
if receipt['state']!='PASS':raise RuntimeError('E_NATIVE_BOUNDARIES_OR_PARALLEL_QUALIFICATION_FAILED')
"""
    sources=[setup_code(config,'E'),campaign,
        (ROOT/'tools/kaggle_webmcp_boundary_validation.py').read_text(encoding='utf-8'),
        (ROOT/'tools/kaggle_webmcp_parallel_validation.py').read_text(encoding='utf-8'),
        'CAMPAIGN_SOURCE='+repr(campaign)+'\n'+run]
    document={'nbformat':4,'nbformat_minor':5,
        'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
        'cells':[{'cell_type':'markdown','metadata':{},'source':['# E native boundary and SDK isolation qualification\nNo model calls. Native tools are read only from owned E2B profiles. No human approval is manufactured.']},
            *[{'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],'source':source.splitlines(True)} for source in sources]]}
    OUT.mkdir(exist_ok=True,parents=True)
    target=OUT/'orbit-e-nativebounds1-qualification.ipynb'
    target.write_text(json.dumps(document,ensure_ascii=False),encoding='utf-8')
    receipt={'state':'prepared-not-run','notebook':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'harnessSha256':config['harnessSha256'],'modelCallsExecuted':0,'softwareTestsExecuted':False,
        'embeddedCredentials':False,'embeddedGold':False}
    (ENTRY/'e-nativebounds1-qualification-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt))


if __name__=='__main__':main()
