"""Author credential-free archives after Kaggle's recorded retirement.

This does not execute a test, revoke an account key, or erase result history.
The original runs remain private and their mission tokens are already inactive.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / '.orbit/cloud-lab/orbit-kaggle-20260930-v1'

def main():
    source = json.loads((LAB / 'orbit-webmcp-campaign.private.ipynb').read_text())
    for cell in source['cells']:
        if cell['cell_type'] == 'markdown':
            cell['source'] = [
                '# Orbit — retired WebMCP campaign archive\n',
                'The eight temporary mission credentials used in run 354216830 were revoked at the end of that run. ',
                'Kaggle recorded HTTP 401 for subsequent requests to every worker. Their values have been removed from this source. ',
                'The E2B account API key was never embedded. Earlier private versions contain inactive mission credentials.\n',
                'Observed outcome: 1 of 144 trajectories completed, 143 errored. This archive does not rerun or validate those failures. ',
                'SDK limits and a Kaggle Pro quota refusal were observed. Semantic review remains pending.\n']
        else:
            lines = cell['source']
            if isinstance(lines,str): lines = lines.splitlines(True)
            cell['source'] = [
                'POOL=[]  # Retired credentials removed; configure new bounded workers for a new campaign.\n'
                if line.startswith('POOL=') else
                "print('Archived run 354216830: temporary credentials revoked; no benchmark executed by this archive.')\n"
                if line.strip() == 'run_webmcp_campaign()' else line
                for line in lines]
            cell['outputs'] = []
            cell['execution_count'] = None
    target = LAB / 'orbit-webmcp-retired.ipynb'
    target.write_text(json.dumps(source),encoding='utf-8')
    print(json.dumps({'state':'credential-free-archive-prepared','path':str(target),'benchmarkExecuted':False}))

if __name__ == '__main__': main()
