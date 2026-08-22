/**
 * Fence info-string parsing — the surface that decides whether a code block is
 * documentation or a live sketch.
 *
 *   ```p5 height=420 title="Bouncing ball"
 *   ```js run
 *   ```anime
 *   ```canvas height=auto
 */

export type RuntimeId = 'p5' | 'anime' | 'canvas' | 'js';

export interface RunSpec {
  runtime: RuntimeId;
  height: number | 'auto';
  /** Wait for an explicit click instead of running on render. */
  manual: boolean;
  /** Show the source alongside the sketch. */
  showCode: boolean;
  title?: string;
}

export interface FenceInfo {
  lang: string;
  attrs: Map<string, string>;
}

const TOKEN = /([A-Za-z_][\w.+-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S*)))?/g;

export function parseInfo(info: string): FenceInfo {
  const attrs = new Map<string, string>();
  let lang = '';

  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(info)) !== null) {
    const key = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if (!lang) {
      lang = key.toLowerCase();
      continue;
    }
    attrs.set(key.toLowerCase(), value);
  }
  return { lang, attrs };
}

const RUNTIME_BY_LANG: Record<string, RuntimeId> = {
  p5: 'p5',
  p5js: 'p5',
  'p5.js': 'p5',
  anime: 'anime',
  animejs: 'anime',
  'anime.js': 'anime',
  canvas: 'canvas',
  sketch: 'canvas',
};

const PLAIN_JS = new Set(['js', 'javascript', 'mjs']);

const DEFAULT_HEIGHT: Record<RuntimeId, number | 'auto'> = {
  p5: 320,
  canvas: 320,
  anime: 260,
  js: 'auto',
};

/** True for any fence the user meant to execute. */
export function runSpecFor(info: string): RunSpec | null {
  const { lang, attrs } = parseInfo(info);
  if (!lang) return null;

  let runtime = RUNTIME_BY_LANG[lang];
  if (!runtime && PLAIN_JS.has(lang) && attrs.has('run')) runtime = 'js';
  if (!runtime) return null;
  // An explicit opt-out keeps a sketch on the page as documentation.
  if (attrs.has('norun') || attrs.has('static')) return null;

  const rawHeight = attrs.get('height');
  let height = DEFAULT_HEIGHT[runtime];
  if (rawHeight === 'auto') height = 'auto';
  else if (rawHeight) {
    const n = Number.parseInt(rawHeight, 10);
    if (Number.isFinite(n)) height = Math.min(Math.max(n, 80), 2000);
  }

  return {
    runtime,
    height,
    manual: attrs.has('manual') || attrs.get('autorun') === 'false',
    showCode: attrs.has('code') || attrs.has('showcode'),
    title: attrs.get('title') || undefined,
  };
}

export const RUNTIME_LABEL: Record<RuntimeId, string> = {
  p5: 'p5.js',
  anime: 'Anime.js',
  canvas: 'Canvas 2D',
  js: 'JavaScript',
};
