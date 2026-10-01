export const learningToolName = 'student_get_learning_snapshot';
const registrations = new WeakMap();
/** A provided registration adapter. This is one student-project tool, not Orbit's 25-tool registry. */
export async function registerLearningCapability({ root, getSnapshot, canRead, getRevision, modelContext = globalThis.document?.modelContext }) {
  registrations.get(root)?.abort();
  if (!modelContext?.registerTool) return { state: 'UNAVAILABLE', dispose() {} };
  const lifetime = new AbortController(); registrations.set(root, lifetime);
  const expectedRevision = getRevision();
  const tool = { name: learningToolName, title: 'Read my selected learning artifact',
    description: 'Read one explicitly shared, bounded learning snapshot. No file system, model call, publication or approval.',
    inputSchema: { type: 'object', properties: { expectedRevision: { type: 'integer', minimum: 0 } }, required: ['expectedRevision'], additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
    execute: async (input, options) => {
      if (lifetime.signal.aborted || options?.signal?.aborted) return { state: 'UNAVAILABLE' };
      if (!input || Object.keys(input).some((key) => key !== 'expectedRevision') || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('Invalid expectedRevision.');
      if (!canRead()) return { state: 'CONSENT_REQUIRED' };
      if (input.expectedRevision !== getRevision() || expectedRevision !== getRevision()) return { state: 'STALE_REVISION' };
      const snapshot = getSnapshot();
      if (JSON.stringify(snapshot).length > 12000) throw new Error('Snapshot exceeds the learning limit.');
      // The synchronous host getter can change permission or revision; recheck both.
      if (lifetime.signal.aborted || !canRead()) return { state: 'CONSENT_REQUIRED' };
      if (expectedRevision !== getRevision()) return { state: 'STALE_REVISION' };
      return { state: 'READY', revision: expectedRevision, snapshot, authority: 'external-declared; not a human approval' };
    }
  };
  try { await modelContext.registerTool(tool, { signal: lifetime.signal }); }
  catch (error) { lifetime.abort(); if (registrations.get(root) === lifetime) registrations.delete(root); throw error; }
  return { state: 'READY', name: learningToolName, revision: expectedRevision,
    dispose() { lifetime.abort(); if (registrations.get(root) === lifetime) registrations.delete(root); } };
}
