import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version)
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
  server: {
    proxy: {
      '/api-whatsapp': {
        target: 'https://apiconnect4.datamastersolucoes.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-whatsapp/, '')
      }
    }
  }
})
