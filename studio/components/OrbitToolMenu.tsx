import {useEffect,useRef} from 'react'
import {mountOrbitPreferences} from '../../web/src/lib/landing-preferences'
import {mountUiLanguage} from '../../web/src/lib/orbit-ui-language'
import '../../web/src/styles/atom-games.css'
import type { ToolMenuProps } from 'sanity'

const visibleOrder = [
  'structure',
  'orbit-dossiers',
  'orbit-tif',
  'orbit-relations',
  'orbit-audit',
  'releases',
]

/** Keep the legacy evidence-review URL callable while presenting six clear tools. */
export function OrbitToolMenu(props: ToolMenuProps) {
  const preferences=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(!preferences.current)return;document.body.classList.add('orbit-studio-surface');const stop=mountOrbitPreferences(preferences.current);const stopLanguage=mountUiLanguage(document.body);return()=>{stopLanguage();stop();document.body.classList.remove('orbit-studio-surface');}},[])
  const byName = new Map(props.tools.map((tool) => [tool.name, tool]))
  const tools = visibleOrder.flatMap((name) => byName.has(name) ? [byName.get(name)!] : [])
  return <div style={{display:'flex',alignItems:'center',gap:8}}>{props.renderDefault({ ...props, tools })}<div ref={preferences} style={{display:"flex",alignItems:"center"}}><a href="/guide/#studio" target="_blank" rel="noopener" style={{color:"inherit",fontSize:13,padding:8}} data-fr="Guide" data-en="Guide" data-es="Guía">Guide</a></div></div>
}
