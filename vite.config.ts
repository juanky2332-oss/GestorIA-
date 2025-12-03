import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    define: {
      // Polyfill process.env.API_KEY so the SDK works in the browser
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY)
    }
  }
})