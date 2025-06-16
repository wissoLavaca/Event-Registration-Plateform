import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests
      '/api': {
        target: 'http://localhost:3001', // <<<< REPLACE WITH YOUR ACTUAL BACKEND SERVER ADDRESS AND PORT
        changeOrigin: true, // Recommended for most cases
        // secure: false,      // Uncomment if your backend is not HTTPS and you encounter issues
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: if your backend routes don't expect the /api prefix
      }
    }
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  }
})
