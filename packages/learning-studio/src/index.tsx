import {useEffect, useMemo, useRef, useState, type ChangeEvent} from 'react'
import {definePlugin, useClient, useCurrentUser} from 'sanity'
import {route, StateLink, useRouter, useRouterState} from 'sanity/router'
import {LearningStore, MODULES, PERMISSIONS, getLocalizedModule, readNotebookZip, type LearningSession, type LearningResult, type Permission} from '../../learning/src/index.js'
import {parseDossier} from '../../evidence-review/src/index.js'
import {type EngineId} from '../../evidence-review/src/classification.js'
import {readPreferences, savePreferences, type DisplayPreferences, type Language} from '../../ui-preferences/src/index.js'
import {registerFormationTools, unregisterFormationTools} from '../../../web/src/lib/learning-webmcp.js'
import {createPublicationPreview, publishReviewedSelection, type PublicationPreview} from './publication.js'
import {learningStyles} from './styles.js'
import {text} from './i18n.js'

export interface OrbitLearningStudioOptions {courseOrigin?: string; webmcp?: boolean}
const stores = new Map<string, LearningStore>()
const selectViews = {lab: ['mission','experience','evidence','reflection'], projects: ['files','versions','journal','sharing']} as const
type Area = keyof typeof selectViews
function fileDownload(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], {type}))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function publicCourseUrl(origin: string, url: string): string {
  const destination = new URL(url, origin)
  if (!['https:', 'http:'].includes(destination.protocol)) throw Error('Invalid course resource URL.')
  return destination.href
}
function privacyText(language: Language) {
  return text(language,
    'Les travaux restent dans ce navigateur, sauf sauvegarde, remise ou publication explicitement choisie. Colab et Drive sont le cloud Google. Seuls des contenus acceptés comme publiables doivent être envoyés à Sanity. Aucun enseignant n’obtient un accès automatique.',
    'Work stays in this browser unless you explicitly save, hand it over or publish. Colab and Drive are Google cloud storage. Send only content you accept as publishable to Sanity. Teachers do not receive automatic access.',
    'El trabajo permanece en este navegador salvo que decidas guardarlo, entregarlo o publicarlo. Colab y Drive son almacenamiento en la nube de Google. Envía a Sanity solo contenido que aceptas como publicable. El docente no recibe acceso automático.')
}
function IdentityBoundLearningTool(props: {area:Area;options:OrbitLearningStudioOptions}) {
  const host=useClient({apiVersion:'2026-03-01'}),user=useCurrentUser(),config=host.config()
  // Remount before rendering a changed identity. Resetting only in useEffect
  // would briefly display the previous user's state under the next account.
  const key=JSON.stringify([config.projectId,config.dataset,user?.id??'signed-out'])
  return <LearningTool key={key} {...props}/>
}
function LearningTool({area, options}: {area: Area; options: OrbitLearningStudioOptions}) {
  const client = useClient({apiVersion: '2026-03-01'})
  const currentUser = useCurrentUser()
  const configuration = client.config()
  const projectId = configuration.projectId ?? '', dataset = configuration.dataset ?? '', userId = currentUser?.id ?? ''
  const identity = JSON.stringify([projectId,dataset,userId])
  const store = useMemo(() => {
    let existing = stores.get(identity)
    if (!existing) {
      let storage: Storage | undefined
      try { storage = globalThis.localStorage } catch { storage = undefined }
      existing = new LearningStore({projectId,dataset,userId: userId || undefined,sessionId: userId ? undefined : 'signed-out'},storage)
      stores.set(identity, existing)
    }
    return existing
  }, [identity])
  const [session, setSession] = useState<LearningSession>(() => store.snapshot())
  const [preferences, setPreferences] = useState<DisplayPreferences>(() => readPreferences())
  const [message, setMessage] = useState('')
  const [registry, setRegistry] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [artifactDraft, setArtifactDraft] = useState('')
  const [draftRevision, setDraftRevision] = useState<number>()
  const [verificationPending, setVerificationPending] = useState<string>()
  const [publicationIds, setPublicationIds] = useState<string[]>([])
  const [publicationTitle, setPublicationTitle] = useState('')
  const [preview, setPreview] = useState<PublicationPreview>()
  const [acknowledgedPreview, setAcknowledgedPreview] = useState<PublicationPreview>()
  const acknowledged = Boolean(preview && acknowledgedPreview === preview)
  const publicationGeneration = useRef(0)
  const [publishing, setPublishing] = useState(false)
  const [handoff, setHandoff] = useState<{revision:number;payload:unknown}>()
  const [evaluation, setEvaluation] = useState<unknown>()
  const [reflection, setReflection] = useState('')
  const [reviewNotes, setReviewNotes] = useState<Record<string,string>>({})
  const liveStore = useRef(store)
  liveStore.current = store
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const routeState = useRouterState((state) => state) as Record<string,unknown>
  const view = selectViews[area].includes(routeState.view as never) ? String(routeState.view) : selectViews[area][0]
  const language = preferences.language
  const module = getLocalizedModule(session.moduleId,language) ?? MODULES[0]
  const t = (fr: string,en: string,es: string) => text(language,fr,en,es)
  const activeArtifact = session.artifacts.find((item) => item.id === selectedId)
  const persistence = store.getPersistenceStatus()
  const destination = {projectId,dataset,userId}
  useEffect(() => {
    setSession(store.snapshot()); setPreview(undefined); setSelectedId(undefined); setEvaluation(undefined)
    return store.subscribe(setSession)
  }, [store])
  useEffect(() => {
    if (options.webmcp === false || !userId) return () => {store.revokeAgentAccess()}
    // The dossier survives routing; this effect's registry ownership does not.
    const owner=Symbol('orbit-learning-studio-mount')
    const registration = registerFormationTools(store,{courseOrigin:options.courseOrigin,owner})
    let active = true
    registration.then((status) => {if (active) setRegistry(status)}).catch(() => {if (active) setRegistry('UNAVAILABLE')})
    return () => {active=false;unregisterFormationTools(store,owner)}
  }, [store,userId,options.courseOrigin,options.webmcp])
  useEffect(() => {
    const changed = () => setPreferences(readPreferences())
    window.addEventListener('orbit:preferences-change',changed);window.addEventListener('storage',changed)
    return () => {window.removeEventListener('orbit:preferences-change',changed);window.removeEventListener('storage',changed)}
  }, [])
  useEffect(() => {invalidatePublicationPreview();setHandoff(undefined)},[session.revision,identity])
  function invalidatePublicationPreview() {
    publicationGeneration.current += 1
    setPreview(undefined)
    setAcknowledgedPreview(undefined)
  }
  async function preparePublication() {
    invalidatePublicationPreview()
    const generation = publicationGeneration.current
    try {
      const prepared = await createPublicationPreview(store.snapshot(),publicationIds,destination,publicationTitle)
      if (liveStore.current === store && publicationGeneration.current === generation && store.snapshot().revision === prepared.revision) setPreview(prepared)
    } catch(error) {
      if (liveStore.current === store && publicationGeneration.current === generation) setMessage((error as Error).message)
    }
  }
  function run(action: () => unknown) {try {const result=action();if(result&&typeof result==='object'&&'state'in result&&!['READY','PRESENTED'].includes(String(result.state)))setMessage('message'in result?String(result.message):String(result.state));else setMessage(t('Modification conservée dans la session.','Change kept in this session.','Cambio conservado en esta sesión.'))}catch(error){setMessage((error as Error).message)}}
  function updatePreferences(partial: Partial<DisplayPreferences>) {setPreferences(savePreferences({...preferences,...partial}))}
  function selectArtifact(id:string) {
    const current=store.snapshot(),artifact=current.artifacts.find((item)=>item.id===id)
    if(!artifact)return
    setSelectedId(id);setArtifactDraft(artifact.content);setDraftRevision(current.revision)
  }
  async function verifyArtifact(id:string) {
    setVerificationPending(id)
    try {
      const result=await store.verifyArtifact(id)
      if(liveStore.current!==store)return
      if(result.state==='READY')setMessage(t('Empreinte contrôlée ; aucune exécution ni compréhension certifiée.','Digest checked; execution and understanding are not certified.','Huella comprobada; no se certifican ejecución ni comprensión.'))
      else run(()=>result)
    }catch(error){if(liveStore.current===store)setMessage((error as Error).message)}
    finally{if(liveStore.current===store)setVerificationPending(undefined)}
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const initialRevision=store.snapshot().revision
    try {
      if (file.size > 8_000_000) throw Error(t('Fichier limité à 8 Mo.','Files are limited to 8 MB.','Archivos limitados a 8 MB.'))
      const bundle = /\.zip$/i.test(file.name) ? await readNotebookZip(file) : undefined
      const content = bundle ? '' : await file.text()
      if(liveStore.current!==store||store.snapshot().revision!==initialRevision)throw Error(t('La session a changé pendant la lecture. Recommence l’import.','The session changed during reading. Import again.','La sesión cambió durante la lectura. Vuelve a importar.'))
      let value: Record<string,unknown> | undefined
      let result: LearningResult | undefined
      if (!bundle && /\.json$/i.test(file.name)) value = JSON.parse(content)
      if (bundle) result = store.importColabResult(bundle.result)
      else if (value?.format === 'orbit-learning-v1') result = store.importSession(value)
      else if (value?.schemaVersion === 'orbit-learning-colab-v1') result = store.importColabResult(value)
      else if (value && ('claims' in value) && ('sources' in value)) result = store.setEvidenceDossier(parseDossier(value))
      else store.addArtifact({title:file.name,path:file.name,content,mediaType:file.type||'text/plain',origin:'learner'})
      if (result && !['READY','PRESENTED'].includes(result.state)) throw Error(`${result.state}: ${result.message??result.code??''}`)
      setMessage(bundle
        ? t(`Archive contrôlée : ${bundle.fileCount} fichiers et empreintes conservés. Travail déclaré ; exécution et compréhension non vérifiées.`,`Archive checked: ${bundle.fileCount} files and digests preserved. Reported work; execution and understanding unverified.`,`Archivo comprobado: ${bundle.fileCount} archivos y huellas conservados. Trabajo declarado; ejecución y comprensión sin verificar.`)
        : t('Import déclaré ; il ne certifie ni exécution ni compréhension.','Declared import; it certifies neither execution nor understanding.','Importación declarada; no certifica ejecución ni comprensión.'))
    }catch(error){setMessage((error as Error).message)}
    finally{input.value = ''}
  }
  function changeModule(id: number) {run(() => {store.selectModule(id);router.navigate({...routeState,module:String(id)})})}
  useEffect(() => {
    const id = Number(routeState.module)
    if (Number.isInteger(id) && id >= 1 && id <= 8 && id !== store.snapshot().moduleId) store.selectModule(id)
  }, [routeState.module,store])
  const viewLabels: Record<string,string> = {
    mission:t('Mission','Mission','Misión'),experience:t('Expérience','Experiment','Experimento'),evidence:t('Preuves','Evidence','Pruebas'),reflection:t('Bilan','Reflection','Reflexión'),
    files:t('Fichiers','Files','Archivos'),versions:t('Versions','Versions','Versiones'),journal:t('Journal','Journal','Diario'),sharing:t('Partage','Sharing','Compartir'),
  }
  const permissions: Record<Permission,string> = {
    localSave:t('Sauvegarder explicitement dans ce navigateur','Explicitly save in this browser','Guardar explícitamente en este navegador'),
    agentRead:t('Autoriser l’assistant à lire la sélection partagée','Allow the assistant to read the shared selection','Permitir al asistente leer la selección compartida'),
    agentPropose:t('Autoriser le dépôt de propositions','Allow proposal deposits','Permitir el envío de propuestas'),
    engineSelection:t('Autoriser l’assistant à choisir les moteurs','Allow the assistant to select engines','Permitir al asistente elegir motores'),
    teacherShare:t('Autoriser un export sélectionné pour l’enseignant','Allow a selected export for the teacher','Permitir una exportación seleccionada para el docente'),
    sanityPublish:t('Autoriser la préparation d’un contenu publiable pour Sanity','Allow preparing publishable content for Sanity','Permitir preparar contenido publicable para Sanity'),
  }
  if (!userId) return <section className="orbit-learning-studio"><style>{learningStyles}</style><p>{t('Connecte-toi au Studio pour ouvrir ton espace isolé.','Sign in to Studio to open your isolated workspace.','Inicia sesión en Studio para abrir tu espacio aislado.')}</p></section>
  return <section className="orbit-learning-studio" lang={language} data-orbit-motion={preferences.motion} data-orbit-contrast={preferences.contrast} data-orbit-text={preferences.text}>
    <style>{learningStyles}</style>
    <header><strong>Orbit.</strong><div className="ol-row">
      <label>{t('Langue','Language','Idioma')} <select aria-label={t('Langue','Language','Idioma')} value={language} onChange={(event) => updatePreferences({language:event.target.value as Language})}><option value="fr">FR</option><option value="en">EN</option><option value="es">ES</option></select></label>
      <details><summary>{t('Accès','Access','Acceso')}</summary><label><input type="checkbox" checked={preferences.motion==='static'} onChange={(event) => updatePreferences({motion:event.target.checked?'static':'animated'})}/>{t('Affichage statique','Static display','Visualización estática')}</label><label><input type="checkbox" checked={preferences.contrast==='high'} onChange={(event) => updatePreferences({contrast:event.target.checked?'high':'standard'})}/>{t('Contraste élevé','High contrast','Alto contraste')}</label><label><input type="checkbox" checked={preferences.text==='large'} onChange={(event) => updatePreferences({text:event.target.checked?'large':'base'})}/>{t('Texte agrandi','Larger text','Texto ampliado')}</label></details>
    </div></header>
    <main><h1>{area==='lab'?t('Laboratoire de formation','Learning laboratory','Laboratorio de formación'):t('Mes projets','My projects','Mis proyectos')}</h1>
      <p className="ol-muted">{privacyText(language)}</p>
      {area==='projects'&&<p>{t('Ton idée de projet t’appartient. Le projet final suit 1 h de cadrage avec l’enseignant → 6 h solo avec ton assistant → 1 h de clôture avec l’enseignant. Ces heures sont distinctes de celles des huit modules.','Your project idea belongs to you. The final project follows 1 hour of teacher setup → 6 solo hours with your assistant → 1 teacher closure hour. These hours are separate from the eight modules.','Tu idea de proyecto te pertenece. El proyecto final sigue 1 hora de preparación con el docente → 6 horas autónomas con tu asistente → 1 hora de cierre con el docente. Estas horas son distintas de las de los ocho módulos.')}</p>}
      <div className="ol-row"><label>{t('Module','Module','Módulo')} <select value={session.moduleId} onChange={(event) => changeModule(Number(event.target.value))}>{MODULES.map((entry) => <option key={entry.id} value={entry.id}>{entry.id} · {getLocalizedModule(entry.id,language)?.title??entry.title}</option>)}</select></label><small>{projectId}/{dataset} · {t('Révision','Revision','Revisión')} {session.revision}</small></div>
      <nav aria-label={t('Vues de travail','Workspace views','Vistas de trabajo')}>{selectViews[area].map((entry) => <StateLink key={entry} state={{...routeState,view:entry,module:String(session.moduleId)}} aria-current={view===entry?'page':undefined}>{viewLabels[entry]}</StateLink>)}</nav>
      <p role="status" aria-live="polite">{message}</p>
      <div className="ol-card" role={persistence.code?'alert':'status'} aria-live={persistence.code?'assertive':'polite'}>
        <strong>{t('Sauvegarde locale','Browser storage','Almacenamiento local')} · {persistence.state}</strong>
        <p>{persistence.state==='saved'&&!persistence.dirty
          ?t(`Révision ${persistence.savedRevision} enregistrée dans ce navigateur.`,`Revision ${persistence.savedRevision} saved in this browser.`,`Revisión ${persistence.savedRevision} guardada en este navegador.`)
          :persistence.state==='awaiting-choice'
            ?t('Une ancienne copie existe. Choisis sa reprise ou l’enregistrement du travail courant. Le travail courant reste en mémoire.','An older copy exists. Choose to restore it or save current work. Current work remains in memory.','Existe una copia anterior. Elige restaurarla o guardar el trabajo actual. El trabajo actual permanece en memoria.')
            :t('Le travail courant reste en mémoire. Exporte ton dossier avant de fermer cette page si aucune sauvegarde n’est confirmée.','Current work remains in memory. Export your dossier before closing this page if no save is confirmed.','El trabajo actual permanece en memoria. Exporta tu expediente antes de cerrar esta página si no se confirma el guardado.')}</p>
        {persistence.message&&<p>{persistence.message}</p>}
      </div>
      {view==='mission' && <div><h2>{module.title}</h2><p>{module.objective}</p><table><tbody><tr><th>{t('Lecture accompagnée','Guided learning','Aprendizaje guiado')}</th><td>120 min</td></tr><tr><th>Colab</th><td>30 min</td></tr><tr><th>{t('Bilan','Reflection','Reflexión')}</th><td>30 min</td></tr><tr><th>{t('Webinaire après la préparation','Webinar after preparation','Webinario después de la preparación')}</th><td>60 min</td></tr></tbody></table><div className="ol-card" lang={language}><h3>{t('Consignes originales du cours','Original course instructions','Instrucciones originales del curso')}</h3><ol>{module.activity.map((item) => <li key={item}>{item}</li>)}</ol><ul>{module.criteria.map((item) => <li key={item}>{item}</li>)}</ul></div><h3>{t('Ressources et notebook','Resources and notebook','Recursos y cuaderno')}</h3><ul>{module.resources.map((resource) => <li key={resource.url}><a href={publicCourseUrl(options.courseOrigin??'https://orbit.securedme.ca',resource.url)} target="_blank" rel="noreferrer">{resource.title}</a></li>)}</ul><p>{t('Les données du notebook restent dans ton compte Google. Le rendu importé reste déclaré jusqu’à une vérification distincte.','Notebook data stays in your Google account. Imported work remains declared until separately verified.','Los datos del cuaderno permanecen en tu cuenta de Google. El trabajo importado permanece declarado hasta una verificación independiente.')}</p></div>}
      {view==='experience' && <div><h2>{t('Prédire, modifier, observer','Predict, change, observe','Predecir, cambiar, observar')}</h2><p>{module.prediction}</p><p>{t('Ouvre le notebook, change une seule variable, exporte le résultat structuré puis importe-le ici.','Open the notebook, change one variable, export the structured result and import it here.','Abre el cuaderno, cambia una variable, exporta el resultado estructurado e impórtalo aquí.')}</p><a href={publicCourseUrl(options.courseOrigin??'https://orbit.securedme.ca',module.notebook)}>{t('Télécharger le notebook','Download notebook','Descargar cuaderno')}</a>{session.experiments.map((experiment) => <article className="ol-card" key={experiment.id}><h3>{experiment.variable}</h3><p>{experiment.prediction}</p><pre>{JSON.stringify(experiment,null,2)}</pre></article>)}</div>}
      {view==='evidence' && <div><h2>{t('Examiner les preuves','Review evidence','Examinar pruebas')}</h2><p>{t('Importer un dossier de preuves ne vérifie pas sa pertinence sémantique. Les trois moteurs conservent leurs résultats séparés.','Importing an evidence dossier does not verify semantic relevance. The three engines retain separate results.','Importar un expediente de pruebas no verifica su pertinencia semántica. Los tres motores conservan resultados separados.')}</p><div className="ol-row">{(['baseline','n','p'] as EngineId[]).map((engine,index) => <button key={engine} disabled={!session.engineSelection.includes(engine)&&session.engineSelection.length===2} aria-pressed={session.engineSelection.includes(engine)} onClick={() => run(() => store.setEngineSelection(session.engineSelection.includes(engine)?session.engineSelection.filter((item) => item!==engine):[...session.engineSelection,engine].slice(-2),'human'))}>{index+1} · {engine}</button>)}<button disabled={!session.evidenceDossier||!session.engineSelection.length} onClick={() => run(() => {if(session.evidenceDossier){const result=store.evaluateEngines();setEvaluation(result);return result}} )}>{t('Comparer la sélection','Compare selection','Comparar selección')}</button></div>{session.evidenceDossier?<pre>{JSON.stringify(session.evidenceDossier,null,2)}</pre>:<p>{t('Aucun dossier de preuves sélectionné.','No evidence dossier selected.','Ningún expediente de pruebas seleccionado.')}</p>}{evaluation!==undefined&&<pre>{JSON.stringify(evaluation,null,2)}</pre>}</div>}
      {view==='reflection' && <div><h2>{t('Préparer la revue humaine','Prepare human review','Preparar la revisión humana')}</h2><p>{t('Ajoute un fichier avec ta prédiction, ton observation, une explication personnelle, l’aide reçue, une limite et ta prochaine question.','Add a file containing your prediction, observation, personal explanation, help received, a limitation and your next question.','Añade un archivo con tu predicción, observación, explicación personal, ayuda recibida, una limitación y tu siguiente pregunta.')}</p><ul>{session.proposals.map((proposal) => <li key={proposal.id}><strong>{proposal.kind} · {proposal.status}</strong><p>{String(proposal.payload.text??'')}</p></li>)}</ul><p>{t('Une exécution n’attribue aucune maîtrise et aucune approbation humaine.','Execution does not establish mastery or human approval.','Una ejecución no acredita dominio ni aprobación humana.')}</p></div>}
      {view==='files' && <div><h2>{t('Fichiers conservés','Saved files','Archivos conservados')}</h2><div className="ol-grid">{session.artifacts.map((artifact) => <article className="ol-card" key={artifact.id}><button onClick={() => selectArtifact(artifact.id)}>{artifact.title}</button><p>{artifact.origin} · {artifact.status} · v{artifact.version}</p><label><input type="checkbox" checked={session.sharedArtifactIds.includes(artifact.id)} onChange={(event) => run(() => store.shareSelection({artifactIds:event.target.checked?[...session.sharedArtifactIds,artifact.id]:session.sharedArtifactIds.filter((id) => id!==artifact.id),journalIds:session.sharedJournalIds}))}/>{t('Sélection pour l’assistant','Selection for assistant','Selección para el asistente')}</label></article>)}</div></div>}
      {view==='versions' && <div><h2>{t('Versions et états observables','Versions and observable states','Versiones y estados observables')}</h2><p>{t('Une empreinte identifie un contenu ; elle ne prouve pas l’exécution ou la compréhension.','A digest identifies content; it does not prove execution or understanding.','Una huella identifica contenido; no demuestra ejecución ni comprensión.')}</p><table><thead><tr><th>{t('Fichier','File','Archivo')}</th><th>{t('Version','Version','Versión')}</th><th>{t('Vérification','Verification','Verificación')}</th></tr></thead><tbody>{session.artifacts.map((artifact) => <tr key={artifact.id}><td><button onClick={()=>selectArtifact(artifact.id)}>{artifact.title}</button></td><td>{artifact.version}</td><td>{artifact.hashStatus} · {artifact.status}</td></tr>)}</tbody></table></div>}
      {(view==='files'||view==='versions')&&activeArtifact&&<article className="ol-card">
        <h3>{activeArtifact.title} · v{activeArtifact.version}</h3><pre>{activeArtifact.content}</pre>
        <p>{activeArtifact.hashStatus}{activeArtifact.sha256&&<> · SHA-256 <code>{activeArtifact.sha256}</code></>}</p>
        <div className="ol-row"><button onClick={()=>fileDownload(activeArtifact.path??activeArtifact.title,activeArtifact.content,activeArtifact.mediaType)}>{t('Exporter ce fichier','Export this file','Exportar este archivo')}</button><button disabled={verificationPending!==undefined} onClick={()=>void verifyArtifact(activeArtifact.id)}>{verificationPending===activeArtifact.id?t('Contrôle en cours…','Checking…','Comprobando…'):t('Contrôler l’empreinte SHA-256','Check SHA-256 digest','Comprobar huella SHA-256')}</button></div>
        <p className="ol-muted">{t('Ce contrôle compare ou établit une empreinte du texte. Il ne modifie pas son statut d’exécution ou de compréhension.','This check compares or establishes a text digest. It does not change execution or understanding status.','Esta comprobación compara o establece una huella del texto. No cambia el estado de ejecución o comprensión.')}</p>
        <label>{t('Contenu de la nouvelle version','New version content','Contenido de la nueva versión')}<textarea rows={12} value={artifactDraft} onChange={(event)=>setArtifactDraft(event.target.value)}/></label>
        {draftRevision!==session.revision&&<p role="status">{t('La révision a changé. Recharge ce fichier avant de créer une version. Ta saisie reste visible jusqu’au rechargement.','The revision changed. Reload this file before creating a version. Your draft remains visible until reloading.','La revisión cambió. Recarga este archivo antes de crear una versión. Tu borrador sigue visible hasta recargar.')}</p>}
        <div className="ol-row"><button onClick={()=>selectArtifact(activeArtifact.id)}>{t('Recharger la version sélectionnée','Reload selected version','Recargar versión seleccionada')}</button><button disabled={draftRevision!==session.revision||artifactDraft===activeArtifact.content} onClick={()=>run(()=>{
          if(store.snapshot().revision!==draftRevision)throw Error(t('Révision périmée ; recharge le fichier.','Stale revision; reload the file.','Revisión desactualizada; recarga el archivo.'))
          const added=store.addArtifactVersion(activeArtifact.id,artifactDraft);selectArtifact(added.id);return added
        })}>{t('Créer une nouvelle version, conserver l’ancienne','Create a new version and keep the old one','Crear una nueva versión y conservar la anterior')}</button></div>
        <p className="ol-muted">{t('La nouvelle version n’hérite ni de l’empreinte, ni des vérifications, ni du partage de l’ancienne.','The new version inherits no digest, verification or sharing from the previous version.','La nueva versión no hereda la huella, verificación ni permisos de la versión anterior.')}</p>
      </article>}
      {view==='journal' && <div><h2>{t('Journal sélectionnable','Selectable journal','Diario seleccionable')}</h2>{session.journal.map((entry) => <article className="ol-card" key={entry.id}><p>{entry.text}</p><small>{entry.at} · {entry.attribution}</small><label><input type="checkbox" checked={session.sharedJournalIds.includes(entry.id)} onChange={(event) => run(() => store.shareSelection({artifactIds:session.sharedArtifactIds,journalIds:event.target.checked?[...session.sharedJournalIds,entry.id]:session.sharedJournalIds.filter((id) => id!==entry.id)}))}/>{t('Sélection pour l’assistant','Selection for assistant','Selección para el asistente')}</label></article>)}</div>}
      {view==='sharing' && <div><h2>{t('Choisir ce qui quitte la session','Choose what leaves the session','Elegir qué sale de la sesión')}</h2><p>{privacyText(language)}</p><h3>{t('Publication Sanity','Sanity publication','Publicación Sanity')}</h3><p>{t('Le forfait gratuit utilise des datasets publics. Ne sélectionne aucun journal privé ou secret. Seuls les artefacts cochés seront envoyés.','The free plan uses public datasets. Do not select private journals or secrets. Only checked artefacts will be sent.','El plan gratuito utiliza datasets públicos. No selecciones diarios privados ni secretos. Solo se enviarán los artefactos marcados.')}</p><label>{t('Titre de la publication','Publication title','Título de la publicación')}<input value={publicationTitle} maxLength={160} onChange={(event) => {setPublicationTitle(event.target.value);invalidatePublicationPreview()}}/></label>{session.artifacts.map((artifact) => <label key={artifact.id}><input type="checkbox" checked={publicationIds.includes(artifact.id)} onChange={(event) => {setPublicationIds(event.target.checked?[...publicationIds,artifact.id]:publicationIds.filter((id) => id!==artifact.id));invalidatePublicationPreview()}}/>{artifact.title}</label>)}<button disabled={!session.permissions.sanityPublish||!publicationIds.length||!publicationTitle.trim()} onClick={preparePublication}>{t('Prévisualiser le contenu exact','Preview exact content','Previsualizar contenido exacto')}</button>{preview&&<div className="ol-card"><p>{preview.destination.projectId}/{preview.destination.dataset}</p><pre>{JSON.stringify(preview.document,null,2)}</pre><label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledgedPreview(event.target.checked?preview:undefined)}/>{t('J’accepte que cette sélection soit publiable et envoyée à cette destination.','I accept that this selection is publishable and sent to this destination.','Acepto que esta selección sea publicable y se envíe a este destino.')}</label><button disabled={!acknowledged||publishing} onClick={async () => {setPublishing(true);try{await publishReviewedSelection(client,preview,store.snapshot(),{projectId:client.config().projectId??'',dataset:client.config().dataset??'',userId},acknowledged,()=>liveStore.current===store&&store.snapshot().revision===preview.revision&&store.snapshot().permissions.sanityPublish);setMessage(t('Sélection publiée ; aucun journal privé envoyé.','Selection published; no private journal sent.','Selección publicada; no se envió ningún diario privado.'));invalidatePublicationPreview()}catch(error){setMessage((error as Error).message)}finally{setPublishing(false)}}}>{t('Publier la sélection examinée','Publish reviewed selection','Publicar selección revisada')}</button></div>}</div>}
      {(view==='reflection'||view==='journal')&&<div className="ol-card">
        <label>{t('Mon explication, aide reçue et prochaine question','My explanation, help received and next question','Mi explicación, ayuda recibida y siguiente pregunta')}<textarea value={reflection} maxLength={10000} onChange={(event)=>setReflection(event.target.value)}/></label>
        <button disabled={!reflection.trim()} onClick={()=>run(()=>{store.addJournalEntry({kind:'reflection',text:reflection,artifactIds:activeArtifact?[activeArtifact.id]:[]});setReflection('')})}>{t('Conserver mon bilan','Keep my reflection','Conservar mi reflexión')}</button>
      </div>}
      {view==='sharing'&&<div className="ol-card">
        <h3>{t('Remise sélectionnée à l’enseignant','Selected handoff to the teacher','Entrega seleccionada al docente')}</h3>
        <p>{t('Les cases de sélection dans Fichiers et Journal déterminent ce rendu. Rien n’est transmis automatiquement et aucune invitation au projet Sanity n’est créée.','The selection boxes in Files and Journal define this handoff. Nothing is transmitted automatically and no Sanity project invitation is created.','Las casillas de selección en Archivos y Diario definen esta entrega. No se transmite nada automáticamente ni se crea una invitación al proyecto Sanity.')}</p>
        <button disabled={!session.permissions.teacherShare||!session.sharedArtifactIds.length&&!session.sharedJournalIds.length} onClick={()=>run(()=>{const result=store.prepareTeacherExport(session.sharedArtifactIds,session.sharedJournalIds);if(result.state==='READY')setHandoff({revision:session.revision,payload:result.data});return result})}>{t('Prévisualiser la remise','Preview handoff','Previsualizar entrega')}</button>
        {handoff&&<><pre>{JSON.stringify(handoff.payload,null,2)}</pre><button disabled={handoff.revision!==session.revision||!session.permissions.teacherShare} onClick={()=>fileDownload(`orbit-learning-handoff-${session.id}.json`,JSON.stringify(handoff.payload,null,2))}>{t('Télécharger la sélection examinée','Download reviewed selection','Descargar selección revisada')}</button></>}
      </div>}
      {view==='reflection'&&session.proposals.map((proposal)=><div className="ol-card" key={`review-${proposal.id}`}>
        <h3>{t('Revue humaine de la proposition','Human review of proposal','Revisión humana de la propuesta')} {proposal.id}</h3>
        <label>{t('Justification','Reason','Justificación')}<textarea value={reviewNotes[proposal.id]??''} onChange={(event)=>setReviewNotes({...reviewNotes,[proposal.id]:event.target.value})}/></label>
        <div className="ol-row"><button disabled={!reviewNotes[proposal.id]?.trim()} onClick={()=>run(()=>store.reviewProposal(proposal.id,'accepted',reviewNotes[proposal.id]))}>{t('Accepter pour cette révision','Accept for this revision','Aceptar para esta revisión')}</button><button disabled={!reviewNotes[proposal.id]?.trim()} onClick={()=>run(()=>store.reviewProposal(proposal.id,'needs-work',reviewNotes[proposal.id]))}>{t('Demander une correction','Request revision','Solicitar corrección')}</button></div>
      </div>)}
      <fieldset><legend>{t('Autorisations distinctes','Separate permissions','Permisos separados')}</legend>{PERMISSIONS.map((permission) => <label key={permission}><input type="checkbox" checked={session.permissions[permission]} onChange={(event) => run(() => store.setPermission(permission,event.target.checked))}/>{permissions[permission]}</label>)}</fieldset>
      <div className="ol-row"><button disabled={!session.permissions.localSave} onClick={()=>run(()=>store.restoreLocal())}>{t('Reprendre la copie locale après consentement','Restore browser copy after consent','Restaurar copia local después del consentimiento')}</button><button disabled={!session.permissions.localSave} onClick={()=>run(()=>store.saveCurrentLocally())}>{t('Enregistrer explicitement la version actuelle','Explicitly save the current version','Guardar explícitamente la versión actual')}</button></div>
      <p className="ol-muted">{t('L’ouverture ne lit pas automatiquement un ancien travail. Autoriser la sauvegarde puis choisir reprise ou enregistrement. Une reprise révoque les partages précédents.','Opening does not automatically read older work. Allow storage, then choose restore or save. Restoring revokes earlier sharing.','Al abrir no se lee automáticamente el trabajo anterior. Permite el almacenamiento y elige restaurar o guardar. La restauración revoca los permisos anteriores.')}</p>
      <div className="ol-row"><input ref={inputRef} hidden type="file" accept=".zip,.json,.ipynb,.js,.ts,.astro,.md,.txt,.css,.html" onChange={importFile}/><button onClick={() => inputRef.current?.click()}>{t('Importer un rendu ou fichier','Import work or a file','Importar trabajo o archivo')}</button><button onClick={() => fileDownload(`orbit-learning-${session.id}.json`,store.exportSession())}>{t('Exporter mon dossier','Export my dossier','Exportar mi expediente')}</button></div>
      <p className="ol-muted">WebMCP · {registry||t('Découverte en cours ou indisponible ; commandes humaines utilisables.','Discovery pending or unavailable; human controls remain usable.','Descubrimiento pendiente o no disponible; los controles humanos siguen disponibles.')}</p>
    </main>
  </section>
}
export const orbitLearningStudio = definePlugin((options: OrbitLearningStudioOptions = {}) => {
  if(options.courseOrigin&&!['https://orbit.securedme.ca','http://127.0.0.1:4321'].includes(options.courseOrigin))throw Error('The public course origin must be Orbit or the documented local development host.')
  return {
  name:'orbit-learning-studio',
  tools:[
    {name:'orbit-learning-lab',title:'Orbit · Lab',component:() => <IdentityBoundLearningTool area="lab" options={options}/>,router:route.create('/',[route.create('/:view',[route.create('/:module')])])},
    {name:'orbit-learning-projects',title:'Orbit · Projects',component:() => <IdentityBoundLearningTool area="projects" options={options}/>,router:route.create('/',[route.create('/:view',[route.create('/:module')])])},
  ],
  schema:{types:[{name:'orbitLearningPublication',title:'Orbit · Publication choisie',type:'document',readOnly:true,fields:[
    {name:'title',title:'Title',type:'string',readOnly:true},
    {name:'moduleId',title:'Module',type:'number',readOnly:true},
    {name:'revision',title:'Revision',type:'number',readOnly:true},
    {name:'publishedAt',title:'Published at',type:'datetime',readOnly:true},
    {name:'payloadJson',title:'Explicitly selected artefacts',type:'text',readOnly:true},
  ]}]},
  }
})
