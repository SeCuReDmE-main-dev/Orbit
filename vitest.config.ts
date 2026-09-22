import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@orbit/core': `${root}packages/core/src/index.ts`,
      '@orbit/providers': `${root}packages/providers/src/index.ts`,
      '@orbit/broker': `${root}services/broker/src/index.ts`,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
