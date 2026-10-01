import { build } from 'esbuild'
import { mkdir, copyFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const directory = path.dirname(fileURLToPath(import.meta.url))
await mkdir(path.join(directory, 'dist'), { recursive: true })
const result = await build({
  entryPoints: [path.join(directory, 'src/index.tsx')],
  outfile: path.join(directory, 'dist/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/*', 'sanity', 'sanity/*'],
  metafile: true,
  legalComments: 'eof',
})
// The shared learning/evidence/preference implementations are embedded. The
// installed archive must never resolve ../../../packages from a second Studio.
await copyFile(path.join(directory, 'src/public-api.d.ts'), path.join(directory, 'dist/index.d.ts'))
await writeFile(path.join(directory, 'dist/build-inputs.json'), JSON.stringify({
  package: '@orbit/learning-studio', version: '1.0.0',
  inputs: Object.keys(result.metafile.inputs).map((input) => input.replaceAll('\\', '/')),
  externalImports: [...new Set(Object.values(result.metafile.outputs).flatMap((output) => output.imports.filter((item) => item.external).map((item) => item.path)))],
}, null, 2))
