export const flowOptions = { historyLimit: 32 }; // STUDENT: compare 32 and 4 after five selections.
export function createInteractionFlow({ onChange, host = globalThis.window, options = flowOptions } = {}) {
  const views = ['mission', 'experience', 'proofs', 'summary'];
  if (!Number.isInteger(options.historyLimit) || options.historyLimit < 1 || options.historyLimit > 100) throw new Error('Invalid history budget.');
  let state = { view: 'mission', selection: 'element-1', elapsed: 0, static: false }; const entries = []; const lifetime = new AbortController();
  const snapshot = () => ({ ...state, entries: entries.map((entry) => ({ ...entry })) });
  const restore = () => { const params = new URL(host.location.href).searchParams; const view = params.get('learningView'); if (views.includes(view)) state.view = view; const selection = params.get('learningSelection'); state.selection = /^element-[1-3]$/.test(selection || '') ? selection : 'element-1'; onChange?.(snapshot()); };
  const navigate = (view, selection = state.selection, replace = false) => {
    if (!views.includes(view) || !/^element-[1-3]$/.test(selection)) throw new Error('Unknown bounded view or selection.');
    state = { ...state, view, selection }; entries.push({ view, selection, elapsed: state.elapsed }); if (entries.length > options.historyLimit) entries.shift();
    if (host?.history) { const url = new URL(host.location.href); url.searchParams.set('learningView', view); url.searchParams.set('learningSelection', selection); host.history[replace ? 'replaceState' : 'pushState'](null, '', url); }
    onChange?.(snapshot()); return snapshot();
  };
  if (host?.addEventListener) { host.addEventListener('popstate', restore, { signal: lifetime.signal }); restore(); }
  return { snapshot, navigate, setStatic(value) { state.static = Boolean(value); onChange?.(snapshot()); },
    step(dt) { if (!state.static && Number.isFinite(dt) && dt > 0) state.elapsed += Math.min(dt, 0.05); }, dispose() { lifetime.abort(); entries.length = 0; } };
}
