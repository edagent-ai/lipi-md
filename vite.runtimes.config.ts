import { defineConfig } from 'vite';

/**
 * Sandboxes are opaque-origin iframes, so they cannot fetch ES modules from our
 * origin (that would need CORS headers a static host will not send). Classic
 * scripts have no such restriction, so every bundled animation runtime is
 * pre-built here as a self-contained IIFE dropped into `public/runtimes/`.
 *
 * Run via `npm run build:runtimes` (wired into both `dev` and `build`).
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public/runtimes',
    emptyOutDir: true,
    minify: 'oxc',
    lib: {
      entry: 'src/runtimes/anime.entry.js',
      name: '__lipiAnime',
      formats: ['iife'],
      fileName: () => 'anime.iife.js',
    },
  },
});
