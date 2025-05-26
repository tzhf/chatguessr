import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/auth'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, '.vite/build/auth'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/auth/index.html')
    }
  }
})
