"""Inspect every page of the generated teaching PDF; document QA, not software tests."""
from pathlib import Path
import json, subprocess
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
from pypdf import PdfReader
HERE=Path(__file__).resolve().parent
BIN=Path(r'C:\Users\jeans\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin')
OUT=HERE/'visual-qa';OUT.mkdir(exist_ok=True)
subprocess.run([str(BIN/'pdftoppm.exe'),'-png','-scale-to','500',str(HERE/'book.pdf'),str(OUT/'page')],check=True,capture_output=True)
flags=[]
pdf=pdfium.PdfDocument(str(HERE/'book.pdf'))
for number,page in enumerate(pdf,1):
 text=page.get_textpage()
 for index in range(text.count_rects()):
  left,bottom,right,top=text.get_rect(index)
  if left<40 or right>page.get_width()-40:
   flags.append({'page':number,'text':text.get_text_bounded(left,bottom,right,top),'bounds':[left,bottom,right,top]})
 text.close();page.close()
pdf.close()
page_count=len(PdfReader(HERE/'book.pdf').pages)
files=[p for p in sorted(OUT.glob('page-*.png')) if int(p.stem.split('-')[-1])<=page_count]
for start in range(0,len(files),18):
 sheet=Image.new('RGB',(6*260,3*370),'#dde3eb');draw=ImageDraw.Draw(sheet)
 for n,p in enumerate(files[start:start+18]):
  im=Image.open(p);im.thumbnail((245,335));x=(n%6)*260+(260-im.width)//2;y=(n//6)*370+24
  sheet.paste(im,(x,y));draw.text(((n%6)*260+10,(n//6)*370+5),p.stem,fill='black')
 sheet.save(OUT/f'contact-{start//18+1}.png')
report={'pages':page_count,'rendered_pages':len(files),'horizontal_overflow_candidates':flags,'visual_review':'pending','reader':'Poppler raster / PDFium text bounds','scope':'all pages, DOCX remains editable'}
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages':report['pages'],'rendered_pages':len(files),'overflow_candidates':len(flags)}))
