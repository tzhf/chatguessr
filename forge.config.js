const path = require('path')
const fs = require('fs-extra')

const { MakerSquirrel } = require('@electron-forge/maker-squirrel')
const { MakerZIP } = require('@electron-forge/maker-zip')
const { MakerDeb } = require('@electron-forge/maker-deb')
const { VitePlugin } = require('@electron-forge/plugin-vite')
const { PublisherGithub } = require('@electron-forge/publisher-github')

// Modules to resolve at build time
const modulesToScanRecursively = ['coordinate_to_country']
const modulesToIncludeManually = ['better-sqlite3', 'bindings', 'file-uri-to-path']

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'build/icon',
    executableName: 'ChatGuessr'
  },
  rebuildConfig: {},

  makers: [
    new MakerSquirrel({
      name: 'chatguessr',
      setupIcon: 'build/icon.ico',
      loadingGif: 'build/icon_installer.gif',
      iconUrl: 'file://build/icon.ico'
    }),

    new MakerZIP({}, ['darwin']),

    new MakerDeb({
      options: { bin: 'ChatGuessr' }
    })
  ],

  publishers: [
    new PublisherGithub({
      repository: { owner: 'tzhf', name: 'chatguessr' }
    })
  ],

  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.mjs', target: 'main' },
        { entry: 'src/preload/preload.ts', config: 'vite.preload.config.mjs', target: 'preload' },
        { entry: 'src/renderer/renderer.ts', config: 'vite.renderer.config.mjs' },
        { entry: 'src/auth/auth_preload.ts', config: 'vite.auth_preload.config.mjs' },
        { entry: 'src/auth/auth_impl.ts', config: 'vite.auth_impl.config.mjs' }
      ],
      renderer: []
    })
  ],

  // Custom hook to copy additional modules
  // This is necessary for modules that are not properly bundled by Vite
  hooks: {
    async packageAfterCopy(_config, buildPath) {
      const deps = getAllDependencies(modulesToScanRecursively)
      modulesToIncludeManually.forEach((dep) => deps.add(dep))

      const nodeModules = path.resolve('node_modules')
      const destModules = path.join(buildPath, 'node_modules')

      for (const mod of deps) {
        try {
          const from = resolveModuleDir(mod)
          const to = path.join(destModules, path.relative(nodeModules, from))
          await fs.copy(from, to)
          console.log(`📦 Copied ${mod}`)
        } catch (err) {
          console.warn(`⚠️ Failed to copy ${mod}: ${err.message}`)
        }
      }
    }
  }
}

/**
 * Recursively finds all dependencies of the given entry modules
 * @param {string[]} entryModules - The modules to start scanning from
 * @returns {Set<string>} - A set of all dependencies
 */
function getAllDependencies(entryModules) {
  const visited = new Set()
  const stack = [...entryModules]

  while (stack.length > 0) {
    const mod = stack.pop()
    if (!mod || visited.has(mod)) continue
    visited.add(mod)

    try {
      const pkgPath = require.resolve(`${mod}/package.json`)
      const pkgJson = fs.readJsonSync(pkgPath)
      const deps = {
        ...pkgJson.dependencies,
        ...pkgJson.optionalDependencies
      }

      for (const dep of Object.keys(deps)) {
        stack.push(dep)
      }
    } catch (err) {
      console.warn(`⚠️ Could not resolve ${mod}: ${err.message}`)
    }
  }

  return visited
}

/**
 * Resolves the absolute path to the root directory of a given Node.js module
 * @param {string} mod - The name of the Node.js module to resolve
 * @returns {string} - The absolute path to the module's root directory inside node_modules
 */
function resolveModuleDir(mod) {
  const mainFile = require.resolve(mod)
  const parts = mainFile.split(path.sep)
  const idx = parts.lastIndexOf('node_modules')
  return parts.slice(0, idx + 2).join(path.sep)
}
