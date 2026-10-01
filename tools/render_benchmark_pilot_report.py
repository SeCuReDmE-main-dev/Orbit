"""Build an inspectable development report from measured aggregates."""
import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape
import fitz
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/delivery-2026-09-29/benchmark-pilot'
OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((ROOT/'web/public/benchmark/gemini-development-pilots.json').read_text())
manifest=json.loads((ROOT/'.orbit/kaggle-pilot-v2/manifest.json').read_text())
fonts={'Body':'C:/Windows/Fonts/calibri.ttf','Heading':'C:/Windows/Fonts/seguisb.ttf','Mono':'C:/Windows/Fonts/consola.ttf'}
for name,path in fonts.items():
    pdfmetrics.registerFont(TTFont(name,path))
navy=colors.HexColor('#15172D'); cyan=colors.HexColor('#00788C'); violet=colors.HexColor('#6843A3'); amber=colors.HexColor('#946313')
styles={
 'title':ParagraphStyle('Title',fontName='Heading',fontSize=29,leading=34,textColor=navy,spaceAfter=20),
 'h1':ParagraphStyle('Heading',fontName='Heading',fontSize=19,leading=24,textColor=violet,spaceAfter=14),
 'h2':ParagraphStyle('Subheading',fontName='Heading',fontSize=12.5,leading=16,textColor=cyan,spaceBefore=12,spaceAfter=7),
 'body':ParagraphStyle('Body',fontName='Body',fontSize=11,leading=15.5,textColor=navy,spaceAfter=10),
 'small':ParagraphStyle('Small',fontName='Body',fontSize=9,leading=12.5,textColor=navy,spaceAfter=8),
 'mono':ParagraphStyle('Mono',fontName='Mono',fontSize=8.5,leading=12,textColor=navy,spaceAfter=8),
}
story=[]; manuscript=[]
def p(text,style='body'):
    story.append(Paragraph(text,styles[style])); manuscript.append(re.sub('<[^>]+>','',text))
def heading(text): p(text,'h1')
def sub(text): p(text,'h2')
def newpage(): story.append(PageBreak())
def table(rows,widths):
    cells=[[Paragraph(escape(str(x)),styles['small']) for x in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EBE9F5')),('LINEBELOW',(0,0),(-1,0),0.7,violet),('LINEBELOW',(0,1),(-1,-1),0.3,colors.HexColor('#D4D8E0')),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story.append(t); story.append(Spacer(1,12)); manuscript.extend(' | '.join(str(x) for x in r) for r in rows)

p('ORBIT / EVIDENCE OBSERVATORY','h2')
p('Scoped evidence.<br/>Measured decisions.','title')
p('Gemini development pilots and the path to an independent benchmark','h1')
p('Edition 0.4 • Observations through 29 September 2026 (Toronto)<br/>Development report • Human interpretation and final review pending','small')
p('Orbit evaluates atomic claims against exact passages and declared conditions. The milestone checks the extraction contract on six controlled questions and observes model-chosen Sanity reads. Schema, browser and citation-chain failures remain visible.')
table([['Observed layer','Measured result'],['Deterministic development suite','Baseline, N and P: 36/36 decisions; equality'],['Kaggle notebook pilot v2','Flash and Pro: 6/6 decisions, 8/8 exact passages, 53/53 checks'],['Antigravity pilot v1','Three runs: 6/6 decisions; one rejected scope record in each'],['Public agent observations','W01: consent refusal. W02: Flash/Pro read Context; provenance audit fails.']],[190,315])
p('Interpretation: these measurements support development readiness and reveal a contract repair. Independent real-source validation and model repetitions will determine the product default. The current scores establish no theoretical superiority.','body')
sub('Proposed research-partner disclosure — author review pending')
p('I used Codex to its fullest potential as a research partner—for code mapping, source comparison, evidence organization, consistency checks, editorial control, and deliverable preparation. I formulated the intent, defined the scope, interpreted the results, arbitrated the conclusions, and preserved every public decision. This collaboration expands my investigative capacity; judgment, responsibility, authorship, and final signature remain under my authority.','small')

newpage(); heading('01 / A common evidence contract')
sub('What is classified')
p('The unit is an atomic claim in a declared scope, rather than a whole document labeled true or false. A passage may support a claim, oppose another claim, or provide context. Scope carries subject, property, value and the applicable provider, product, execution mode, conditions or version.')
table([['Output','Meaning'],['T — support','Verified direct passages supporting the claim in scope'],['I — indeterminacy','Explicit missing conditions, unavailable evidence or unchecked passages'],['F — counterproof','Verified direct passages opposing the same claim in scope'],['ADMIT / REJECT / HOLD','Operational recommendation, separate from human judgment']],[150,355])
p('T, I and F remain independent evidence sets. A conflicting claim can have both T and F. Their counts are neither probabilities nor three portions summing to 100%. Presence of an exact quotation and semantic relevance are separate questions.')
sub('Why pilot v2 differs from v1')
p('The fifth v1 case asks about an unspecified retention condition. Each tested model returns the appropriate HOLD and an exact contextual quote, but provides a scope object missing property and value. The portable schema rejects that record. We preserved the original outputs.')
p('Prompt v2 states the two valid forms explicitly: a complete atomic scope, or an omitted scope for purely contextual evidence. Both Kaggle model runs satisfy the clarified contract. This is a new prompt version; v1 and v2 scores are kept separate.')
sub('How leakage is controlled')
p('Models receive the public twelve-document input and six questions. Gold labels are used by the scorer. The same extraction is fed to all engines. The final campaign will freeze independent cases, source snapshots, rules and code hashes before scoring.')

newpage(); heading('02 / Results and their limits')
table([['Model / host','Prompt','Decision','Quote','Schema'],['Gemini 3.8 Flash / Kaggle','v2','6/6','8/8','0 errors'],['Gemini 3.1 Pro Preview / Kaggle','v2','6/6','8/8','0 errors'],['Gemini 3.8 Flash High / Antigravity UI','v1','6/6','8/8','1 error'],['Gemini 3.8 Flash High / Antigravity CLI','v1','6/6','8/8','1 error'],['Gemini 3.1 Pro High / Antigravity CLI','v1','6/6','8/8','1 error']],[235,45,75,65,85])
p('In Kaggle, all three engine configurations evaluate six records correctly for each model. In v1, each engine evaluates five records correctly and rejects the remaining malformed scope. Denominators remain visible so that a rejected record cannot disappear from the reported coverage.')
sub('Assertions are checks, not sample size')
p('The 53 Kaggle assertions cover six questions, quote checks, schema validity and engine outputs. They are correlated checks within the same small sample. The development suite also reuses known synthetic cases. These results cannot support a generalization claim or a scientific ranking.')
sub('Equal decisions have a specific explanation')
p('The classic baseline and N currently share eligibility and recommendation logic. N represents independent support, counterproof and uncertainty; that representation alone does not create a different decision algorithm. P additionally applies discrete attribute rules. An independent corpus must isolate the cases where those rules change a conclusion correctly.')
sub('Resources and host differences')
p('Kaggle notebook usage reports 1,147 input tokens for each model; Flash outputs 2,173 tokens and Pro 5,261. Their reported quota costs sum to US$0.074435. The later task-page quota reads US$0.18 used of US$10 daily and US$100 monthly; it includes a broader activity scope. These are existing free quotas, with no purchase or top-up.')
p('Antigravity CLI uses the existing official account and its actual High model variants. Host defaults, caching and reasoning budgets differ from Kaggle. Durations and tokens remain descriptive metadata; they are not a normalized intelligence or speed ranking.')

newpage(); heading('03 / What actually ran on Orbit')
sub('Native WebMCP transport')
p('An isolated headed Chrome session discovers and invokes tools registered by the live page. The scripted transport check observes fifteen tools, READY capabilities, and CONSENT_REQUIRED when requesting an unshared private question. It does not manufacture dossier consent or human decisions.')
sub('Public Sanity Context reads')
p('Actual public-page reads returned READY for privacy and deep-research paths, and for Sanity Knowledge Base and schema/Studio paths. The returned text comes from the existing Knowledge Base. This proves connectivity; the effect of its structure on a full answer still requires the paired Context-versus-text experiment.')
sub('Model-chosen calls through an external JSON planner')
p('Flash chooses capabilities and a private-question request, then receives READY and CONSENT_REQUIRED from the live page. Its final answer overgeneralizes that refusal to Context: the public corpus has a separate permission boundary. Pro reads capabilities, then a page-generation guard refuses its next request. These observations do not repair native Antigravity MCP integration or establish a full research workflow. Earlier failures remain preserved.','small')
sub('W02: a response with an incomplete evidence chain')
p('Flash makes four native calls, reads two entries separately and returns four exact quotes; only one claim includes an observed original URL. Its fourth quote also needs semantic review. Pro makes two calls and combines both entries despite the instruction: individual entry binding fails, both URLs are absent, and its limitations array is empty. Neither response passes the provenance audit.','small')
table([['Preserved attempt','Observed limitation'],['W02 startup interruptions','Three attempts stop before any model call; not model reasoning failures'],['W01 native CLI integration','No injected tools, prohibited fallback or filters; no completed native mission'],['Upstream Context citations','Named Web references have no original URL in the returned text']],[195,310])
p('Orbit now reports observed citation metadata and unresolved URLs. It preserves the Context text and never infers a source address from a title. Reading an entry does not establish original-document verification or semantic support.','small')
sub('Release and startup verification')
p('The preceding public release passed eight route checks and three byte-for-byte artifact checks, with a rollback backup. A readline startup race is fixed: an immediate initialize request now receives a response before further requests. The regression uses real native WebMCP and no model. This edition is prepared for a separately verified release.','small')

newpage(); heading('04 / The independent campaign ahead')
table([['Layer','Acceptance evidence still required'],['Corpus','Ten packets × twelve documents; sixty questions; real labels human-reviewed'],['Engines and models','Common extraction; balanced repetitions; false contradictions and HOLD coverage'],['Sanity contribution','Same original corpus and question; structured Context versus text retrieval'],['Agent missions','Actual tool choice, bounded handoffs, provenance, revocation and stale revisions'],['Product review','Two human end-to-end paths, source audit and dossier export']],[140,365])
p('The engine selection follows integrity first, fewer unjustified conclusions second, useful resolution third, then scope distinctions and cost. A simpler reference may win. The product retains N and P as explicit configurations while measurement determines their role.')
p('Four real-source candidate packets now contain 48 retrieved documents and 24 questions: IA policies, Sanity documentation, robotic pollination, and swarms. None has a human-adjudicated gold answer yet. Metadata and links are public; full texts stay private pending license review.','small')
sub('Reproduction entry points')
for cmd in ['python tools/benchmark_suite_a.py --corpus .orbit/benchmark-corpus-development --output .orbit/benchmark-results/suite-a-replay.json','python tools/summarize_benchmark.py','python tools/test_webmcp_transport.py','python tools/prepare_kaggle_pilot.py --model google/gemini-3.8-flash --model google/gemini-3.1-pro-preview']:
    p(escape(cmd),'mono')
p('Run canonical scripts from the Orbit repository root. New model calls require a quota precheck and a fresh experiment identifier. A saved trace is a replay, not a new independent run.','small')
sub('Inspect the evidence')
for label,url in [('Live protocol, aggregates and private Kaggle owner links','https://orbit.securedme.ca/benchmark/')]:
    p(f'<link href="{url}" color="#00788C">{escape(label)}</link>','small')
sub('Frozen pilot fingerprints')
for label,key in [('Shared TypeScript bundle','engineSha256'),('Prompt v2','promptSha256')]:
    value=manifest[key]; p(label,'small'); p(value[:32]+'<br/>'+value[32:],'mono')
p('Canonical safe outputs, CSV, source hashes, failed attempts and harness snapshots are indexed under the existing .benchmark dossier. Public artifacts omit credentials and internal model reasoning. Publication and challenge submission remain separate future actions.','small')

def page(canvas,doc):
    canvas.setTitle('Orbit — scoped evidence development pilots, edition 0.4')
    canvas.setAuthor('Orbit project — Jean-Sébastien Beaulieu; author review pending')
    canvas.setSubject('Measured Gemini pilots; scientific and agent-validation limits')
    canvas.setFillColor(navy); canvas.rect(0,A4[1]-28,A4[0],28,fill=1,stroke=0)
    canvas.setFillColor(colors.white); canvas.setFont('Heading',8); canvas.drawString(45,A4[1]-18,'orbit. / MEASURE • COMPARE • PRESERVE')
    canvas.setStrokeColor(cyan);canvas.setLineWidth(.5);canvas.line(45,37,A4[0]-45,37)
    canvas.setFillColor(navy);canvas.setFont('Body',8);canvas.drawString(45,24,'DEVELOPMENT REPORT / REVIEW PENDING'); canvas.drawRightString(A4[0]-45,24,str(doc.page))

pdf=OUT/'orbit-scoped-evidence-pilot-report.pdf'
SimpleDocTemplate(str(pdf),pagesize=A4,leftMargin=45,rightMargin=45,topMargin=50,bottomMargin=50).build(story,onFirstPage=page,onLaterPages=page)
reader=PdfReader(pdf)
assert len(reader.pages)==5, f'Unexpected pagination: {len(reader.pages)}'
reader_text='\n'.join(x.extract_text() for x in reader.pages)
assert '53/53' in reader_text and 'HOLD' in reader_text and 'review pending' in reader_text.lower()
assert reader_text.count('research partner')==1
(OUT/'manuscript.md').write_text('# Orbit — scoped evidence development pilots\n\n'+'\n\n'.join(manuscript)+'\n',encoding='utf-8')
design={'profile':'technical-manual','bodyFont':'Calibri 11pt','headingFont':'Segoe UI Semibold','monoFont':'Consolas','fallback':'Fail if local font missing; no silent substitution','colors':{'navy':'#15172D','cyan':'#00788C','violet':'#6843A3','amber':'#946313'},'page':'A4','marginsPt':45,'lineSpacingPt':15.5,'opening':'Explicit five-page report','cover':'Typographic evidence report; no authority implied','print':'White pages and darker accessible accents derived from the Orbit landing; review-ready, not print-ready','outputs':'PDF and Markdown requested; EPUB, podcast and editable DOCX outside this pilot scope'}
(OUT/'design-system.json').write_text(json.dumps(design,indent=2)+'\n')
negative=[]
for i,line in enumerate(manuscript,1):
    matches=re.findall(r'\b(?:not|no|without|cannot|never)\b',line,re.I)
    if matches:negative.append({'paragraph':i,'count':len(matches),'reason':'Essential scientific, technical, confidentiality or publication-status distinction'})
doc=fitz.open(pdf)
for i in range(len(doc)):
    doc[i].get_pixmap(matrix=fitz.Matrix(1.1,1.1)).save(OUT/f'page-{i+1}.png')
qa={'status':'visual-review-pending','pages':len(reader.pages),'metadataVerified':True,'textChecksPassed':True,'researchPartnerDisclosure':'Proposed exact canonical text once; human review pending','negativeConstructions':negative,'tex':'PDF generated by ReportLab; no LaTeX source or print-ready claim','sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'visualChecks':'Inspect five rendered pages before setting review-ready'}
(OUT/'publication_qa.json').write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps({'pdf':str(pdf),'pages':len(reader.pages),'status':qa['status']}))
