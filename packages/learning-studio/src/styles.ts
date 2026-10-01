export const learningStyles = `
.orbit-learning-studio{box-sizing:border-box;color:#eaf3ff;background:#080c1d;min-height:100%;height:100%;overflow:auto;font:1rem/1.65 Barlow,system-ui,sans-serif;padding:1.4rem;--accent:#ffad45;--muted:#b9c9e0;--border:#374158}
.orbit-learning-studio *{box-sizing:border-box}
.orbit-learning-studio header,.orbit-learning-studio .ol-row{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:space-between}
.orbit-learning-studio main{max-width:1100px;margin:1rem auto}
.orbit-learning-studio h1,.orbit-learning-studio h2,.orbit-learning-studio h3{line-height:1.3;font-family:'Exo 2',system-ui,sans-serif}
.orbit-learning-studio h1{font-size:1.8rem}.orbit-learning-studio h2{font-size:1.35rem}
.orbit-learning-studio p{max-width:80ch}.orbit-learning-studio small,.orbit-learning-studio .ol-muted{color:var(--muted)}
.orbit-learning-studio button,.orbit-learning-studio select,.orbit-learning-studio input,.orbit-learning-studio textarea{font:inherit;color:inherit;background:#121b31;border:1px solid var(--border);border-radius:6px;padding:.45rem .65rem}
.orbit-learning-studio button,.orbit-learning-studio a{cursor:pointer}.orbit-learning-studio button:disabled{opacity:.5;cursor:default}
.orbit-learning-studio a{color:#78eaff;overflow-wrap:anywhere}.orbit-learning-studio button[aria-pressed=true],.orbit-learning-studio a[aria-current=page]{border-color:var(--accent);color:var(--accent)}
.orbit-learning-studio :focus-visible{outline:3px solid #78eaff;outline-offset:3px}
.orbit-learning-studio textarea{width:100%;min-height:8rem;resize:vertical}.orbit-learning-studio input[type=checkbox]{width:1.1rem;height:1.1rem;margin-right:.5rem}
.orbit-learning-studio nav{display:flex;gap:.5rem;flex-wrap:wrap;border-block:1px solid var(--border);padding:1rem 0;margin:1rem 0}
.orbit-learning-studio nav a{padding:.4rem .8rem;border:1px solid transparent;border-radius:6px;text-decoration:none}
.orbit-learning-studio .ol-card{border:1px solid var(--border);padding:1rem;margin:1rem 0;border-radius:8px;background:#0f1428}
.orbit-learning-studio fieldset{border:1px solid var(--border);border-radius:6px;padding:1rem;margin:1rem 0}.orbit-learning-studio legend{padding:0 .5rem;color:var(--accent)}
.orbit-learning-studio label{display:block;margin:.5rem 0}.orbit-learning-studio .ol-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:1rem}
.orbit-learning-studio pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:30rem;overflow:auto;background:#050916;padding:.8rem;border:1px solid var(--border);font-size:.9em}
.orbit-learning-studio table{width:100%;border-collapse:collapse}.orbit-learning-studio td,.orbit-learning-studio th{border-bottom:1px solid var(--border);padding:.6rem;text-align:left}
.orbit-learning-studio [role=status]{min-height:1.5rem;color:var(--accent)}
.orbit-learning-studio[data-orbit-contrast=high]{--border:#eaf3ff;--muted:#fff;background:#000;color:#fff}.orbit-learning-studio[data-orbit-text=large]{font-size:1.2rem}
.orbit-learning-studio[data-orbit-motion=static] *{scroll-behavior:auto;animation:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){.orbit-learning-studio *{scroll-behavior:auto}}
@media(max-width:600px){.orbit-learning-studio{padding:.75rem}.orbit-learning-studio h1{font-size:1.45rem}.orbit-learning-studio table{font-size:.85rem}}
`
