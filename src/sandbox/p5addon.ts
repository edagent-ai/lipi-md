import { idbDel, idbGet, idbSet } from '../lib/idb';

/**
 * p5.js is LGPL-2.1, not MIT, so it is deliberately *not* an npm dependency of
 * this app — that keeps the shipped bundle 100% MIT as specified.
 *
 * Instead the user installs it once as an opt-in add-on. The unmodified library
 * is stored verbatim in IndexedDB and injected into sandboxes as a separate
 * script, so it stays replaceable (the user can swap in their own build via
 * "Install from file"), which is what LGPL §6 asks for. After the one-time
 * install everything works offline like the rest of the app.
 */

const KEY = 'p5-source';
const META_KEY = 'p5-meta';

export const P5_CDN = 'https://cdn.jsdelivr.net/npm/p5@1/lib/p5.min.js';
export const P5_LICENSE_URL = 'https://github.com/processing/p5.js/blob/main/license.txt';

export interface P5Meta {
  installedAt: number;
  bytes: number;
  origin: string;
}

let cached: string | null = null;

export async function getP5Source(): Promise<string | null> {
  if (cached) return cached;
  const stored = await idbGet<string>('kv', KEY);
  cached = stored ?? null;
  return cached;
}

export function getP5Meta(): Promise<P5Meta | undefined> {
  return idbGet<P5Meta>('kv', META_KEY);
}

function validate(source: string): void {
  if (source.length < 50_000) {
    throw new Error('That file is too small to be the p5.js library.');
  }
  if (!/p5/i.test(source.slice(0, 4000))) {
    throw new Error('That file does not look like p5.js.');
  }
}

async function store(source: string, origin: string): Promise<P5Meta> {
  validate(source);
  const meta: P5Meta = { installedAt: Date.now(), bytes: source.length, origin };
  await idbSet('kv', KEY, source);
  await idbSet('kv', META_KEY, meta);
  cached = source;
  return meta;
}

export async function installFromNetwork(): Promise<P5Meta> {
  let response: Response;
  try {
    response = await fetch(P5_CDN, { mode: 'cors', cache: 'no-cache' });
  } catch {
    throw new Error('Could not reach the network. Try "Install from file" instead.');
  }
  if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
  return store(await response.text(), new URL(P5_CDN).hostname);
}

export async function installFromFile(file: File): Promise<P5Meta> {
  return store(await file.text(), file.name);
}

export async function uninstallP5(): Promise<void> {
  cached = null;
  await idbDel('kv', KEY);
  await idbDel('kv', META_KEY);
}
