/** A movable reading surface, connected to the selected point around Orbit. */
export function mountWorkspaceSurface(shell: HTMLElement) {
  const stage = shell.querySelector<HTMLElement>('.workspace-stage')!;
  const events = new AbortController();
  const { signal } = events;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  svg.classList.add('workspace-thread');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(path); stage.prepend(svg);
  let x = 0, y = 0, frame = 0;
  let drag: { id: number; startX: number; startY: number; x: number; y: number } | undefined;

  const link = () => {
    frame = 0;
    const panel = stage.querySelector<HTMLElement>('[data-view-panel]:not([hidden])');
    const node = stage.querySelector<HTMLElement>(shell.dataset.view === 'companion'
      ? '[data-presence-conversation] i'
      : `.presence-node[data-view-link="${shell.dataset.view}"] i`);
    const grip = panel?.querySelector<HTMLElement>('.workspace-grip');
    if (!node || !grip || shell.dataset.surfaceOpen !== 'true' || shell.dataset.panelExpanded === 'true' || stage.clientWidth < 650) {
      svg.style.display = 'none'; return;
    }
    svg.style.display = '';
    const base = stage.getBoundingClientRect(), a = node.getBoundingClientRect(), b = grip.getBoundingClientRect();
    const ax = a.left + a.width / 2 - base.left, ay = a.top + a.height / 2 - base.top;
    const bx = b.left + b.width / 2 - base.left, by = b.top + b.height / 2 - base.top;
    svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    path.setAttribute('d', `M ${ax} ${ay} C ${ax + 100} ${ay}, ${bx - 140} ${by + 50}, ${bx} ${by}`);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(link); };
  const place = () => {
    if (stage.clientWidth < 650 || shell.dataset.panelExpanded === 'true') x = y = 0;
    x = Math.max(-stage.clientWidth * .28, Math.min(12, x));
    y = Math.max(-12, Math.min(12, y));
    stage.style.setProperty('--surface-x', `${x}px`);
    stage.style.setProperty('--surface-y', `${y}px`);
    schedule();
  };
  shell.querySelectorAll<HTMLElement>('[data-view-panel]').forEach(panel => {
    const grip = document.createElement('button');
    grip.type = 'button'; grip.className = 'workspace-grip';
    grip.textContent = '⠿';
    grip.setAttribute('aria-label', 'Déplacer cet espace de lecture');
    grip.setAttribute('aria-describedby', 'workspace-move-help');
    grip.title = 'Glisser pour rapprocher · flèches au clavier · Origine pour replacer';
    panel.prepend(grip);
    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0 || stage.clientWidth < 650 || shell.dataset.panelExpanded === 'true') return;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
      grip.setPointerCapture(event.pointerId);
      stage.dataset.movingSurface = 'true';
    }, { signal });
    grip.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      x = drag.x + event.clientX - drag.startX; y = drag.y + event.clientY - drag.startY; place();
    }, { signal });
    grip.addEventListener('pointercancel', () => {
      if (drag) { x = drag.x; y = drag.y; place(); }
      drag = undefined; delete stage.dataset.movingSurface;
    }, { signal });
    grip.addEventListener('lostpointercapture', () => { drag = undefined; delete stage.dataset.movingSurface; }, { signal });
    grip.addEventListener('dblclick', () => { x = y = 0; place(); }, { signal });
    grip.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') x = y = 0;
      if (event.key === 'ArrowLeft') x -= 24;
      if (event.key === 'ArrowRight') x += 24;
      if (event.key === 'ArrowUp') y -= 8;
      if (event.key === 'ArrowDown') y += 8;
      place();
    }, { signal });
  });
  const hint = document.createElement('span');
  hint.id = 'workspace-move-help'; hint.className = 'sr-only';
  hint.textContent = 'Glissez cette poignée ou utilisez les flèches. Origine replace l’espace. Sur petit écran, la lecture occupe la fenêtre.';
  stage.append(hint);
  const observer = new ResizeObserver(place);
  observer.observe(stage);
  observer.observe(stage.querySelector('.app-presence')!);
  const mutation = new MutationObserver(place);
  mutation.observe(shell, { attributes: true, attributeFilter: ['data-view','data-surface-open','data-panel-expanded'] });
  document.addEventListener('orbit:presence-position', schedule, { signal });
  const dispose = () => { events.abort(); observer.disconnect(); mutation.disconnect(); cancelAnimationFrame(frame); };
  window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { signal });
  document.addEventListener('astro:before-swap', dispose, { once: true, signal });
  place();
}
