import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'runtimes/*.js'],
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
        // p5.js add-on and large runtime bundles need headroom.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split the big, rarely-changing dependencies out of the app chunk so a
        // code update only invalidates a small precache entry.
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
