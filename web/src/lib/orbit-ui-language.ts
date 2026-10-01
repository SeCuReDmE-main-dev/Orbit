import {readPreferences} from '../../../packages/ui-preferences/src/index';

// Translate declared interface vocabulary only. Source excerpts, editable data
// and dossier content remain in their original language.
const vocabulary:Record<string,[string,string]>={
 'Question':['Question','Pregunta'],'Plan':['Plan','Plan'],'Preuves':['Evidence','Pruebas'],'Vérification':['Review','Revisión'],'Rapport':['Report','Informe'],
 'Mes dossiers':['My dossiers','Mis expedientes'],'Rechercher':['Search','Buscar'],'Aide':['Help','Ayuda'],'Réglages':['Settings','Ajustes'],
 'Partager avec mon agent':['Share with my agent','Compartir con mi agente'],'Session en mémoire':['In-memory session','Sesión en memoria'],'Conserver sur cet appareil':['Keep on this device','Conservar en este dispositivo'],
 'Fermer':['Close','Cerrar'],'Enregistrer':['Save','Guardar'],'Annuler':['Cancel','Cancelar'],'Retour':['Back','Volver'],'Ouvrir':['Open','Abrir'],'Importer':['Import','Importar'],'Exporter':['Export','Exportar'],
 'Structure':['Structure','Estructura'],'Dossiers':['Dossiers','Expedientes'],'Relations':['Relations','Relaciones'],'Audit':['Audit','Auditoría'],'Releases':['Releases','Publicaciones'],
 'Source':['Source','Fuente'],'Sources':['Sources','Fuentes'],'Claim':['Claim','Afirmación'],'Concept':['Concept','Concepto'],'Content':['Content','Contenido'],
 'Corpus de recherche':['Research corpora','Corpus de investigación'],'Autres contenus':['Other content','Otros contenidos'],
 'Soutenue':['Supported','Sostenida'],'Contestée':['Contested','Cuestionada'],'Indéterminée':['Indeterminate','Indeterminada'],'À revoir':['Needs review','Por revisar'],
 'Soutiens':['Supporting evidence','Apoyos'],'Incertitudes':['Uncertainties','Incertidumbres'],'Réfutations':['Refutations','Refutaciones'],
 'Toutes':['All','Todas'],'Tous':['All','Todos'],'Tout T':['All T','Todo T'],'Tout I':['All I','Todo I'],'Tout F':['All F','Todo F'],
 'Stockage':['Storage','Almacenamiento'],'Autorisations':['Permissions','Permisos'],'Connexion Sanity':['Sanity connection','Conexión Sanity'],'Historique':['History','Historial'],
 'Lire le guide complet ↗':['Read the full guide ↗','Leer la guía completa ↗'],'Nouvelle recherche':['New research','Nueva investigación'],'Nouveau dossier':['New dossier','Nuevo expediente'],
 'Créer un dossier':['Create a dossier','Crear un expediente'],'Créer':['Create','Crear'],'Supprimer':['Delete','Eliminar'],'Examiner':['Examine','Examinar'],'Intégrer':['Integrate','Integrar'],
 'Question de recherche':['Research question','Pregunta de investigación'],'Résultat attendu':['Expected outcome','Resultado esperado'],'Contexte':['Context','Contexto'],'Contraintes':['Constraints','Restricciones'],
 'Enregistrer la question':['Save the question','Guardar la pregunta'],'Préparer le plan':['Prepare the plan','Preparar el plan'],'Approuver le plan':['Approve the plan','Aprobar el plan'],
 'Consulter Sanity':['Consult Sanity','Consultar Sanity'],'Lire le sommaire':['Read the outline','Leer el índice'],'Lire cette entrée':['Read this entry','Leer esta entrada'],
 'Ajouter une source':['Add a source','Añadir una fuente'],'Ajouter des sources':['Add sources','Añadir fuentes'],'Ajouter un lien':['Add a link','Añadir un enlace'],
 'Choisir dans Drive':['Choose from Drive','Elegir desde Drive'],'Connecter Google Drive':['Connect Google Drive','Conectar Google Drive'],'Déconnecter Drive':['Disconnect Drive','Desconectar Drive'],
 'Titre':['Title','Título'],'Adresse URL':['URL','Dirección URL'],'Passage exact':['Exact passage','Pasaje exacto'],'Extrait':['Excerpt','Extracto'],'Provenance':['Provenance','Procedencia'],
 'Retour aux preuves':['Back to evidence','Volver a las pruebas'],'Retour aux affirmations':['Back to claims','Volver a las afirmaciones'],'Affirmations':['Claims','Afirmaciones'],'Affirmation':['Claim','Afirmación'],
 'Sujet':['Subject','Sujeto'],'Propriété':['Property','Propiedad'],'Valeur':['Value','Valor'],'Fournisseur':['Provider','Proveedor'],'Produit':['Product','Producto'],'Mode':['Mode','Modo'],
 'Conditions':['Conditions','Condiciones'],'Population':['Population','Población'],'Version':['Version','Versión'],'Période':['Period','Período'],'Justification':['Rationale','Justificación'],
 'Comparer les trois moteurs sur ces mêmes passages':['Compare the three engines on these same passages','Comparar los tres motores con estos mismos pasajes'],
 'Conserver les trois calculs':['Keep the three calculations','Conservar los tres cálculos'],'Calculs précédents':['Previous calculations','Cálculos anteriores'],
 'Préciser les conditions / reprendre HOLD':['Clarify conditions / reassess HOLD','Precisar condiciones / revisar HOLD'],
 'N · preuves indépendantes':['N · independent evidence','N · pruebas independientes'],'P · relations par attributs':['P · attribute relations','P · relaciones por atributos'],'Référence simple':['Simple baseline','Referencia simple'],
 'Comparer':['Compare','Comparar'],'Recalculer':['Recalculate','Recalcular'],'Vérifier':['Verify','Verificar'],'Corriger':['Correct','Corregir'],'Approuver':['Approve','Aprobar'],
 'Décision humaine':['Human decision','Decisión humana'],'Revue humaine':['Human review','Revisión humana'],'Propositions':['Proposals','Propuestas'],'Proposition':['Proposal','Propuesta'],
 'Accepter':['Accept','Aceptar'],'Demander une correction':['Request a correction','Solicitar una corrección'],'Exporter le dossier':['Export dossier','Exportar expediente'],'Exporter un fichier JSON':['Export a JSON file','Exportar un archivo JSON'],
 'Exporter le rapport':['Export report','Exportar informe'],'Exporter Markdown':['Export Markdown','Exportar Markdown'],'Importer un dossier':['Import a dossier','Importar un expediente'],
 'Autoriser une copie locale':['Allow a local copy','Autorizar una copia local'],'Retirer la copie locale':['Remove local copy','Retirar la copia local'],
 'Autoriser la sauvegarde locale':['Allow local saving','Autorizar guardado local'],'Révoquer la sauvegarde locale':['Revoke local saving','Revocar guardado local'],
 'Révoquer le partage':['Revoke sharing','Revocar acceso compartido'],'Lecture seule':['Read only','Solo lectura'],'Autoriser la lecture':['Allow reading','Autorizar lectura'],
 'Autoriser les propositions':['Allow proposals','Autorizar propuestas'],'Étape suivante':['Next step','Siguiente paso'],'Commencer':['Start','Comenzar'],
 'Posez votre question.':['Ask your question.','Haz tu pregunta.'],'Examinez une preuve.':['Examine evidence.','Examina una prueba.'],'Reprenez votre recherche.':['Resume your research.','Retoma tu investigación.'],
 'Dans Question, précisez le résultat attendu, puis enregistrez.':['In Question, define the expected outcome, then save.','En Pregunta, define el resultado esperado y guarda.'],
 'Dans Preuves, ouvrez une source : vérifiez son passage et son périmètre.':['In Evidence, open a source: check its passage and scope.','En Pruebas, abre una fuente: comprueba el pasaje y su alcance.'],
 'Exportez le dossier ou autorisez sa copie locale. Le rapport reste modifiable.':['Export the dossier or allow a local copy. The report remains editable.','Exporta el expediente o autoriza una copia local. El informe sigue editable.'],
 'Par défaut, le dossier reste dans cette session. Autoriser la copie locale est une action distincte.':['By default, the dossier stays in this session. Allowing a local copy is a separate action.','Por defecto, el expediente permanece en esta sesión. Autorizar una copia local es una acción separada.'],
 'Le benchmark n’a pas encore établi de supériorité.':['The benchmark has not yet established superiority.','El benchmark aún no ha establecido superioridad.'],
};

export function mountUiLanguage(root:HTMLElement){
 const originals=new WeakMap<Text,{fr:string,last:string}>();
 const selector='button,a,label,h1,h2,h3,h4,nav,[role=tab],[data-ui=Label],[data-ui=Heading],.eyebrow,.micro-label,[data-storage-state],[data-ui=Text]';
 let observer:MutationObserver,frame=0;
 function update(){
  observer?.disconnect();const lang=readPreferences().language;
  root.querySelectorAll<HTMLElement>(selector).forEach(element=>{
   if(element.closest('pre,code,textarea,[contenteditable=true],.readable-text,.report-document,[data-dossier-title]'))return;
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   let node:Node|null;
   while((node=walker.nextNode())){
    const text=node as Text, raw=text.data, saved=originals.get(text);
    const fr=saved&&raw===saved.last?saved.fr:raw;
    const word=fr.trim(),pair=vocabulary[word];if(!pair)continue;
    const translated=lang==='fr'?word:pair[lang==='en'?0:1];
    const next=fr.replace(word,translated);if(raw!==next)text.data=next;
    originals.set(text,{fr,last:next});
   }
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true});
 }
 observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update();});});update();
 window.addEventListener('orbit:preferences-change',update);
 window.addEventListener('storage',update);
 return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);window.removeEventListener('orbit:preferences-change',update);window.removeEventListener('storage',update);};
}
