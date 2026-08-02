import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base: './'` makes all asset URLs relative so the build works regardless of
// where it is hosted: GitHub Pages project sites (user.github.io/repo-name/),
// custom domains, or local preview via `npm run preview`.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler'))
            return 'vendor-react'
          if (id.includes('trystero') || id.includes('@trystero-p2p'))
            return 'vendor-trystero'
          if (id.includes('node_modules/qrcode.react')) return 'vendor-qrcode'
        },
      },
    },
  },
})
