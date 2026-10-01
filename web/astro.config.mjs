import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
    // Development only: keep cookies and OAuth callbacks on the Astro origin.
    // The account service is distinct from the loopback research broker.
    server: {
      proxy: {
        '/api/v1': { target: 'http://127.0.0.1:8788', changeOrigin: false },
        '/auth/': { target: 'http://127.0.0.1:8788', changeOrigin: false },
      },
    },
  },
})
