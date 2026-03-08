import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  // Get frontend port from environment or use default
  const frontendPort = parseInt(env.FRONTEND_PORT) || 5173

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/socket': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      },
      onConnectionError: (err) => {
        console.error('❌ Connection error:', err.message)
      }
    },
    // Build optimization
    build: {
      // Enable chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-lucide': ['lucide-react'],
            'vendor-axios': ['axios']
          }
        }
      },
      // Minify for production
      minify: mode === 'production' ? 'esbuild' : false,
      // Source maps for debugging
      sourcemap: mode !== 'production',
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000
    },
    // Dependencies optimization
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react', 'axios']
    }
  }
})
