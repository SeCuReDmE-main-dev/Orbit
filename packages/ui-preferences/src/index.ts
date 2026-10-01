/** Canonical display preferences. No account, tracking or remote storage. */
export type Language='fr'|'en'|'es';
export interface DisplayPreferences {version:1;language:Language;motion:'animated'|'static';contrast:'standard'|'high';text:'base'|'large'}
export const preferenceKey='orbit.display-preferences.v1';
export const defaults=():DisplayPreferences=>({version:1,language:'fr',motion:typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches?'static':'animated',contrast:'standard',text:'base'});
export function normalizePreferences(value:unknown):DisplayPreferences{
  const v=value&&typeof value==='object'?value as Partial<DisplayPreferences>:{};const d=defaults();
  return{version:1,language:v.language==='en'||v.language==='es'?v.language:'fr',motion:v.motion==='static'||v.motion==='animated'?v.motion:d.motion,contrast:v.contrast==='high'?'high':'standard',text:v.text==='large'?'large':'base'};
}
export function readPreferences():DisplayPreferences{
  try {const raw=localStorage.getItem(preferenceKey);if(raw)return normalizePreferences(JSON.parse(raw));return normalizePreferences({language:localStorage.getItem('orbit.landing.language'),motion:localStorage.getItem('orbit.landing.motion')});}catch{return defaults();}
}
export function applyPreferences(value:DisplayPreferences){
  document.documentElement.lang=value.language;document.documentElement.dataset.orbitContrast=value.contrast;document.documentElement.dataset.orbitText=value.text;document.documentElement.dataset.orbitMotion=value.motion;
  document.querySelectorAll<HTMLElement>('[data-landing]').forEach(root=>root.dataset.motion=value.motion);
}
export function savePreferences(value:DisplayPreferences){
  const v=normalizePreferences(value);try{localStorage.setItem(preferenceKey,JSON.stringify(v));}catch{}
  applyPreferences(v);window.dispatchEvent(new CustomEvent('orbit:preferences-change',{detail:v}));return v;
}
export function preferenceText(language:Language,fr:string,en:string,es:string){return{fr,en,es}[language];}
