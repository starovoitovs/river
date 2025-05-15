import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/river/', // Assuming the repository name is 'river'
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
})
