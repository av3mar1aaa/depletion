import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the site lives at /<repo>/ so built assets need that prefix.
// Local dev still serves from /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/depletion/' : '/',
  plugins: [react(), tailwindcss()],
}))
