import { defineConfig } from 'vite'
import pkg from './package.json'

// https://vitejs.dev/config
export default defineConfig({
  // resolve: {
  //   // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
  //   // @ts-expect-error (browserField is deprecated, but i couldn't get it working with mainFields for now)
  //   browserField: false,
  //   conditions: ['node'],
  //   mainFields: ['module', 'jsnext:main', 'jsnext']
  // },
  build: {
    rollupOptions: {
      // external: ['better-sqlite3', 'coordinate_to_country', 'bufferutil', 'utf-8-validate'],
      // Some third-party Node.js libraries may not be built correctly by Vite,
      // we can use `external` to exclude them to ensure they work correctly.
      external: Object.keys('dependencies' in pkg ? pkg.dependencies : {})
    }
  }
})
