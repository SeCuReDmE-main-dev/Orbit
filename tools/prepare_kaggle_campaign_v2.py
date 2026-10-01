"""Prepare credential-free Kaggle runners; preparation invokes no models/tests.

Corpus and references are mounted as private Kaggle datasets. Worker access is
read by the Kaggle Secrets client at execution, never embedded in a notebook.
"""
from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / '.benchmark/benchmarks/dev-to-challenge-orbit-classification-engines-and-public-measure-scoped-evidence-decisions-and-provenance-c-discrete-pli/current/campaign-v2'
OUT = ROOT / '.orbit/cloud-lab/orbit-kaggle-20261001-v2'
MODELS = ['google/gemini-3.8-flash', 'google/gemini-3.1-pro-preview']
HARNESSES = ['tools/orbit_campaign_checkpoint.py', 'tools/kaggle_engine_campaign.py',
             'tools/kaggle_context_campaign.py', 'tools/kaggle_webmcp_campaign.py',
             'tools/e2b-webmcp-bridge.ts', 'tools/webmcp-browser.ts',
             'tools/prepare_scoped_corpus_v2.py','tools/prepare_kaggle_campaign_v2.py']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def mapping_digest(records):
    return sha(json.dumps(records, sort_keys=True, ensure_ascii=False).encode())


def source_identity():
    engine = {path.relative_to(ROOT).as_posix(): sha(path.read_bytes())
              for path in sorted((ROOT/'packages/evidence-review/src').glob('*.ts'))}
    engine['tools/engine-jsonl.ts'] = sha((ROOT/'tools/engine-jsonl.ts').read_bytes())
    harness = {name: sha((ROOT/name).read_bytes()) for name in HARNESSES}
    rules = {name: engine[name] for name in ['packages/evidence-review/src/classification.ts',
                                            'packages/evidence-review/src/relations.ts']}
    return engine, harness, rules


def initial_manifest():
    engine, harness, rules = source_identity()
    corpus = OUT/'corpus'
    if not (corpus/'public-input.json').exists():
        raise RuntimeError('Prepare the scoped v2 corpus with prepare_scoped_corpus_v2.py first.')
    return {
        'format':'orbit-kaggle-campaign-v2', 'campaignId':'orbit-kaggle-20261001-v2',
        'state':'preflight-observed-not-frozen', 'frozen':False, 'models':MODELS, 'sdkVersion':'0.6.1',
        'repositoryHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'corpusSha256':sha((corpus/'public-input.json').read_bytes()),
        'goldSha256':sha((corpus/'private-gold.json').read_bytes()),
        'fixturesSha256':sha((corpus/'deterministic-fixtures.json').read_bytes()),
        'corpusSelectionSha256':sha((corpus/'selection-manifest.json').read_bytes()),
        'originalAccessSha256':sha((corpus/'private-original-access.json').read_bytes()),
        'corpusFilesSha256':sha((corpus/'corpus-files.json').read_bytes()),
        'corpusViewPolicy':{'maxDocumentCharacters':12000,'maxPacketCharacters':144000,
            'selection':'question-windows-inspected-prose-introduction',
            'sourceText':'frozen-snapshot-only','humanSemanticReview':'pending'},
        'engineSourceSha256':mapping_digest(engine),'harnessSha256':mapping_digest(harness),
        'rulesSha256':mapping_digest(rules),'sourceFiles':{'engine':engine,'harness':harness},
        'releaseId':None,'releaseManifestSha256':None,'browserMajor':None,
        'reasoningSetting':'medium','maxOutputTokens':4096,'maxSdkToolRounds':22,
        'maxNativeCalls':20,'maxDurationSeconds':480,'maxHoldRequests':2,
        'maxTransientAttempts':2,'maxWorkers':8,'quotaChecked':False,'modelsChecked':True,
        'quotaPolicy':{'newLongLotsStopConsumedPercent':85,'hardStopConsumedPercent':89,
                       'paidTopupAllowed':False,'automaticModelReplacement':False,
                       'maxSnapshotAgeSeconds':3600,'unknownResetPolicy':'preserve-null-refresh-observation-api-refusal-stops',
                       'unknownPricingStrategy':'serial-provider-free-quota'},
        'preflightObservation':{'observedAt':'2026-10-01T17:53:00Z','timestampPrecision':'minute',
            'source':'Kaggle Benchmark Task observed by coordinator','sdkVersion':'0.6.1',
            'modelsAvailable':MODELS,'modelCalls':0,
            'nativeToolAgentParameters':['llm','tools','schema','max_tool_rounds','respond_kwargs'],
            'quotaResetTimes':'unavailable','lotCostReserve':'not-yet-established'},
        'quotaSnapshot':[{'name':name,'limitNanodollars':limit,'usedNanodollars':used,
            'observedAtUnix':int(datetime.fromisoformat('2026-10-01T17:53:00+00:00').timestamp()),
            'resetsAtUnix':None} for name,limit,used in
            [('daily',10000000000,0),('monthly',100000000000,9760000000)]],
        'maxLotReserveNanodollars':None,
        'lotReserveScope':'one-model-prompt-C-or-one-agent-trajectory-D-E',
        'pricingObservation':None,
        'targets':{'C':{'extractions':60,'comparativeProductions':240},'D':{'trajectories':24},'E':{'trajectories':144}},
        'inputCorpusDir':'/kaggle/input/orbit-kaggle-v2-private-inputs',
        'inputReferenceDir':'/kaggle/input/orbit-kaggle-v2-private-inputs',
        'workerSecretName':'ORBIT_WORKER_POOL_JSON','resumeDatasetDir':None,'resumeArchives':{},
        'contextCases':{case:{'packet':packet,'paths':[],'responseDigests':{},'parityReviewed':False}
                        for case,packet in [('provider',7),('sanity',8)]},
        'referenceStatus':{'syntheticQuestions':36,'humanReviewedRealQuestions':0,'realQuestionsPendingHuman':24},
        'publicRelease':False,'modelCallsExecuted':0,'softwareTestsExecuted':False,
        'limits':['Historical v1 is preserved and not pooled with v2.',
                  'Real sources and labels remain subject to independent review.',
                  'Private datasets are not a license to redistribute their text.'],
    }


def corpus_inventory():
    documents=json.loads((ROOT/'.orbit/benchmark-corpus-real-v1/documents.json').read_text(encoding='utf-8'))
    public=json.loads((OUT/'corpus/public-input.json').read_text(encoding='utf-8'))
    snapshots={record['id']:record for record in public['documents'] if not record.get('synthetic')}
    audit_path=OUT/'corpus-review/audit.json'
    audit=json.loads(audit_path.read_text(encoding='utf-8')) if audit_path.exists() else {'records':[]}
    inspected={record['id']:record for record in audit['records']}
    records=[]
    for source in documents:
        snapshot=snapshots[source['id']]
        records.append({name:source.get(name) for name in
            ['id','packet','title','url','primaryRole','contentHash','retrievedAt','contentAccess',
             'licenseObserved','redistribution','admissionStatus']})
        records[-1].update({'benchmarkTextTruncated':snapshot.get('textTruncated',False),
            'benchmarkSnapshotSha256':snapshot.get('benchmarkSnapshotSha256'),
            'scopedViewCharacters':len(snapshot['text']),
            'scopedViewSha256':sha(snapshot['text'].encode()),
            'scopedViewSelectionMethod':snapshot.get('textSelectionMethod'),
            'scopedViewOriginalFingerprint':snapshot.get('originalSnapshotSha256'),
            'scopedViewExcerptMap':snapshot.get('excerptMap',[]),
            'selectedPassages':[],'passageReview':'pending-independent-review',
            'licenseReview':'pending','fullTextDistributed':False})
        if source['id'] in inspected:
            records[-1].update({name:value for name,value in inspected[source['id']].items() if name!='id'})
            records[-1]['historicalPrefixInputTruncated']=inspected[source['id']].get('benchmarkTextTruncated')
            records[-1]['benchmarkTextTruncated']=snapshot.get('textTruncated',False)
    return {'format':'orbit-real-source-review-inventory-v2','sources':len(records),
            'humanReviewedReferences':0,'fullTextDistributed':False,'records':records}


def validate_frozen(config, suite):
    if not config.get('frozen') or not config.get('modelsChecked') or not config.get('quotaChecked'):
        raise RuntimeError('Explicit frozen model/quota preflight is required before a runner is executable.')
    if not config.get('sdkVersion') or config.get('models')!=MODELS:
        raise RuntimeError('Pinned SDK and both original model identifiers are required.')
    reserve=config.get('maxLotReserveNanodollars')
    if not config.get('quotaSnapshot'):
        raise RuntimeError('Current free quota windows are required.')
    if reserve is None:
        if config.get('quotaPolicy',{}).get('unknownPricingStrategy')!='serial-provider-free-quota':
            raise RuntimeError('Unknown pricing needs an explicit serial free-provider quota policy.')
    elif not isinstance(reserve,int) or isinstance(reserve,bool) or reserve<=0:
        raise RuntimeError('A declared numeric reserve must be a positive conservative bound.')
    if not 60<=config.get('quotaPolicy',{}).get('maxSnapshotAgeSeconds',0)<=3600:
        raise RuntimeError('An explicit quota observation lifetime is required; it is not a reset-time estimate.')
    if suite=='E' and (not config.get('releaseId') or not config.get('releaseManifestSha256') or not config.get('browserMajor')):
        raise RuntimeError('Frozen public release and native browser preflight are required.')
    if suite=='D':
        for case in ('provider','sanity'):
            row=config['contextCases'][case]
            if not row.get('parityReviewed') or not row.get('paths') or '' not in row.get('responseDigests',{}):
                raise RuntimeError('Context parity, exact entry paths and outline digest are required for both cases.')
            if any(path not in row['responseDigests'] for path in row['paths']):
                raise RuntimeError('Every allowed Context entry needs a frozen content digest.')


def source_archive():
    buffer=io.BytesIO()
    files={path.relative_to(ROOT).as_posix():path.read_bytes()
           for path in sorted((ROOT/'packages/evidence-review/src').glob('*.ts'))}
    for name in ['tools/engine-jsonl.ts','tools/orbit_campaign_checkpoint.py']:
        files[name]=(ROOT/name).read_bytes()
    files['package.json']=json.dumps({'name':'orbit-campaign-v2','private':True,'type':'module',
        'dependencies':{'esbuild':'0.25.12'}}).encode()
    files['source-manifest.json']=json.dumps({name:sha(data) for name,data in files.items()},sort_keys=True).encode()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,10,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,data)
    return buffer.getvalue()


def private_input_archive(config):
    """Author a private UI-upload input package; no corpus/answers go in source."""
    original=OUT/'corpus'
    target=OUT/'orbit-kaggle-v2-private-inputs.zip'
    mapping={'public-input.json':'corpusSha256','private-gold.json':'goldSha256',
             'deterministic-fixtures.json':'fixturesSha256','selection-manifest.json':'corpusSelectionSha256',
             'private-original-access.json':'originalAccessSha256','corpus-files.json':'corpusFilesSha256'}
    files=json.loads((original/'corpus-files.json').read_text(encoding='utf-8'))
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(set(files)|set(mapping)):
            data=(original/name).read_bytes()
            expected=config[mapping[name]] if name in mapping else files[name]
            if sha(data)!=expected: raise RuntimeError('PRIVATE_INPUT_PACKAGE_FINGERPRINT_MISMATCH')
            if name in files and sha(data)!=files[name]: raise RuntimeError('PRIVATE_CORPUS_FILE_FINGERPRINT_MISMATCH')
            info=zipfile.ZipInfo(name,date_time=(2026,10,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,data)
    return {'file':target.name,'sha256':sha(target.read_bytes()),'fileCount':len(set(files)|set(mapping)),
            'files':list(mapping),'privateOriginals':48,
            'visibilityRequired':'private','answerKeyIncluded':True,'credentialsIncluded':False,
            'sourceTextRights':'not-cleared-for-public-redistribution'}


def setup_code(config, suite):
    payload=source_archive()
    code="""import base64, hashlib, io, json, os, shutil, subprocess, sys, tarfile, urllib.request, zipfile
from pathlib import Path
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
ROOT=Path('/kaggle/temp/orbit-campaign-v2'); ROOT.mkdir(parents=True,exist_ok=True)
PAYLOAD=base64.b64decode(__PAYLOAD__)
if hashlib.sha256(PAYLOAD).hexdigest()!=__DIGEST__: raise RuntimeError('SOURCE_ARCHIVE_MISMATCH')
with zipfile.ZipFile(io.BytesIO(PAYLOAD)) as archive:
    if any(not (ROOT/name).resolve().is_relative_to(ROOT.resolve()) for name in archive.namelist()): raise RuntimeError('UNSAFE_SOURCE_ARCHIVE')
    archive.extractall(ROOT)
for name,expected in json.loads((ROOT/'source-manifest.json').read_text()).items():
    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=expected: raise RuntimeError('SOURCE_FILE_MISMATCH')
sys.path.insert(0,str(ROOT/'tools'))
from orbit_campaign_checkpoint import load_verified_json, require_configuration, verify_scoped_views
RUN_CONFIG=json.loads(__CONFIG__)
require_configuration(RUN_CONFIG,__SUITE__)
SOURCE_SHA256=RUN_CONFIG['engineSourceSha256']
PUBLIC=load_verified_json(Path(RUN_CONFIG['inputCorpusDir'])/'public-input.json',RUN_CONFIG['corpusSha256'])
if len(PUBLIC['documents'])!=120 or len(PUBLIC['questions'])!=60: raise RuntimeError('CORPUS_COUNTS_MISMATCH')
CORPUS_SELECTION=load_verified_json(Path(RUN_CONFIG['inputCorpusDir'])/'selection-manifest.json',RUN_CONFIG['corpusSelectionSha256'])
ORIGINAL_ACCESS=load_verified_json(Path(RUN_CONFIG['inputCorpusDir'])/'private-original-access.json',RUN_CONFIG['originalAccessSha256'])
if ORIGINAL_ACCESS['sourceCount']!=48: raise RuntimeError('REAL_ORIGINAL_COUNT_MISMATCH')
SCOPED_VIEW_INTEGRITY=verify_scoped_views(PUBLIC,ORIGINAL_ACCESS,RUN_CONFIG['inputCorpusDir'])
""".replace('__PAYLOAD__',repr(base64.b64encode(payload).decode())).replace('__DIGEST__',repr(sha(payload)))
    code=code.replace('__CONFIG__',repr(json.dumps(config))).replace('__SUITE__',repr(suite))
    if suite in ('C','E'):
        code+="FIXTURES=load_verified_json(Path(RUN_CONFIG['inputReferenceDir'])/'deterministic-fixtures.json',RUN_CONFIG['fixturesSha256'])\n"
    if suite=='C':
        code+="GOLD=load_verified_json(Path(RUN_CONFIG['inputReferenceDir'])/'private-gold.json',RUN_CONFIG['goldSha256'])\n"
        code+="""NODE=shutil.which('node')
if not NODE:
    data=urllib.request.urlopen('https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz',timeout=60).read(64*1024*1024+1)
    if hashlib.sha256(data).hexdigest()!='00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc': raise RuntimeError('NODE_INTEGRITY_FAILURE')
    runtime=Path('/kaggle/temp/orbit-node-v2'); runtime.mkdir(parents=True,exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:xz') as archive: archive.extractall(runtime,filter='data')
    bindir=runtime/'node-v22.20.0-linux-x64/bin';os.environ['PATH']=str(bindir)+':'+os.environ['PATH'];NODE=str(bindir/'node')
install=subprocess.run(['npm','install','--ignore-scripts','--no-audit','--no-fund'],cwd=ROOT,capture_output=True,text=True,timeout=600)
if install.returncode: raise RuntimeError('ENGINE_DEPENDENCY_INSTALL_FAILED')
bundle=subprocess.run(['npx','esbuild','tools/engine-jsonl.ts','--bundle','--platform=node','--format=esm','--outfile=engine.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=60)
if bundle.returncode: raise RuntimeError('SHARED_TYPESCRIPT_ENGINE_BUILD_FAILED')
"""
    if suite=='E':
        code+="""from kaggle_secrets import UserSecretsClient
POOL=json.loads(UserSecretsClient().get_secret(RUN_CONFIG['workerSecretName']))
if not 1<=len(POOL)<=8: raise RuntimeError('WORKER_POOL_BOUND_INVALID')
if any(not worker.get('controlToken') or worker['controlToken']==worker.get('token') for worker in POOL): raise RuntimeError('DISTINCT_CONTROL_TOKEN_REQUIRED')
"""
    return code


def notebook(config, suite):
    module={'C':'kaggle_engine_campaign.py','D':'kaggle_context_campaign.py','E':'kaggle_webmcp_campaign.py'}[suite]
    run={'C':'run_campaign()','D':'run_context_campaign()','E':'run_webmcp_campaign()'}[suite]
    header='# Orbit — Kaggle campaign v2 / suite '+suite+'\nPrivate execution. Public source contains no answer key or worker credential. Private original texts/results require a rights and privacy review before public redistribution.'
    sources=[setup_code(config,suite),(ROOT/'tools'/module).read_text(encoding='utf-8'),run+'\n']
    return {'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
        'cells':[{'cell_type':'markdown','metadata':{},'source':[header]},
                 *[{'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],'source':source.splitlines(True)} for source in sources]]}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--suite',choices=['C','D','E','all'],default='all')
    parser.add_argument('--manifest',type=Path,default=ENTRY/'manifest.json')
    parser.add_argument('--refresh-manifest',action='store_true')
    parser.add_argument('--refresh-input-fingerprints',action='store_true',
                        help='Unfreeze and update code/corpus fingerprints while preserving observed preflight fields.')
    parser.add_argument('--allow-unfrozen-preparation',action='store_true')
    args=parser.parse_args()
    ENTRY.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    config=initial_manifest() if args.refresh_manifest or not args.manifest.exists() else json.loads(args.manifest.read_text())
    if args.refresh_input_fingerprints:
        fresh=initial_manifest()
        for name in ('repositoryHead','corpusSha256','goldSha256','fixturesSha256','corpusSelectionSha256',
                     'originalAccessSha256','corpusFilesSha256','corpusViewPolicy','sourceFiles',
                     'engineSourceSha256','harnessSha256','rulesSha256'):
            config[name]=fresh[name]
        config['quotaPolicy'].setdefault('maxSnapshotAgeSeconds',3600)
        config['quotaPolicy'].setdefault('unknownResetPolicy','preserve-null-refresh-observation-api-refusal-stops')
        config['quotaPolicy'].setdefault('unknownPricingStrategy','serial-provider-free-quota')
        config.setdefault('pricingObservation',None)
        config.setdefault('lotReserveScope',fresh['lotReserveScope'])
        config['frozen']=False;config['state']='preparation-updated-not-frozen'
    if args.refresh_manifest or args.refresh_input_fingerprints or not args.manifest.exists():
        args.manifest.write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
    (ENTRY/'real-source-review-inventory.json').write_text(json.dumps(corpus_inventory(),indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    engine,harness,rules=source_identity()
    if (config['engineSourceSha256'],config['harnessSha256'],config['rulesSha256'])!=(mapping_digest(engine),mapping_digest(harness),mapping_digest(rules)):
        raise RuntimeError('Source changed after manifest creation; explicitly refresh/review the new version before freezing.')
    prepared=[]
    for suite in ['C','D','E'] if args.suite=='all' else [args.suite]:
        if not args.allow_unfrozen_preparation: validate_frozen(config,suite)
        document=notebook(config,suite);target=OUT/('orbit-suite-'+suite.lower()+'-v2.ipynb')
        target.write_text(json.dumps(document,ensure_ascii=False),encoding='utf-8')
        prepared.append({'suite':suite,'notebook':target.name,'sha256':sha(target.read_bytes()),
                         'state':'prepared-not-run','executable':bool(config.get('frozen')),
                         'embeddedGold':False,'embeddedCredentials':False,'embeddedOriginalCorpus':False})
    receipt={'format':'orbit-kaggle-v2-preparation','campaignId':config['campaignId'],
             'modelCallsExecuted':0,'softwareTestsExecuted':False,'notebooks':prepared,
             'privateDatasetArchive':private_input_archive(config)}
    (ENTRY/'preparation-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    selection=json.loads((OUT/'corpus/selection-manifest.json').read_text(encoding='utf-8'))
    original_access=json.loads((OUT/'corpus/private-original-access.json').read_text(encoding='utf-8'))
    view_receipt={'format':'orbit-scoped-corpus-v2-preparation','corpusSha256':config['corpusSha256'],
        'corpusSelectionSha256':config['corpusSelectionSha256'],'originalAccessSha256':config['originalAccessSha256'],
        'documents':120,'questions':60,'privateOriginals':48,
        'inspectedPassagesPreserved':sum(row['inspectedPassagePreserved'] for row in selection['documents']),
        'retrievedRawOriginals':sum(row['originalAccessState']=='retrieved-raw-and-frozen-snapshot' for row in original_access['records']),
        'snapshotFallbackOriginals':sum(row['originalAccessState']=='frozen-snapshot-fallback' for row in original_access['records']),
        'packetCharacters':selection['packetCharacters'],'maxDocumentCharacters':12000,'maxPacketCharacters':144000,
        'selectionUsesAnswers':False,'humanReviewedRealReferences':0,
        'modelCallsExecuted':0,'softwareTestsExecuted':False,'publicSourceTextIncluded':False}
    (ENTRY/'corpus-v2-view-receipt.json').write_text(json.dumps(view_receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt))


if __name__=='__main__': main()
