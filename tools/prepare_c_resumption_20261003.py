"""Prepare a private Kaggle resume notebook without executing a benchmark.

The frozen source cells are retained byte-for-byte. Only operational resume and
fresh quota metadata are supplied before the original campaign entry point.
The generated notebook mounts the private Kaggle checkpoint dataset required by
the frozen ledger. It is written under the ignored .orbit directory.
"""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / '.benchmark/benchmarks/dev-to-challenge-orbit-classification-engines-and-public-measure-scoped-evidence-decisions-and-provenance-c-discrete-pli/current/campaign-v2'


def cell(source):
    return {'cell_type': 'code', 'metadata': {}, 'execution_count': None,
            'outputs': [], 'source': source.splitlines(keepends=True)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quota-observed-at-unix', type=int, required=True)
    args = parser.parse_args()
    notebook = json.loads((ENTRY / 'frozen-c-sdkparams2/runner.ipynb').read_text(encoding='utf-8'))
    archive = ROOT / '.orbit/cloud-lab/orbit-kaggle-20261001-v2/c-sdkparams2-private-observations.zip'
    data = archive.read_bytes()
    expected = 'c5e88b5321b716b8070f0e5604138223d0fb5b9937b73317dcca144e415a1ebc'
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('Private checkpoint archive fingerprint mismatch')
    prepare = '''from pathlib import Path
import importlib.metadata, subprocess, sys, json
if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
try: version = importlib.metadata.version('kaggle-benchmarks')
except importlib.metadata.PackageNotFoundError: version = None
if version != '0.6.1':
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'kaggle-benchmarks==0.6.1'], check=True)
import kagglehub
mounted = Path(kagglehub.dataset_download('celebrum/orbit-kaggle-v2-private-inputs'))
expected_mount = Path('/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs')
if mounted.resolve() != expected_mount.resolve():
    raise RuntimeError('INPUT_MOUNT_DIFFERS_FROM_FROZEN_CONFIG: ' + str(mounted))
import kaggle_benchmarks as kbench
pinned = ['google/gemini-3.8-flash', 'google/gemini-3.1-pro-preview']
if any(name not in kbench.llms for name in pinned): raise RuntimeError('PINNED_MODEL_UNAVAILABLE')
print(json.dumps({'host':'Kaggle','sdk':importlib.metadata.version('kaggle-benchmarks'),'models':pinned,'modelCalls':0}))
'''
    resume = f'''# PRIVATE CHECKPOINT RESTORE. Preserve this notebook's private visibility.
import hashlib, json, kagglehub
from pathlib import Path
from orbit_campaign_checkpoint import campaign_identity
before = campaign_identity(RUN_CONFIG)
assert before == '0d433497a1e6fa7810c68a51709e821d204f3241707e39850e45b2ce6283ad85'
resume_root = Path(kagglehub.dataset_download('celebrum/orbit-c-private-checkpoints-20261003'))
assert resume_root.resolve().is_relative_to(Path('/kaggle/input').resolve())
archive = resume_root / 'c-checkpoints.zip.bin'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == '{expected}'
RUN_CONFIG['resumeDatasetDir'] = str(resume_root)
RUN_CONFIG['resumeArchives'] = {{archive.name: '{expected}'}}
RUN_CONFIG['quotaSnapshot'] = [{{'name': name, 'limitNanodollars': limit, 'usedNanodollars': used,
    'observedAtUnix': {args.quota_observed_at_unix}, 'resetsAtUnix': None}}
    for name, limit, used in [('daily', 10000000000, 0), ('monthly', 100000000000, 18290000000)]]
assert campaign_identity(RUN_CONFIG) == before
print(json.dumps({{'restoredArchiveSha256':'{expected}','configurationSha256':before,
 'quotaSource':'Kaggle Refresh Quota UI 2026-10-03','resetAt':None,'historicalTerminalCasePreserved':True}}))
'''
    notebook['cells'][0]['source'] = ['# Orbit C — private October 3 resumption\n',
        'Frozen sdkparams2 source and original identity. Only fresh observed quota and verified private checkpoints are added.\n',
        'Target of this resumption: 60 extractions and at most 236 productions. Four terminal historical productions remain separate.\n',
        'Uses private model answers from an authorized private Kaggle dataset. Keep private.\n']
    notebook['cells'].insert(1, cell(prepare))
    notebook['cells'].insert(-1, cell(resume))
    notebook['cells'][-1]['source'] = ['run_campaign()\n']
    out = ROOT / '.orbit/closure-20261003'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'resume-cell.py').write_text(resume, encoding='utf-8')
    path = out / 'orbit-c-private-resume-20261003.ipynb'
    path.write_text(json.dumps(notebook, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'path':str(path),'bytes':path.stat().st_size,'generatedOnly':True,
                      'privateNotebook':True,'modelCalls':0}))


if __name__ == '__main__':
    main()
