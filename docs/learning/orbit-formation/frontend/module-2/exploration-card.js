export const cardOptions = { descriptionPrefix: 'Mon observation : ' }; // STUDENT: make the purpose explicit.
export function createCards(root, items, onSelect, options = cardOptions) {
  const lifetime = new AbortController();
  const list = root.querySelector('[data-learning-cards]');
  const description = root.querySelector('[data-learning-description]');
  if (!list || !description) throw new Error('The card needs a list and a description.');
  const buttons = new Map();
  for (const item of items) {
    const row = document.createElement('li'); const button = document.createElement('button');
    button.type = 'button'; button.dataset.learningId = item.id; button.textContent = item.title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => onSelect(item.id), { signal: lifetime.signal });
    row.append(button); list.append(row); buttons.set(item.id, button);
  }
  return { select(id) {
    const item = items.find((entry) => entry.id === id); if (!item) return;
    for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === id));
    description.textContent = options.descriptionPrefix + item.content;
  }, dispose() { lifetime.abort(); list.replaceChildren(); } };
}
