/** Software validation in Kaggle. These archives are declared fixtures, not learner work or WebMCP calls. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { File as NodeFile } from 'node:buffer';
import { readNotebookZip } from '../packages/learning/src/notebook-archive';

type Entry = { path: string; content: string };
const encode = new TextEncoder();
const hash = (content: string) => createHash('sha256').update(content, 'utf8').digest('hex');
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** A real stored ZIP fixture, including central directory and CRC metadata. */
function archive(entries: Entry[], method = 0): File {
  const chunks: Uint8Array[] = [], directories: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encode.encode(entry.path), content = encode.encode(entry.content), crc = crc32(content);
    const local = new Uint8Array(30 + name.length + content.length), v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(8, method, true);
    v.setUint32(14, crc, true); v.setUint32(18, content.length, true); v.setUint32(22, content.length, true); v.setUint16(26, name.length, true);
    local.set(name, 30); local.set(content, 30 + name.length); chunks.push(local);
    const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(10, method, true);
    c.setUint32(16, crc, true); c.setUint32(20, content.length, true); c.setUint32(24, content.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.set(name, 46); directories.push(central); offset += local.length;
  }
  const directorySize = directories.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  const bytes = new Uint8Array(offset + directorySize + end.length); let p = 0;
  for (const chunk of [...chunks, ...directories, end]) { bytes.set(chunk, p); p += chunk.length; }
  return new NodeFile([bytes], 'synthetic-learning-export.zip', { type: 'application/zip' }) as unknown as File;
}
function fixture(): Entry[] {
  const code = 'export const learningFixture = true;\n';
  const result = {
    schemaVersion: 'orbit-learning-colab-v1', moduleId: 1, missionId: 'module-1', attemptId: 'synthetic-archive-test-1',
    parameters: { fixture: true }, prediction: 'Fixture prediction before execution.', observations: ['Declared software-test observation.'],
    explanation: 'This fixture checks archive import, not learner understanding.', assistance: 'Prepared software test.', limitations: 'No learner or browser interaction certified.', openQuestion: '',
    status: 'human-reviewed', verification: { humanApproval: true, understandingVerified: true },
    artifacts: [{ path: 'frontend/interaction-state.js', content: code, sha256: hash(code) }],
  };
  return withManifest([
    { path: 'frontend/interaction-state.js', content: code },
    { path: 'orbit-learning-result.json', content: JSON.stringify(result) },
    { path: 'notebook.ipynb', content: JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: {}, cells: [] }) },
    { path: 'INTEGRATION.md', content: '# Fixture integration\nDo not treat this as learner work.\n' },
  ]);
}
function withManifest(entries: Entry[]): Entry[] {
  const files = entries.filter(entry => entry.path !== 'manifest.json');
  return [...files, { path: 'manifest.json', content: JSON.stringify({ files: files.map(entry => ({ path: entry.path, sha256: hash(entry.content) })) }) }];
}
function changedResult(entries: Entry[], change: (result: any) => void): Entry[] {
  return withManifest(entries.map(entry => {
    if (entry.path !== 'orbit-learning-result.json') return entry;
    const result = JSON.parse(entry.content); change(result); return { ...entry, content: JSON.stringify(result) };
  }));
}

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
afterAll(() => vi.unstubAllGlobals());

describe('actual stored Colab archive import', () => {
  it('preserves all actual payload files and strips claimed approval from the normalized result', async () => {
    const parsed = await readNotebookZip(archive(fixture()));
    expect(parsed.fileCount).toBe(4); expect(parsed.manifestVerified).toBe(true);
    expect(parsed.result.status).toBe('external-declared');
    expect(parsed.result).not.toHaveProperty('verification');
    expect(parsed.result.artifacts?.map(entry => entry.path)).toEqual([
      'frontend/interaction-state.js', 'orbit-learning-result.json', 'notebook.ipynb', 'INTEGRATION.md',
    ]);
    expect(parsed.result.artifacts?.[0]).toMatchObject({ content: 'export const learningFixture = true;\n', sha256: hash('export const learningFixture = true;\n') });
  });
  it('rejects a changed actual file even when the result frontend remains unchanged', async () => {
    const entries = fixture().map(entry => entry.path === 'INTEGRATION.md' ? { ...entry, content: 'Tampered integration text.' } : entry);
    await expect(readNotebookZip(archive(entries))).rejects.toThrow('Integrity mismatch');
  });
  it('requires the manifest instead of silently reading only the result JSON', async () => {
    await expect(readNotebookZip(archive(fixture().filter(entry => entry.path !== 'manifest.json')))).rejects.toThrow('MISSING_ARCHIVE_FILE');
  });
  it('rejects a missing file that is still declared in the manifest', async () => {
    await expect(readNotebookZip(archive(fixture().filter(entry => entry.path !== 'frontend/interaction-state.js')))).rejects.toThrow('INCOMPLETE_ARCHIVE_MANIFEST');
  });
  it('rejects duplicate local paths', async () => {
    const entries = fixture(); entries.push({ ...entries[0] });
    await expect(readNotebookZip(archive(entries))).rejects.toThrow('DUPLICATE_ARCHIVE_PATH');
  });
  it('rejects parent traversal even when a manifest could be supplied', async () => {
    const entries = fixture(); entries.push({ path: '../outside-fixture.txt', content: 'Synthetic fixture only.' });
    await expect(readNotebookZip(archive(entries))).rejects.toThrow('safe artifact path');
  });
  it('rejects divergent JSON and frontend contents despite a self-consistent archive manifest', async () => {
    const entries = changedResult(fixture(), result => { result.artifacts[0].content = 'export const substituted = true;'; });
    await expect(readNotebookZip(archive(entries))).rejects.toThrow('DECLARED_FRONTEND_DIFFERS_FROM_ARCHIVE');
  });
  it('rejects a false frontend digest declared by the JSON despite correct actual file hashes', async () => {
    const entries = changedResult(fixture(), result => { result.artifacts[0].sha256 = '0'.repeat(64); });
    await expect(readNotebookZip(archive(entries))).rejects.toThrow('DECLARED_FRONTEND_HASH_MISMATCH');
  });
  it('rejects compressed-method metadata instead of treating it as stored text', async () => {
    await expect(readNotebookZip(archive(fixture(), 8))).rejects.toThrow('UNSUPPORTED_ARCHIVE');
  });
});
