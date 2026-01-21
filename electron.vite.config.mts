import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, defineViteConfig } from 'electron-vite';
import builtinModules from 'builtin-modules';

import Inspect from 'vite-plugin-inspect';
import solidPlugin from 'vite-plugin-solid';
import viteResolve from 'vite-plugin-resolve';

import { withFilter, type UserConfig } from 'vite';

import { pluginVirtualModuleGenerator } from './vite-plugins/plugin-importer.mjs';
import pluginLoader from './vite-plugins/plugin-loader.mjs';
import { i18nImporter } from './vite-plugins/i18n-importer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const resolveAlias = {
  '@': resolve(__dirname, './src'),
  '@assets': resolve(__dirname, './assets'),
};

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  main: defineViteConfig({
    experimental: {
      enableNativePlugin: true,
    },
    plugins: [
      pluginLoader('backend'),
      viteResolve({
        'virtual:i18n': i18nImporter(),
        'virtual:plugins': pluginVirtualModuleGenerator('main'),
      }),
      ...(isDev ? [Inspect({
        build: true,
        outputDir: join(__dirname, '.vite-inspect/backend'),
      })] : []),
    ],
    publicDir: 'assets',
    define: {
      '__dirname': 'import.meta.dirname',
      '__filename': 'import.meta.filename',
    },
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
      },
      outDir: 'dist/main',
      rolldownOptions: {
        external: ['electron', 'custom-electron-prompt', ...builtinModules],
        input: './src/index.ts',
      },
      ...(isDev ? { sourcemap: 'inline' } : { minify: true, cssMinify: true }),
    },
    resolve: {
      alias: resolveAlias,
    },
  }),
  preload: defineViteConfig({
    experimental: {
      enableNativePlugin: true,
    },
    plugins: [
      pluginLoader('preload'),
      viteResolve({
        'virtual:i18n': i18nImporter(),
        'virtual:plugins': pluginVirtualModuleGenerator('preload'),
      }),
      ...(isDev ? [Inspect({
        build: true,
        outputDir: join(__dirname, '.vite-inspect/preload'),
      })] : []),
    ],
    build: {
      lib: {
        entry: 'src/preload.ts',
        formats: ['cjs'],
      },
      outDir: 'dist/preload',
      commonjsOptions: {
        ignoreDynamicRequires: true,
      },
      rolldownOptions: {
        external: ['electron', 'custom-electron-prompt', ...builtinModules],
        input: './src/preload.ts',
      },
      ...(isDev ? { sourcemap: 'inline' } : { minify: true, cssMinify: true }),
    },
    resolve: {
      alias: resolveAlias,
    },
  }),
  renderer: defineViteConfig({
    experimental: {
      enableNativePlugin: !isDev, // Disable native plugin in development mode to avoid issues with HMR (bug in rolldown-vite)
    },
    plugins: [
      pluginLoader('renderer'),
      viteResolve({
        'virtual:i18n': i18nImporter(),
        'virtual:plugins': pluginVirtualModuleGenerator('renderer'),
      }),
      withFilter(solidPlugin(), {
        load: { id: [/\.(tsx|jsx)$/, '/@solid-refresh'] },
      }),
      ...(isDev ? [Inspect({
        build: true,
        outputDir: join(__dirname, '.vite-inspect/renderer'),
      })] : []),
    ],
    root: './src/',
    build: {
      lib: {
        entry: 'src/index.html',
        formats: ['iife'],
        name: 'renderer',
      },
      outDir: 'dist/renderer',
      rolldownOptions: {
        external: ['electron', ...builtinModules],
        input: './src/index.html',
      },
      ...(isDev ? { sourcemap: 'inline' } : { minify: true, cssMinify: true }),
    },
    resolve: {
      alias: resolveAlias,
    },
    server: {
      cors: {
        origin:
          'https://music.\u0079\u006f\u0075\u0074\u0075\u0062\u0065.com',
      },
    },
  }),
});
