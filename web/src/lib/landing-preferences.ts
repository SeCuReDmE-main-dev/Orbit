import {readPreferences,savePreferences,applyPreferences,preferenceKey,defaults} from '../../../packages/ui-preferences/src/index';
export type LandingLanguage='fr'|'en'|'es';
export const landingLanguage=():LandingLanguage=>['en','es'].includes(document.documentElement.lang)?document.documentElement.lang as LandingLanguage:'fr';
export const landingText=(fr:string,en:string,es:string)=>({fr,en,es})[landingLanguage()];
const messages:Record<string,[string,string]>={
 'Scène du jeu réinitialisée.':['Game scene cleared.','Escena del juego reiniciada.'],
 'Geste déclenché. Essayez maintenant avec la souris ou au toucher.':['Gesture demonstrated. Try it with the mouse or touch.','Gesto demostrado. Pruébalo con el ratón o al tocar.'],
 'Alignement assisté. Effacer pour essayer vous-même.':['Assisted alignment. Clear to try it yourself.','Alineación asistida. Borra para intentarlo tú.'],
 'Puzzle aligné ! Les trois silhouettes se superposent.':['Puzzle aligned! The three silhouettes overlap.','¡Alineado! Las tres siluetas coinciden.'],
 'Portail traversé · mouvement conservé.':['Portal crossed · motion retained.','Portal atravesado · movimiento conservado.'],
 'Historique rembobiné. Vous pouvez créer un nouveau parcours.':['History rewound. Create a new path.','Historial rebobinado. Puedes crear un nuevo recorrido.'],
 'Retour dans votre parcours · relâchez pour repartir.':['Rewinding your path · release to continue.','Retrocediendo · suelta para continuar.'],
 'Parcours repris · un nouveau mouvement crée une nouvelle suite.':['Path resumed · a new gesture creates a new branch.','Recorrido retomado · un gesto nuevo crea una nueva rama.'],
 'Fronde relâchée : direction vers le noyau.':['Slingshot released toward the nucleus.','Honda soltada hacia el núcleo.'],
 'Empreinte PNG enregistrée sur votre appareil.':['PNG imprint saved on your device.','Huella PNG guardada en tu dispositivo.'],
 'Capture indisponible. Réessayez.':['Capture unavailable. Try again.','Captura no disponible. Inténtalo otra vez.'],
 'Capture indisponible dans ce navigateur.':['Capture unavailable in this browser.','Captura no disponible en este navegador.'],
 'Animations réduites · rotation manuelle disponible':['Reduced motion · manual rotation available','Movimiento reducido · rotación manual disponible'],
 'Déplacez et lancez l’atome · flèches au clavier · explorez les quinze jeux':['Move and throw the atom · arrow keys to rotate · explore fifteen games','Mueve y lanza el átomo · flechas para girar · explora quince juegos'],
 'Relâché · inertie puis retour au calme.':['Released · inertia, then gradual rest.','Soltado · inercia y vuelta gradual al reposo.'],
 'Sculpture statique · WebGL indisponible':['Static sculpture · WebGL unavailable','Escultura estática · WebGL no disponible'],
 'Rendu interrompu · sculpture statique disponible':['Rendering stopped · static sculpture available','Render detenido · escultura estática disponible'],
 'Sculpture réinitialisée · glissez pour explorer':['Sculpture reset · drag to explore','Escultura reiniciada · arrastra para explorar'],
 'Mouvement en pause · rotation manuelle disponible':['Motion paused · manual rotation available','Movimiento pausado · rotación manual disponible'],
};
export function translateLandingMessage(fr:string){
  const pair=messages[fr];if(pair)return landingText(fr,pair[0],pair[1]);
  const stars=fr.match(/^(\d+) étoiles dans votre constellation\.$/);if(stars)return landingText(fr,`${stars[1]} stars in your constellation.`,`${stars[1]} estrellas en tu constelación.`);
  const seeds=fr.match(/^(\d+) particules semées\.$/);if(seeds)return landingText(fr,`${seeds[1]} particles scattered.`,`${seeds[1]} partículas dispersadas.`);
  return fr;
}
export function mountLandingPreferences(root:HTMLElement,translationRoot:HTMLElement=root){
  const abort=new AbortController(),signal=abort.signal;
  const select=root.querySelector<HTMLSelectElement>('[data-landing-language]')!;
  const access=root.querySelector<HTMLButtonElement>('[data-landing-access]')!;
  let prefs=readPreferences();applyPreferences(prefs);
  const dialog=document.createElement('dialog');dialog.className='orbit-access';dialog.setAttribute('aria-labelledby','orbit-access-title');
  dialog.innerHTML=`<h2 id="orbit-access-title"></h2><label><input type="checkbox" data-landing-motion /><span data-access-motion></span></label><label><input type="checkbox" data-access-contrast /><span data-access-contrast-label></span></label><label><input type="checkbox" data-access-text /><span data-access-text-label></span></label><p data-access-note></p><div><button type="button" data-access-reset></button><button type="button" data-access-close></button></div>`;
  root.append(dialog);
  const motion=dialog.querySelector<HTMLInputElement>('[data-landing-motion]')!,contrast=dialog.querySelector<HTMLInputElement>('[data-access-contrast]')!,text=dialog.querySelector<HTMLInputElement>('[data-access-text]')!;
  function language(){
    select.value=prefs.language;translationRoot.querySelectorAll<HTMLElement>('[data-fr]').forEach(el=>{el.textContent=el.dataset[prefs.language]||el.dataset.fr||'';});
    select.setAttribute('aria-label',landingText('Langue','Language','Idioma'));
    access.textContent=landingText('Accès','Access','Acceso');
    dialog.querySelector('h2')!.textContent=landingText('Affichage et accessibilité','Display and accessibility','Vista y accesibilidad');
    dialog.querySelector('[data-access-motion]')!.textContent=landingText('Statique — figer la scène actuelle','Static — freeze the current scene','Estático — congelar la escena actual');
    dialog.querySelector('[data-access-contrast-label]')!.textContent=landingText('Contraste renforcé','High contrast','Contraste alto');
    dialog.querySelector('[data-access-text-label]')!.textContent=landingText('Texte agrandi','Larger text','Texto ampliado');
    dialog.querySelector('[data-access-note]')!.textContent=landingText('Préférences locales communes à Orbit et au Studio. Aucun envoi de données.','Local preferences shared by Orbit and Studio. No data is sent.','Preferencias locales compartidas por Orbit y Studio. No se envían datos.');
    dialog.querySelector('[data-access-reset]')!.textContent=landingText('Réinitialiser','Reset','Restablecer');dialog.querySelector('[data-access-close]')!.textContent=landingText('Fermer','Close','Cerrar');
    motion.checked=prefs.motion==='static';contrast.checked=prefs.contrast==='high';text.checked=prefs.text==='large';
    root.dispatchEvent(new CustomEvent('orbit:language-change'));root.dispatchEvent(new CustomEvent('orbit:motion-change'));
  }
  function changed(){prefs=savePreferences(prefs);language();}
  language();
  select.addEventListener('change',()=>{prefs.language=select.value==='en'||select.value==='es'?select.value:'fr';changed();},{signal});
  motion.addEventListener('change',()=>{prefs.motion=motion.checked?'static':'animated';changed();},{signal});
  contrast.addEventListener('change',()=>{prefs.contrast=contrast.checked?'high':'standard';changed();},{signal});
  text.addEventListener('change',()=>{prefs.text=text.checked?'large':'base';changed();},{signal});
  access.addEventListener('click',()=>{dialog.showModal();dialog.querySelector<HTMLInputElement>('input')?.focus();},{signal});
  dialog.querySelector('[data-access-close]')!.addEventListener('click',()=>dialog.close(),{signal});
  dialog.querySelector('[data-access-reset]')!.addEventListener('click',()=>{prefs=defaults();changed();},{signal});
  dialog.addEventListener('close',()=>access.focus(),{signal});
  window.addEventListener('storage',e=>{if(e.key===preferenceKey){prefs=readPreferences();applyPreferences(prefs);language();}},{signal});
  return ()=>{abort.abort();dialog.remove();};
}

/** Same controls and storage contract for the workspace and the Studio. */
export function mountOrbitPreferences(root:HTMLElement,translationRoot:HTMLElement=root){
  const controls=document.createElement('div');controls.className='orbit-display-controls';
  controls.innerHTML='<select data-landing-language aria-label="Langue"><option value="fr">FR</option><option value="en">EN</option><option value="es">ES</option></select><button type="button" data-landing-access aria-haspopup="dialog">Accès</button>';
  root.append(controls);const stop=mountLandingPreferences(root,translationRoot);return()=>{stop();controls.remove();};
}
