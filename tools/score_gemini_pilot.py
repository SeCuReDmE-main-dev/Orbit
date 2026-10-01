"""Score observed final answers; never repair a model's evidence silently."""
import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def evaluate(folder, answer_path):
    public = json.loads((folder / 'public-input.json').read_text(encoding='utf-8'))
    gold = json.loads((folder / 'private-gold.json').read_text(encoding='utf-8'))
    answer = json.loads(answer_path.read_text(encoding='utf-8'))
    docs = {row['id']: row for row in public['documents']}
    questions = {row['id']: row for row in public['questions']}
    returned = answer['results']
    if len(returned) != len(questions) or {row['questionId'] for row in returned} != set(questions):
        raise ValueError('Incomplete or duplicate question results; do not score as a complete pilot.')
    requests, metadata, rows = [], [], []
    for row in returned:
        key = row['questionId']
        question = questions[key]
        checks = [{'sourceId': e['sourceId'], 'found': e['sourceId'] in docs and bool(e['quote']) and e['quote'] in docs[e['sourceId']]['text']} for e in row['evidence']]
        rows.append({'questionId': key, 'modelDecision': row['decision'], 'expected': gold[key],
                     'modelDecisionCorrect': row['decision'] == gold[key], 'quoteChecks': checks})
        dossier = {'format': 'orbit-evidence-v1', 'id': key, 'title': 'Synthetic development pilot',
                   'question': question['statement'], 'objective': '', 'context': '', 'revision': 0,
                   'createdAt': '2026-09-29T00:00:00.000Z', 'updatedAt': '2026-09-29T00:00:00.000Z',
                   'axes': [], 'sources': [{'id': d['id'], 'title': d['id'], 'url': 'https://example.org/orbit-pilot/'+d['id'],
                                            'status': 'read', 'text': d['text'], 'contentHash': hashlib.sha256(d['text'].encode()).hexdigest()} for d in docs.values()],
                   'claims': [{'id': key, 'statement': question['statement'], 'kind': 'reported',
                               'disposition': 'indeterminate', 'scopeAttributes': question['scope'], 'evidence': row['evidence']}],
                   'screeningCriteria': [], 'sourceDecisions': [], 'extractions': [], 'knowledgeReads': [],
                   'answer': '', 'report': '', 'proposals': [], 'reviews': [], 'history': [], 'example': True}
        for engine in ('baseline', 'n', 'p'):
            requests.append({'dossier': dossier, 'engine': engine})
            metadata.append((key, engine))
    process = subprocess.run(['node', '--import', 'tsx', str(ROOT / 'tools/engine-jsonl.ts')],
                             input=''.join(json.dumps(row)+'\n' for row in requests), text=True,
                             capture_output=True, cwd=ROOT, timeout=60)
    if process.returncode:
        raise RuntimeError('Engine harness failed: '+process.stderr[:500])
    responses = [json.loads(line) for line in process.stdout.splitlines() if line.strip()]
    if len(responses) != len(metadata):
        raise RuntimeError('Incomplete engine stream.')
    engines = []
    for (key, engine), response in zip(metadata, responses):
        engines.append({'questionId': key, 'engine': engine, 'expected': gold[key], **response,
                        'decisionCorrect': response['result'][0]['decision'] == gold[key] if response['ok'] else None})
    result = {'status': 'development-pilot', 'model': answer['model'], 'host': answer['host'],
              'answerSha256': hashlib.sha256(answer_path.read_bytes()).hexdigest(),
              'executedAt': datetime.now(timezone.utc).isoformat(), 'questions': len(rows),
              'modelDecisionsCorrect': sum(row['modelDecisionCorrect'] for row in rows),
              'quoteChecks': sum(len(row['quoteChecks']) for row in rows),
              'quotesExact': sum(c['found'] for row in rows for c in row['quoteChecks']),
              'engines': {engine: {'evaluated': sum(r['ok'] for r in engines if r['engine']==engine),
                                    'correctEvaluated': sum(r['decisionCorrect'] is True for r in engines if r['engine']==engine),
                                    'schemaErrors': sum(not r['ok'] for r in engines if r['engine']==engine)} for engine in ('baseline','n','p')},
              'rows': rows, 'engineRows': engines,
              'limitations': ['One development repetition, not final benchmark.', 'Exact quotation does not establish semantic relevance.',
                              'Schema errors are retained, not repaired or counted as engine decisions.',
                              'Model identity and effort are labels observed in the host UI, not independent provider attestations.']}
    output = answer_path.with_name(answer_path.stem+'-scored.json')
    output.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key: result[key] for key in ('model','questions','modelDecisionsCorrect','quotesExact','quoteChecks','engines')}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('answer', type=Path)
    parser.add_argument('--folder', type=Path, default=ROOT / '.orbit/gemini-pilot-v1')
    args = parser.parse_args()
    evaluate(args.folder, args.answer)
