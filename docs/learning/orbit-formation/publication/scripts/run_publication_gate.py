"""Run the installed Book Publication Lab gate on documents; retain its limited scope."""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plugin-script', type=Path, required=True)
    args = parser.parse_args()
    if not args.plugin_script.is_file():
        raise ValueError('Installed Publication QA Gate script not found.')
    spec = importlib.util.spec_from_file_location('orbit_installed_publication_gate', args.plugin_script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    output = BASE / 'outputs'
    report = module.qa(output)
    # The plugin examines two rendered pages. Its automatic label is retained,
    # but does not certify every page, external links or the learning product.
    report['automaticPluginReadiness'] = report['readiness_label']
    report['readiness_label'] = 'review-ready-provisional' if not report['blockers'] else 'print-blocked'
    report['qualification'] = {
        'gate': 'Book Publication Lab Publication QA Gate',
        'renderScope': 'first-two-pages; supplemented by qa/output-review.json all-page rendering',
        'courseSoftwareExecuted': False,
        'learnerUnderstandingExamined': False,
        'humanApproval': False,
        'deliveryReady': False,
        'fullMissionComplete': False,
        'remaining': ['Context course-only admission HOLD', 'Canva not produced',
                      'Assembled browser and authenticated Studio retain separate evidence',
                      'Native Word pagination and external-link readback not certified'],
        'formatsExcluded': ['epub', 'podcast'],
    }
    # Reports exported with the package do not carry private runtime paths.
    text = json.dumps(report, ensure_ascii=False, indent=2)
    for path, label in [(BASE, '<publication>'), (Path.home(), '<home>')]:
        text = text.replace(str(path).replace('\\', '\\\\'), label).replace(path.as_posix(), label)
    sanitized = json.loads(text)
    (output / 'publication_qa.json').write_text(json.dumps(sanitized, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'state':'INSTALLED_PUBLICATION_QA_GATE_EXECUTED',
                      'automaticReadiness':sanitized['automaticPluginReadiness'],
                      'qualifiedReadiness':sanitized['readiness_label'],
                      'blockers':sanitized['blockers'], 'privatePathsExported':False}))
    return 2 if sanitized['blockers'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
