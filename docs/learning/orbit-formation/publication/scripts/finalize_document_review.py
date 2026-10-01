"""Record the scoped document review against an explicitly inspected PDF digest."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import zipfile

BASE = Path(__file__).resolve().parents[1]
MARKDOWN = ['MASTER_MANUSCRIPT.md', 'TEACHER_GUIDE.md', 'ASSISTANT_MISSIONS.md', 'CANVA_BRIEFS.md']
TOKEN_PATTERN = re.compile(r'(?:ghp_|github_pat_|e2b_|AIzaSy)[A-Za-z0-9_\-]{24,}')
REVIEWED_OUTPUTS = {'pdf': 'outputs/book.pdf', 'docx': 'outputs/book.docx'}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reviewed_output(output: dict, kind: str) -> dict:
    """Bind review metadata to the one exact file the package distributes."""
    rows = output.get(kind)
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict) or rows[0].get('path') != REVIEWED_OUTPUTS[kind]:
        raise ValueError('OUTPUT_ARTIFACT_SET_NOT_CANONICAL:' + kind)
    return rows[0]


def main() -> int:
    qa = BASE / 'qa'
    # Invalidate even when an input is missing, malformed or an argument is refused.
    # The previous outputs/receipts remain intact; only the generated inventory expires.
    (qa / 'final-publication-artifacts.json').unlink(missing_ok=True)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--visually-reviewed-pdf-sha256', required=True,
                        help='Exact digest of the rendered PDF inspected by Codex; never implies human approval.')
    args = parser.parse_args()
    source = json.loads((qa / 'source-review.json').read_text(encoding='utf-8'))
    output = json.loads((qa / 'output-review.json').read_text(encoding='utf-8'))
    export = json.loads((qa / 'export-report.json').read_text(encoding='utf-8'))
    gate = json.loads((BASE / 'outputs/publication_qa.json').read_text(encoding='utf-8'))
    try:
        pdf, docx = reviewed_output(output, 'pdf'), reviewed_output(output, 'docx')
    except ValueError as error:
        report = {'state': 'DOCUMENT_REVIEW_REQUIRES_REPAIR', 'recordedAt': datetime.now(timezone.utc).isoformat(),
                  'readiness': 'print-blocked', 'documentReadyForAuthorReview': False,
                  'deliveryReady': False, 'fullMissionComplete': False,
                  'expectedArtifacts': REVIEWED_OUTPUTS, 'failures': [str(error)]}
        (qa / 'document-delivery-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(json.dumps(report))
        return 2
    failures = []
    source_rows = {row['path']:row for row in source['files']}
    for name in MARKDOWN:
        if name not in source_rows:
            failures.append('SOURCE_REVIEW_INVENTORY_INCOMPLETE')
        elif digest(BASE / name) != source_rows[name]['sha256']:
            failures.append('SOURCE_REVIEW_DIFFERS_FROM_MAINTAINED_SOURCE')
    if digest(BASE / 'MASTER_MANUSCRIPT.md') != export['sourceSha256']:
        failures.append('MANUSCRIPT_DIFFERS_FROM_EXPORT_INPUT')
    for row in [pdf, docx]:
        if digest(BASE / row['path']) != row['sha256']:
            failures.append('OUTPUT_DIFFERS_FROM_RENDER_OR_STRUCTURE_REVIEW')
        if export.get('artifactSha256', {}).get(Path(row['path']).name) != row['sha256']:
            failures.append('OUTPUT_DIFFERS_FROM_EXPORT_ARTIFACT')
    visual_hash_matches = args.visually_reviewed_pdf_sha256 == pdf['sha256'] == digest(BASE / pdf['path'])
    if not visual_hash_matches:
        failures.append('VISUAL_REVIEW_DIGEST_DIFFERS')
    if not pdf['allPagesRendered'] or pdf['outsidePageSpanCount'] or pdf.get('overlapCandidateCount'):
        failures.append('PDF_RENDER_OR_LAYOUT_REQUIRES_REVIEW')
    if pdf['replacementCharacterCount'] or not pdf['authorMatches'] or pdf['language'] != 'fr-CA':
        failures.append('PDF_TEXT_OR_METADATA_REQUIRES_REVIEW')
    if docx['canonicalDisclosureCount'] != 1 or not docx['authorMatches']:
        failures.append('DOCX_DISCLOSURE_OR_AUTHOR_REQUIRES_REVIEW')
    if source['canonicalResearchPartnerDisclosureCount'] != 1:
        failures.append('SOURCE_DISCLOSURE_REQUIRES_REVIEW')
    if any(row['localReferencesMissing'] for row in source['files']):
        failures.append('LOCAL_SOURCE_REFERENCE_MISSING')
    if gate['blockers'] or export['blockers']:
        failures.append('EXPORT_OR_INSTALLED_PUBLICATION_GATE_BLOCKER')
    scanned = []
    for name in MARKDOWN + ['outputs/book.tex', 'source-map.json', 'outputs/publication_qa.json']:
        path = BASE / name
        scanned.append(name)
        if TOKEN_PATTERN.search(path.read_text(encoding='utf-8')):
            failures.append('CREDENTIAL_MARKER_FOUND_IN_SELECTED_DOCUMENT')
    # Text readback of the editable archive; no macro or code execution.
    with zipfile.ZipFile(BASE / docx['path']) as archive:
        for name in archive.namelist():
            if name.endswith('.xml') and TOKEN_PATTERN.search(archive.read(name).decode('utf-8')):
                failures.append('CREDENTIAL_MARKER_FOUND_IN_DOCX_XML')
    report = {
        'state':'DOCUMENT_REVIEW_COPY_QA_COMPLETE' if not failures else 'DOCUMENT_REVIEW_REQUIRES_REPAIR',
        'recordedAt':datetime.now(timezone.utc).isoformat(),
        'readiness':'review-ready-provisional' if not failures else 'print-blocked',
        'documentReadyForAuthorReview':not failures,
        'deliveryReady':False,
        'fullMissionComplete':False,
        'courseSoftwareExecutedByDocumentWorkflow':False,
        'canvaProducedByThisWorkflow':False,
        'learnerUnderstandingExamined':False,
        'humanContentApproval':False,
        'sourceSha256':export['sourceSha256'],
        'sources':{name:digest(BASE / name) for name in MARKDOWN},
        'pdf':{'path':pdf['path'], 'sha256':pdf['sha256'], 'pages':pdf['pages'],
               'allPagesRendered':pdf['allPagesRendered'],
               'visualReview':'Codex reviewed rendered page contact sheets and critical full-size pages' if visual_hash_matches and pdf['allPagesRendered'] else 'VISUAL_REVIEW_NOT_BOUND_TO_CURRENT_RENDERED_PDF',
               'outsidePageSpanCount':pdf['outsidePageSpanCount'],
               'overlapCandidateCount':pdf.get('overlapCandidateCount'),
               'replacementCharacterCount':pdf['replacementCharacterCount'],
               'linksObserved':pdf['totalLinks'], 'everyExternalDestinationRetested':False},
        'docx':{'path':docx['path'], 'sha256':docx['sha256'], 'paragraphs':docx['paragraphs'],
                'tables':docx['tables'], 'authorMatches':docx['authorMatches'],
                'canonicalDisclosureCount':docx['canonicalDisclosureCount'], 'nativeWordPaginationVerified':False},
        'installedPublicationGate':{'automaticReadiness':gate['automaticPluginReadiness'],
                                    'qualifiedReadiness':gate['readiness_label'],
                                    'renderScope':'two pages; complemented by the complete PDF render'},
        'credentialMarkerScan':{'files':scanned, 'docxXmlChecked':True, 'valuesPrinted':False,
                                'scope':'Known credential prefixes only; not a general proof of absence'},
        'preservedBoundaries':['40 hours: teacher10 / solo30; final project setting1 / solo6 / closure1',
                              'Course Context HTTP9 and public native cross-origin16 verified, with audited scope',
                              'Canva and authenticated Studio keep their own qualification',
                              'Actual assembly browser keeps its latest independent receipt',
                              'Official embedded files.upload picker not qualified by control; explicit Files-panel selection and assembly observed in the separate free-Colab receipt',
                              'No editorial, promotion, new tutorial or voice cloning'],
        'sourceOriginalityScope':'Authorized course files and teaching scripts are identified in source-map.json; primary external resources are linked. No external plagiarism service was used.',
        'sourceReviewBinding':{'path':'qa/source-review.json', 'sha256':digest(qa / 'source-review.json'), 'maintainedFiles':MARKDOWN},
        'voiceReviewScope':'Written scripts and proposed intonation; no recorded vocal reproduction or human content acceptance.',
        'failures':sorted(set(failures)),
    }
    (qa / 'document-delivery-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    if not failures:
        selected = MARKDOWN + [
            'README.md', 'QUALIFICATION.md', 'TOOLCHAIN_AND_VERSIONS.md', 'CANVA_DELIVERY.md', 'CANVA_DELIVERY.json',
            'QA_CHECKLIST.md', 'book_project.yml', 'source-map.json', 'voice_profile.json',
            'outputs/MASTER_MANUSCRIPT.md', 'outputs/book.docx', 'outputs/book.pdf',
            'outputs/book.tex', 'outputs/fingerprints.json', 'outputs/header.tex',
            'outputs/reference.docx', 'outputs/package_manifest.json',
            'outputs/publication_qa.json', 'outputs/pdf-render/page-01.png',
            'outputs/pdf-render/page-02.png', 'qa/source-composition.json',
            'qa/source-review.json', 'qa/output-review.json', 'qa/export-report.json',
            'qa/export-docx.json', 'qa/export-latex.json', 'qa/export-pdf.json',
            'qa/document-delivery-review.json',
        ]
        selected += [path.relative_to(BASE).as_posix() for path in sorted((BASE / 'scripts').glob('*.py'))]
        selected += [path.relative_to(BASE).as_posix() for path in sorted((qa / 'canva').glob('*.png'))]
        selected += [path.relative_to(BASE).as_posix() for path in sorted((qa / 'input-snapshots').glob('*.md'))]
        # Distribute only this PDF's rendered proof, never an older provisional render.
        render_directory = 'qa/render/book-' + pdf['sha256'][:12] + '/'
        for row in pdf['pageRows']:
            name = row['render']
            if not name.startswith(render_directory) or digest(BASE / name) != row['pngSha256']:
                raise ValueError('CURRENT_RENDER_IMAGE_DIFFERS_FROM_OUTPUT_REVIEW')
            selected.append(name)
        for name in pdf['contactSheets']:
            if not name.startswith(render_directory):
                raise ValueError('CONTACT_SHEET_OUTSIDE_CURRENT_RENDER')
            selected.append(name)
        inventory = []
        for name in selected:
            path = BASE / name
            data = path.read_bytes()
            textual = path.suffix in {'.md', '.json', '.yml', '.tex', '.py'}
            if textual and b'\r\n' in data:
                raise ValueError('Public document text is not canonical LF: ' + name)
            inventory.append({'path':name, 'bytes':len(data),
                              'sha256':hashlib.sha256(data).hexdigest(),
                              'byteScope':'UTF-8 LF' if textual else 'exact binary bytes'})
        (qa / 'final-publication-artifacts.json').write_text(json.dumps({
            'state':'FINAL_DOCUMENT_REVIEW_DISTRIBUTION_INVENTORY',
            'readiness':'review-ready-provisional',
            'deliveryReady':False, 'fullMissionComplete':False,
            'selfHashIncluded':False, 'artifacts':inventory,
            'excluded':['qa/final-publication-artifacts.json', 'outputs/book.log',
                        'outputs/book.aux', 'outputs/book.out', 'outputs/book.toc',
                        'qa/render/history/', 'all render directories for other PDF digests'],
            'renderProof':'All pages and contact sheets for the exact current PDF digest are included; historical and provisional renders are excluded.',
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({key:report[key] for key in ['state', 'documentReadyForAuthorReview', 'deliveryReady', 'fullMissionComplete', 'failures']}))
    return 2 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
