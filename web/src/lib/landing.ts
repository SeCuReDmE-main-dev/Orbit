import { mountAtomScene } from './atom-scene'
import { mountLandingJourney } from './landing-journey'
import { registerOrbitTools } from './webmcp'
import { mountLandingPreferences } from './landing-preferences'
/** Public entrance: no account probe, microphone, research or provider invocation. */
export function mountLanding() {
  const events=new AbortController(), atom=document.querySelector<HTMLElement>('[data-atom]'), landing=document.querySelector<HTMLElement>('[data-landing]')
  const stopPreferences=landing?mountLandingPreferences(landing):undefined;
  const stopAtom=atom?mountAtomScene(atom):undefined,stopJourney=landing?mountLandingJourney(landing):undefined;
  void registerOrbitTools().catch(()=>{})
  window.addEventListener('pageshow',event=>{if(event.persisted)void registerOrbitTools().catch(()=>{})},{signal:events.signal})
  const dispose=()=>{stopAtom?.();stopJourney?.();stopPreferences?.();events.abort()}
  document.addEventListener('astro:before-swap',dispose,{once:true,signal:events.signal})
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose()},{signal:events.signal})
}
