import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue(), svgLoader()],
  define: { 'process.env': {} },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src/renderer') }
  }
})
