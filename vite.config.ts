import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

export default defineConfig({
  // Automerge ships a WASM core; these plugins let Vite serve and bundle it.
  // See ADR 0013.
  plugins: [wasm(), topLevelAwait(), react(), tailwindcss()],
  // Automerge's WASM glue uses top-level await; build for a modern target so it
  // (and the folder-sync APIs this app already requires) compile cleanly.
  build: { target: 'esnext' },
  optimizeDeps: { esbuildOptions: { target: 'esnext' } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
