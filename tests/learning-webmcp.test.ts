/** Transport assertions only: mocks do not establish native Studio CORS or a real Context read. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearningStore } from '../packages/learning/src/index';
import { createFormationTools } from '../web/src/lib/learning-webmcp';

function fixture(options: { courseOrigin?: string; signal?: AbortSignal } = {}) {
  const store = new LearningStore({ projectId: 'student', dataset: 'course', userId: 'learner' }, undefined, { id: 'public-course-test' });
  store.addJournalEntry({ kind: 'reflection', text: 'Private journal must not leave the session.' });
  const tools = createFormationTools(store, options);
  return { store, tool: (name: string) => tools.find(item => item.name === name)! };
}

function ready() {
  return new Response(JSON.stringify({ state: 'READY', source: 'sanity-context-mcp', content: [{ type: 'text', text: 'Public course evidence.' }] }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('separate public course Context transport', () => {
  it('uses one credential-free GET with no private work, body or authorization headers', async () => {
    const { tool, store } = fixture();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ready());
    expect(await tool('orbit_sanity_initial_context').execute({})).toMatchObject({ state: 'READY' });
    const [url, request] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://orbit.securedme.ca/api/v1/course-context/outline');
    expect(request).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
    expect(request?.body).toBeUndefined();
    expect(JSON.stringify(fetchSpy.mock.calls)).not.toContain('Private journal');
    expect(JSON.stringify(fetchSpy.mock.calls)).not.toContain('Authorization');
    expect(store.snapshot().permissions.agentRead).toBe(false);
  });

  it('encodes exactly the selected public paths in the GET query', async () => {
    const { tool } = fixture();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ready());
    const paths = ['course/events', 'course/inertia'];
    await tool('orbit_sanity_read_entries').execute({ paths });
    const [value, request] = fetchSpy.mock.calls[0];
    const url = new URL(String(value));
    expect(url.pathname).toBe('/api/v1/course-context/entries');
    expect([...url.searchParams.keys()]).toEqual(['paths']);
    expect(JSON.parse(url.searchParams.get('paths')!)).toEqual(paths);
    expect(request?.method).toBe('GET');
    expect(request?.credentials).toBe('omit');
    expect(request?.body).toBeUndefined();
  });

  it('rejects arbitrary endpoints, extra fields and invalid paths before network activity', async () => {
    const { tool } = fixture();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ready());
    for (const input of [
      { paths: ['course/events'], token: 'unapproved' },
      { paths: ['course/events'], question: 'Private question' },
      { paths: ['course/events'], knowledgeBase: 'another' },
      { paths: ['https://other.example'] },
      { paths: ['../private'] },
      { paths: ['same', 'same'] },
      { paths: [] },
      { paths: ['a', 'b', 'c', 'd', 'e', 'f'] },
    ]) await expect(tool('orbit_sanity_read_entries').execute(input)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(() => fixture({ courseOrigin: 'https://other.example' })).toThrow('COURSE_ORIGIN_NOT_ALLOWED');
  });

  it('reports a disabled or failing public gateway as unavailable, without fallback evidence', async () => {
    const { tool } = fixture();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ state: 'UNAVAILABLE', noFallback: true }), { status: 503 }));
    expect(await tool('orbit_sanity_initial_context').execute({})).toMatchObject({ state: 'UNAVAILABLE', httpStatus: 503 });
    fetchSpy.mockRejectedValueOnce(new Error('Network unavailable'));
    expect(await tool('orbit_sanity_initial_context').execute({})).toEqual({ state: 'UNAVAILABLE', reason: 'CONTEXT_GATEWAY_UNAVAILABLE' });
  });

  it('propagates execution cancellation to the actual fetch signal', async () => {
    const { tool } = fixture();
    const controller = new AbortController();
    let networkSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, request) => {
      networkSignal = request?.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        networkSignal!.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
      });
    });
    const pending = tool('orbit_sanity_read_entries').execute({ paths: ['course/events'] }, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow('ABORTED');
    expect(networkSignal?.aborted).toBe(true);
  });

  it('propagates registration lifetime cancellation and withholds a result from a changed session', async () => {
    const registration = new AbortController();
    const { tool, store } = fixture({ signal: registration.signal });
    let complete!: (response: Response) => void;
    let networkSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, request) => {
      networkSignal = request?.signal as AbortSignal;
      return new Promise(resolve => { complete = resolve; });
    });
    const pending = tool('orbit_sanity_initial_context').execute({});
    registration.abort(); complete(ready());
    await expect(pending).rejects.toThrow('ABORTED');
    expect(networkSignal?.aborted).toBe(true);
    const next = fixture();
    vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const changed = next.tool('orbit_sanity_initial_context').execute({});
    next.store.selectModule(2);
    complete(ready());
    expect(await changed).toMatchObject({ state: 'CONSENT_REQUIRED' });
    expect(store.snapshot().permissions.agentRead).toBe(false);
  });
});
