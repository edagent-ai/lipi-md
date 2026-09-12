import bootstrapSource from './bootstrap.js?raw';
import type { RuntimeId } from '../markdown/fence';

export interface RuntimeDescriptor {
  id: RuntimeId;
  label: string;
  license: string;
  blurb: string;
}

export const RUNTIMES: Record<RuntimeId, RuntimeDescriptor> = {
  canvas: {
    id: 'canvas',
    label: 'Canvas 2D',
    license: 'MIT',
    blurb: 'A ready-made canvas with ctx, width, height and loop().',
  },
  js: {
    id: 'js',
    label: 'JavaScript',
    license: 'MIT',
    blurb: 'Plain JavaScript against a stage element.',
  },
};

function sandboxCss(autoHeight: boolean): string {
  return `
/* A drawing surface is always white, whatever the app or the document is set
   to. A sketch picks its own colours and cannot ask what it is being drawn on,
   so the usual black strokes have to land on something pale or they land on
   nothing at all. The colour scheme is pinned for the same reason: it decides
   the default ink, and a sketch that never sets a fill should still be seen. */
html,body{margin:0;padding:0;background:#fff;color:#111;
  color-scheme:light;
  font:13px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;}
html,body{height:${autoHeight ? 'auto' : '100%'};}
body{overflow:${autoHeight ? 'visible' : 'hidden'};}
#stage{width:100%;height:${autoHeight ? 'auto' : '100%'};
  ${
    autoHeight
      ? 'display:block;padding:12px;box-sizing:border-box;'
      : 'display:flex;align-items:center;justify-content:center;'
  }}
canvas{display:block;max-width:100%;}
`.trim();
}

export interface SrcdocOptions {
  channel: string;
  runtime: RuntimeId;
  height: number | 'auto';
}

export function buildSrcdoc({ channel, runtime, height }: SrcdocOptions): string {
  const config = { channel, runtime, height };

  // `</script>` inside the JSON payload would close the tag early.
  const configJson = JSON.stringify(config).replace(/<\//g, '<\\/');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${sandboxCss(height === 'auto')}</style>
</head>
<body>
<script>window.__LIPI__=${configJson};</script>
<script>${bootstrapSource}</script>
</body>
</html>`;
}
