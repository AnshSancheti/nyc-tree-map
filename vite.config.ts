import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages deploys to /<repo-name>/
  base: process.env.NODE_ENV === 'production' ? '/nyc-tree-map/' : '/',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'docs',
    sourcemap: true,
  },
  // Handle large data files
  assetsInclude: ['**/*.json'],
})
