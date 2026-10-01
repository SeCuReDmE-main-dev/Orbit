"""Build eight CPU-only Colab learning notebooks and separate instructor copies.

This is artifact generation, not notebook execution or software validation.
No credential, remote installer, API call, model or Python engine is included.
"""
from pathlib import Path
import hashlib
import json
import textwrap

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/learning/orbit-formation'
OUTPUT = BASE / 'notebooks'
MODULES = [
    dict(id=1, title='Geste, état et rendu', files=['interaction-state.js'],
         goal='Expliquer quelle donnée le geste modifie, puis distinguer relâchement et annulation.',
         change='Dans interactionOptions, comparez keyboardStep 0.04 puis 0.08. Gardez la zone et le même nombre de pressions.',
         question='Après deux pressions vers la droite, quelle position attendez-vous ? Que devient la capture après une annulation ?',
         expected='Le pas change le déplacement au clavier. pointercancel termine le geste sans le confondre avec une sortie de zone.',
         transfer='Réutilisez les états dans une carte déplaçable, avec clavier et annulation.',
         replacement=('keyboardStep: 0.04', 'keyboardStep: 0.08')),
    dict(id=2, title='Organisation Astro', files=['ExplorationCard.astro', 'exploration-card.js'],
         goal='Séparer structure, contenu et comportement sans confondre aperçu HTML et compilation Astro.',
         change='Modifiez seulement descriptionPrefix dans exploration-card.js. Retrouvez ensuite le titre et la liste dans ExplorationCard.astro.',
         question='Quelle modification change une description sans toucher au nombre de boutons ?',
         expected='Astro fournit la structure. createCards remplit une liste avec textContent et associe les choix aux identifiants.',
         transfer='Préparez une carte pour un autre sujet avec les mêmes rôles HTML.',
         replacement=("descriptionPrefix: 'Mon observation : '", "descriptionPrefix: 'Ma décision expliquée : '")),
    dict(id=3, title='Scène Three.js et coordonnées', files=['scene-controller.js'],
         goal='Relier caméra, coordonnées normalisées, objet sélectionné et alternative HTML.',
         change='Comparez cameraDistance 5 et 7. Gardez les positions identiques. Cliquez ensuite une sphère puis un bouton HTML.',
         question='En reculant la caméra, les positions enregistrées changent-elles ou seulement leur projection ?',
         expected='La caméra change la projection. Les identifiants de la scène et de la liste désignent le même élément.',
         transfer='Conservez une fiche HTML lorsqu’une carte 3D est indisponible.',
         replacement=('cameraDistance: 5', 'cameraDistance: 7')),
    dict(id=4, title='Vitesse et inertie', files=['inertia.js'],
         goal='Distinguer position, vitesse et durée en secondes après le relâchement.',
         change='Comparez damping 0.65 et 1.3. Gardez restitution 0.9 et tentez un glisser-relâcher comparable. Les vitesses sont des unités normalisées par seconde. Les flèches déplacent sans élan : leur relâchement ne simule pas un lancer. Espace fige/reprend l’image et le temps; Échap annule le geste.',
         question='Un amortissement plus grand raccourcit-il ou allonge-t-il le déplacement après le geste ?',
         expected='La vitesse décroît avec exp(-damping*dt). La position continue après relâchement; le simple survol ne réagrippe pas.',
         transfer='Appliquez l’inertie à une carte HTML sans obliger Three.js.',
         replacement=('damping: 0.65', 'damping: 1.3')),
    dict(id=5, title='Interpolation et élasticité', files=['transitions.js'],
         goal='Relier cible, vitesse, ressort et amortissement avec une intégration bornée.',
         change='Comparez damping 12 et 5 en conservant stiffness 36 et la même cible. Activez ensuite le mode figé.',
         question='Que change la diminution de l’amortissement sur le dépassement de la cible ?',
         expected='Un amortissement moindre permet davantage d’oscillation. Le mode statique conserve la valeur présente et suspend la chronologie.',
         transfer='Animez l’ouverture d’une fiche plutôt qu’une sphère.',
         replacement=('damping: 12', 'damping: 5')),
    dict(id=6, title='Particules et ressources', files=['particle-layer.js'],
         goal='Distinguer population, durée de vie, données et rendu navigateur.',
         change='Comparez count 64 puis 128; gardez lifetime 3 et seed 17. Restaurez 64 après comparaison.',
         question='Quelle quantité augmente ? Est-ce que le temps du runtime Python mesure le coût du rendu dans votre navigateur ?',
         expected='Le nombre de données et de points augmente. Python ne mesure pas le renderer Three.js. La graine fixe la répétabilité, pas la validité physique.',
         transfer='Réutilisez une population bornée pour un fond facultatif désactivable.',
         replacement=('count: 64', 'count: 128')),
    dict(id=7, title='Parcours, états et mémoire', files=['interaction-flow.js'],
         goal='Conserver une sélection et un historique borné, puis suspendre la chronologie.',
         change='Comparez historyLimit 32 et 4 après cinq changements. L’aperçu conserve un historique interne; le vrai retour navigateur sera testé dans Astro.',
         question='Quelle entrée sort après le cinquième changement lorsque la limite vaut quatre ?',
         expected='L’entrée la plus ancienne sort. Un état de navigation est distinct de l’état d’un geste. Le temps ne progresse pas en mode statique.',
         transfer='Construisez une navigation fiche → liste qui restaure la sélection.',
         replacement=('historyLimit: 32', 'historyLimit: 4')),
    dict(id=8, title='Assistant, preuves et capacités', files=['register-capabilities.js'],
         goal='Examiner permission, révision et provenance, puis raccorder les huit productions.',
         change='Retrouvez canRead et expectedRevision dans le code. Réduisez la limite de snapshot de 12000 à 6000 sans supprimer les contrôles. Examinez la trace préparée.',
         question='Une réponse préparée READY peut-elle prouver que le vrai outil a été appelé ou qu’un humain a approuvé ?',
         expected='Non. La trace est une donnée d’exercice. L’outil réel exige permission et révision. La compréhension et l’approbation humaine restent distinctes.',
         transfer='Proposez une capacité de lecture bornée utile à votre propre projet, sans publication ni accès arbitraire.',
         replacement=('> 12000', '> 6000')),
]

COMMON_SETUP = '''import base64, hashlib, html, io, json, math, re, time, zipfile
from pathlib import Path
from IPython.display import HTML, display

# CPU standard; rien à installer. Les sorties HTML s'exécutent dans votre navigateur.
MODULE_ID = __NUMBER__
MISSION_ID = 'module-' + str(MODULE_ID)
reflection = {
    'prediction': '', 'observations': [], 'explanation': '',
    'assistance': '', 'limitations': '', 'openQuestion': ''
}
parameters = {}
print('Préparation prête. Votre notebook appartient à votre compte Google; le partager peut partager code et sorties.')
'''

PREVIEW_CODE = r'''if not reflection['prediction'].strip():
    raise ValueError('Écrivez votre prédiction avant l’essai, puis exécutez cette cellule à nouveau.')
for name, source in student_files.items():
    if not isinstance(source, str) or len(source.encode('utf-8')) > 200_000:
        raise ValueError('Fichier élève trop gros ou non textuel.')
preview_document = PREVIEW_TEMPLATE.replace('__STUDENT_FILES__', json.dumps(student_files, ensure_ascii=False).replace('<', r'\u003c'))
encoded = base64.b64encode(preview_document.encode('utf-8')).decode('ascii')
display(HTML('<iframe title="Expérience frontend du module" sandbox="allow-scripts allow-same-origin" '
             'style="width:100%;height:620px;border:1px solid #8796b4" src="data:text/html;base64,' + encoded + '"></iframe>'))
print('Aperçu navigateur du code dans student_files. Ce résultat n’est pas une compilation Astro ni un appel WebMCP certifié.')
'''

PREVIEW_BASE = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>body{font:16px system-ui;color:#172033;background:#f5f7fb;padding:1rem}button{margin:.25rem;padding:.5rem}.stage{height:270px;position:relative;background:#11152a;color:white;overflow:hidden;touch-action:none;outline-offset:2px}.marker{position:absolute;background:#ffa234;width:24px;height:24px;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}canvas{display:block;width:100%;height:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere}.error{color:#a31515}label{display:inline-block;margin:.5rem}li{margin:.5rem}</style></head><body>
<p>Une variable à la fois. Gardez votre prédiction visible dans le notebook.</p>
<label><input id="static" type="checkbox"> Figer l’image et le temps</label><button id="restart">Recharger l’aperçu</button>
<div id="stage" class="stage" tabindex="0" aria-label="Zone d’expérience : utilisez aussi les flèches"><span id="marker" class="marker"></span></div>
<section id="cards"><ul data-learning-cards></ul><p data-learning-description aria-live="polite"></p></section>
<p id="info" role="status"></p><pre id="trace"></pre><p id="error" class="error" role="alert"></p>
<script type="module">
const studentFiles = __STUDENT_FILES__;
const lifetimes = [];
const urls = Object.fromEntries(Object.entries(studentFiles).filter(([name]) => name.endsWith('.js')).map(([name,text]) => [name, URL.createObjectURL(new Blob([text], {type:'text/javascript'}))]));
const stage=document.getElementById('stage'), marker=document.getElementById('marker'), info=document.getElementById('info'), trace=document.getElementById('trace');
const staticControl=document.getElementById('static'); let isStatic=matchMedia('(prefers-reduced-motion: reduce)').matches, last=0, frame=0;
staticControl.checked=isStatic;
const show=(value)=>{trace.textContent=JSON.stringify(value,null,2)};
const point=(event)=>{const r=stage.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))}};
const drawPoint=(p)=>{marker.style.left=(p.x*100)+'%';marker.style.top=(p.y*100)+'%'};
let step=()=>{}, onStatic=()=>{};
function loop(now){if(isStatic)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;step(dt);frame=requestAnimationFrame(loop)}
staticControl.addEventListener('change',()=>{isStatic=staticControl.checked;onStatic(isStatic);cancelAnimationFrame(frame);last=0;if(!isStatic)frame=requestAnimationFrame(loop)});
document.getElementById('restart').addEventListener('click',()=>location.reload());
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);lifetimes.forEach(f=>f());Object.values(urls).forEach(URL.revokeObjectURL)});
const items=[{id:'element-1',title:'Geste',content:'Une position enregistrée.',position:{x:.5,y:.5}},{id:'element-2',title:'Observation',content:'Un résultat à examiner.',position:{x:.25,y:.3}},{id:'element-3',title:'Transfert',content:'Une nouvelle situation.',position:{x:.75,y:.3}}];
try {
__MODULE_PREVIEW__
onStatic(isStatic);step(0);if(!isStatic)frame=requestAnimationFrame(loop);
} catch(error) { document.getElementById('error').textContent='Erreur de l’essai : '+error.message+' — corrigez le fichier ou reprenez sa version précédente.'; }
</script></body></html>'''

PREVIEWS = {
1: """const {createInteraction}=await import(urls['interaction-state.js']);
const interaction=createInteraction(stage,state=>{if(isStatic)return;drawPoint(state.position);show(state)});lifetimes.push(()=>interaction.dispose());drawPoint(interaction.snapshot().position);
info.textContent='Glissez, relâchez, utilisez les flèches. Pour une annulation reproductible, pressez Échap pendant le geste. Une sortie de zone capturée n’est pas pointercancel.';""",
2: """const {createCards}=await import(urls['exploration-card.js']);marker.hidden=true;stage.hidden=true;
const cards=createCards(document.getElementById('cards'),items,id=>{cards.select(id);show({selection:id,representation:'HTML counterpart; Astro not compiled'})});lifetimes.push(()=>cards.dispose());
info.textContent='Cet aperçu utilise la contrepartie HTML de la carte. ExplorationCard.astro est exporté; il sera réellement compilé dans le projet.';""",
3: """marker.hidden=true;
try { const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.module.js');
 const {createSceneController}=await import(urls['scene-controller.js']);
 const scene=createSceneController({container:stage,THREE,items,onSelect:id=>show({selected:id,source:'3D',position:items.find(i=>i.id===id).position})});lifetimes.push(()=>scene.dispose());step=()=>scene.render();
 info.textContent=scene.available?'Three.js 0.181.2, dans votre navigateur. Caméra et position sont distinctes.':'WebGL indisponible : utilisez les boutons HTML.';
} catch(error) { info.textContent='CDN ou WebGL indisponible; alternative HTML conservée : '+error.message; }
const list=document.querySelector('[data-learning-cards]');items.forEach(item=>{const li=document.createElement('li'),button=document.createElement('button');button.textContent=item.title;button.onclick=()=>show({selected:item.id,source:'HTML',position:item.position});li.append(button);list.append(li)});""",
4: """const {createInertia}=await import(urls['inertia.js']);const motion=createInertia();lifetimes.push(()=>motion.dispose());let held=null;
const keyboardHeld=new Set(), inputLifetime=new AbortController(), inputOptions={signal:inputLifetime.signal};
const renderMotion=()=>{const state=motion.snapshot();drawPoint(state);show(state)};
const releaseCapture=id=>{if(id!==null&&stage.hasPointerCapture(id))stage.releasePointerCapture(id)};
const cancelGesture=()=>{const id=held;held=null;keyboardHeld.clear();motion.cancel();releaseCapture(id);renderMotion()};
stage.addEventListener('pointerdown',e=>{if(isStatic||held!==null||e.button!==0)return;keyboardHeld.clear();stage.focus({preventScroll:true});held=e.pointerId;stage.setPointerCapture(held);motion.grab(point(e),performance.now()/1000);renderMotion()},inputOptions);
stage.addEventListener('pointermove',e=>{if(e.pointerId===held&&!isStatic){motion.move(point(e),performance.now()/1000);renderMotion()}},inputOptions);
stage.addEventListener('pointerup',e=>{if(e.pointerId!==held)return;const id=held;held=null;motion.release(performance.now()/1000);releaseCapture(id);renderMotion()},inputOptions);
stage.addEventListener('pointercancel',e=>{if(e.pointerId===held)cancelGesture()},inputOptions);
stage.addEventListener('lostpointercapture',e=>{if(e.pointerId===held)cancelGesture()},inputOptions);
const keyboardDirections={ArrowLeft:{x:-.04,y:0},ArrowRight:{x:.04,y:0},ArrowUp:{x:0,y:-.04},ArrowDown:{x:0,y:.04}};
stage.addEventListener('keydown',e=>{
 if(e.code==='Space'||e.key===' '){e.preventDefault();if(!e.repeat){staticControl.checked=!isStatic;staticControl.dispatchEvent(new Event('change'))}return}
 if(e.key==='Escape'){e.preventDefault();if(held!==null||keyboardHeld.size)cancelGesture();return}
 const direction=keyboardDirections[e.key];if(!direction)return;e.preventDefault();if(isStatic||held!==null)return;
 keyboardHeld.add(e.key);const current=motion.snapshot();
 // Each key step begins at rest: the keyboard never fabricates a pointer velocity.
 motion.grab({x:Math.max(0,Math.min(1,current.x+direction.x)),y:Math.max(0,Math.min(1,current.y+direction.y))},performance.now()/1000);renderMotion();
},inputOptions);
stage.addEventListener('keyup',e=>{if(!keyboardHeld.has(e.key))return;e.preventDefault();keyboardHeld.delete(e.key);if(!keyboardHeld.size)motion.release(performance.now()/1000);renderMotion()},inputOptions);
stage.addEventListener('blur',()=>{if(held!==null||keyboardHeld.size)cancelGesture()},inputOptions);
// Freeze preserves free-flight position/velocity; an active input is ended without a launch.
onStatic=frozen=>{if(frozen&&(held!==null||keyboardHeld.size))cancelGesture()};
lifetimes.push(()=>inputLifetime.abort());
step=dt=>{const state=motion.step(dt,isStatic);drawPoint(state);show(state)};
info.textContent='Glisser puis relâcher produit l’inertie. Flèches : déplacement de 0,04 sans élan au relâchement. Espace : figer/reprendre. Échap : annuler le geste. Le gel termine un geste actif sans lancer; en vol libre il conserve position et vitesse. Coordonnées entre 0 et 1; dt en secondes. Un survol ne réagrippe pas.';""",
5: """const {createTransition}=await import(urls['transitions.js']);const transition=createTransition();lifetimes.push(()=>transition.dispose());drawPoint({x:.5,y:.5});
const button=document.createElement('button');button.textContent='Cible 1.5 / 1';let expanded=false;button.onclick=()=>{expanded=!expanded;transition.setTarget(expanded?1.5:1)};document.body.insertBefore(button,stage);
step=dt=>{const value=transition.step(dt,isStatic);marker.style.width=(24*value)+'px';marker.style.height=(24*value)+'px';show(transition.snapshot())};
info.textContent='La valeur actuelle est conservée lorsque vous figez le mouvement. Même cible, un paramètre changé.';""",
6: """const {createParticleLayer,particleOptions}=await import(urls['particle-layer.js']);const particles=createParticleLayer();lifetimes.push(()=>particles.dispose());marker.hidden=true;
const canvas=document.createElement('canvas');stage.append(canvas);canvas.width=600;canvas.height=270;const context=canvas.getContext('2d');
step=dt=>{const values=particles.step(dt,isStatic);context.clearRect(0,0,600,270);context.fillStyle='#ffa234';for(const p of values){context.beginPath();context.arc(p.x*600,p.y*270,2,0,Math.PI*2);context.fill()}
 info.textContent=values.length+' particules. Données JS et aperçu Canvas; coût Three.js à vérifier dans le projet.';};show(particleOptions);""",
7: """const {createInteractionFlow}=await import(urls['interaction-flow.js']);marker.hidden=true;stage.hidden=true;
const inputLifetime=new AbortController(), inputOptions={signal:inputLifetime.signal};
const navigation=document.createElement('div');navigation.setAttribute('role','group');navigation.setAttribute('aria-label','Vues du parcours');document.body.insertBefore(navigation,document.getElementById('cards'));
const list=document.querySelector('[data-learning-cards]'), description=document.querySelector('[data-learning-description]');list.setAttribute('aria-label','Éléments du parcours');
const viewButtons=new Map(), selectionButtons=new Map(), rows=[];
const renderFlow=state=>{show(state);for(const [view,button] of viewButtons)button.setAttribute('aria-pressed',String(view===state.view));for(const [id,button] of selectionButtons)button.setAttribute('aria-pressed',String(id===state.selection));const selected=items.find(item=>item.id===state.selection);description.textContent=selected?selected.id+' — '+selected.content:''};
const flow=createInteractionFlow({host:null,onChange:renderFlow});
for(const view of ['mission','experience','proofs','summary']){const button=document.createElement('button');button.type='button';button.textContent=view;button.addEventListener('click',()=>flow.navigate(view),inputOptions);viewButtons.set(view,button);navigation.append(button)}
for(const item of items){const row=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=item.title+' ('+item.id+')';button.addEventListener('click',()=>flow.navigate(flow.snapshot().view,item.id),inputOptions);selectionButtons.set(item.id,button);row.append(button);rows.push(row);list.append(row)}
lifetimes.push(()=>{inputLifetime.abort();flow.dispose();navigation.remove();rows.forEach(row=>row.remove())});
onStatic=value=>flow.setStatic(value);step=dt=>{flow.step(dt);renderFlow(flow.snapshot())};
info.textContent='Choisissez au moins deux éléments avec les boutons, au clavier ou au pointeur. Une nouvelle vue conserve la sélection actuelle. Chaque choix ajoute une entrée; comparez la même séquence de cinq choix avec historyLimit 32 puis 4. Le gel suspend elapsed. Historique interne de l’iframe : le vrai retour navigateur est vérifié dans Astro.';""",
8: """const {learningToolName}=await import(urls['register-capabilities.js']);marker.hidden=true;stage.hidden=true;
const preparedTrace={kind:'prepared-example-not-a-live-call',tool:learningToolName,question:'Puis-je lire cet aperçu ?',expectedRevision:2,currentRevision:3,canRead:false,claimedState:'READY',claimedHumanApproval:true};show(preparedTrace);
info.textContent='Trace préparée volontairement défectueuse. N’interprétez ni READY ni humanApproval comme des faits. Le notebook ne crée aucun appel réel ni moteur Python.';""",
}

EXPORT_CODE = r'''# Faites votre bilan avant de rendre. Les observations sont déclarées par vous.
required = ['prediction', 'explanation', 'assistance', 'limitations']
if any(not isinstance(reflection.get(key), str) or not reflection[key].strip() for key in required):
    raise ValueError('Complétez prédiction, explication, aide reçue (ou aucune) et limite avant le rendu.')
if not reflection.get('observations'):
    raise ValueError('Conservez au moins une observation sélectionnée.')
if any(len(str(value)) > 12000 for value in reflection.values()):
    raise ValueError('Le bilan est trop long; sélectionnez les éléments utiles, pas toute la conversation.')
attempt_id = 'module-' + str(MODULE_ID) + '-' + str(time.time_ns())
artifacts = []
export_files = {}
for name, source in student_files.items():
    if not re.fullmatch(r'[A-Za-z0-9_.-]+\.(js|astro)', name):
        raise ValueError('Chemin frontend non autorisé : ' + name)
    raw = source.encode('utf-8')
    if len(raw) > 200_000:
        raise ValueError('Brique trop volumineuse.')
    path = 'frontend/' + name
    export_files[path] = raw
    artifacts.append({'id': 'module-' + str(MODULE_ID) + '-' + name, 'path': path, 'content': source,
                      'mediaType': 'text/plain', 'sha256': hashlib.sha256(raw).hexdigest()})
result = {'schemaVersion': 'orbit-learning-colab-v1', 'missionId': MISSION_ID, 'moduleId': MODULE_ID,
          'attemptId': attempt_id, 'parameters': parameters, **reflection,
          'status': 'external-declared', 'artifacts': artifacts,
          'verification': {'sourceCaptured': True, 'independentExecutionVerified': False,
                           'humanApproval': False, 'masteryCertified': False}}
export_files['orbit-learning-result.json'] = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False).encode('utf-8')
export_files['INTEGRATION.md'] = INTEGRATION_TEXT.encode('utf-8')

# Copie rejouable de votre code effectif, non une capture certifiée des sorties du navigateur.
def cell(kind, source):
    value = {'cell_type': kind, 'metadata': {}, 'source': source.splitlines(True)}
    if kind == 'code': value.update(outputs=[], execution_count=None)
    return value
record = {'nbformat': 4, 'nbformat_minor': 5,
          'metadata': {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
                       'orbit': {'kind': 'source-capture-replay', 'notIndependentExecutionProof': True}},
          'cells': [cell('markdown', '# Mon rendu — module ' + str(MODULE_ID) + '\nCode capturé depuis student_files; observations déclarées. Les sorties navigateur ne sont pas archivées automatiquement.'),
                    cell('code', 'from IPython.display import HTML, display\nimport base64, json\nstudent_files = ' + repr(student_files) + '\nreflection = ' + repr(reflection) + '\nparameters = ' + repr(parameters)),
                    cell('code', 'PREVIEW_TEMPLATE = ' + repr(PREVIEW_TEMPLATE) + '\n' + PREVIEW_CODE_TEXT),
                    cell('markdown', 'Revue : reformuler une décision, refaire un essai et tenter un transfert.') ]}
export_files['notebook.ipynb'] = json.dumps(record, ensure_ascii=False, indent=2).encode('utf-8')
manifest = {'schemaVersion': 'orbit-learning-artifact-bundle-v1', 'missionId': MISSION_ID,
            'attemptId': attempt_id, 'status': 'external-declared',
            'files': [{'path': path, 'sha256': hashlib.sha256(raw).hexdigest()} for path, raw in sorted(export_files.items())]}
export_files['manifest.json'] = json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')
archive_buffer = io.BytesIO()
# ZIP_STORED makes the bounded browser import possible without an extra decompression dependency.
with zipfile.ZipFile(archive_buffer, 'w', compression=zipfile.ZIP_STORED) as archive:
    for path, raw in sorted(export_files.items()):
        archive.writestr(path, raw)
filename = 'orbit-module-' + str(MODULE_ID) + '-' + attempt_id + '.zip'
Path(filename).write_bytes(archive_buffer.getvalue())
try:
    from google.colab import files
    files.download(filename)
except ImportError:
    print('Fichier prêt dans le répertoire du notebook :', filename)
print(json.dumps({'state': 'EXPORTED_DECLARED_WORK', 'moduleId': MODULE_ID,
                  'files': len(export_files), 'sha256': hashlib.sha256(archive_buffer.getvalue()).hexdigest()}))
'''


def make_cell(kind, content):
    value = {'cell_type': kind, 'metadata': {}, 'source': textwrap.dedent(content).strip().splitlines(True)}
    if kind == 'code':
        value.update(outputs=[], execution_count=None)
    return value


def integration(module):
    names = '\n'.join('- `src/learning/module-' + str(module['id']) + '/' + name + '`' for name in module['files'])
    return f'''# Raccordement — module {module['id']}

{names}

Ces fichiers proviennent de votre variable student_files; aucun corrigé ne remplace le code à l’export.
Conservez identifiants, coordonnées normalisées, dt en secondes et fonctions de nettoyage.
L’aperçu n’est pas une compilation Astro, un appel WebMCP réel ni une mesure de performance Three.js.
La remise reste sélectionnée par vous. Sanity ne reçoit rien de ce notebook.
Le notebook.ipynb exporté conserve le code et le bilan pour reprise, sans prétendre capturer l’exécution indépendante.

Transfert : {module['transfer']}
'''


def scaffold_content():
    source = BASE / 'assembly'
    return {path.relative_to(source).as_posix(): path.read_text(encoding='utf-8')
            for path in source.rglob('*') if path.is_file() and path.name != 'merge_modules.py' and '__pycache__' not in path.parts}


ASSEMBLY_UPLOAD_CODE = '''from google.colab import files

# Par défaut, utilisez le sélecteur officiel ci-dessous.
# Si son dialogue reste indisponible, téléversez vos huit ZIP dans le panneau
# Fichiers de Colab. Activez alors ce choix et écrivez les huit noms exacts.
# Aucun fichier n'est recherché, téléchargé ou choisi automatiquement.
USE_RUNTIME_FILE_SELECTION = False
RUNTIME_SELECTED_EXPORT_FILENAMES = []

def read_selected_runtime_exports(filenames):
    if not isinstance(filenames, list) or len(filenames) != 8:
        raise ValueError('Déclarez exactement huit noms de ZIP du panneau Fichiers.')
    if any(not isinstance(name, str) or len(name) > 200 or
           not re.fullmatch(r'[A-Za-z0-9_.-]+\\.zip', name) for name in filenames):
        raise ValueError('Utilisez les noms de ZIP exportés, sans dossier ni chemin.')
    if len(set(filenames)) != 8:
        raise ValueError('Les huit noms de ZIP doivent être distincts.')
    root = Path('/content').resolve()
    selected = {}
    for name in filenames:
        path = root / name
        if path.is_symlink() or path.resolve().parent != root or not path.is_file():
            raise ValueError('ZIP déclaré absent ou non admissible : ' + name)
        if path.stat().st_size > MAX_ARCHIVE_BYTES:
            raise ValueError('ZIP déclaré trop volumineux : ' + name)
        data = path.read_bytes()
        if len(data) > MAX_ARCHIVE_BYTES:
            raise ValueError('ZIP déclaré trop volumineux : ' + name)
        selected[name] = data
    return selected

# Une nouvelle sélection invalide toujours l'examen et l'assemblage précédents.
uploaded = {}
examined_selection = None
project_data = None
assembly_filename = None
upload_error = None
upload_mode = 'runtime-files-explicit' if USE_RUNTIME_FILE_SELECTION else 'official-picker'
try:
    if USE_RUNTIME_FILE_SELECTION:
        uploaded = read_selected_runtime_exports(RUNTIME_SELECTED_EXPORT_FILENAMES)
    else:
        uploaded = files.upload()  # Le sélecteur officiel : choisissez vos huit ZIP.
except Exception as error:
    upload_error = type(error).__name__
    print(json.dumps({'state': 'RUNTIME_SELECTION_REFUSED' if USE_RUNTIME_FILE_SELECTION else 'UPLOAD_UNAVAILABLE',
                      'sourceMode': upload_mode, 'errorType': type(error).__name__, 'reason': str(error),
                      'nextStep': 'Corrigez le choix déclaré ou réexécutez le sélecteur officiel.'}, ensure_ascii=False))
if upload_error is None and not uploaded:
    print(json.dumps({'state': 'UPLOAD_CANCELLED', 'selectedFiles': 0,
                      'nextStep': 'Aucun fichier assemblé. Vous pouvez relancer cette cellule.'}))
elif uploaded:
    print(json.dumps({'state': 'FILES_SELECTED_NOT_EXAMINED', 'selectedFiles': len(uploaded),
                      'sourceMode': upload_mode,
                      'nextStep': 'Exécutez la cellule suivante pour examiner les huit exports.'}))
'''

ASSEMBLY_EXAMINE_CODE = '''def examine_selected_exports(selected_files):
    # Même lecteur borné et mêmes contrôles de manifeste que l'assemblage réel.
    if not isinstance(selected_files, dict) or len(selected_files) != 8:
        raise ValueError('Choisissez exactement un export par module, soit huit ZIP.')
    modules = {}
    rows = []
    for filename, raw in selected_files.items():
        if not isinstance(filename, str) or not isinstance(raw, bytes):
            raise ValueError('Le sélecteur doit fournir des noms et des octets de fichiers.')
        number, contents, result = load_module(raw)
        manifest = json.loads(contents['manifest.json'])
        if number in modules:
            raise ValueError('Deux exports désignent le module ' + str(number) + '. Choisissez votre version.')
        modules[number] = raw
        rows.append({'moduleId': number, 'filename': filename, 'bytes': len(raw),
                     'attemptId': str(result.get('attemptId', 'non déclaré'))[:120],
                     'resultSchemaVersion': str(result['schemaVersion'])[:120],
                     'manifestSchemaVersion': str(manifest.get('schemaVersion', 'non déclaré'))[:120],
                     'sha256': hashlib.sha256(raw).hexdigest(),
                     'frontendFiles': sum(name.startswith('frontend/') for name in contents)})
    if set(modules) != set(REQUIRED):
        raise ValueError('Les modules 1 à 8 doivent chacun apparaître exactement une fois.')
    rows.sort(key=lambda row: row['moduleId'])
    fingerprint = hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True,
                                            separators=(',', ':')).encode('utf-8')).hexdigest()
    return {'rows': rows, 'sha256': fingerprint, 'modules': modules}

examined_selection = None
project_data = None
assembly_filename = None
try:
    examined_selection = examine_selected_exports(uploaded)
    cells = ''.join('<tr><td>' + str(row['moduleId']) + '</td><td>' + html.escape(row['filename']) +
                    '</td><td>' + str(row['bytes']) + '</td><td>' + html.escape(row['attemptId']) +
                    '</td><td>' + html.escape(row['resultSchemaVersion']) +
                    '</td><td>' + html.escape(row['manifestSchemaVersion']) +
                    '</td><td><code>' + row['sha256'] + '</code></td></tr>'
                    for row in examined_selection['rows'])
    display(HTML('<table><caption>Vos huit exports contrôlés — provenance déclarée</caption>'
                 '<thead><tr><th>Module</th><th>Fichier choisi</th><th>Octets</th><th>Tentative</th>'
                 '<th>Format résultat déclaré</th><th>Format manifeste déclaré</th>'
                 '<th>SHA-256 du ZIP</th></tr></thead><tbody>' + cells + '</tbody></table>'))
    print('Empreinte de cette sélection à copier dans la cellule suivante :')
    print(examined_selection['sha256'])
    print('EXAMINED_DECLARED_EXPORTS : aucune exécution indépendante, compréhension ou approbation humaine certifiée.')
except (ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
    examined_selection = None
    print(json.dumps({'state': 'SELECTION_REFUSED', 'reason': str(error),
                      'nextStep': 'Corrigez la sélection, relancez son chargement puis son examen.'}, ensure_ascii=False))
'''

ASSEMBLY_BUILD_CODE = '''# Après avoir examiné les fichiers et leurs versions, copiez l'empreinte affichée.
ASSEMBLY_REVIEWED_SELECTION_SHA256 = ''
project_data = None
assembly_filename = None
if not examined_selection:
    print('SELECTION_REQUIRED : chargez puis examinez vos huit exports avant cet assemblage.')
elif ASSEMBLY_REVIEWED_SELECTION_SHA256 != examined_selection['sha256']:
    print('SELECTION_ACKNOWLEDGEMENT_REQUIRED : copiez l’empreinte de la sélection examinée ci-dessus.')
else:
    try:
        current_selection = examine_selected_exports(uploaded)
        if current_selection['sha256'] != examined_selection['sha256']:
            raise ValueError('La sélection a changé depuis son examen. Examinez-la à nouveau.')
        project_data = assemble([current_selection['modules'][number] for number in range(1, 9)], scaffold_files)
        assembly_filename = 'orbit-mon-frontend-' + current_selection['sha256'][:12] + '.zip'
        Path(assembly_filename).write_bytes(project_data)
        files.download(assembly_filename)
        print(json.dumps({'state': 'ASSEMBLED_NOT_BUILT', 'selectionSha256': current_selection['sha256'],
                          'archiveSha256': hashlib.sha256(project_data).hexdigest(), 'bytes': len(project_data),
                          'executionVerified': False, 'understandingVerified': False,
                          'humanApproval': False, 'nextStep': 'Compilation Astro et vrais appels WebMCP à vérifier.'}, ensure_ascii=False))
    except (ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        project_data = None
        assembly_filename = None
        print(json.dumps({'state': 'ASSEMBLY_REFUSED', 'reason': str(error),
                          'nextStep': 'Reprenez l’examen de la sélection. Aucun fichier remplacé par un corrigé.'}, ensure_ascii=False))
'''


def build_notebook(module, corrected=False):
    number = module['id']
    student = {name: (BASE / f'frontend/module-{number}' / name).read_text(encoding='utf-8') for name in module['files']}
    if corrected:
        target = next(name for name in module['files'] if name.endswith('.js'))
        before, after = module['replacement']
        if before not in student[target]:
            raise ValueError('Instructor change target missing: ' + target)
        student[target] = student[target].replace(before, after, 1)
    preview = PREVIEW_BASE.replace('__MODULE_PREVIEW__', PREVIEWS[number])
    constants = 'PREVIEW_TEMPLATE = ' + repr(preview) + '\nPREVIEW_CODE_TEXT = ' + repr(PREVIEW_CODE) + '\nINTEGRATION_TEXT = ' + repr(integration(module))
    supplied = 'student_files = {}\n'
    for name, code in student.items():
        # Keep the editable JavaScript readable in Colab, rather than one escaped Python line.
        if "'''" in code:
            supplied += 'student_files[' + repr(name) + '] = ' + repr(code) + '\n'
        else:
            supplied += 'student_files[' + repr(name) + "] = r'''" + code + "'''\n"
    supplied += '# Modifiez le texte ci-dessus, puis réexécutez cette cellule et l’aperçu.\n'
    prediction = ('reflection[\'prediction\'] = ' + repr('Exemple enseignant : ' + module['expected']) if corrected else "reflection['prediction'] = ''  # Votre hypothèse AVANT l’essai")
    title = ('CORRIGÉ ENSEIGNANT — ' if corrected else '') + f"Module {number} — {module['title']}"
    cells = [
        make_cell('markdown', f'''# {title}

**Objectif :** {module['goal']}

Activité de **30 minutes**, incluse dans les **3 heures solo** : **2 h lecture guidée → 30 min Colab → 30 min bilan**. Le webinaire de **1 heure** a lieu après la préparation autonome. Formation complète : **10 h accompagnées + 30 h solo = 40 h**.

CPU gratuit, sans GPU, API payante ou IA Colab obligatoire. Rien à installer. Les sorties JS sont exécutées par votre navigateur. Three.js, lorsque nécessaire, est chargé depuis un CDN à version fixée; l’alternative HTML reste disponible si le réseau ou WebGL est indisponible.

Faites une copie personnelle dans Drive. Vos productions sont conservables et réutilisables. Le partage du notebook peut partager son code, ses textes et ses sorties. Ni votre journal ni vos fichiers ne sont envoyés dans Sanity automatiquement.

**Trois petites étapes :** prédire (5 min), changer/observer (15 min), expliquer/exporter (10 min). Vous pouvez demander une réponse à votre assistant; indiquez l’aide reçue et vérifiez son application.
'''),
        make_cell('code', COMMON_SETUP.replace('__NUMBER__', str(number))),
        make_cell('markdown', f"## 1. Prédire — 5 min\n{module['question']}\n\nNotez votre prédiction avant de voir l’effet. Une prédiction imparfaite est une trace utile."),
        make_cell('code', prediction + "\nparameters = {}  # Notez la valeur initiale, la valeur testée et les conditions conservées."),
        make_cell('markdown', f"## 2. Modifier et observer — 15 min\n{module['change']}\n\nLe fichier est une chaîne Python contenant du JavaScript/Astro réel. L’aperçu et l’export utilisent **la même** variable `student_files`. Conservez les exports nommés et les signatures; un changement hors contrat doit être examiné plutôt que remplacé silencieusement."),
        make_cell('code', supplied),
        make_cell('code', constants),
        make_cell('code', PREVIEW_CODE),
        make_cell('markdown', f"## 3. Expliquer et exporter — 10 min\nComparez prédiction et observation. Expliquez une ligne ou une décision avec vos mots. Indiquez votre aide reçue, une limite et une prochaine question.\n\n**Transfert proposé :** {module['transfer']}\n\nLe bilan de 30 minutes qui suit cette activité sert à choisir ce que vous remettez à l’enseignant et à préparer sa revue. Un ZIP valide ou une empreinte ne prouve pas une maîtrise."),
        make_cell('code', (
            "reflection['observations'] = " + (repr(['Exemple à examiner : ' + module['expected']]) if corrected else '[]') + '\n'
            "reflection['explanation'] = " + (repr('Exemple de piste : ' + module['expected']) if corrected else "''") + '\n'
            "reflection['assistance'] = " + (repr('Corrigé fourni : une piste de réponse, pas une observation élève.') if corrected else "''  # Écrivez aussi « aucune » si pertinent.") + '\n'
            "reflection['limitations'] = " + (repr('Exemple enseignant non exécuté; refaire la manipulation et vérifier dans le navigateur cible.') if corrected else "''") + '\n'
            "reflection['openQuestion'] = ''\n")),
        make_cell('code', EXPORT_CODE),
    ]
    if number == 8:
        merge_source = (BASE / 'assembly/merge_modules.py').read_text(encoding='utf-8').split("if __name__ == '__main__':")[0]
        cells += [
            make_cell('markdown', '''## La découverte finale — vos huit productions ensemble

Vous disposez maintenant de huit briques conservées pendant vos leçons. Le raccordement suivant les importe réellement, sans récupérer un frontend terminé à votre place. Chargez les huit ZIP de **vos** versions. Le raccordement Astro est du code fourni et attribué séparément.

Cette étape prolonge la revue du Module 8 et le projet personnel. Elle ne constitue pas du temps ajouté à l’activité de trente minutes. Le projet garde ses **6 h solo + 2 h accompagnées**. Aucun `npm install` ou benchmark n’est lancé dans Colab. La compilation est vérifiée dans Kaggle et le projet cible.
'''),
            make_cell('code', 'scaffold_files = ' + repr(scaffold_content()) + '\n' + merge_source),
            make_cell('code', ASSEMBLY_UPLOAD_CODE),
            make_cell('code', ASSEMBLY_EXAMINE_CODE),
            make_cell('code', ASSEMBLY_BUILD_CODE),
        ]
    if corrected:
        cells.append(make_cell('markdown', '## Piste de correction, à ne pas confondre avec un résultat observé\n' + module['expected'] + '\nLe corrigé ne certifie ni l’exécution ni la compréhension. Accepter des observations différentes et rechercher leurs conditions.'))
    notebook = {'nbformat': 4, 'nbformat_minor': 5,
                'metadata': {'kernelspec': {'name': 'python3', 'display_name': 'Python 3', 'language': 'python'},
                             'language_info': {'name': 'python'}, 'colab': {'name': f'module-{number}.ipynb', 'provenance': []},
                             'orbit': {'missionId': f'module-{number}', 'moduleId': number, 'minutes': 30,
                                       'audience': 'instructor' if corrected else 'student', 'state': 'prepared-not-executed'}},
                'cells': cells}
    for index, cell in enumerate(cells):
        cell['id'] = f'm{number}-' + ('answer-' if corrected else '') + str(index)
    return notebook


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'instructor').mkdir(exist_ok=True)
    manifest = []
    for module in MODULES:
        for corrected in [False, True]:
            path = OUTPUT / ('instructor' if corrected else '') / f"module-{module['id']}.ipynb"
            data = json.dumps(build_notebook(module, corrected), ensure_ascii=False, indent=2).encode('utf-8')
            path.write_bytes(data)
            manifest.append({'path': path.relative_to(BASE).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(),
                             'missionId': f"module-{module['id']}", 'state': 'prepared-not-executed'})
    (OUTPUT / 'manifest.json').write_text(json.dumps({'schemaVersion': 'orbit-colab-source-v1', 'files': manifest}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'state': 'prepared-not-executed', 'studentNotebooks': 8, 'instructorNotebooks': 8, 'path': str(OUTPUT)}))


if __name__ == '__main__':
    main()
