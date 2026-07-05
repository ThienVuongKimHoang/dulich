import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: "all",
    proxy: {
      // npm run dev: forward API calls to the dulich backend
      "/api": "http://localhost:8000",
    },
  },
})
