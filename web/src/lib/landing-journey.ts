/** Each public view is a real Astro route. Scrolling never changes its identity. */
export function mountLandingJourney(root: HTMLElement): () => void {
  const chapter = Number(root.dataset.chapter) || 0;
  const events = new AbortController();
  const presenceHost = root.querySelector<HTMLElement>('[data-landing-presence]');
  let presence: import('../../../packages/synthia-presence/src/index').Presence | undefined;
  let disposed = false;
  root.dispatchEvent(new CustomEvent('orbit:journey-progress', { detail: { progress: chapter, index: chapter } }));
  root.style.setProperty('--journey-progress', String(chapter / 3));
  const update = () => presence?.setActive(root.dataset.motion!=='static'&&!document.hidden && !document.querySelector('dialog[open]'));
  root.addEventListener('orbit:motion-change',update,{signal:events.signal});
  const observer = new MutationObserver(update);
  document.querySelectorAll('dialog').forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  document.addEventListener('visibilitychange', update, { signal: events.signal });
  if (presenceHost) {
    presenceHost.style.opacity = '1';
    presenceHost.style.visibility = 'visible';
    void import('../../../packages/synthia-presence/src/index').then(({ mountPresence }) => {
      if (disposed) return;
      presence = mountPresence(presenceHost.querySelector('canvas')!, {
        modelUrl: '/presence-review/orbit-study.glb', animations: { idle: 'Idle' },
      }, { onStatus: (state, message) => {
        const label = presenceHost.querySelector('span');
        if (label) label.textContent = state === 'ready' ? 'Orbit · étude 3D en évolution' : message;
      }});
      update();
    });
  }
  const dispose = () => { disposed = true; events.abort(); observer.disconnect(); presence?.dispose(); };
  window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { signal: events.signal });
  return dispose;
}
