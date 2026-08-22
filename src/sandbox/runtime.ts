import bootstrapSource from './bootstrap.js?raw';
import type { RuntimeId } from '../markdown/fence';

export interface RuntimeDescriptor {
  id: RuntimeId;
  label: string;
  /** Same-origin classic script loaded inside the sandbox, if any. */
  libUrl?: string;
  /** True when the library ships separately as an opt-in add-on. */
  addon?: boolean;
  license: string;
  blurb: string;
}

const base = import.meta.env.BASE_URL || '/';
const asset = (path: string) => new URL(base + path, location.href).href;

export const RUNTIMES: Record<RuntimeId, RuntimeDescriptor> = {
  p5: {
    id: 'p5',
    label: 'p5.js',
    addon: true,
    license: 'LGPL-2.1',
    blurb: 'Creative-coding sketches with setup() and draw().',
  },
  anime: {
    id: 'anime',
    label: 'Anime.js',
    libUrl: asset('runtimes/anime.iife.js'),
    license: 'MIT',
    blurb: 'Timeline-driven DOM and SVG animation.',
  },
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
html,body{margin:0;padding:0;background:transparent;
  color-scheme:light dark;
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
  /** Inline library source, used by the p5 add-on. */
  libSource?: string;
}

export function buildSrcdoc({ channel, runtime, height, libSource }: SrcdocOptions): string {
  const descriptor = RUNTIMES[runtime];
  const config = {
    channel,
    runtime,
    height,
    libUrl: libSource ? undefined : descriptor.libUrl,
    libSource,
  };

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
