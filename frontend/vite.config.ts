import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API requests
      '/api': {
        target: 'http://localhost:3001', 
        changeOrigin: true, 
      }
    }
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  }
})
