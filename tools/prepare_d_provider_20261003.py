"""Prepare the private Provider-only D runner; no model/test is executed here.

The runtime verifies the real Kaggle SDK/catalog and fixed live Context before
freezing the executable configuration. Source views and the Viewer token are
never embedded in this notebook or its public metadata receipts.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / '.benchmark/benchmarks/dev-to-challenge-orbit-classification-engines-and-public-measure-scoped-evidence-decisions-and-provenance-c-discrete-pli/current/campaign-v2/context-qa-20261003'
PRIVATE = ROOT / '.orbit/cloud-lab/orbit-context-qa-20261003'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def code_cell(source):
    return {'cell_type': 'code', 'metadata': {}, 'execution_count': None,
            'outputs': [], 'source': source.splitlines(keepends=True)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quota-observed-at-unix', type=int, required=True)
    parser.add_argument('--daily-used-nanodollars', type=int, required=True)
    parser.add_argument('--monthly-used-nanodollars', type=int, required=True)
    args = parser.parse_args()
    if not (0 <= args.daily_used_nanodollars < 8_500_000_000
            and 0 <= args.monthly_used_nanodollars < 85_000_000_000):
        raise RuntimeError('OBSERVED_FREE_QUOTA_OUTSIDE_DISPATCH_POLICY')
    captured = datetime.fromtimestamp(args.quota_observed_at_unix, timezone.utc)
    if captured > datetime.now(timezone.utc):
        raise RuntimeError('QUOTA_OBSERVATION_CANNOT_BE_IN_THE_FUTURE')
    builder = load_module('orbit_d_builder', ROOT / 'tools/prepare_kaggle_campaign_v2.py')
    checkpoint = load_module('orbit_d_checkpoint', ROOT / 'tools/orbit_campaign_checkpoint.py')
    audit = json.loads((ENTRY / 'audit-provider.json').read_text(encoding='utf-8'))
    mcp = json.loads((ENTRY / 'mcp-provider.json').read_text(encoding='utf-8'))
    if (audit['knowledgeBase'] != 'kbMOG2p1HkA4'
            or audit['observedSources'] != 12
            or audit['quotationAudit']['normalizedLiteralMatches'] != 58
            or audit['quotationAudit']['outsideCaseCitations'] != 0
            or audit['quotationAudit']['citedFrozenSources'] != 12
            or mcp['state'] != 'QA_MCP_REAL_READS_COMPLETE'
            or mcp['organizationId'] != 'ofo1daa1l'
            or mcp['endpoint'] != 'orbit-d-provider-20261003'
            or mcp['tools'] != ['initial_context', 'knowledge_base_read']):
        raise RuntimeError('FIXED_PROVIDER_PROVENANCE_AND_LIVE_READS_REQUIRED')
    paths = audit['entryPaths']
    readings = {row['path']: row for row in mcp['readings']}
    if set(readings) != {'', *paths}:
        raise RuntimeError('REAL_CONTEXT_READ_COVERAGE_MISMATCH')
    private_audit = json.loads((PRIVATE / 'audit/provider.json').read_text(encoding='utf-8'))
    entries = {entry['path']: entry for entry in private_audit['entries']}
    if set(entries) != set(paths):
        raise RuntimeError('SDK_ENTRY_PATHS_DIFFER_FROM_MCP_PATHS')
    digests = {}
    for path in ['', *paths]:
        row = readings[path]
        response = json.loads((PRIVATE / 'mcp/provider' / row['file']).read_text(encoding='utf-8'))
        if response['state'] != 'READY' or response['knowledgeBase'] != audit['knowledgeBase']:
            raise RuntimeError('FROZEN_CONTEXT_RESPONSE_IDENTITY_MISMATCH')
        if path and entries[path]['body'] not in '\n'.join(block['text'] for block in response['content']):
            raise RuntimeError('MCP_RESPONSE_DIFFERS_FROM_REAL_SDK_ENTRY_BODY')
        digests[path] = checkpoint.context_digest(response)

    config = builder.initial_manifest()
    config.update({
        'campaignId': 'orbit-kaggle-20261003-final-d1',
        'state': 'QA_PROVIDER_READY_FOR_KAGGLE_CATALOG_PREFLIGHT',
        'frozen': False, 'modelsChecked': False, 'quotaChecked': True,
        'contextCaseSelection': ['provider'],
        'contextViewerSecretName': 'ORBIT_CONTEXT_QA_VIEWER',
        'executableSuites': ['D'], 'fullContextMissionTarget': 24,
        'inputCorpusDir': '/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs',
        'inputReferenceDir': '/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs',
        'runtimeDependencyPins': {'protobuf':'5.29.6'},
        'preparationSourceSha256': sha(Path(__file__).read_bytes()),
        'preflightObservation': {
            'source': 'coordinator readback of Kaggle Refresh Quota UI',
            'observedAt': captured.isoformat(), 'timestampPrecision': 'minute',
            'modelCatalog': 'runtime verification required before freezing',
            'sdkVersion': '0.6.1', 'modelCalls': 0,
            'contextMcpReceipt': 'mcp-provider.json',
            'contextMcpObservedAt': mcp['observedAt'],
            'quotaResetTimes': 'unavailable',
        },
        'quotaSnapshot': [
            {'name': name, 'limitNanodollars': limit, 'usedNanodollars': used,
             'observedAtUnix': args.quota_observed_at_unix, 'resetsAtUnix': None}
            for name, limit, used in [('daily', 10_000_000_000, args.daily_used_nanodollars),
                                     ('monthly', 100_000_000_000, args.monthly_used_nanodollars)]
        ],
        'limits': [
            'This Provider-only lot plans 12 of 24 Context trajectories; it is not complete mission D.',
            'Two generated Context warnings remain open; source parity is not semantic approval.',
            'No production fallback, CLI credential distribution or automatic model replacement.',
            'Source texts, model answers and annotations require independent rights/privacy/review.',
        ],
    })
    config['targets']['D']['trajectories'] = 12
    config['contextCases']['provider'].update({
        'paths': paths, 'responseDigests': digests, 'parityReviewed': True,
        'parityReviewScope': 'source membership and literal citation provenance only',
        'organizationId': 'ofo1daa1l', 'knowledgeBase': audit['knowledgeBase'],
        'revisionId': audit['revisions'][0], 'transport': 'sanity-context-mcp-live',
        'mcpEndpoint': mcp['endpoint'],
        'sourceMembershipState': '12 frozen views, 12 cited sources and 58 literal quotations verified',
        'semanticReview': 'pending independent review', 'contextOpenIssues': audit['openIssues'],
    })
    executable = copy.deepcopy(config)
    executable.update({'frozen': True, 'modelsChecked': True,
                       'state': 'KAGGLE_CATALOG_VERIFIED_PROVIDER_FROZEN'})
    builder.validate_frozen(executable, 'D')  # Structural validation, not a runtime claim.
    anticipated_identity = checkpoint.campaign_identity(executable)
    prepare = '''from pathlib import Path
import importlib.metadata, subprocess, sys, json
from datetime import datetime, timezone
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
try: observed_sdk = importlib.metadata.version('kaggle-benchmarks')
except importlib.metadata.PackageNotFoundError: observed_sdk = None
try: observed_protobuf = importlib.metadata.version('protobuf')
except importlib.metadata.PackageNotFoundError: observed_protobuf = None
if observed_protobuf != '5.29.6' and ('google.protobuf' in sys.modules or 'kaggle_benchmarks' in sys.modules):
    raise RuntimeError('RESTART_SESSION_REQUIRED_BEFORE_PINNED_PROTOBUF_INSTALL')
if observed_sdk != '0.6.1' or observed_protobuf != '5.29.6':
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet',
                    'protobuf==5.29.6', 'kaggle-benchmarks==0.6.1'], check=True)
import kagglehub
mounted = Path(kagglehub.dataset_download('celebrum/orbit-kaggle-v2-private-inputs'))
if mounted.resolve() != Path('/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs').resolve():
    raise RuntimeError('PRIVATE_INPUT_MOUNT_DIFFERS_FROM_DECLARED_CONFIG')
import kaggle_benchmarks as kbench
pinned = ['google/gemini-3.8-flash', 'google/gemini-3.1-pro-preview']
if importlib.metadata.version('kaggle-benchmarks') != '0.6.1': raise RuntimeError('PINNED_SDK_MISMATCH')
if importlib.metadata.version('protobuf') != '5.29.6': raise RuntimeError('PINNED_PROTOBUF_MISMATCH')
if any(name not in kbench.llms for name in pinned): raise RuntimeError('PINNED_MODEL_UNAVAILABLE')
CATALOG_PREFLIGHT = {'state':'CATALOG_AND_SDK_VERIFIED', 'host':'Kaggle',
    'observedAt':datetime.now(timezone.utc).isoformat(), 'sdkVersion':'0.6.1', 'protobufVersion':'5.29.6',
    'modelsAvailable':pinned, 'modelCalls':0}
Path('/kaggle/working/context-catalog-preflight.json').write_text(json.dumps(CATALOG_PREFLIGHT, indent=2))
print(json.dumps(CATALOG_PREFLIGHT))
'''
    setup = builder.setup_code(config, 'D')
    required = "require_configuration(RUN_CONFIG,'D')"
    if setup.count(required) != 1:
        raise RuntimeError('EXPECTED_SINGLE_CONFIGURATION_GATE')
    freeze = '''if CATALOG_PREFLIGHT.get('state') != 'CATALOG_AND_SDK_VERIFIED':
    raise RuntimeError('ACTUAL_KAGGLE_CATALOG_PREFLIGHT_REQUIRED')
RUN_CONFIG.update({'frozen':True,'modelsChecked':True,'state':'KAGGLE_CATALOG_VERIFIED_PROVIDER_FROZEN'})
require_configuration(RUN_CONFIG,'D')
from orbit_campaign_checkpoint import campaign_identity
if campaign_identity(RUN_CONFIG) != __IDENTITY__: raise RuntimeError('CONFIGURATION_IDENTITY_MISMATCH')
Path('/kaggle/working/context-runtime-manifest.json').write_text(json.dumps(RUN_CONFIG, indent=2))
'''.replace('__IDENTITY__', repr(anticipated_identity))
    setup = setup.replace(required, freeze)
    live = '''# Technical reads only. No model is called by this cell.
from kaggle_secrets import UserSecretsClient
from orbit_campaign_checkpoint import context_digest, campaign_identity
from datetime import datetime, timezone
viewer = UserSecretsClient().get_secret('ORBIT_CONTEXT_QA_VIEWER')
case_config = RUN_CONFIG['contextCases']['provider']
live_readings = []
for path in ['', *case_config['paths']]:
    response = live_qa_context(case_config, path, viewer)
    observed = context_digest(response)
    if observed != case_config['responseDigests'][path]:
        raise RuntimeError('QA_CONTEXT_RESPONSE_CHANGED_BEFORE_DISPATCH')
    live_readings.append({'path':path,'state':response['state'],'responseDigest':observed})
if live_qa_context(case_config, '__not_a_frozen_path__', viewer) != {'state':'NOT_ALLOWED'}:
    raise RuntimeError('QA_CONTEXT_PATH_BOUNDARY_FAILED')
del viewer
preflight = {'state':'LIVE_QA_CONTEXT_QUALIFIED','observedAt':datetime.now(timezone.utc).isoformat(),
    'configurationSha256':campaign_identity(RUN_CONFIG),'catalog':CATALOG_PREFLIGHT,
    'readings':live_readings,'pathRefusal':'NOT_ALLOWED','plannedTrajectories':12,
    'fullMissionTarget':24,'modelCalls':0,'sourceParity':'literal provenance only',
    'semanticReview':'pending independent review','openContextIssues':2}
Path('/kaggle/working/context-preflight.json').write_text(json.dumps(preflight, indent=2))
CONTEXT_RUNTIME_PREFLIGHT_READY = True
print(json.dumps(preflight))
'''
    header = ('# Orbit D — Provider-only live Context comparison\n'
              'Private notebook. Planned: 12 paired trajectories (2 models × 2 conditions × 3 repetitions). '
              'Full mission remains 24; the Sanity case is separate.\n'
              'Cells 1–4 verify SDK/catalog, inputs and the real fixed QA Context without a model call. '
              'The last cell dispatches models within the existing free-quota/call/time limits.\n'
              'Only Kaggle Secrets supplies the temporary read-only Viewer. '
              'Keep answers, source excerpts and this notebook private until rights/privacy review.\n')
    notebook = {'nbformat':4,'nbformat_minor':5,
        'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
        'cells':[{'cell_type':'markdown','metadata':{},'source':[header]},
                 code_cell(prepare), code_cell(setup),
                 code_cell((ROOT/'tools/kaggle_context_campaign.py').read_text(encoding='utf-8')),
                 code_cell(live), code_cell("if globals().get('CONTEXT_RUNTIME_PREFLIGHT_READY') is not True: raise RuntimeError('LIVE_CONTEXT_PREFLIGHT_REQUIRED_BEFORE_DISPATCH')\nrun_context_campaign()\n")]}
    for index, cell in enumerate(notebook['cells']):
        if cell['cell_type'] == 'code':
            compile(''.join(cell['source']), f'provider-cell-{index}', 'exec')
    PRIVATE.mkdir(parents=True, exist_ok=True)
    notebook_path = PRIVATE / 'runner-provider.ipynb'
    notebook_path.write_text(json.dumps(notebook, ensure_ascii=False), encoding='utf-8')
    (ENTRY/'manifest-provider.json').write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
    receipt = {'state':'PREPARED_RUNTIME_CATALOG_CHECK_REQUIRED',
        'campaignId':config['campaignId'],'notebook':notebook_path.relative_to(ROOT).as_posix(),
        'notebookSha256':sha(notebook_path.read_bytes()),'notebookBytes':notebook_path.stat().st_size,
        'anticipatedExecutableConfigurationSha256':anticipated_identity,
        'manifestSha256':sha((ENTRY/'manifest-provider.json').read_bytes()),
        'harnessSha256':config['harnessSha256'],'contextResponseDigests':digests,
        'sdkCatalogVerifiedInKaggle':False,'liveMcpLocalTechnicalReads':11,
        'mcpMatchesSdkEntryBodies':len(entries),'sourceLiteralMatches':58,
        'sourceCitationCoverage':12,'openContextIssues':2,'semanticReview':'pending',
        'plannedTrajectories':12,'fullMissionTarget':24,'modelCallsExecuted':0,
        'softwareTestsExecuted':False,'syntaxCompilation':'passed',
        'credentialsEmbedded':False,'privateSourceTextEmbedded':False,
        'quotaSource':config['preflightObservation'],
        'quotaSnapshot':config['quotaSnapshot']}
    (ENTRY/'provider-runner-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:value for key,value in receipt.items()
                      if key not in ('contextResponseDigests','quotaSource','quotaSnapshot')}))


if __name__ == '__main__':
    main()
