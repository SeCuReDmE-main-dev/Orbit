"""Inspect private real-source snapshots and bounded original URLs; no benchmark/tests.

This prepares provenance and candidate passages, not expected model answers.
Source text stays private. Public inventory contains spans, hashes and limits.
"""
from __future__ import annotations

import concurrent.futures
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

from prepare_kaggle_campaign_v2 import ROOT, OUT

SOURCE = ROOT / '.orbit/benchmark-corpus-real-v1'
REVIEW = OUT / 'corpus-review'
MAX_BYTES = 2 * 1024 * 1024

# Passage-search anchors prepared from the actual sources; these are not gold decisions.
ANCHORS = {
 'r07-d01':r'Response data is temporarily', 'r07-d02':r'background mode stores',
 'r07-d03':r'third.party.*MCP|remote MCP servers', 'r07-d04':r'must use background execution',
 'r07-d05':r'`store=false` is incompatible', 'r07-d06':r'Google uses the content you submit',
 'r07-d07':r'You control how long your data', 'r07-d08':r'When you use our services for individuals',
 'r07-d09':r'Google won.t use your data', 'r07-d10':r'Files are stored for',
 'r07-d11':r'Public code matching', 'r07-d12':r'work independently in the background',
 'r08-d01':r'structured, read.only access', 'r08-d02':r'citations back to the original source',
 'r08-d03':r'When the same fact appears', 'r08-d04':r'pre.checked|three kinds of source',
 'r08-d05':r'Private datasets allow', 'r08-d06':r'upgrade|latest version',
 'r08-d07':r'custom tool|tool.*React|React.*tool', 'r08-d08':r'two authentication mechanisms',
 'r08-d09':r'AI assistant that helps', 'r08-d10':r'version 3\.88\.0',
 'r08-d11':r'optional projection', 'r08-d12':r'patch documents',
 'r09-d01':r'six.*arms|six.*manipulator|six.*degrees', 'r09-d02':r'Honeycrisp',
 'r09-d03':r'76\.9%', 'r09-d04':r'chemically functionalized soap bubbles',
 'r09-d05':r'Here, we exemplify', 'r09-d06':r'fruit.*set|pear.*pollin|pollination',
 'r09-d07':r'In this paper, we present', 'r09-d08':r'kiwifruit|kiwi',
 'r09-d09':r'This paper proposes', 'r09-d10':r'pollination.*essential|food.*pollin',
 'r09-d11':r'pollinator.*loss|pollinator.*declin|crop.*risk', 'r09-d12':r'greenhouse|manipulator|pollinat',
 'r10-d01':r'simulation|simulated|trajectory', 'r10-d02':r'In this work, we propose',
 'r10-d03':r'magnetic|surface', 'r10-d04':r'magnetic|surface',
 'r10-d05':r'magnetic|microrobot', 'r10-d06':r'This study proposes',
 'r10-d07':r'thirty|30 drone|30.*robot', 'r10-d08':r'ten|10.*robot',
 'r10-d09':r'forest|outdoor|wild', 'r10-d10':r'This study proposes',
 'r10-d11':r'Matlab|virtual simulation|simulation', 'r10-d12':r'up to 200 robots',
}


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0; self.parts = []; self.licenses = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script','style','noscript','svg'):
            self.hidden += 1
        if tag in ('p','div','section','article','li','h1','h2','h3','br') and not self.hidden:
            self.parts.append('\n')
        if tag == 'a':
            href = dict(attrs).get('href','')
            if 'creativecommons.org/' in href or 'opensource.org/licenses/' in href:
                self.licenses.append(href)

    def handle_endtag(self, tag):
        if tag in ('script','style','noscript','svg'):
            self.hidden = max(0,self.hidden-1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def normalize(text):
    return re.sub(r'\s+',' ', re.sub(r'[`*_#]','',text)).strip().lower()


def candidate_passage(identifier, text):
    matches = list(re.finditer(ANCHORS[identifier], text, re.I))
    # Prefer prose to headings, navigation and code. At most eighteen words are selected.
    for match in matches:
        start = text.rfind('\n\n',0,match.start())+2
        start = max(0,start)
        end = text.find('\n\n',match.end())
        end = len(text) if end<0 else end
        if end-start < 65 or text[start:end].lstrip().startswith(('URL:','#','<','Figure ')) or '">' in text[start:end]:
            continue
        words = list(re.finditer(r'\S+',text[start:end]))
        if len(words)<8:
            continue
        first=max(0,next((index for index,word in enumerate(words) if start+word.end()>=match.start()),0)-4)
        anchor_line_start=text.rfind('\n',0,match.start())+1
        first=max(first,next((index for index,word in enumerate(words) if start+word.start()>=anchor_line_start),first))
        last=min(len(words),first+18)
        a,b=start+words[first].start(),start+words[last-1].end()
        sentence_end=re.search(r'[.!?](?:\s|$)',text[a:b])
        if sentence_end and len(text[a:a+sentence_end.end()].split())>=8:
            b=a+sentence_end.end();b-=len(text[a:b])-len(text[a:b].rstrip())
        return {'quote':text[a:b],'startCharacter':a,'endCharacter':b,'sha256':sha(text[a:b]),
                'selectionMethod':'review-anchor-prose-window','semanticReview':'agent-candidate-not-human-reference'}
    # Keep incompleteness explicit instead of inventing a passage.
    return None


def fetch_once(source):
    url=source['url']; identifier=source['id']
    parsed=urllib.parse.urlparse(url)
    if parsed.scheme not in ('http','https') or parsed.username or parsed.password:
        return {'state':'refused-url','url':url}, ''
    request=urllib.request.Request(url,headers={'User-Agent':'Orbit research source audit/2.0','Accept':'text/html,application/pdf,text/plain'})
    try:
        with urllib.request.urlopen(request,timeout=30) as response:
            raw=response.read(MAX_BYTES+1)
            result={'state':'retrieved','url':url,'finalUrl':response.url,'httpStatus':response.status,
                'bytes':len(raw),'retrievedAt':datetime.now(timezone.utc).isoformat(),
                'contentType':response.headers.get('Content-Type',''),'rawSha256':sha(raw)}
            if len(raw)>MAX_BYTES:
                return {**result,'state':'response-bound-exceeded','textAvailable':False}, ''
            (REVIEW/'private'/ (identifier+'.response')).write_bytes(raw)
            if raw.startswith(b'%PDF'):
                try:
                    from pypdf import PdfReader
                    text='\n'.join(page.extract_text() or '' for page in PdfReader(io.BytesIO(raw)).pages)
                    licenses=[]
                except Exception as error:
                    return {**result,'state':'pdf-text-unavailable','errorType':type(error).__name__}, ''
            else:
                parser=PageText();parser.feed(raw.decode('utf-8',errors='replace'))
                text=''.join(parser.parts);licenses=sorted(set(parser.licenses))
            (REVIEW/'private'/ (identifier+'.live.txt')).write_text(text,encoding='utf-8')
            return {**result,'textCharacters':len(text),'textSha256':sha(text),'textAvailable':bool(text.strip()),
                'licenseLinksObserved':licenses,'licenseReview':'link-observation-only-rights-not-cleared'},text
    except urllib.error.HTTPError as error:
        return {'state':'http-unavailable','httpStatus':error.code,'url':url}, ''
    except Exception as error:
        return {'state':'transport-unavailable','errorType':type(error).__name__,'url':url}, ''


def main():
    REVIEW.mkdir(parents=True,exist_ok=True);(REVIEW/'private').mkdir(exist_ok=True)
    sources=json.loads((SOURCE/'documents.json').read_text(encoding='utf-8'))
    corpus=json.loads((ROOT/'.orbit/cloud-lab/orbit-kaggle-20260930-v1/corpus/public-input.json').read_text(encoding='utf-8'))
    frozen={row['id']:row for row in corpus['documents'] if not row.get('synthetic')}
    previous=json.loads((REVIEW/'audit.json').read_text()) if (REVIEW/'audit.json').exists() else {'records':[]}
    cached={row['id']:row for row in previous['records']}
    pending=[source for source in sources if source['id'] not in cached]
    fetched={}
    # One request per original URL in this audit; failed reads are not retried automatically.
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures={executor.submit(fetch_once,source):source for source in pending}
        for future in concurrent.futures.as_completed(futures):
            source=futures[future]; result,text=future.result();fetched[source['id']]=(result,text)
            print(json.dumps({'id':source['id'],'liveState':result['state'],'httpStatus':result.get('httpStatus')}),flush=True)
    records=[];private_passages=[]
    for source in sources:
        identifier=source['id']; benchmark=frozen[identifier]
        snapshot=(SOURCE/source['snapshot']).read_text(encoding='utf-8')
        if identifier in fetched:
            live,live_text=fetched[identifier]
        else:
            live=cached[identifier]['liveOriginal']
            path=REVIEW/'private'/(identifier+'.live.txt');live_text=path.read_text(encoding='utf-8') if path.exists() else ''
        passage=candidate_passage(identifier,snapshot)
        passages=[]
        if passage:
            public={name:value for name,value in passage.items() if name!='quote'}
            public.update({'locationUnit':'Unicode character offsets in frozen original snapshot',
                'exactInSnapshot':snapshot[passage['startCharacter']:passage['endCharacter']]==passage['quote'],
                'exactInBenchmarkInput':passage['quote'] in benchmark['text'],
                'normalizedInCurrentOriginal':normalize(passage['quote']) in normalize(live_text) if live_text else None,
                'liveComparisonMethod':'whitespace and Markdown markers normalized; not byte identity'})
            passages.append(public);private_passages.append({'sourceId':identifier,**passage})
        content=snapshot[:-1] if snapshot.endswith('\n') else snapshot
        records.append({'id':identifier,'snapshotCharacters':len(snapshot),'snapshotNormalizedTextSha256':sha(snapshot),
            'snapshotFileSha256':sha((SOURCE/source['snapshot']).read_bytes()),
            'declaredSourceContentSha256':source['contentHash'],'sourceContentSha256':sha(content),
            'sourceContentFingerprintMatches':sha(content)==source['contentHash'],
            'snapshotNormalization':'read_text normalizes line endings; remove exactly one LF appended by original writer for declared source-content hash',
            'benchmarkCharacters':len(benchmark['text']),'benchmarkTextTruncated':benchmark.get('textTruncated',False),
            'benchmarkIsPrefixOfSnapshot':snapshot.startswith(benchmark['text']),
            'selectedPassages':passages,'snapshotReview':'content-inspected-via-prose-anchor-candidate',
            'passageReview':'agent-candidate-human-semantic-review-pending', 'liveOriginal':live,
            'licenseReview':'rights-not-cleared','fullTextDistributed':False})
    result={'format':'orbit-real-source-audit-v2','sources':len(records),'humanReviewedReferences':0,
        'reviewedAt':datetime.now(timezone.utc).isoformat(),'modelCalls':0,'softwareTests':False,
        'records':records,'limits':['Prose anchors prepare references; they do not grade models or establish semantic correctness.',
            'Original snapshot and current live document can differ; the benchmark corpus is never silently replaced.',
            'All source text remains private; detected license links do not automatically clear redistribution.']}
    (REVIEW/'audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    (REVIEW/'private/passages.json').write_text(json.dumps(private_passages,indent=2),encoding='utf-8')
    print(json.dumps({'sources':len(records),'candidatePassages':sum(len(row['selectedPassages']) for row in records),
        'truncatedInputs':sum(row['benchmarkTextTruncated'] for row in records),
        'liveOriginalsRetrieved':sum(row['liveOriginal']['state']=='retrieved' for row in records),
        'humanReviewedReferences':0,'modelCalls':0,'softwareTests':False}))


if __name__=='__main__':main()
