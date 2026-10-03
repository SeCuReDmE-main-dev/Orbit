"""Prepare E-only native-boundary/parallel QA; execute exclusively in Kaggle."""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from prepare_kaggle_campaign_v2 import ENTRY, OUT, ROOT, setup_code, source_identity, mapping_digest


KAGGLE_BOOTSTRAP = """from pathlib import Path
import importlib.metadata, json, subprocess, sys
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
pins = {'kaggle-benchmarks': '0.6.1', 'protobuf': '5.29.6'}
loaded_protobuf = getattr(sys.modules.get('google.protobuf'), '__version__', None)
loaded_sdk = 'kaggle_benchmarks' in sys.modules
installed = {}
for package in pins:
    try: installed[package] = importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError: installed[package] = None
if installed != pins:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', '--upgrade',
                    'kaggle-benchmarks==0.6.1', 'protobuf==5.29.6'], check=True)
if ((loaded_protobuf is not None and loaded_protobuf != pins['protobuf'])
        or (loaded_sdk and installed['kaggle-benchmarks'] != pins['kaggle-benchmarks'])):
    raise RuntimeError('RESTART_KAGGLE_SESSION_REQUIRED: dependencies installed; restart and rerun before importing the SDK. No model dispatch occurred.')
for package, expected in pins.items():
    if importlib.metadata.version(package) != expected:
        raise RuntimeError('PINNED_BOOTSTRAP_DEPENDENCY_MISMATCH: ' + package)
import google.protobuf
if google.protobuf.__version__ != pins['protobuf']:
    raise RuntimeError('LOADED_PROTOBUF_VERSION_MISMATCH: restart the Kaggle session')
print(json.dumps({'host': 'Kaggle', 'sdk': importlib.metadata.version('kaggle-benchmarks'),
                 'protobuf': google.protobuf.__version__, 'modelCalls': 0,
                 'state': 'DEPENDENCY_BOOTSTRAP_ONLY'}))
"""


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--manifest',type=Path,required=True)
    parser.add_argument('--out',type=Path,default=OUT)
    parser.add_argument('--receipt-dir',type=Path,default=ENTRY)
    parser.add_argument('--name',default='orbit-e-nativebounds1-qualification')
    args=parser.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,95}',args.name):
        raise RuntimeError('BOUNDED_QUALIFICATION_NAME_REQUIRED')
    original=json.loads(args.manifest.read_text(encoding='utf-8'))
    engine,harness,rules=source_identity()
    if original['engineSourceSha256']!=mapping_digest(engine) or original['harnessSha256']!=mapping_digest(harness):
        raise RuntimeError('REFRESH_E_FINGERPRINTS_BEFORE_QA_PREPARATION')
    config=copy.deepcopy(original)
    config['frozen']=True;config['executableSuites']=['E']
    config['state']='E-native-boundary-software-validation-only-no-model-calls'
    config['quotaChecked']=False
    campaign=(ROOT/'tools/kaggle_webmcp_campaign.py').read_text(encoding='utf-8')
    preparation=(ROOT/'tools/prepare_final_e_20261003.py').read_text(encoding='utf-8')
    run="""from orbit_campaign_checkpoint import campaign_identity
if RUN_CONFIG['campaignId']=='orbit-kaggle-20261003-final-e1' and (
    len(POOL)!=8 or sorted(worker.get('sandboxId','') for worker in POOL)!=RUN_CONFIG['poolSandboxIds']):
    raise RuntimeError('EXACT_FRESH_OWNED_WORKER_SECRET_REQUIRED')
preparation=run_preparation_validation(PREPARATION_SOURCE,RUN_CONFIG)
parallel=run_parallel_validation(RUN_CONFIG)
boundary=run_boundary_validation(CAMPAIGN_SOURCE,POOL[0],RUN_CONFIG,bridge) if preparation['state']=='PASS' and parallel['state']=='PASS' else {'state':'NOT_RUN'}
preflight=[]
if preparation['state']=='PASS' and parallel['state']=='PASS' and boundary['state']=='PASS':
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
    'observedAtUnix':time.time(),
    'campaignId':RUN_CONFIG['campaignId'],'configurationSha256':campaign_identity(RUN_CONFIG),
    'workerGeneration':RUN_CONFIG.get('workerGeneration'),
    'poolSandboxIds':[worker['sandboxId'] for worker in POOL],
    'state':'PASS' if preparation['state']=='PASS' and parallel['state']=='PASS' and boundary['state']=='PASS' and len(preflight)==8 and all(row['passed'] for row in preflight) else 'FAIL',
    'preparation':preparation,'parallel':parallel,'boundary':boundary,'nativePool':preflight,
    'harnessSha256':RUN_CONFIG['harnessSha256'],'campaignSourceSha256':hashlib.sha256(CAMPAIGN_SOURCE.encode()).hexdigest(),
    'releaseManifestSha256':RUN_CONFIG['releaseManifestSha256'],'fullMissionComplete':False}
target=Path('/kaggle/working/orbit-e-nativebounds1-qualification.json')
target.write_text(json.dumps(public_observation(receipt),indent=2))
print(json.dumps(public_observation(receipt)))
if receipt['state']!='PASS':raise RuntimeError('E_NATIVE_BOUNDARIES_OR_PARALLEL_QUALIFICATION_FAILED')
"""
    sources=[KAGGLE_BOOTSTRAP,setup_code(config,'E'),campaign,
        (ROOT/'tools/kaggle_webmcp_boundary_validation.py').read_text(encoding='utf-8'),
        (ROOT/'tools/kaggle_webmcp_parallel_validation.py').read_text(encoding='utf-8'),
        (ROOT/'tools/kaggle_final_e_preparation_validation.py').read_text(encoding='utf-8'),
        'PREPARATION_SOURCE='+repr(preparation)+'\nCAMPAIGN_SOURCE='+repr(campaign)+'\n'+run]
    document={'nbformat':4,'nbformat_minor':5,
        'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
        'cells':[{'cell_type':'markdown','metadata':{},'source':['# E native boundary and SDK isolation qualification\nNo model calls. Native tools are read only from owned E2B profiles. No human approval is manufactured.']},
            *[{'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],'source':source.splitlines(True)} for source in sources]]}
    args.out.mkdir(exist_ok=True,parents=True);args.receipt_dir.mkdir(exist_ok=True,parents=True)
    target=args.out/(args.name+'.ipynb')
    receipt_path=args.receipt_dir/(args.name+'-preparation.json')
    if target.exists() or receipt_path.exists():
        raise RuntimeError('REFUSE_TO_OVERWRITE_QUALIFICATION_SOURCE_OR_RECEIPT')
    target.write_text(json.dumps(document,ensure_ascii=False),encoding='utf-8')
    receipt={'state':'prepared-not-run','notebook':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'harnessSha256':config['harnessSha256'],'modelCallsExecuted':0,'softwareTestsExecuted':False,
        'embeddedCredentials':False,'embeddedGold':False}
    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt))


if __name__=='__main__':main()
