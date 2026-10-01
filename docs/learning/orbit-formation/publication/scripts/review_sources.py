"""Inventory document references and lexical review locations; run no course software."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

BASE = Path(__file__).resolve().parents[1]
FILES = ['MASTER_MANUSCRIPT.md', 'TEACHER_GUIDE.md', 'ASSISTANT_MISSIONS.md', 'CANVA_BRIEFS.md']
LEXICAL = re.compile(r"(?i)(?:\b(?:sans|pas|aucun|aucune|ni|non|not|never|without|cannot|no)\b|\bn['’])")


def review() -> dict:
    rows = []
    for name in FILES:
        text = (BASE / name).read_text(encoding='utf-8')
        residuals, missing = [], []
        for number, line in enumerate(text.splitlines(), 1):
            matches = list(LEXICAL.finditer(line))
            if matches:
                if re.search(r'(?i)WebMCP|notebook|Colab|compil|empreinte|révision|source|statut|test|\bREADY\b|PRESENTED|UNAVAILABLE|version|code', line):
                    purpose = 'technical-or-status-boundary'
                elif re.search(r'(?i)Sanity|permission|partage|journal|privé|publ|autorité|identifiant', line):
                    purpose = 'security-or-authority-boundary'
                elif re.search(r'(?i)physique|mesure|vitesse|GPU|probabilité|scientifique|compréhension|maîtrise', line):
                    purpose = 'scientific-or-measurement-boundary'
                else:
                    purpose = 'manual-review-required'
                residuals.append({'line': number, 'matches': len(matches), 'markers': [m.group() for m in matches],
                                  'proposedPurpose': purpose, 'humanReviewStatus': 'pending'})
            for match in re.finditer(r'\[[^\]]+\]\(([^)]+)\)', line):
                parsed = urlsplit(match.group(1))
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                if not (BASE / unquote(parsed.path)).resolve().exists():
                    missing.append({'line': number, 'target': match.group(1)})
        rows.append({'path': name, 'sha256': hashlib.sha256((BASE / name).read_bytes()).hexdigest(),
                     'normalizedTextSha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
                     'hashScope': 'sha256 identifies exact file bytes; normalizedTextSha256 identifies the text used by this review',
                     'characters': len(text),
                     'localReferencesMissing': missing, 'negativeConstructionMatches': sum(r['matches'] for r in residuals),
                     'negativeConstructionLocations': residuals})
    master = (BASE / 'MASTER_MANUSCRIPT.md').read_text(encoding='utf-8')
    return {'state': 'DOCUMENT_SOURCE_REVIEW_PREPARED', 'preparedAt': datetime.now(timezone.utc).isoformat(),
            'softwareExecuted': False, 'documentExportsExecutedByThisStep': False, 'canvaProduced': False,
            'outputVisualQA': 'See qa/output-review.json and qa/document-delivery-review.json',
            'learnerUnderstanding': 'NOT_EXAMINED',
            'canonicalResearchPartnerDisclosureCount': master.count("J'ai utilisé Codex à son plein potentiel comme partenaire de recherche"),
            'negativeConstructionPolicy': 'Proposed purposes are source-review classifications; final editorial review remains pending. Exact protocol/security/scientific/status distinctions remain explicit.',
            'revisions': ['M3 pointer target and exact independent assembly browser35/35 synchronized',
                          'M4 controls and limits synchronized', 'M7 two-selection objective retained with corrected HTML choices',
                          'Project sequence retained as setting 1h / solo 6h / closure 1h',
                          'Native-registry ownership and public GET course Context differentiated',
                          'Historical and current evidence kept scoped by payload'], 'files': rows}


if __name__ == '__main__':
    report = review()
    (BASE / 'qa').mkdir(exist_ok=True)
    (BASE / 'qa/source-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')
    print(json.dumps({'state': report['state'], 'disclosures': report['canonicalResearchPartnerDisclosureCount'],
                      'missingLocalReferences': sum(len(r['localReferencesMissing']) for r in report['files']),
                      'negativeMatches': {r['path']: r['negativeConstructionMatches'] for r in report['files']},
                      'exportsExecutedByThisStep': False}, ensure_ascii=False))
