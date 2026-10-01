"""Move the public experience into real Astro routes, preserving its controls."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
path=root/'web/src/pages/index.astro'
text=path.read_text(encoding='utf-8')
text=text.replace("import '../", "import '../")
text=text.replace("import OrbitLayout from '../layouts/OrbitLayout.astro'", "import OrbitLayout from '../layouts/OrbitLayout.astro'")
text=text.replace("import OrbitMark from '../components/OrbitMark.astro'", "import OrbitMark from './OrbitMark.astro'\ninterface Props { chapter?: number }\nconst { chapter = 0 } = Astro.props\nconst routes = ['/', '/explore/question/', '/explore/sources/', '/explore/synthia/']\nconst titles = ['Orbit — Un espace pour votre curiosité', 'Une question — Orbit', 'Les sources — Orbit', 'Synthia — Orbit']")
text=text.replace('<OrbitLayout bodyClass="landing-page">','<OrbitLayout bodyClass="landing-page" title={titles[chapter]}>')
text=text.replace('data-landing data-chapter="0"','data-landing data-chapter={chapter}')
text=text.replace('Atome interactif. Défilez pour explorer. Flèches haut et bas : étape précédente ou suivante.', 'Atome interactif. Les liens ouvrent une nouvelle page. Flèches haut et bas : rotation verticale.')
text=text.replace('Défilez pour entrer · déplacez les particules', 'Glissez pour tourner · cliquez pour explorer')
text=text.replace('Descendre dans Orbit', 'Explorer Orbit')
text=text.replace('>↓</span>', '>↗</span>')
# Each old navigation button becomes a normal link, supporting history/open-in-tab.
text=re.sub(r'<button([^>]*data-journey-to="(\d)"[^>]*)>(.*?)</button>',
    lambda m: '<a'+re.sub(r'\s(?:type="button"|aria-current="step")','',m[1])+f' href={{routes[{m[2]}]}} aria-current={{chapter === {m[2]} ? "page" : undefined}}>'+m[3]+'</a>',text,flags=re.S)
text=re.sub(r'<section class="journey-chapter" data-journey-chapter="(\d)"(.*?)</section>',lambda m:'{chapter === '+m[1]+' && (<section class="journey-chapter" data-journey-chapter="'+m[1]+'"'+m[2]+'</section>)}',text,flags=re.S)
text=text.replace('<div class="landing-presence"', '{chapter === 3 && (<div class="landing-presence"')
text=text.replace('Rencontre avec Synthia</span></div>','Rencontre avec Synthia</span></div>)}')
text=re.sub(r'<div class="journey-directions".*?</div>', '<nav class="journey-directions" aria-label="Pages de la découverte">{chapter > 0 && <a href={routes[chapter-1]} aria-label="Page précédente">←</a>}<span>0{chapter+1} / 04</span>{chapter < 3 && <a href={routes[chapter+1]} aria-label="Page suivante">→</a>}</nav>',text)
text=text.replace('<i></i><span>Explorer</span>', '<i>00</i><span>Explorer</span>').replace('<i></i><span>Question</span>','<i>01</i><span>Question</span>').replace('<i></i><span>Sources</span>','<i>02</i><span>Sources</span>').replace('<i></i><span>Synthia</span>','<i>03</i><span>Synthia</span>')
(root/'web/src/components/LandingExperience.astro').write_text(text,encoding='utf-8')
path.write_text('---\nimport LandingExperience from "../components/LandingExperience.astro"\n---\n<LandingExperience />\n',encoding='utf-8')
stage=root/'web/src/pages/explore/[stage].astro';stage.parent.mkdir(exist_ok=True)
stage.write_text('''---
import LandingExperience from '../../components/LandingExperience.astro'
export function getStaticPaths() {
  return ['question', 'sources', 'synthia'].map((stage, i) => ({params:{stage},props:{chapter:i+1}}))
}
const { chapter } = Astro.props
---
<LandingExperience chapter={chapter} />
''',encoding='utf-8')
for file in ('journey.css','cosmic.css'):
    css=root/'web/src/styles'/file
    s=css.read_text(encoding='utf-8').replace('.atom-links button','.atom-links a').replace('.journey-navigation button','.journey-navigation a').replace('.journey-directions button','.journey-directions a')
    css.write_text(s,encoding='utf-8')
