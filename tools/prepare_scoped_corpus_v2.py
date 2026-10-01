"""Prepare bounded evidence views and private originals; no models or product tests.

Selection uses only the frozen questions, inspected prose anchors and source text.
It never reads expected answers. Live reads already recorded by the source audit
are archived separately and never silently replace the experimental snapshots.
"""
from __future__ import annotations

from collections import Counter
import copy
import hashlib
import json
import math
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.orbit/cloud-lab/orbit-kaggle-20261001-v2'
SOURCE = ROOT / '.orbit/benchmark-corpus-real-v1'
ORIGINAL = ROOT / '.orbit/cloud-lab/orbit-kaggle-20260930-v1/corpus'
TARGET = OUT / 'corpus'
MAX_DOCUMENT_CHARACTERS = 12000
MAX_PACKET_CHARACTERS = 12 * MAX_DOCUMENT_CHARACTERS
SEPARATOR = '\n\n[Excerpt boundary: intervening source text omitted; this marker is not source evidence.]\n\n'
STOPWORDS = set('a an and are as at be been below by can did do does each every fail for from had has have '
                'how identify in into is it its of on or other preserve relevant report same separate should '
                'specific that the their them these this to use was were what which with itself alone '
                'directly establish establishes behavior outcomes results describe demonstrates demonstrate '
                'performance statements source sources documentation document evidence result claims '
                'question questions both between identify distinguish different include introduced'.split())

# These anchors identify different experimental units in a source that cannot
# fit in one 12k view. They name passages, never expected decisions or scores.
QUESTION_CONTEXT_ANCHORS = {
    'r09-d04': [r'Pollen germination ratio \(G\) was calculated',
                r'young fruits formed after 16 days',
                r'After all, we achieved a higher than'],
}


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode('utf-8')).hexdigest()


def tokens(text):
    return {word.lower() for word in re.findall(r'[A-Za-z0-9]+(?:[_.-][A-Za-z0-9]+)*', text)
            if len(word) > 2 and word.lower() not in STOPWORDS}


def prose_window(text, start, end, radius=550, maximum=2200):
    """Keep adjacent sentences/paragraphs; bound very long PDF/HTML paragraphs."""
    left = max(0, start - radius)
    right = min(len(text), end + radius)
    paragraph_left = text.rfind('\n\n', 0, start)
    paragraph_right = text.find('\n\n', end)
    if paragraph_left >= 0 and start - paragraph_left <= maximum // 2:
        left = min(left, paragraph_left + 2)
    if paragraph_right >= 0 and paragraph_right - end <= maximum // 2:
        right = max(right, paragraph_right)
    if right - left > maximum:
        left = max(0, start - (maximum - (end - start)) // 2)
        right = min(len(text), left + maximum)
    # Do not truncate the mandatory inspected passage itself.
    return min(left, start), max(right, end)


def merge_spans(spans):
    merged = []
    for start, end in sorted(spans):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    return merged


def view_size(spans):
    return sum(end - start for start, end in spans) + len(SEPARATOR) * max(0, len(spans) - 1)


def lexical_candidates(text, questions, frequencies, document_count):
    # Fixed-width overlapping windows give long PDF paragraphs the same access
    # opportunity as HTML paragraphs. Their rank is retrieval, never a label.
    candidates = []
    step = 650
    for start in range(0, len(text), step):
        end = min(len(text), start + 1400)
        words = tokens(text[start:end])
        scores = {}
        matched = {}
        for question in questions:
            terms = tokens(question['question']) & words
            if terms:
                scores[question['id']] = sum(math.log((document_count + 1) / (frequencies[term] + 1)) + 1
                                              for term in sorted(terms))
                matched[question['id']] = sorted(terms)
        if scores:
            candidates.append({'start': start, 'end': end, 'scores': scores, 'matchedTerms': matched})
    return candidates


def select_view(source, text, questions, passage, frequencies, document_count):
    if len(text) <= MAX_DOCUMENT_CHARACTERS:
        spans = [(0, len(text))]
        selection = 'complete-frozen-snapshot'
        candidates = lexical_candidates(text, questions, frequencies, document_count)
    else:
        mandatory = prose_window(text, passage['startCharacter'], passage['endCharacter'])
        spans = [mandatory]
        for pattern in QUESTION_CONTEXT_ANCHORS.get(source['id'], []):
            match=re.search(pattern,text,re.I)
            if not match:
                raise RuntimeError('DECLARED_CONTEXT_ANCHOR_NOT_FOUND_'+source['id'])
            spans=merge_spans(spans+[prose_window(text,match.start(),match.end())])
        # Preserve document identity/introduction in addition to the prose anchor.
        intro = (0, min(len(text), 1400))
        spans = merge_spans(spans + [intro])
        if view_size(spans)>MAX_DOCUMENT_CHARACTERS:
            raise RuntimeError('REQUIRED_CONTEXT_EXCEEDS_VIEW_BUDGET_'+source['id'])
        candidates = lexical_candidates(text, questions, frequencies, document_count)
        # First offer the strongest lexical window for each of the six questions.
        # The same fixed algorithm is used for all documents and both models.
        chosen = []
        for question in questions:
            ranked = sorted((row for row in candidates if question['id'] in row['scores']),
                            key=lambda row: (-row['scores'][question['id']], row['start']))
            if ranked:
                chosen.append(ranked[0])
        chosen += sorted(candidates, key=lambda row: (-sum(row['scores'].values()), row['start']))
        seen = set()
        for row in chosen:
            pair = (row['start'], row['end'])
            if pair in seen:
                continue
            seen.add(pair)
            proposed = merge_spans(spans + [pair])
            if view_size(proposed) <= MAX_DOCUMENT_CHARACTERS:
                spans = proposed
        selection = 'question-lexical-windows-plus-inspected-prose-and-introduction'
    parts = []
    mapping = []
    offset = 0
    for index, (start, end) in enumerate(spans):
        if index:
            parts.append(SEPARATOR)
            offset += len(SEPARATOR)
        fragment = text[start:end]
        parts.append(fragment)
        mapping.append({'originalStartCharacter': start, 'originalEndCharacter': end,
                        'inputStartCharacter': offset, 'inputEndCharacter': offset + len(fragment),
                        'sha256': sha(fragment)})
        offset += len(fragment)
    view = ''.join(parts)
    if len(view) > MAX_DOCUMENT_CHARACTERS:
        raise RuntimeError('DOCUMENT_VIEW_BOUND_EXCEEDED_' + source['id'])
    if not any(start <= passage['startCharacter'] and end >= passage['endCharacter'] for start, end in spans):
        raise RuntimeError('INSPECTED_PASSAGE_NOT_PRESERVED_' + source['id'])
    coverage = []
    for question in questions:
        selected = [row for row in candidates if question['id'] in row['scores']
                    and any(start <= row['start'] and end >= row['end'] for start, end in spans)]
        coverage.append({'questionId': question['id'],
                         'lexicalWindowSelected': bool(selected),
                         'matchedTerms': sorted({term for row in selected for term in row['matchedTerms'][question['id']]}),
                         'semanticCoverage': 'not-established-by-lexical-retrieval'})
    omitted = []
    previous = 0
    for start, end in spans:
        if previous < start:
            omitted.append({'startCharacter': previous, 'endCharacter': start, 'sha256': sha(text[previous:start])})
        previous = end
    if previous < len(text):
        omitted.append({'startCharacter': previous, 'endCharacter': len(text), 'sha256': sha(text[previous:])})
    return view, mapping, {
        'id': source['id'], 'packet': source['packet'], 'selectionMethod': selection,
        'snapshotCharacters': len(text), 'inputCharacters': len(view), 'snapshotNormalizedTextSha256': sha(text),
        'inputSha256': sha(view), 'excerptMap': mapping, 'omittedSpans': omitted,
        'inspectedPassagePreserved': True, 'questionRetrieval': coverage,
        'coverageReview': 'required-prose-present-context-selected-human-semantic-review-pending',
    }


def main():
    audit = json.loads((OUT / 'corpus-review/audit.json').read_text(encoding='utf-8'))
    audited = {row['id']: row for row in audit['records']}
    passages = {row['sourceId']: row for row in json.loads((OUT / 'corpus-review/private/passages.json').read_text(encoding='utf-8'))}
    sources = json.loads((SOURCE / 'documents.json').read_text(encoding='utf-8'))
    corpus = json.loads((ORIGINAL / 'public-input.json').read_text(encoding='utf-8'))
    public = copy.deepcopy(corpus)
    public['format'] = 'orbit-scoped-evidence-public-input-v2'
    public['inputPolicy'] = {'maxDocumentCharacters': MAX_DOCUMENT_CHARACTERS,
        'maxPacketCharacters': MAX_PACKET_CHARACTERS, 'sourceText': 'frozen-snapshot-only',
        'offsetUnit': 'Unicode code point offsets in normalized frozen snapshot',
        'selectionUsesAnswers': False, 'markersAreEvidence': False,
        'citationRule': 'A quotation must occur wholly within one mapped source span; generated boundary markers are not citable.',
        'limitations': ['Window selection is a prepared retrieval view, not exhaustive source reading or semantic annotation.',
                       'Absence from the selected view does not prove absence from the full source.']}
    originals = []
    selections = []
    files = {}
    source_texts = {source['id']: (SOURCE / source['snapshot']).read_text(encoding='utf-8') for source in sources}
    for packet in range(7, 11):
        questions = [q for q in public['questions'] if q['packet'] == packet]
        packet_sources = [source for source in sources if source['packet'] == packet]
        frequencies = Counter(term for source in packet_sources for term in tokens(source_texts[source['id']]))
        for source in packet_sources:
            identifier = source['id']; text = source_texts[identifier]
            view, mapping, review = select_view(source, text, questions, passages[identifier], frequencies, len(packet_sources))
            benchmark = next(row for row in public['documents'] if row['id'] == identifier)
            benchmark.update({'text': view, 'textTruncated': len(view) != len(text),
                'textSelectionMethod': review['selectionMethod'], 'excerptMap': mapping,
                'originalSnapshotSha256': sha(text), 'sourceContentSha256': source['contentHash'],
                'benchmarkSnapshotSha256': sha(view), 'contentAccess': 'selected-frozen-source-view',
                'originalAccess': 'private-original-access.json', 'semanticReview': 'pending-human'})
            live = audited[identifier]['liveOriginal']
            raw = OUT / 'corpus-review/private' / (identifier + '.response')
            raw_name = 'originals/' + identifier + '.response'
            snapshot_name = 'originals/' + identifier + '.snapshot.txt'
            files[snapshot_name] = text.encode('utf-8')
            access_state = 'retrieved-raw-and-frozen-snapshot' if live.get('state') == 'retrieved' and raw.exists() else 'frozen-snapshot-fallback'
            if access_state == 'retrieved-raw-and-frozen-snapshot':
                files[raw_name] = raw.read_bytes()
                if sha(files[raw_name]) != live['rawSha256']:
                    raise RuntimeError('AUDITED_RAW_FINGERPRINT_MISMATCH_' + identifier)
            originals.append({'id': identifier, 'packet': packet, 'title': source['title'], 'url': source['url'],
                'snapshotPath': snapshot_name, 'snapshotNormalizedTextSha256': sha(text),
                'declaredSourceContentSha256': source['contentHash'],
                'snapshotFileSha256': audited[identifier]['snapshotFileSha256'],
                'originalAccessState': access_state, 'liveOriginal': live,
                'retrievedRawPath': raw_name if access_state == 'retrieved-raw-and-frozen-snapshot' else None,
                'liveTextUsedInExperimentalInput': False,
                'licenseReview': 'rights-not-cleared', 'publicRedistributionAllowed': False})
            selections.append(review)
    counts = {packet: sum(len(d['text']) for d in public['documents'] if d['packet'] == packet) for packet in range(1, 11)}
    if len(public['documents']) != 120 or len(public['questions']) != 60 or len(originals) != 48:
        raise RuntimeError('DECLARED_CORPUS_COUNTS_MISMATCH')
    if any(characters > MAX_PACKET_CHARACTERS for characters in counts.values()):
        raise RuntimeError('PACKET_INPUT_BOUND_EXCEEDED')
    TARGET.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        target = TARGET / name; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
    (TARGET / 'public-input.json').write_text(json.dumps(public, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    access = {'format': 'orbit-private-original-access-v2', 'sourceCount': 48, 'records': originals,
              'publicRedistributionAllowed': False, 'experimentalInput': 'frozen-snapshot-only'}
    (TARGET / 'private-original-access.json').write_text(json.dumps(access, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    selection = {'format': 'orbit-corpus-selection-v2', 'documents': selections, 'packetCharacters': counts,
        'maxDocumentCharacters': MAX_DOCUMENT_CHARACTERS, 'maxPacketCharacters': MAX_PACKET_CHARACTERS,
        'sourceSelectionUsesAnswers': False, 'humanReviewedReferences': 0}
    (TARGET / 'selection-manifest.json').write_text(json.dumps(selection, indent=2) + '\n', encoding='utf-8')
    # Reference files are copied byte-for-byte without being read by selection.
    for name in ('private-gold.json', 'deterministic-fixtures.json'):
        shutil.copyfile(ORIGINAL / name, TARGET / name)
    manifest = {path.relative_to(TARGET).as_posix(): sha(path.read_bytes()) for path in sorted(TARGET.rglob('*')) if path.is_file() and path.name != 'corpus-files.json'}
    (TARGET / 'corpus-files.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'state': 'prepared-not-run', 'documents': 120, 'questions': 60, 'privateOriginals': 48,
        'mappedViews': len(selections), 'inspectedPassagesPreserved': sum(row['inspectedPassagePreserved'] for row in selections),
        'retrievedRawOriginals': sum(row['originalAccessState'] == 'retrieved-raw-and-frozen-snapshot' for row in originals),
        'snapshotFallbackOriginals': sum(row['originalAccessState'] == 'frozen-snapshot-fallback' for row in originals),
        'packetCharacters': counts, 'corpusSha256': sha((TARGET / 'public-input.json').read_bytes()),
        'humanReviewedReferences': 0, 'modelCallsExecuted': 0, 'softwareTestsExecuted': False}))


if __name__ == '__main__':
    main()
