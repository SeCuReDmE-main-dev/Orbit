#!/usr/bin/env python3
"""Prepare or explicitly build DOCX/LaTeX/PDF from the maintained manuscript; never install tools or claim visual QA."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

PUBLICATION = Path(__file__).resolve().parents[1]
REPO = PUBLICATION.parents[3]
DEFAULT_TOOLCHAIN_REPORT = REPO / '.orbit' / 'formation-20261001' / 'publication-toolchain.json'


def sanitize_log(value: str) -> str:
    """Keep public build reports independent of private runtime paths."""
    for path, label in [(PUBLICATION, '<publication>'), (REPO, '<repo>'), (Path.home(), '<home>')]:
        value = value.replace(str(path), label).replace(path.as_posix(), label)
    return value


def public_invocation(args: list[str]) -> list[str]:
    return [Path(item).name if index == 0 else '--pdf-engine=xelatex' if item.startswith('--pdf-engine=') else sanitize_log(item) for index, item in enumerate(args)]


def command(args: list[str], cwd: Path, env: dict[str, str], timeout: int = 900) -> dict:
    completed = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=env)
    return dict(command=public_invocation(args), exitCode=completed.returncode, stdout=sanitize_log(completed.stdout[-20000:]), stderr=sanitize_log(completed.stderr[-20000:]))


def resolve_tool(name: str, inventory: dict) -> tuple[str | None, dict]:
    """Inspect an existing executable path without running or installing it."""
    recorded = inventory.get('tools', {}).get(name, {})
    path = shutil.which(name)
    source = 'PATH' if path else 'recorded-private-preflight'
    if not path:
        candidate = recorded.get('path')
        path = candidate if isinstance(candidate, str) and Path(candidate).is_file() else None
    return path, dict(available=bool(path), discovery=source if path else 'unavailable', recordedVersion=recorded.get('version'), executableName=Path(path).name if path else None)


def font_observation(name: str) -> dict:
    files = {'Arial': ['arial.ttf', 'arialbd.ttf', 'ariali.ttf', 'arialbi.ttf'], 'Consolas': ['consola.ttf', 'consolab.ttf', 'consolai.ttf', 'consolaz.ttf']}.get(name, [])
    directory = Path(os.environ.get('WINDIR', 'C:\\Windows')) / 'Fonts'
    observed = [filename for filename in files if (directory / filename).is_file()]
    return dict(name=name, files=observed, status='INSTALLED_FILES_OBSERVED_RENDER_PENDING' if files and len(observed) == len(files) else 'TO_VERIFY_IN_RENDER')


def reference_docx(path: Path, body: str, heading: str, mono: str) -> None:
    from docx import Document
    from docx.shared import Cm, Pt, RGBColor

    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21); section.page_height = Cm(29.7)
    section.top_margin = section.bottom_margin = section.left_margin = section.right_margin = Cm(2.2)
    normal = doc.styles['Normal']; normal.font.name = body; normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string('18212B')
    normal.paragraph_format.line_spacing = 1.15; normal.paragraph_format.space_after = Pt(6)
    for name, size in [('Title', 28), ('Heading 1', 22), ('Heading 2', 16), ('Heading 3', 13), ('Heading 4', 11)]:
        style = doc.styles[name]; style.font.name = heading; style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string('006C82')
        style.paragraph_format.keep_with_next = True
        if name == 'Heading 1': style.paragraph_format.page_break_before = True
    for name in ['Source Code', 'Verbatim Char', 'Code']:
        if name in doc.styles:
            doc.styles[name].font.name = mono; doc.styles[name].font.size = Pt(9)
    doc.core_properties.title = 'Orbit Formation'
    doc.core_properties.author = 'Jean-Sébastien Beaulieu'
    doc.core_properties.subject = 'Manuel de formation — 40 heures, apprendre et enseigner'
    doc.save(path)


def rebase_output_links(text: str) -> str:
    def replace(match: re.Match) -> str:
        label, destination = match.group(1), match.group(2)
        if destination.startswith(('https://', 'http://', '#', 'mailto:')):
            return match.group(0)
        return f'[{label}](../{destination})'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', replace, text)


def format_digest_literals(text: str) -> tuple[str, list[str]]:
    """Keep readable inline/table identifiers and a complete, unaltered digest appendix."""
    digests = list(dict.fromkeys(re.findall(r'`([a-f0-9]{64}|[a-f0-9]{40})`', text)))
    if not digests:
        return text, []
    for digest in digests:
        text = text.replace(f'`{digest}`', f'`{digest[:8]}…{digest[-6:]}`')
    text += '\n\n# Empreintes intégrales de lecture\n\nLes tableaux et paragraphes de cette édition abrègent les identifiants longs pour garder leur lecture dans la page. Les valeurs intégrales ci-dessous sont recopiées sans modification depuis le manuscrit maintenu; les reçus liés précisent leur objet et leur scénario.\n\n'
    text += 'Valeurs intégrales, numérotées par ordre de première apparition dans le manuscrit :\n\n```text\n'
    for index, digest in enumerate(digests, 1):
        text += f'{index:02}  {digest}\n'
    text += '```\n'
    return text, digests


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='Build only after explicit coordinator dispatch.')
    parser.add_argument('--allow-provisional', action='store_true', help='Allow a labelled draft while cloud qualification IDs remain pending.')
    parser.add_argument('--body-font', default='Arial')
    parser.add_argument('--heading-font', default='Arial')
    parser.add_argument('--mono-font', default='Consolas')
    parser.add_argument('--toolchain-report', type=Path, default=DEFAULT_TOOLCHAIN_REPORT, help='Use inspected executable paths; report remains private and its paths are not exported.')
    args = parser.parse_args()
    output = PUBLICATION / 'outputs'; qa = PUBLICATION / 'qa'
    output.mkdir(parents=True, exist_ok=True); qa.mkdir(parents=True, exist_ok=True)
    manuscript = PUBLICATION / 'MASTER_MANUSCRIPT.md'
    qualification = (PUBLICATION / 'QUALIFICATION.md').read_text(encoding='utf-8')
    pending = 'deliveryReady: false' in qualification
    inventory, inventory_error = {}, None
    if args.toolchain_report.is_file():
        try:
            inventory = json.loads(args.toolchain_report.read_text(encoding='utf-8'))
        except (OSError, ValueError) as error:
            inventory_error = type(error).__name__
    resolved = {name: resolve_tool(name, inventory) for name in ['pandoc', 'xelatex']}
    tools = {name: result[1] for name, result in resolved.items()}
    report = dict(createdAt=datetime.now(timezone.utc).isoformat(), status='PREFLIGHT_ONLY', tools=tools,
                  fonts=dict(body=font_observation(args.body_font), heading=font_observation(args.heading_font), mono=font_observation(args.mono_font), renderingExecuted=False),
                  toolchainInventory=dict(present=args.toolchain_report.is_file(), recordedAt=inventory.get('created_at'), readError=inventory_error, privatePathsExported=False),
                  sourceExists=manuscript.exists(), sourceSha256=hashlib.sha256(manuscript.read_bytes()).hexdigest() if manuscript.exists() else None,
                  qualificationPending=pending, executed=False, readiness='draft', visualQA='NOT_EXECUTED', learnerUnderstanding='NOT_EXAMINED', commands=[])
    blockers = []
    if not manuscript.exists(): blockers.append('MASTER_MANUSCRIPT_MISSING')
    if args.execute and pending and not args.allow_provisional: blockers.append('DOCUMENT_QUALIFICATION_PENDING')
    if args.execute and not all(item['available'] for item in tools.values()): blockers.append('PANDOC_OR_XELATEX_UNAVAILABLE')
    if args.execute:
        try:
            import docx  # Editable output styling, never a substitute print engine.
        except ImportError:
            blockers.append('PYTHON_DOCX_UNAVAILABLE')
    report['blockers'] = blockers
    if not args.execute or blockers:
        if blockers: report['status'] = 'PRINT_BLOCKED' if args.execute else 'PREFLIGHT_BLOCKED'
        (qa / 'export-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(json.dumps(dict(status=report['status'], blockers=blockers, executed=False), ensure_ascii=False))
        return 2 if blockers else 0

    reference_docx(output / 'reference.docx', args.body_font, args.heading_font, args.mono_font)
    printed_text, digests = format_digest_literals(rebase_output_links(manuscript.read_text(encoding='utf-8')))
    (output / 'MASTER_MANUSCRIPT.md').write_text(printed_text, encoding='utf-8', newline='\n')
    (output / 'fingerprints.json').write_text(json.dumps({'state':'EXACT_SOURCE_DIGESTS_RETAINED', 'inlineDisplay':'first8-ellipsis-last6', 'values':digests}, indent=2) + '\n', encoding='utf-8', newline='\n')
    report['literalPresentation'] = {'abbreviatedInlineDigestCount':len(digests), 'completeValuesRetained':True, 'sourceModified':False}
    # Wrapping is visible; a long literal remains intact in the Markdown source.
    (output / 'header.tex').write_text('''\\usepackage{fvextra}
\\DefineVerbatimEnvironment{Highlighting}{Verbatim}{breaklines,breakanywhere,commandchars=\\\\\\{\\}}
\\fvset{fontsize=\\small}
\\setlength{\\emergencystretch}{3em}
\\definecolor{orbitcyan}{HTML}{006C82}
\\AtBeginDocument{\\renewcommand{\\contentsname}{Table des matières}\\hypersetup{colorlinks=true,linkcolor=orbitcyan,urlcolor=orbitcyan}}
''', encoding='utf-8', newline='\n')
    environment = dict(os.environ)
    environment['PATH'] = str(Path(resolved['xelatex'][0]).parent) + os.pathsep + environment.get('PATH', '')
    common = [resolved['pandoc'][0], 'MASTER_MANUSCRIPT.md', '--from=markdown+tex_math_dollars', '--standalone', '--toc', '--toc-depth=3',
              '--metadata=title:Orbit Formation', '--metadata=author:Jean-Sébastien Beaulieu', '--metadata=lang:fr-CA']
    jobs = [
        ('docx', [*common, '--reference-doc=reference.docx', '-o', 'book.docx']),
        ('latex', [*common, '--include-in-header=header.tex', '-V', 'documentclass=report', '-V', 'papersize=a4', '-V', 'geometry:margin=22mm',
                   '-V', 'fontsize=11pt', '-V', f'mainfont={args.body_font}', '-V', f'sansfont={args.heading_font}', '-V', f'monofont={args.mono_font}', '-o', 'book.tex']),
        ('pdf', [resolved['xelatex'][0], '-interaction=nonstopmode', '-halt-on-error', 'book.tex']),
    ]
    built = {}
    for format_name, invocation in jobs:
        try:
            if format_name == 'pdf':
                tex_path = output / 'book.tex'
                tex = tex_path.read_text(encoding='utf-8')
                # Inline identifiers may wrap at separators; verbatim source blocks stay intact.
                def break_identifier(match: re.Match) -> str:
                    content = match.group(1).replace('\\_', '\\_\\allowbreak{}').replace('/', '/\\allowbreak{}')
                    content = re.sub(r'([a-z0-9])(?=[A-Z])', r'\1\\allowbreak{}', content)
                    return '\\texttt{' + content + '}'
                tex = re.sub(r'\\texttt\{([^{}]+)\}', break_identifier, tex)
                def break_status_link(match: re.Match) -> str:
                    return match.group(1) + match.group(2).replace('\\_', '\\_\\allowbreak{}') + '}'
                tex = re.sub(r'(\\href\{[^{}]+\}\{)([A-Z]+(?:\\_[A-Z]+){2,})\}', break_status_link, tex)
                tex = re.sub(r'(\\textbf\{Empreinte \d+ .*?\\end\{Shaded\})',
                             lambda match: '\\begin{samepage}\n' + match.group(1) + '\n\\end{samepage}',
                             tex, flags=re.S)
                tex_path.write_text(tex, encoding='utf-8', newline='\n')
                passes = [command(invocation, output, environment, timeout=1800) for _ in range(3)]
                result = dict(passes[-1])
                result['passes'] = passes
                result['exitCode'] = next((item['exitCode'] for item in passes if item['exitCode'] != 0), 0)
                report['inlineIdentifierWrapping'] = 'TeX discretionary breaks after underscore/slash and at camel-case boundaries; source identifiers preserved.'
            else:
                result = command(invocation, output, environment, timeout=1800)
        except Exception as error:
            result = dict(command=public_invocation(invocation), exitCode=None, error=sanitize_log(str(error)))
        report['commands'].append(result)
        (qa / f'export-{format_name}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        built[format_name] = dict(returncode=result['exitCode'], path=f"book.{'tex' if format_name == 'latex' else format_name}")
        if result['exitCode'] != 0: blockers.append(f'{format_name.upper()}_BUILD_FAILED')
    report.update(executed=True, status='EXPORTS_BUILT_PENDING_QA' if not blockers else 'PRINT_BLOCKED', readiness='review-ready' if not blockers else 'print-blocked')
    # This export-phase inventory excludes auxiliary logs, itself and a QA
    # report belonging to a preceding run. Final QA has a separate inventory.
    distributed = ['MASTER_MANUSCRIPT.md', 'book.docx', 'book.pdf', 'book.tex',
                   'fingerprints.json', 'header.tex', 'reference.docx']
    files = {name: hashlib.sha256((output / name).read_bytes()).hexdigest()
             for name in distributed if (output / name).is_file()}
    report['artifactSha256'] = files
    (qa / 'export-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    manifest = dict(project=dict(title='Orbit Formation', authors=['Jean-Sébastien Beaulieu'], language='fr-CA', edition='1.0 source de revue'),
                    phase='document-export-before-final-qa', built=built, blockers=blockers, visualQA='NOT_EXECUTED', requestedFormats=['markdown','docx','latex','pdf'], excludedFormats=['epub','podcast'], excludedFiles=['book.log','book.aux','book.out','book.toc','package_manifest.json','publication_qa.json'], qualificationPending=pending, sha256=files)
    (output / 'package_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(dict(status=report['status'], readiness=report['readiness'], visualQA='NOT_EXECUTED', blockers=blockers), ensure_ascii=False))
    return 2 if blockers else 0


if __name__ == '__main__':
    raise SystemExit(main())
