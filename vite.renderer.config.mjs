import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

const rootDir = import.meta.dirname

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue(), svgLoader()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': {}
  },
  resolve: {
    alias: { '@': path.resolve(rootDir, './src/renderer') }
  }

  // build: {
  //   rollupOptions: {
  //     output: {
  //       // for future vite update
  //       // Force the output CSS file to always be named style.css
  //       assetFileNames: (assetInfo) => {
  //         if (assetInfo.name && assetInfo.name.endsWith('.css')) {
  //           return 'style.css'
  //         }
  //         return '[name]-[hash][extname]'
  //       }
  //     }
  //   }
  // }
})
