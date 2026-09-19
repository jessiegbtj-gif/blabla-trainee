import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      // During `npm run dev`, forward API calls to `npx wrangler dev` (port 8787)
      // running the Worker + local D1 in a second terminal.
      '/api': 'http://localhost:8787',
    },
  },
})
