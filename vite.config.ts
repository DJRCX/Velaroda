import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Velaroda/' : '/',
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
})
