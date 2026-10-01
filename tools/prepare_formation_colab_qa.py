"""Prepare one Colab CPU QA notebook; do not execute a validation locally.

The sources of the eight actual student notebooks are embedded with hashes.
Google's output.eval_js drives checks inside the current cell output; no SSH,
tunnel, model call or Linux browser installation is used. Trusted pointer use,
eight independent cold starts and human understanding remain separate reviews.
"""
from pathlib import Path
import base64
import hashlib
import io
import json
import textwrap
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/learning/orbit-formation'
OUTPUT = BASE / 'notebooks/qa'

SETUP = r'''import base64, copy, hashlib, html, io, json, os, platform, re, sys, time, uuid, zipfile
from pathlib import Path
from IPython.display import HTML, display
from google.colab import output as colab_output, files as colab_files

PAYLOAD = base64.b64decode(__PAYLOAD__)
if hashlib.sha256(PAYLOAD).hexdigest() != __SHA256__:
    raise RuntimeError('Empreinte du paquet source invalide.')
with zipfile.ZipFile(io.BytesIO(PAYLOAD)) as archive:
    if len(archive.infolist()) != 9 or sum(i.file_size for i in archive.infolist()) > 2_000_000:
        raise RuntimeError('Paquet source inattendu.')
    source_files = {item.filename: archive.read(item) for item in archive.infolist()}
source_manifest = json.loads(source_files['source-manifest.json'])
for name, digest in source_manifest['files'].items():
    if hashlib.sha256(source_files[name]).hexdigest() != digest:
        raise RuntimeError('Source modifiée : ' + name)
notebooks = {number: json.loads(source_files['module-' + str(number) + '.ipynb']) for number in range(1, 9)}
qa_id = 'orbit-colab-qa-' + uuid.uuid4().hex
qa_root = Path('/content') / qa_id
qa_root.mkdir(exist_ok=False)
module_archives = {}
module_namespaces = {}
report = {
    'schemaVersion': 'orbit-colab-qa-report-v1', 'runId': qa_id, 'sourceSha256': __SHA256__,
    'scope': 'Eight real notebook sources, separate namespaces in one Colab CPU computation; not eight independent cold starts.',
    'host': 'Colab', 'python': platform.python_version(), 'machine': platform.machine(),
    'requestedAccelerator': 'none', 'accountPlanObserved': 'not-observed',
    'state': 'PREPARED_RUNTIME', 'modules': {},
    'humanUnderstanding': 'NOT_EXAMINED', 'trustedPointerInteractions': 'NOT_OBSERVED',
    'coldStartAfterActualRuntimeRestart': 'NOT_OBSERVED', 'playwright': 'NOT_USED',
    'credentials': 'none', 'modelsCalled': False,
}

def cell_source(cell):
    return ''.join(cell['source']) if isinstance(cell['source'], list) else cell['source']

def save_report():
    report['updatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    (qa_root / 'qa-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False), encoding='utf-8')

def verified_bundle(data):
    if len(data) > 2_000_000:
        raise ValueError('Rendu trop volumineux pour ce contrôle.')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = archive.infolist()
        if len(members) > 40 or sum(i.file_size for i in members) > 2_000_000:
            raise ValueError('Nombre ou taille de fichiers inattendus.')
        content = {}
        for item in members:
            if item.filename.startswith('/') or '..' in item.filename.split('/') or '\\' in item.filename or item.filename in content:
                raise ValueError('Chemin de rendu non autorisé.')
            content[item.filename] = archive.read(item)
        manifest = json.loads(content['manifest.json'])
        names = [item['path'] for item in manifest['files']]
        if len(names) != len(set(names)) or set(names) != set(content) - {'manifest.json'}:
            raise ValueError('Manifeste incomplet ou dupliqué.')
        for item in manifest['files']:
            if hashlib.sha256(content[item['path']]).hexdigest() != item['sha256']:
                raise ValueError('Empreinte de rendu différente : ' + item['path'])
        result = json.loads(content['orbit-learning-result.json'])
        if result['status'] != 'external-declared' or result['verification']['humanApproval']:
            raise ValueError('Autorité du rendu incorrecte.')
        return content, result

def run_python_and_export(number):
    notebook = notebooks[number]
    namespace = {'__name__': 'orbit_qa_module_' + str(number)}
    executed = []
    folder = qa_root / ('module-' + str(number))
    folder.mkdir(exist_ok=True)
    old = Path.cwd()
    try:
        os.chdir(folder)
        # These are the actual cells; QA deliberately fills test-only fixtures after blank learner inputs.
        for index in [1, 3, 5, 6]:
            code = cell_source(notebook['cells'][index])
            exec(compile(code, '<actual-module-' + str(number) + '-cell-' + str(index) + '>', 'exec'), namespace)
            executed.append(index)
        namespace['reflection']['prediction'] = 'QA fixture: one changed variable should preserve the source/export contract.'
        namespace['parameters'] = {'origin': 'software-qa-fixture', 'moduleId': number, 'notStudentObservation': True}
        # The sentinel tests source fidelity; it does not apply an instructor correction.
        target = next(name for name in namespace['student_files'] if name.endswith('.js'))
        namespace['student_files'][target] += '\n// QA-SOURCE-FIDELITY-MODULE-' + str(number) + '\n'
        for index in [7, 9]:
            exec(compile(cell_source(notebook['cells'][index]), '<actual-cell-' + str(index) + '>', 'exec'), namespace)
            executed.append(index)
        namespace['reflection'].update({
            'observations': ['Software QA fixture. A later browser check records its own observations.'],
            'explanation': 'The actual edited student_files variable must be identical in preview and export.',
            'assistance': 'Automated test fixture supplied by the QA notebook; not an unaided learner answer.',
            'limitations': 'No human understanding or trusted pointer interaction is certified by this fixture.',
            'openQuestion': 'Repeat the lesson with a real learner and a separate cold runtime.'})
        exec(compile(cell_source(notebook['cells'][10]), '<actual-export-cell>', 'exec'), namespace)
        executed.append(10)
        archives = list(folder.glob('orbit-module-' + str(number) + '-*.zip'))
        if not archives:
            raise ValueError('Le vrai export n’a produit aucun ZIP.')
        newest = max(archives, key=lambda path: path.stat().st_mtime_ns)
        data = newest.read_bytes()
        content, result = verified_bundle(data)
        for name, code in namespace['student_files'].items():
            if content['frontend/' + name].decode('utf-8') != code:
                raise ValueError('Le code exporté n’est pas le code modifié : ' + name)
        # Resume the exported notebook into a fresh namespace, not the preceding live variables.
        replay = json.loads(content['notebook.ipynb'])
        replay_namespace = {'__name__': 'orbit_qa_replay_' + str(number)}
        for index, cell in enumerate(replay['cells']):
            if cell['cell_type'] == 'code':
                exec(compile(cell_source(cell), '<captured-replay-cell-' + str(index) + '>', 'exec'), replay_namespace)
        if replay_namespace['student_files'] != namespace['student_files']:
            raise ValueError('La reprise change le code.')
        if replay_namespace['reflection'] != namespace['reflection']:
            raise ValueError('La reprise change le bilan.')
        module_archives[number] = data
        module_namespaces[number] = replay_namespace
        row = {
            'moduleId': number, 'pythonState': 'PYTHON_EXPORT_REPLAY_PASSED', 'executedSourceCells': executed,
            'fixtureAuthority': 'software test, not learner or human approval',
            'sourceSha256': hashlib.sha256(source_files['module-' + str(number) + '.ipynb']).hexdigest(),
            'exportSha256': hashlib.sha256(data).hexdigest(), 'exportFiles': len(content),
            'replayScope': 'fresh Python namespace, same runtime',
            'downloadFunctionInvoked': True, 'browserDownloadReceived': 'NOT_OBSERVED',
            'browserState': 'NOT_YET_OBSERVED', 'trustedPointerInteractions': 'NOT_OBSERVED',
        }
        report['modules'][str(number)] = row
        save_report()
        return replay_namespace
    except Exception as error:
        report['modules'][str(number)] = {'moduleId': number, 'pythonState': 'FAILED',
            'errorType': type(error).__name__, 'error': str(error)[:500], 'browserState': 'NOT_EXECUTED'}
        save_report()
        raise
    finally:
        os.chdir(old)

print(json.dumps({'state': 'SOURCE_VERIFIED_NOT_EXECUTED', 'notebooks': 8, 'sourceSha256': __SHA256__}))
save_report()
'''

CHILD_PROBE = r'''<script>
(async()=>{
 const moduleId=__NUMBER__, runId=__RUN_ID__; const checks=[], errors=[], frameObservations=[];
 let probeState='BROWSER_PROBE_COMPLETE', visibleAtProbe=false, visibilityTarget='';
 const send=()=>parent.postMessage({kind:'orbit-colab-qa',runId,moduleId,checks,errors,state:probeState,
   visibilityState:document.visibilityState,visibleAtProbe,visibilityTarget,frameObservations,
   authority:'browser script checks; not human review or trusted pointer input',
   userAgent:navigator.userAgent.slice(0,240),webmcp:'NOT_CALLED'},'*');
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail:String(detail||'').slice(0,400)});
 const parsed=()=>{try{return JSON.parse(document.getElementById('trace').textContent)}catch{return null}};
 const waitFor=async test=>{for(let n=0;n<120;n++){if(test())return true;if(document.getElementById('error').textContent)return false;await pause(250)}return false};
 const ensureVisible=async()=>{
  // HTML-only lessons deliberately hide #stage; gate their actual central content instead.
  const target=moduleId===2?document.getElementById('cards'):
   moduleId===7?[...document.querySelectorAll('button')].find(button=>button.textContent==='proofs'):
   moduleId===8?document.getElementById('trace'):document.getElementById('stage');
  visibilityTarget=moduleId===2?'cards':moduleId===7?'navigation-button:proofs':moduleId===8?'prepared-trace':'stage';
  if(!target)return false;
  target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  const started=performance.now();
  while(performance.now()-started<8000){
   const rect=target.getBoundingClientRect(),style=getComputedStyle(target);
   if(document.visibilityState==='visible'&&!target.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&
      rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth){visibleAtProbe=true;return true}
   await pause(100);
  }
  return false;
 };
 const advanceFrames=(label,minimumCount=18,minimumElapsed=300)=>new Promise(resolve=>{
  const times=[];let handle,done=false;
  const finish=state=>{if(done)return;done=true;clearTimeout(timer);if(handle)cancelAnimationFrame(handle);
   const result={label,state,count:times.length,elapsedMs:times.length>1?times.at(-1)-times[0]:0,visibilityState:document.visibilityState};
   frameObservations.push(result);resolve(result)};
  const timer=setTimeout(()=>finish(document.visibilityState==='visible'?'FRAME_TIMEOUT':'VISIBILITY_LOST'),5000);
  const frame=time=>{if(document.visibilityState!=='visible'){finish('VISIBILITY_LOST');return}
   times.push(time);
   if(times.length>=minimumCount&&times.at(-1)-times[0]>=minimumElapsed){finish('FRAMES_ADVANCED');return}
   handle=requestAnimationFrame(frame)};
  handle=requestAnimationFrame(frame);
 });
 window.addEventListener('error',event=>errors.push(String(event.message).slice(0,300)));
 window.addEventListener('unhandledrejection',event=>errors.push(String(event.reason).slice(0,300)));
 try{
  const ready=await waitFor(()=>{
   if(moduleId===1)return document.getElementById('marker').style.left.length>0;
   if(moduleId===2)return document.querySelectorAll('#cards button').length===3;
   if(moduleId===3)return document.getElementById('info').textContent.length>0;
   return parsed()!==null;
  });
  check('readyWithin30Seconds',ready,document.getElementById('error').textContent);
  const errorText=document.getElementById('error').textContent;
  if(!ready||errorText)throw new Error(errorText||'Output readiness timeout');
  const stage=document.getElementById('stage'), control=document.getElementById('static');
  if(!await ensureVisible()){
   probeState='BROWSER_VISIBILITY_UNAVAILABLE';
   checks.push({name:'visibleOutputBeforeInteraction',passed:null,detail:'Output was not visible within eight seconds; motion was not scored.'});
   send();return;
  }
  check('visibleOutputBeforeInteraction',visibleAtProbe,visibilityTarget+'; '+document.visibilityState);
  if(moduleId===1){
   control.checked=false;control.dispatchEvent(new Event('change'));
   const before=parseFloat(document.getElementById('marker').style.left);
   stage.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
   const after=parseFloat(document.getElementById('marker').style.left);
   check('syntheticKeyboardChangesPosition',after>before,`${before} → ${after}`);
   check('stateReportsKeyboard',parsed()?.phase==='keyboard',parsed()?.lastEvent);
  }else if(moduleId===2){
   const selected=document.querySelector('#cards button');selected.click();
   check('HTMLSelectionLinkedToStableId',parsed()?.selection==='element-1',parsed()?.selection);
   check('selectedButtonPressed',selected.getAttribute('aria-pressed')==='true');
  }else if(moduleId===3){
   const button=document.querySelector('[data-learning-cards] button');button.click();
   check('HTMLFallbackCanSelect',parsed()?.selected==='element-1');
   const canvas=stage.querySelector('canvas');
   check('renderSurfaceOrDeclaredFallback',Boolean(canvas)||/indisponible/i.test(document.getElementById('info').textContent),document.getElementById('info').textContent);
   checks.push({name:'WebGLSurface',passed:null,detail:canvas?'Canvas surface observed; pixel/raycast interaction not certified.':'Declared fallback observed; WebGL not validated.'});
  }else if(moduleId===4){
   const state=parsed();check('initialMotionIsFinite',Number.isFinite(state?.x)&&Number.isFinite(state?.vx));
   checks.push({name:'trustedPointerReleaseAndBounce',passed:null,detail:'Requires a real browser pointer, not mocked pointer capture.'});
  }else if(moduleId===5){
   control.checked=false;control.dispatchEvent(new Event('change'));
   const initialValue=parsed()?.value;
   [...document.querySelectorAll('button')].find(button=>button.textContent.includes('Cible')).click();
   const frames=await advanceFrames('spring-after-target');
   if(frames.state!=='FRAMES_ADVANCED'){
    probeState=frames.state==='VISIBILITY_LOST'?'BROWSER_VISIBILITY_UNAVAILABLE':'BROWSER_FRAME_UNAVAILABLE';
    checks.push({name:'springMovesTowardNewTarget',passed:null,detail:'No complete visible frame interval; the spring was not scored.'});
   }else{
    const observed=parsed();check('springMovesTowardNewTarget',Number.isFinite(initialValue)&&Number.isFinite(observed?.value)&&Math.abs(observed.value-initialValue)>.01,JSON.stringify(observed));
   }
   control.checked=true;control.dispatchEvent(new Event('change'));await pause(80);const a=document.getElementById('trace').textContent;await pause(200);
   check('staticFreezesSpringAndClock',a===document.getElementById('trace').textContent);
  }else if(moduleId===6){
   control.checked=false;control.dispatchEvent(new Event('change'));
   const canvas=stage.querySelector('canvas'), a=canvas.toDataURL();
   const frames=await advanceFrames('particles-while-animated',24,400);const b=canvas.toDataURL();
   if(frames.state!=='FRAMES_ADVANCED'){
    probeState=frames.state==='VISIBILITY_LOST'?'BROWSER_VISIBILITY_UNAVAILABLE':'BROWSER_FRAME_UNAVAILABLE';
    checks.push({name:'particleCanvasChangesWhileAnimated',passed:null,detail:'No complete visible frame interval; the animated pixels were not scored.'});
   }else check('particleCanvasChangesWhileAnimated',a!==b);
   control.checked=true;control.dispatchEvent(new Event('change'));await pause(80);const c=canvas.toDataURL();await pause(200);
   check('staticFreezesParticlePixels',c===canvas.toDataURL());
  }else if(moduleId===7){
   [...document.querySelectorAll('button')].find(button=>button.textContent==='proofs').click();
   check('viewAndHistoryRecorded',parsed()?.view==='proofs'&&parsed()?.entries?.length===1);
   control.checked=true;control.dispatchEvent(new Event('change'));await pause(80);const t=parsed()?.elapsed;await pause(200);
   check('staticFreezesNavigationClock',t===parsed()?.elapsed);
  }else{
   const trace=parsed();check('preparedTraceDeclared',trace?.kind==='prepared-example-not-a-live-call');
   check('traceContainsMissingPermissionAndStaleRevision',trace?.canRead===false&&trace?.expectedRevision!==trace?.currentRevision);
  }
  control.checked=true;control.dispatchEvent(new Event('change')); // Bound background work after this check.
 }catch(error){errors.push(String(error.message||error).slice(0,400))}
 send();
})()
</script>'''

BROWSER_CHECK = r'''def run_browser_probe(number, namespace):
    # The real preview is instrumented only for this QA output. The student source stays unchanged.
    run_id = uuid.uuid4().hex
    child = CHILD_PROBE.replace('__NUMBER__', str(number)).replace('__RUN_ID__', json.dumps(run_id))
    preview_document = namespace['preview_document']
    if '</body>' not in preview_document:
        raise ValueError('Document d’aperçu inattendu.')
    diagnostic_document = preview_document.replace('</body>', child + '</body>', 1)
    encoded = base64.b64encode(diagnostic_document.encode('utf-8')).decode('ascii')
    title = 'Orbit Colab QA module ' + str(number)
    display(HTML('<iframe title="' + title + '" sandbox="allow-scripts allow-same-origin" '
                 'style="width:100%;height:620px;border:1px solid #8796b4" src="about:blank"></iframe>'))
    expression = r''' + '"""' + r'''new Promise(resolve=>{
      const iframe=[...document.querySelectorAll('iframe')].find(frame=>frame.title===__TITLE__);
      if(!iframe){resolve({state:'OUTPUT_FRAME_UNAVAILABLE'});return}
      iframe.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      const timeout=setTimeout(()=>finish({state:'BROWSER_TIMEOUT',checks:[],errors:['No bounded iframe response']}),54000);
      function finish(value){clearTimeout(timeout);window.removeEventListener('message',listener);resolve(value)}
      function listener(event){if(event.source!==iframe.contentWindow||event.data?.kind!=='orbit-colab-qa'||event.data?.runId!==__RUN_ID__)return;finish(event.data)}
      window.addEventListener('message',listener);
      iframe.src='data:text/html;base64,'+__ENCODED__;
    })''' + '"""' + r'''
    expression = expression.replace('__TITLE__', json.dumps(title)).replace('__RUN_ID__', json.dumps(run_id)).replace('__ENCODED__', json.dumps(encoded))
    try:
        value = colab_output.eval_js(expression, timeout_sec=58)
        if not isinstance(value, dict):
            raise ValueError('Le navigateur n’a fourni aucun résultat structuré.')
        checks = value.get('checks', [])
        failed = [item for item in checks if item.get('passed') is False]
        errors = value.get('errors', [])
        partial = [item for item in checks if item.get('passed') is None]
        unavailable = value.get('state') in ['OUTPUT_FRAME_UNAVAILABLE', 'BROWSER_VISIBILITY_UNAVAILABLE', 'BROWSER_FRAME_UNAVAILABLE']
        state = 'BROWSER_SCRIPT_CHECKS_FAILED' if failed or errors else ('BROWSER_CHECK_UNAVAILABLE' if unavailable or not checks else 'BROWSER_SCRIPT_CHECKS_PASSED')
        report['modules'][str(number)].update(browserState=state, browserReport=value, remainingChecks=partial)
    except Exception as error:
        report['modules'][str(number)].update(browserState='BROWSER_CHECK_UNAVAILABLE', browserErrorType=type(error).__name__, browserError=str(error)[:500])
    save_report()
    print(json.dumps({'moduleId': number, 'pythonState': report['modules'][str(number)]['pythonState'],
                      'browserState': report['modules'][str(number)]['browserState'], 'humanReview': 'NOT_EXAMINED'}, ensure_ascii=False))
'''

ASSEMBLY_CHECK = r'''# Exercise the actual Module 8 assembly definitions, but do not mock its upload widget.
if set(module_archives) != set(range(1, 9)):
    raise RuntimeError('Les huit exports réels sont nécessaires; aucune brique corrigée ne remplace une absence.')
namespace8 = module_namespaces[8]
exec(compile(cell_source(notebooks[8]['cells'][12]), '<actual-module-8-assembly-definitions>', 'exec'), namespace8)
assembly = namespace8['assemble']([module_archives[number] for number in range(1, 9)], namespace8['scaffold_files'])
(qa_root / 'qa-eight-actual-exports-assembled.zip').write_bytes(assembly)
with zipfile.ZipFile(io.BytesIO(assembly)) as archive:
    for number in range(1, 9):
        expected = next(path for path in json.loads(verified_bundle(module_archives[number])[0]['orbit-learning-result.json'])['artifacts'] if path['path'].endswith('.js'))
        path = 'src/learning/module-' + str(number) + '/' + expected['path'].removeprefix('frontend/')
        if archive.read(path).decode('utf-8') != expected['content']:
            raise RuntimeError('Assemblage non fidèle au module ' + str(number))
report['assembly'] = {'state': 'EIGHT_ACTUAL_EXPORTS_ASSEMBLED', 'sha256': hashlib.sha256(assembly).hexdigest(),
                      'AstroCompilation': 'NOT_EXECUTED_IN_COLAB; see Kaggle validation',
                      'module8UploadWidget': 'NOT_OBSERVED'}
save_report()
print(json.dumps(report['assembly'], ensure_ascii=False))
'''

FINAL_REPORT = r'''# Optional observations must come from a real reviewed UI, never inferred from Python success.
UI_REVIEW = {
    'reviewerKind': 'not-reviewed',  # human or browser-agent only after an actual observation
    'accountPlan': 'not-observed',  # free only after the signed-in account plan was inspected
    'eightSeparateColdStarts': False,
    'runtimeRestartAndSelectedRecovery': False,
    'trustedPointerUse': False,
    'keyboardAndTouchEdgeCases': False,
    'downloadReceived': False,
    'notes': '',
}
report['selectedUiReview'] = UI_REVIEW
report['state'] = 'PARTIAL_VALIDATION'
python_passed = sum(row.get('pythonState') == 'PYTHON_EXPORT_REPLAY_PASSED' for row in report['modules'].values())
browser_passed = sum(row.get('browserState') == 'BROWSER_SCRIPT_CHECKS_PASSED' for row in report['modules'].values())
report['summary'] = {'pythonPassed': python_passed, 'browserScriptPassed': browser_passed,
                     'expectedModules': 8, 'coldStartsVerified': UI_REVIEW['eightSeparateColdStarts'],
                     'humanUnderstanding': 'NOT_EXAMINED', 'allCourseFunctionsValidated': False}
save_report()
checkpoint = io.BytesIO()
with zipfile.ZipFile(checkpoint, 'w', compression=zipfile.ZIP_STORED) as archive:
    archive.writestr('qa-report.json', (qa_root / 'qa-report.json').read_bytes())
    for number, data in sorted(module_archives.items()):
        archive.writestr('exports/module-' + str(number) + '.zip', data)
    if 'assembly' in report:
        archive.writestr('assembly.zip', (qa_root / 'qa-eight-actual-exports-assembled.zip').read_bytes())
path = qa_root / 'orbit-colab-qa-evidence.zip'
path.write_bytes(checkpoint.getvalue())
colab_files.download(str(path))
print(json.dumps(report['summary'], indent=2, ensure_ascii=False))
print('PARTIAL_VALIDATION. La réception du téléchargement, les huit copies neuves et la reprise après redémarrage réel restent à observer.')
'''

RECOVERY_BODY = r'''# Execute this after a real restart and the source setup, with only the QA evidence ZIP you select.
# Uploaded results remain reported history until the modules are executed again.
uploaded = colab_files.upload()
if len(uploaded) != 1:
    raise ValueError('Choisissez uniquement le ZIP QA que vous avez téléchargé.')
data = next(iter(uploaded.values()))
if len(data) > 12_000_000:
    raise ValueError('Checkpoint trop volumineux.')
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    if len(archive.infolist()) > 12 or sum(item.file_size for item in archive.infolist()) > 12_000_000:
        raise ValueError('Checkpoint inattendu.')
    old_report = json.loads(archive.read('qa-report.json'))
    if old_report.get('sourceSha256') != report['sourceSha256']:
        raise ValueError('Le checkpoint appartient à une autre version source.')
    for number in range(1, 9):
        raw = archive.read('exports/module-' + str(number) + '.zip')
        content, result = verified_bundle(raw)
        if result['moduleId'] != number:
            raise ValueError('Module déplacé dans le checkpoint.')
        captured = json.loads(content['notebook.ipynb'])
        resumed = {'__name__': 'qa_selected_recovery_' + str(number)}
        expected = {item['path'].removeprefix('frontend/'): item['content'] for item in result['artifacts']}
        reflection = {key: result[key] for key in ['prediction', 'observations', 'explanation', 'assistance', 'limitations', 'openQuestion']}
        trusted_constants = {}
        exec(compile(cell_source(notebooks[number]['cells'][6]), '<trusted-preview-constants>', 'exec'), trusted_constants)
        safe_source = ('from IPython.display import HTML, display\nimport base64, json\nstudent_files = ' + repr(expected)
                       + '\nreflection = ' + repr(reflection) + '\nparameters = ' + repr(result['parameters']))
        safe_preview = 'PREVIEW_TEMPLATE = ' + repr(trusted_constants['PREVIEW_TEMPLATE']) + '\n' + trusted_constants['PREVIEW_CODE_TEXT']
        if len(captured['cells']) != 4 or [cell['cell_type'] for cell in captured['cells']] != ['markdown', 'code', 'code', 'markdown']:
            raise ValueError('Structure de reprise non autorisée.')
        if cell_source(captured['cells'][1]) != safe_source or cell_source(captured['cells'][2]) != safe_preview:
            raise ValueError('La reprise contient du Python différent du modèle contrôlé.')
        # Execute the verified provided template with literal selected data, not arbitrary uploaded Python.
        exec(compile(safe_source, '<selected-recovery-data>', 'exec'), resumed)
        exec(compile(safe_preview, '<selected-recovery-preview>', 'exec'), resumed)
        if resumed['student_files'] != expected:
            raise ValueError('La reprise du checkpoint change le code.')
    report['recovery'] = {'state': 'SELECTED_CAPTURED_SOURCES_REPLAYED', 'previousResultsAuthority': 'imported report; not rerun',
                          'actualRuntimeRestart': 'to be recorded from observed UI', 'checkpointSourceSha256': old_report['sourceSha256']}
save_report()
print(json.dumps(report['recovery'], ensure_ascii=False))
'''

RECOVERY = (
    "RUN_SELECTED_RECOVERY = False  # True only for an intentional selected recovery after a real restart.\n\n"
    "def run_selected_recovery():\n" + textwrap.indent(RECOVERY_BODY, '    ') +
    "\nif RUN_SELECTED_RECOVERY:\n    run_selected_recovery()\n"
    "else:\n    print('SELECTED_RECOVERY_SKIPPED. Run All does not open an upload widget; enable recovery explicitly when needed.')\n"
)


def cell(kind, content, number):
    source = textwrap.dedent(content).strip()
    value = {'cell_type': kind, 'id': 'qa-' + str(number), 'metadata': {}, 'source': source.splitlines(True)}
    if kind == 'code':
        value.update(outputs=[], execution_count=None)
    return value


def main():
    sources = {f'module-{number}.ipynb': (BASE / f'notebooks/module-{number}.ipynb').read_bytes() for number in range(1, 9)}
    manifest = {'files': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(sources.items())}}
    sources['source-manifest.json'] = json.dumps(manifest, indent=2).encode('utf-8')
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, raw in sorted(sources.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, raw)
    raw = buffer.getvalue()
    digest = hashlib.sha256(raw).hexdigest()
    setup = SETUP.replace('__PAYLOAD__', repr(base64.b64encode(raw).decode('ascii'))).replace('__SHA256__', repr(digest))
    definitions = 'CHILD_PROBE = ' + repr(CHILD_PROBE) + '\n' + BROWSER_CHECK
    texts = [
        ('markdown', '''# Orbit Formation — contrôle des huit notebooks dans Colab

Ce carnet enseignant/QA exécute les **sources réelles** des huit notebooks dans un runtime Colab CPU, vérifie les exports et reprend leurs copies capturées. Il ajoute des sondes JavaScript dans les sorties Colab. Il ne produit aucune réponse d’élève ni approbation humaine.

Choisir **Exécution → Modifier le type d’exécution → CPU / aucun accélérateur**. Utiliser le compte gratuit cible, sans API, tunnel, poste distant, Playwright installé dans le runtime ou modèle. Un programme ne déduit pas votre forfait du succès d’une cellule.

La source officielle Google expose [output.eval_js dans le contexte de la cellule](https://github.com/googlecolab/colabtools/blob/main/google/colab/output/_js.py). Le contrôle de l’iframe utilise cette API et un message borné lié à sa fenêtre et à un identifiant de run. Les [conditions Colab](https://research.google.com/colaboratory/faq.html) imposent notamment des limites variables et interdisent certains usages distants sur le gratuit. Aucune intégration officielle Playwright vers le navigateur de l’élève n’a été établie ici; nous ne la supposons pas.

**Ce que ce carnet ne prouve pas :** huit démarrages froids séparés, trente minutes d’activité, gestes pointeur réels, confort tactile, qualité du rendu 3D, réception d’un téléchargement, compilation Astro, outils WebMCP réels ou compréhension humaine. Les résultats Python, JavaScript et observations UI restent distincts.

Les huit rendus sont des fixtures de contrôle marquées comme telles. Les téléchargements arrivent dans votre navigateur; ne rendez pas ces fixtures comme travaux d’élève. Gardez ce carnet privé s’il contient ensuite vos observations personnelles.

**Conserver cet onglet au premier plan pendant les sondes.** Chaque sortie est amenée dans la zone visible; la sonde attend une visibilité réelle et des frames avancées avant de noter le mouvement. Une perte de visibilité devient une limite de contrôle, pas une réussite. Si les frames avancent mais que le mouvement attendu manque, l’assertion reste un échec.
'''),
        ('code', setup),
        ('code', definitions),
    ]
    for number in range(1, 9):
        texts.extend([
            ('markdown', f'''## Module {number} — source, export, reprise et sonde navigateur

Cette cellule exécute réellement les cellules du notebook. Elle remplit seulement les entrées de fixture et ajoute un commentaire de fidélité; elle ne corrige pas silencieusement le code. Le ZIP est produit par la vraie cellule d’export et la copie capturée est rejouée dans un namespace neuf. La sonde peut durer jusqu’à 58 secondes. Un état FAILED ou UNAVAILABLE reste un échec ou une limite, jamais une réussite implicite.
'''),
            ('code', f"namespace = run_python_and_export({number})\nrun_browser_probe({number}, namespace)"),
        ])
    texts += [
        ('markdown', '''## Assemblage fidèle — sans compilation dans Colab

Le code d’assemblage du Module 8 reçoit les huit vrais exports de ces fixtures. La cellule ne simule pas le widget de sélection : celui-ci demande sa propre observation. La compilation Astro reste dans Kaggle et le projet cible.
'''),
        ('code', ASSEMBLY_CHECK),
        ('markdown', '''## Revue et téléchargement du dossier de contrôle

Remplir les champs seulement après observation réelle. Une revue par un agent navigateur doit être attribuée à cet agent, pas présentée comme une décision humaine. Le résultat global reste PARTIAL_VALIDATION tant que les contrôles externes manquent.

Pour qualifier le parcours gratuit : ouvrir **une copie neuve de chaque notebook élève**, démarrer le CPU, prédire, changer la variable, effectuer le geste réel, passer au clavier, figer l’image, réactiver le mouvement, exporter et examiner le ZIP. Pour le Module 3, contrôler le CDN/WebGL et la liste HTML. Pour le Module 8, sélectionner les huit ZIP dans le vrai widget. Garder un relevé par module; une exécution regroupée dans ce carnet ne remplace pas ces copies neuves.
'''),
        ('code', FINAL_REPORT),
        ('markdown', '''## Reprise après redémarrage réel — étape séparée

Le réglage `RUN_SELECTED_RECOVERY = False` empêche **Tout exécuter** d’ouvrir un widget bloquant. Pour une reprise voulue, télécharger d’abord `orbit-colab-qa-evidence.zip` et vérifier sa présence. Redémarrer le runtime depuis Colab, rejouer uniquement la préparation source, puis changer le réglage en `True` et exécuter la dernière cellule en choisissant ce ZIP. Cette action vérifie la reprise du code capturé dans le nouveau runtime. Les anciens scores importés restent des résultats rapportés; ils ne deviennent pas des tests fraîchement exécutés.

Ne montez pas tout votre Drive. Le widget n’importe que le fichier choisi. Aucun jeton temporaire ou compte E2B n’est nécessaire pour ce contrôle.
'''),
        ('code', RECOVERY),
    ]
    notebook = {'nbformat': 4, 'nbformat_minor': 5,
                'metadata': {'kernelspec': {'name': 'python3', 'display_name': 'Python 3', 'language': 'python'},
                             'colab': {'name': 'orbit-eight-colab-qa.ipynb', 'provenance': []},
                             'orbit': {'kind': 'instructor-qa', 'state': 'prepared-not-executed', 'sourceSha256': digest,
                                       'acceleratorRequired': False, 'independentColdStartsVerified': False}},
                'cells': [cell(kind, content, index) for index, (kind, content) in enumerate(texts)]}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / 'orbit-eight-colab-qa.ipynb'
    target.write_text(json.dumps(notebook, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUTPUT / 'qa-source.json').write_text(json.dumps({'state': 'prepared-not-executed', 'sourceSha256': digest, 'notebooks': manifest['files'],
        'notebookSha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'browserBridge': 'official google.colab.output.eval_js; not executed',
        'playwright': 'not used; no official attach bridge established'}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'state': 'prepared-not-executed', 'notebooks': 8, 'path': str(target), 'sourceSha256': digest}))


if __name__ == '__main__':
    main()
