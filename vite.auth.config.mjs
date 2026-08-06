import { defineConfig } from 'vite'
import path from 'path'

const rootDir = import.meta.dirname

export default defineConfig({
  root: path.resolve(rootDir, 'src/auth'),
  base: './',
  build: {
    outDir: path.resolve(rootDir, '.vite/build/auth'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(rootDir, 'src/auth/index.html')
    }
  }
})
