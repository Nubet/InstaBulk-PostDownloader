import { type PluginOption, defineConfig } from 'vite'
import { sharedConfig } from './vite.config.mjs'
import { isDev, r } from './scripts/utils'
import packageJson from './package.json'

function excludeUnoCssPlugins(plugins: PluginOption[] = []): PluginOption[] {
  return plugins.flatMap((plugin) => {
    if (Array.isArray(plugin))
      return excludeUnoCssPlugins(plugin)

    if (!plugin || typeof plugin === 'boolean' || plugin instanceof Promise)
      return plugin ? [plugin] : []

    if ('name' in plugin && plugin.name.startsWith('unocss'))
      return []

    return [plugin]
  })
}

export default defineConfig({
  ...sharedConfig,
  plugins: excludeUnoCssPlugins(sharedConfig.plugins as PluginOption[]),
  define: {
    '__DEV__': isDev,
    '__NAME__': JSON.stringify(packageJson.name),
    'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
  },
  build: {
    watch: isDev
      ? {}
      : undefined,
    outDir: r('extension/dist/contentScripts'),
    cssCodeSplit: false,
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    lib: {
      entry: r('src/contentScripts/index.ts'),
      name: packageJson.name,
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.global.js',
        extend: true,
      },
    },
  },
})
