import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Some third-party Node.js libraries may not be built correctly by Vite,
      // we can use `external` to exclude them to ensure they work correctly.
      external: ['better-sqlite3', 'coordinate_to_country', 'bufferutil', 'utf-8-validate']
    }
  }
})
