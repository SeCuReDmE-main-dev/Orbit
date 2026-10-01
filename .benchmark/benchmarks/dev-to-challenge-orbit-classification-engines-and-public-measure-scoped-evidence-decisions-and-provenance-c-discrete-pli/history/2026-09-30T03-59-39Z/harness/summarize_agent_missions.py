"""Separate executed transport, core task checks and interpretation defects."""
import hashlib
import json
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
rows=[]
identifiers=['w01-json-loop-flash-v2','w01-json-loop-pro-v2']
identifiers += [p.parent.name for p in sorted((ROOT/'.orbit/benchmark-results').glob('w02-json-loop-*/result.json'))]
for identifier in identifiers:
    path=ROOT/'.orbit/benchmark-results'/identifier/'result.json'
    if not path.exists():continue
    data=json.loads(path.read_text(encoding='utf-8'))
    issues=[]
    if identifier=='w01-json-loop-flash-v2':
        issues.append({'reviewer':'Codex source-code and actual Context-read audit; not a human decision',
          'kind':'unsupported-permission-generalization',
          'finding':'The final answer says Context entries cannot proceed without consent. Public corpus reads do not require private dossier sharing. The agent did not test that limitation.',
          'status':'unresolved-agent-interpretation-defect'})
    citation_audit=data.get('citationAudit')
    if citation_audit and not citation_audit['observableChecksPassed']:
        issues.append({'reviewer':'Codex literal citation audit; not human review',
          'kind':'incomplete-original-source-provenance',
          'finding':'An original source URL is missing, or a quote is not bound to an individually read entry. Literal occurrence alone does not establish the source chain. This is a failed provenance requirement, not a repaired score.',
          'status':'unresolved'})
    if identifier=='w02-json-loop-flash-v2':
        issues.append({'reviewer':'Codex semantic inspection; not gold or human review',
          'kind':'citation-relevance-requires-review',
          'finding':'The fourth quote distinguishes two controls; this quote alone does not refute the broader claim about satisfying ZDR. The first two claims contain more direct retention conditions. Byte matching does not settle entailment.',
          'status':'review-required'})
    if identifier=='w02-json-loop-pro-v4':
        issues.append({'reviewer':'Codex actual-call inspection; not human review',
          'kind':'combined-entry-read-despite-mission-boundary',
          'finding':'Pro reads two entries in one call, despite the instruction to read each separately. The audit cannot attribute its quotes to a single observed path. Original URLs are also absent and the final limitations array is empty.',
          'status':'unresolved'})
    overall='incomplete' if data['missionStatus']!='PASSED' else 'observable-checks-passed-review-pending'
    if issues:overall='citation-provenance-incomplete' if citation_audit else 'core-passed-interpretation-defect'
    rows.append({'experiment':identifier,'mission':data['mission'],'model':data['model'],'adapter':data['host'],
      'plannerProtocol':data['plannerProtocol'],'nativeAntigravityMcpIntegration':False,
      'coreChecksPassed':data['missionStatus']=='PASSED',
      'overallReview':overall,'citationAudit':citation_audit,
      'successfulNativeCalls':[{'name':c['name'],'state':c['result'].get('state')} for c in data['calls']],
      'final':data.get('final'),'error':data.get('error'),'reviewFindings':issues,
      'durationSeconds':data.get('durationSeconds'),'turnUsage':[t.get('usage') for t in data['turns']],
      'resultSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
      'scope':data['mission']+' development only; no private dossier, engine classification, subagent handoff, original-document verification or report presentation.'})
output={'format':'orbit-agent-observations-v1','updatedAt':datetime.now(timezone.utc).isoformat(),
        'status':'development-partial','missions':rows,
        'limits':['Model chooses calls in an external JSON planner loop; this does not repair native Antigravity MCP injection.',
                  'Successful core checks do not validate every final-answer claim.',
                  'Public Context reads and W01 observations do not establish a fully audited research trajectory or human decision.',
                  'Earlier failures and protocol changes remain archived; they are not pooled as identical trials.']}
(ROOT/'web/public/benchmark/agent-mission-observations.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'missions':[(r['model'],r['overallReview'],len(r['successfulNativeCalls'])) for r in rows]}))
