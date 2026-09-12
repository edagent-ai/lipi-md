import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

/**
 * KaTeX ships each face three times over. Every browser this app runs in takes
 * the woff2, and only that one is precached, so the ttf and woff copies were
 * ~800KB of deploy that could never be reached — and would 404 offline if
 * anything ever did reach for them. Dropped from the bundle, and their `src`
 * entries dropped from the stylesheet so it stays honest about what exists.
 */
function dropLegacyFontFormats(): Plugin {
  return {
    name: 'drop-legacy-font-formats',
    generateBundle(_options, bundle) {
      let dropped = 0;
      let bytes = 0;
      for (const [file, asset] of Object.entries(bundle)) {
        if (asset.type === 'asset' && /\.(ttf|woff)$/.test(file)) {
          bytes += String(asset.source).length;
          delete bundle[file];
          dropped++;
        }
      }
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'asset' && asset.fileName.endsWith('.css')) {
          asset.source = String(asset.source).replace(
            /\s*,\s*url\([^)]*\.(?:ttf|woff)\)\s*format\((?:"[^"]*"|'[^']*'|[^)]*)\)/g,
            '',
          );
        }
      }
      if (dropped) {
        this.info(`dropped ${dropped} legacy font files (${(bytes / 1024).toFixed(0)} KB)`);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    dropLegacyFontFormats(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'lipi.md — Type text. Render worlds.',
        short_name: 'lipi.md',
        description:
          'An offline-first Markdown editor that renders live animations and native Indic scripts from plain text.',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        categories: ['education', 'productivity', 'graphics'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        /* Mermaid is larger than the rest of the app put together, and most
           documents never draw a diagram. Precaching it would take the offline
           install from 2MB to nearly 7MB for a feature most readers will not
           use, so its chunks go to a directory of their own and are left out —
           picked up on first use, and kept by the runtime cache below.

           Excluded by where they come from rather than by what they are
           called: Mermaid's chunks arrive named `swimlanes`, `cose-bilkent`,
           `rough.esm` and `_baseUniq`, and a list of patterns would have missed
           them and quietly grown the install again. */
        globIgnores: ['diagrams/**'],
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
              sameOrigin && url.pathname.startsWith('/diagrams/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'lipi-lazy-chunks',
              expiration: { maxEntries: 250 },
            },
          },
        ],
        // p5.js add-on and large runtime bundles need headroom.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  /* Injected rather than imported, so the bundle carries the two strings the
     About panel shows and not the whole of package.json. */
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  server: { port: 5173 },
  build: {
    // The source is public on GitHub, so maps buy nothing here and cost ~5MB of
    // deploy that no reader ever fetches.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the big, rarely-changing dependencies out of the app chunk so a
        // code update only invalidates a small precache entry.
        /** Anything that only exists to draw a diagram, kept apart. */
        chunkFileNames(chunk: { moduleIds?: string[]; name: string }) {
          const drawing = chunk.moduleIds?.some((id) =>
            /node_modules[/\\](mermaid|cytoscape|elkjs|dagre|dagre-d3|d3|d3-[a-z-]+|internmap|delaunator|robust-predicates|lodash-es|khroma|roughjs|points-on-|path-data-parser|@braintree|langium|chevrotain|ts-dedent|@iconify|@mermaid-js|marked|katex-|uuid|graphlib|web-worker)[/\\]/.test(
              id,
            ),
          );
          return drawing ? 'diagrams/[name]-[hash].js' : 'assets/[name]-[hash].js';
        },
        manualChunks(id: string) {
          if (id.includes('@codemirror') || id.includes('@lezer')) return 'editor';
          if (id.includes('sanscript')) return 'translit';
          if (id.includes('markdown-it')) return 'markdown';
          return undefined;
        },
      },
    },
  },
});
