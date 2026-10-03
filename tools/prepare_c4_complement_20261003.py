"""Prepare the private, separately identified C4 Kaggle complement; never run it.

Reuses the verified flash/p5/r0 extraction from the recovered C archive. Frozen
parent code and historical checkpoints remain untouched. Generated notebooks
contain private model text and are written only beneath ignored .orbit/.
In Kaggle, select File > Set as Benchmark Task before Run All. A standard
notebook can expose an empty model catalogue even when these models exist.
"""
import argparse
import ast
import base64
import copy
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / '.benchmark/benchmarks/dev-to-challenge-orbit-classification-engines-and-public-measure-scoped-evidence-decisions-and-provenance-c-discrete-pli/current/campaign-v2'
FROZEN = ENTRY / 'frozen-c-sdkparams2'
ARCHIVE_SHA = '55276f8c2d772d1c87caec867e0678a7d16d9eec2b97e09beea1ba471c0f3116'
PARENT_IDENTITY = '0d433497a1e6fa7810c68a51709e821d204f3241707e39850e45b2ce6283ad85'
EXTRACTION_KEY = '3c3161accc4df1068312b3d1395c5017bdee9fe3a4c7223ceeb290c855113196'
EXTRACTION_RAW_SHA = '6fc132ef4784e4345e09d87f5b94fc7989f3d871d4b9a986211d8807ab6731bb'
TARGET = {'packet': 5, 'repetition': 0, 'model': 'google/gemini-3.8-flash'}
CONDITIONS = ['baseline', 'n', 'p', 'none']
C4_ID = 'orbit-kaggle-20261003-c4-prospective-v1'


def digest(value):
    data = value if isinstance(value, bytes) else json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(data).hexdigest()


def code_cell(source):
    ast.parse(source)
    return {'cell_type': 'code', 'metadata': {}, 'execution_count': None,
            'outputs': [], 'source': source.splitlines(keepends=True)}


def read_extraction(archive_path):
    data = archive_path.read_bytes()
    if digest(data) != ARCHIVE_SHA:
        raise ValueError('RECOVERED_PARENT_ARCHIVE_SHA_MISMATCH')
    candidates = []
    with zipfile.ZipFile(archive_path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('DUPLICATE_PARENT_ARCHIVE_PATH')
        for info in archive.infolist():
            name = PurePosixPath(info.filename)
            if name.is_absolute() or '..' in name.parts or '\\' in info.filename or ':' in info.filename:
                raise ValueError('UNSAFE_PARENT_ARCHIVE_PATH')
            if not info.filename.endswith('.json') or info.file_size > 2 * 1024 * 1024:
                continue
            row = json.loads(archive.read(info))
            if (isinstance(row, dict) and row.get('configurationSha256') == PARENT_IDENTITY
                    and row.get('key') == EXTRACTION_KEY
                    and row.get('parameters') == {**TARGET, 'phase': 'extraction'}):
                candidates.append(row)
    if not candidates:
        raise ValueError('EXACT_COMMON_EXTRACTION_NOT_FOUND')
    row = max(candidates, key=lambda value: (value.get('attempt', 0), value.get('observedAtUnix', 0)))
    if row['state'] != 'completed' or digest(row['result']['raw'].encode()) != EXTRACTION_RAW_SHA:
        raise ValueError('COMMON_EXTRACTION_STATE_OR_CONTENT_MISMATCH')
    return row


PREPARE = '''from pathlib import Path
import importlib.metadata, subprocess, sys, json
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
pins = {'kaggle-benchmarks': '0.6.1', 'protobuf': '5.29.6'}
loaded_protobuf = getattr(sys.modules.get('google.protobuf'), '__version__', None)
installed = {}
for package in pins:
    try: installed[package] = importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError: installed[package] = None
if installed != pins:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', '--upgrade',
                    'kaggle-benchmarks==0.6.1', 'protobuf==5.29.6'], check=True)
if loaded_protobuf is not None and loaded_protobuf != pins['protobuf']:
    raise RuntimeError('RESTART_KAGGLE_SESSION_REQUIRED: dependencies installed; restart the session and rerun before importing the SDK. No model dispatch occurred.')
for package, expected in pins.items():
    if importlib.metadata.version(package) != expected:
        raise RuntimeError('PINNED_BOOTSTRAP_DEPENDENCY_MISMATCH: ' + package)
import google.protobuf
if google.protobuf.__version__ != pins['protobuf']:
    raise RuntimeError('LOADED_PROTOBUF_VERSION_MISMATCH: restart the Kaggle session')
import kagglehub
mounted = Path(kagglehub.dataset_download('celebrum/orbit-kaggle-v2-private-inputs'))
expected_mount = Path('/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs')
if mounted.resolve() != expected_mount.resolve(): raise RuntimeError('FROZEN_INPUT_MOUNT_MISMATCH')
import kaggle_benchmarks as kbench
observed_sdk = importlib.metadata.version('kaggle-benchmarks')
if observed_sdk != '0.6.1': raise RuntimeError('PINNED_KAGGLE_SDK_MISMATCH')
pinned_models = ['google/gemini-3.8-flash', 'google/gemini-3.1-pro-preview']
available_models = [name for name in pinned_models if name in kbench.llms]
if available_models != pinned_models: raise RuntimeError('PINNED_MODEL_CATALOGUE_MISMATCH')
print(json.dumps({'host': 'Kaggle', 'sdk': observed_sdk, 'protobuf': google.protobuf.__version__, 'catalogueModelsObserved': available_models,
                 'modelCalls': 0, 'state': 'RUNTIME_PREFLIGHT_ONLY'}))
'''


RUNTIME = '''import base64, copy, hashlib, io, json, threading, time, zipfile
import orbit_campaign_checkpoint as checkpoint

if 'FROZEN_PARENT_CONFIG' not in globals():
    FROZEN_PARENT_CONFIG = copy.deepcopy(RUN_CONFIG)
PARENT_CONFIG = copy.deepcopy(FROZEN_PARENT_CONFIG)
if checkpoint.campaign_identity(PARENT_CONFIG) != C4_PLAN['parentConfigurationSha256']:
    raise RuntimeError('PARENT_CONFIGURATION_MISMATCH')
COMMON_EXTRACTION = json.loads(base64.b64decode(EXTRACTION_B64))
if (COMMON_EXTRACTION['key'] != C4_PLAN['commonExtractionKey']
        or COMMON_EXTRACTION['configurationSha256'] != C4_PLAN['parentConfigurationSha256']
        or COMMON_EXTRACTION['state'] != 'completed'
        or hashlib.sha256(COMMON_EXTRACTION['result']['raw'].encode()).hexdigest() != C4_PLAN['commonExtractionRawSha256']):
    raise RuntimeError('PRIVATE_COMMON_EXTRACTION_MISMATCH')
RUN_CONFIG = copy.deepcopy(PARENT_CONFIG)
RUN_CONFIG.update({'campaignId': C4_PLAN['campaignId'], 'state': 'prospective-four-production-complement',
    'harnessSha256': C4_PLAN['complementHarnessSha256'], 'resumeDatasetDir': None, 'resumeArchives': {},
    'quotaSnapshot': QUOTA_SNAPSHOT, 'targets': {'C': {'extractions': 0, 'comparativeProductions': 4}},
    'complement': C4_PLAN})
FINGERPRINT = checkpoint.campaign_identity(RUN_CONFIG)
if FINGERPRINT == checkpoint.campaign_identity(PARENT_CONFIG): raise RuntimeError('COMPLEMENT_IDENTITY_NOT_DISTINCT')
if not QUOTA_SNAPSHOT: raise RuntimeError('FRESH_QUOTA_OBSERVATION_REQUIRED: fill QUOTA_SNAPSHOT from the current Kaggle quota UI; no dispatch occurred')
TARGET_BASE = C4_PLAN['target']

class ComplementLedger(checkpoint.CampaignLedger):
    def __init__(self, config):
        # Check the exact frozen parent contract and SDK. The new campaign has
        # its own explicit boundary; the shared legacy allowlist is untouched.
        checkpoint.require_configuration(PARENT_CONFIG, 'C')
        if config['campaignId'] != 'orbit-kaggle-20261003-c4-prospective-v1':
            raise RuntimeError('UNKNOWN_COMPLEMENT_NAMESPACE')
        self.config, self.suite = config, 'C'
        self.root = Path('/kaggle/working/orbit-c4-complement-20261003') / 'C'
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.dispatch_lock = threading.RLock()
        self.blocked = threading.Event()
        self.identity = checkpoint.campaign_identity(config)
        # No restore/copy of the historical ledger into this namespace.

    def completed(self, parameters):
        if parameters == {**TARGET_BASE, 'phase': 'extraction'}:
            return COMMON_EXTRACTION  # read-only reuse, no extraction generation or new extraction record
        return super().completed(parameters)

    def _call_serial(self, parameters, callback):
        if parameters == {**TARGET_BASE, 'phase': 'extraction'}:
            return COMMON_EXTRACTION['result']
        allowed = [{**TARGET_BASE, 'phase': 'production', 'condition': condition}
                   for condition in C4_PLAN['conditionOrder']]
        if parameters not in allowed: raise RuntimeError('DISPATCH_OUTSIDE_FOUR_APPROVED_PRODUCTIONS')
        existing = self.completed(parameters)
        if existing: return existing['result']
        if self.blocked.is_set(): raise checkpoint.QuotaBlocked('CAMPAIGN_QUOTA_BLOCKED')
        previous = self.read(parameters)
        if previous and previous['state'] not in ('running', 'observing', 'transient-transport'):
            raise RuntimeError('COMPLEMENT_TERMINAL_OBSERVATION_RETAINED')
        attempts = previous.get('attempt', 0) if previous else 0
        while attempts < 2:
            self.begin(parameters)  # original fresh-quota/cost guard; records a new attempt
            attempts = self.read(parameters)['attempt']
            try:
                result = callback()
                self.write(parameters, 'completed', result=result)
                return result
            except Exception as error:
                message = str(error).lower()
                overload = (getattr(error, 'status_code', None) == 429 or '429' in message) and 'heavy load' in message
                kind = 'transient-transport' if overload else checkpoint.failure_kind(error)
                details = checkpoint.safe_error(error)
                details['failureKind'] = kind
                details['classifierRevision'] = 'c4-explicit-heavy-load-429-v1'
                self.write(parameters, kind, error=details)
                if kind == 'blocked-quota':
                    self.blocked.set()
                    raise checkpoint.QuotaBlocked('CAMPAIGN_QUOTA_BLOCKED') from None
                if kind != 'transient-transport' or attempts >= 2: raise
                time.sleep(2)
        raise RuntimeError('COMPLEMENT_TRANSPORT_ATTEMPTS_EXHAUSTED')

LEDGER = ComplementLedger(RUN_CONFIG)

def run_complement():
    import pandas as pd
    from pathlib import Path
    start = time.time()
    errors = []
    try:
        with kbench.client.enable_cache():
            runs = packet_comparison.evaluate(llm=[kbench.llms[TARGET_BASE['model']]],
                evaluation_data=evaluation_frame([{'packet': TARGET_BASE['packet'],
                    'repetition': TARGET_BASE['repetition'], 'campaign_fingerprint': FINGERPRINT}],
                    FINGERPRINT, 'C', TARGET_BASE['model']), on_failure='continue', max_attempts=1)
        errors = [{'state': 'errored', 'parameters': str(run.params),
                   'message': checkpoint.public_observation(run.error_message)[-1800:]}
                  for run in runs.errored_runs]
    finally:
        rows = LEDGER.rows()
        produced = [r for r in rows if r['state'] == 'completed' and r['parameters'].get('phase') == 'production']
        interpretations = [r for r in rows if r['state'] == 'completed' and r['parameters'].get('phase') == 'production-interpretation']
        packet_rows = [r for r in rows if r['state'] == 'completed' and r['parameters'].get('phase') == 'packet']
        if any(r['parameters'].get('phase') == 'extraction' for r in rows):
            raise RuntimeError('UNEXPECTED_NEW_EXTRACTION_RECORD')
        interpreted = {r['parameters']['condition']: r['result'].get('status') for r in interpretations}
        accounting = {'format': 'orbit-c4-prospective-accounting-v1', 'host': 'Kaggle',
            'campaignId': RUN_CONFIG['campaignId'], 'configurationSha256': FINGERPRINT,
            'parentConfigurationSha256': C4_PLAN['parentConfigurationSha256'], 'parentArchiveSha256': C4_PLAN['parentArchiveSha256'],
            'state': 'four-production-volume-reached' if len(produced) == 4 and len(packet_rows) == 1 else 'partial',
            'newExtractions': 0, 'reusedExtractionKey': C4_PLAN['commonExtractionKey'],
            'reusedExtractionRawSha256': C4_PLAN['commonExtractionRawSha256'],
            'productionsObserved': len(produced), 'completedPackets': len(packet_rows),
            'conditionOrder': C4_PLAN['conditionOrder'], 'interpretationStatuses': interpreted,
            'quotaBlocked': LEDGER.blocked.is_set(), 'ledger': LEDGER.accounting(),
            'durationSeconds': time.time()-start, 'historicalErrorRewritten': False,
            'limitations': ['Prospective complement: original C retains its own 236/240 identity.',
                'Generation volume is separate from answer validity; invalid output is never regenerated.',
                'No new extraction; no D/E dispatch; real annotations retain pending-human status.']}
        output = LEDGER.root.parent
        (output/'complement-manifest.json').write_text(json.dumps(RUN_CONFIG, indent=2), encoding='utf-8')
        (output/'complement-accounting.json').write_text(json.dumps(accounting, indent=2), encoding='utf-8')
        (output/'complement-errors.json').write_text(json.dumps(errors, indent=2), encoding='utf-8')
        archive_path = Path('/kaggle/working/000-orbit-c4-complement-20261003.zip')
        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(output.rglob('*')):
                if path.is_file(): archive.write(path, path.relative_to(output))
        accounting['privateArchiveSha256'] = hashlib.sha256(archive_path.read_bytes()).hexdigest()
        accounting['privateArchiveName'] = archive_path.name
        print(json.dumps(accounting))  # metadata only; model answers stay in the private archive
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quota-snapshot-json', type=Path,
                        help='Fresh observed quota windows; omission prepares a notebook that refuses dispatch until filled')
    args = parser.parse_args()
    archive_path = ROOT / '.orbit/closure-20261003/orbit-c-resumption-results-20261003.zip'
    extraction = read_extraction(archive_path)
    parent = json.loads((FROZEN / 'runner.ipynb').read_text(encoding='utf-8'))
    frozen_setup = ''.join(parent['cells'][1]['source'])
    frozen_runner = ''.join(parent['cells'][2]['source'])
    if digest((FROZEN / 'tools/kaggle_engine_campaign.py').read_bytes()) != 'ff7773b95dcb0b4d831ab75393cde79a9c3e3e0f5ed860fb5574e0d7ca8e2370':
        raise ValueError('FROZEN_ENGINE_CAMPAIGN_SOURCE_MISMATCH')
    if not frozen_runner.startswith('"""Suites B/C.') or 'run_campaign()' in frozen_runner.splitlines()[-1]:
        raise ValueError('UNEXPECTED_FROZEN_FUNCTION_CELL')
    windows = json.loads(args.quota_snapshot_json.read_text(encoding='utf-8')) if args.quota_snapshot_json else []
    if not isinstance(windows, list): raise ValueError('QUOTA_SNAPSHOT_MUST_BE_A_LIST')
    for window in windows:
        if not isinstance(window, dict) or any(key not in window for key in ['name', 'limitNanodollars', 'usedNanodollars', 'observedAtUnix', 'resetsAtUnix']):
            raise ValueError('QUOTA_WINDOW_METADATA_INCOMPLETE')
    plan = {'campaignId': C4_ID, 'parentConfigurationSha256': PARENT_IDENTITY,
        'parentArchiveSha256': ARCHIVE_SHA, 'commonExtractionKey': EXTRACTION_KEY,
        'commonExtractionRawSha256': EXTRACTION_RAW_SHA, 'target': TARGET, 'conditionOrder': CONDITIONS,
        'preparedOn': '2026-10-03', 'helperSha256': digest(Path(__file__).read_bytes()),
        'frozenNotebookSha256': digest((FROZEN / 'runner.ipynb').read_bytes()),
        'frozenFunctionCellSha256': digest(frozen_runner.encode()),
        'policy': 'Four productions, exact shared extraction, separate namespace, at most two attempts for an explicit transient transport incident.'}
    plan['complementHarnessSha256'] = digest({'frozenSetup': digest(frozen_setup.encode()),
        'frozenRunner': digest(frozen_runner.encode()), 'runtime': digest(RUNTIME.encode()), 'helper': plan['helperSha256']})
    private_prelude = ('# PRIVATE MODEL EXTRACTION: keep this notebook private.\n'
        + 'C4_PLAN = ' + repr(plan) + '\n'
        + 'QUOTA_SNAPSHOT = ' + repr(windows) + '\n'
        + 'EXTRACTION_B64 = ' + repr(base64.b64encode(json.dumps(extraction, ensure_ascii=False).encode()).decode()) + '\n')
    notebook = {'nbformat': 4, 'nbformat_minor': 5, 'metadata': copy.deepcopy(parent.get('metadata', {})),
        'cells': [{'cell_type': 'markdown', 'metadata': {}, 'source': [
            '# Orbit C4 — prospective four-production complement\n',
            'Private notebook: contains the exact existing model extraction. Preserve private visibility.\n',
            'Kaggle UI prerequisite: File → Set as Benchmark Task, then Run All. A standard notebook may have an empty model catalogue.\n',
            'Original C remains 60/60 extractions,236/240 productions,59/60 packets under its own identity.\n',
            'Target: flash packet5/repetition0, order baseline → n → p → none. No new extraction.\n',
            'Fill QUOTA_SNAPSHOT with a fresh current UI observation before dispatch. A missing/expired observation blocks.\n']},
            code_cell(PREPARE), code_cell(frozen_setup), code_cell(frozen_runner),
            code_cell(private_prelude + RUNTIME), code_cell('run_complement()\n')]}
    output = ROOT / '.orbit/closure-20261003/c4-prospective'
    if not output.resolve().is_relative_to((ROOT / '.orbit').resolve()): raise ValueError('OUTPUT_OUTSIDE_PRIVATE_SCOPE')
    output.mkdir(parents=True, exist_ok=True)
    notebook_path = output / 'orbit-c4-prospective-private-20261003.ipynb'
    notebook_path.write_text(json.dumps(notebook, ensure_ascii=False), encoding='utf-8')
    (output / 'complement-plan.private.json').write_text(json.dumps(plan, indent=2), encoding='utf-8')
    (output / 'runtime-source.py').write_text(RUNTIME, encoding='utf-8')
    print(json.dumps({'preparedNotebook': str(notebook_path), 'private': True, 'generatedOnly': True,
        'notebookSha256': digest(notebook_path.read_bytes()), 'complementHarnessSha256': plan['complementHarnessSha256'],
        'modelCalls': 0, 'newExtractions': 0, 'targetProductions': 4, 'quotaProvided': bool(windows)}))


if __name__ == '__main__':
    main()
