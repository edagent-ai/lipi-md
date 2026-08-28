import { useCallback, useEffect, useRef, useState } from 'react';
import { idbDel, idbGet, idbSet } from '../lib/idb';
import {
  dirFor,
  fsSupported,
  listMarkdown,
  permissionFor,
  pickDirectory,
  pruneEmptyDirs,
  readFile,
  removeFile,
  safeSegment,
  writeFile,
  type DirHandle,
} from '../lib/fs';
import { slugify, uid } from '../lib/util';
import { deriveFolder, deriveTitle } from './docs';
import type { Doc } from '../types';

/**
 * Mirrors the library into a folder the reader owns.
 *
 * Everything lives in IndexedDB, which the browser is entitled to evict and any
 * "clear site data" erases without warning. That is fine for a cache and wrong
 * for someone's writing, so the documents are also written out as ordinary
 * `.md` files in a directory the reader picks. Those files outlive the browser
 * profile, open in any editor, and can be put into whatever backup the reader
 * already trusts.
 *
 * The mirror is one-way — the app writes, and restores on request. Two-way sync
 * would need conflict resolution, and quietly guessing which side won is a good
 * way to lose the thing this exists to protect.
 */

const HANDLE_KEY = 'vault-handle';
const MANIFEST = '.lipi-md.json';
const MANIFEST_VERSION = 1;

interface ManifestEntry {
  id: string;
  path: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  folder?: string;
  example?: boolean;
}

interface Manifest {
  app: 'lipi.md';
  version: number;
  savedAt: number;
  docs: ManifestEntry[];
}

export type VaultStatus =
  /** No File System Access API — the backup file is the way out. */
  | 'unsupported'
  /** Supported, no folder chosen. */
  | 'off'
  /** A folder is remembered but the grant lapsed; needs a click to resume. */
  | 'locked'
  | 'ready';

export interface VaultState {
  status: VaultStatus;
  folderName: string;
  lastSync: number | null;
  busy: boolean;
  error: string | null;
}

/* ------------------------------- persistence ------------------------------ */

/**
 * Asks the browser to stop treating the library as disposable.
 *
 * Chrome decides from engagement and whether the app is installed, and never
 * prompts; Firefox asks. Either way the answer is reported honestly rather than
 * implying the data is safe when it is not.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function persistenceGranted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageUsed(): Promise<number> {
  try {
    return (await navigator.storage?.estimate?.())?.usage ?? 0;
  } catch {
    return 0;
  }
}

/* --------------------------------- backup --------------------------------- */

/** The whole library as one portable file, for browsers with no folder access. */
export function backupJson(docs: Doc[]): string {
  return JSON.stringify(
    { app: 'lipi.md', version: MANIFEST_VERSION, savedAt: Date.now(), docs },
    null,
    2,
  );
}

/** Documents from a backup file, ignoring anything that is not one. */
export function parseBackup(text: string): Doc[] {
  const parsed: unknown = JSON.parse(text);
  const list = (parsed as { docs?: unknown }).docs;
  if (!Array.isArray(list)) throw new Error('Not a lipi.md backup');
  return list.filter(
    (d): d is Doc =>
      !!d && typeof (d as Doc).id === 'string' && typeof (d as Doc).text === 'string',
  );
}

/* --------------------------------- mirror --------------------------------- */

/**
 * A stable, human-readable filename per document, unique within its folder.
 *
 * A document keeps the filename it already had wherever that name still
 * describes it. Otherwise renaming one document renames its neighbours too:
 * when `alpha.md` is retitled, the `alpha-2.md` that was only numbered to avoid
 * it would slide up into the free name, and the reader would find two files
 * changed underneath them for one edit they made.
 */
function assignPaths(docs: Doc[], before: Map<string, ManifestEntry>): Map<string, string> {
  const paths = new Map<string, string>();
  const taken = new Set<string>();

  const want = new Map<string, { folder: string; base: string }>();
  for (const doc of docs) {
    want.set(doc.id, {
      folder: (doc.folder ?? '')
        .split('/')
        .filter(Boolean)
        .map(safeSegment)
        .join('/'),
      base: safeSegment(slugify(doc.title || 'untitled')),
    });
  }

  for (const doc of docs) {
    const prior = before.get(doc.id);
    const target = want.get(doc.id);
    if (!prior || !target) continue;

    const parsed = /^(?:(.*)\/)?([^/]+)\.md$/i.exec(prior.path);
    if (!parsed) continue;
    const priorFolder = parsed[1] ?? '';
    const priorBase = parsed[2].replace(/-\d+$/, '');

    if (
      priorFolder === target.folder &&
      priorBase === target.base &&
      !taken.has(prior.path.toLowerCase())
    ) {
      taken.add(prior.path.toLowerCase());
      paths.set(doc.id, prior.path);
    }
  }

  for (const doc of docs) {
    if (paths.has(doc.id)) continue;
    const { folder, base } = want.get(doc.id) as { folder: string; base: string };
    let candidate = folder ? `${folder}/${base}.md` : `${base}.md`;
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
      candidate = folder ? `${folder}/${base}-${n}.md` : `${base}-${n}.md`;
    }
    taken.add(candidate.toLowerCase());
    paths.set(doc.id, candidate);
  }
  return paths;
}

async function readManifest(root: DirHandle): Promise<Manifest | null> {
  const raw = await readFile(root, MANIFEST);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Manifest;
    return Array.isArray(parsed?.docs) ? parsed : null;
  } catch {
    return null;
  }
}

export interface MirrorResult {
  written: number;
  removed: number;
}

/**
 * Brings the folder in line with the library.
 *
 * Only documents whose text or location actually changed are rewritten — the
 * manifest records what was last written, so an idle session does no disk I/O
 * and the reader's file timestamps stay meaningful.
 */
export async function mirror(root: DirHandle, docs: Doc[]): Promise<MirrorResult> {
  const previous = await readManifest(root);
  const before = new Map((previous?.docs ?? []).map((e) => [e.id, e]));
  const paths = assignPaths(docs, before);
  const result: MirrorResult = { written: 0, removed: 0 };

  for (const doc of docs) {
    const path = paths.get(doc.id);
    if (!path) continue;
    const prior = before.get(doc.id);

    // A retitled or refiled document leaves its old file behind otherwise.
    if (prior && prior.path !== path) {
      await removeFile(root, prior.path);
      await pruneEmptyDirs(root, prior.path);
      result.removed++;
    }
    if (prior && prior.path === path && prior.updatedAt === doc.updatedAt) continue;

    const parts = path.split('/');
    const name = parts.pop() as string;
    const dir = await dirFor(root, parts.join('/'), true);
    if (!dir) continue;
    await writeFile(dir, name, doc.text);
    result.written++;
  }

  const live = new Set(docs.map((d) => d.id));
  for (const [id, entry] of before) {
    if (!live.has(id)) {
      await removeFile(root, entry.path);
      await pruneEmptyDirs(root, entry.path);
      result.removed++;
    }
  }

  const manifest: Manifest = {
    app: 'lipi.md',
    version: MANIFEST_VERSION,
    savedAt: Date.now(),
    docs: docs.map((d) => ({
      id: d.id,
      path: paths.get(d.id) as string,
      title: d.title,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      folder: d.folder,
      example: d.example,
    })),
  };
  await writeFile(root, MANIFEST, JSON.stringify(manifest, null, 2));
  return result;
}

/**
 * Rebuilds documents from the folder.
 *
 * The manifest restores identity — the same ids and timestamps, so a restore
 * updates documents in place instead of duplicating them. Markdown files the
 * manifest does not know about are taken as new documents, which is what makes
 * the folder usable as a drop box for writing done elsewhere.
 */
export async function readVault(root: DirHandle): Promise<Doc[]> {
  const manifest = await readManifest(root);
  const files = await listMarkdown(root);
  const byPath = new Map(files.map((f) => [f.path.toLowerCase(), f.text]));
  const docs: Doc[] = [];
  const claimed = new Set<string>();

  for (const entry of manifest?.docs ?? []) {
    const text = byPath.get(entry.path.toLowerCase());
    if (text === undefined) continue;
    claimed.add(entry.path.toLowerCase());
    docs.push({
      id: entry.id,
      title: deriveTitle(text),
      text,
      folder: deriveFolder(text) || entry.folder || '',
      createdAt: entry.createdAt || Date.now(),
      updatedAt: entry.updatedAt || Date.now(),
      ...(entry.example ? { example: true } : {}),
    });
  }

  for (const file of files) {
    if (claimed.has(file.path.toLowerCase())) continue;
    const now = Date.now();
    const fromPath = file.path.split('/').slice(0, -1).join('/');
    docs.push({
      id: uid(),
      title: deriveTitle(file.text),
      text: file.text,
      folder: deriveFolder(file.text) || fromPath,
      createdAt: now,
      updatedAt: now,
    });
  }

  return docs;
}

/* ---------------------------------- hook ---------------------------------- */

/** A stored value is only a handle if it still behaves like one. */
function isHandle(value: unknown): value is DirHandle {
  return (
    !!value && typeof (value as DirHandle).getDirectoryHandle === 'function'
  );
}

export function useVault() {
  const [state, setState] = useState<VaultState>({
    status: fsSupported() ? 'off' : 'unsupported',
    folderName: '',
    lastSync: null,
    busy: false,
    error: null,
  });
  const handleRef = useRef<DirHandle | null>(null);

  useEffect(() => {
    if (!fsSupported()) return;
    let cancelled = false;

    void (async () => {
      const stored = await idbGet<unknown>('kv', HANDLE_KEY);
      if (cancelled || !isHandle(stored)) return;
      handleRef.current = stored;
      // Never request here: re-granting needs a user gesture, and a permission
      // prompt nobody asked for on page load is its own kind of rude.
      const granted = (await permissionFor(stored, false)) === 'granted';
      if (cancelled) return;
      setState((s) => ({
        ...s,
        status: granted ? 'ready' : 'locked',
        folderName: stored.name,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (docs: Doc[]) => {
    const handle = await pickDirectory();
    if (!handle) return;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await idbSet('kv', HANDLE_KEY, handle);
      handleRef.current = handle;
      await mirror(handle, docs);
      setState({
        status: 'ready',
        folderName: handle.name,
        lastSync: Date.now(),
        busy: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  /** Re-grants a lapsed permission; must be called from a click. */
  const unlock = useCallback(async (docs: Doc[]) => {
    const handle = handleRef.current;
    if (!handle) return;
    setState((s) => ({ ...s, busy: true, error: null }));
    const granted = (await permissionFor(handle, true)) === 'granted';
    if (!granted) {
      setState((s) => ({ ...s, busy: false, status: 'locked' }));
      return;
    }
    try {
      await mirror(handle, docs);
      setState((s) => ({ ...s, status: 'ready', busy: false, lastSync: Date.now() }));
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    handleRef.current = null;
    await idbDel('kv', HANDLE_KEY);
    setState({
      status: fsSupported() ? 'off' : 'unsupported',
      folderName: '',
      lastSync: null,
      busy: false,
      error: null,
    });
  }, []);

  /** Writes the library out. Quiet by default: this runs on every save. */
  const sync = useCallback(async (docs: Doc[], loud = false) => {
    const handle = handleRef.current;
    if (!handle) return;
    if ((await permissionFor(handle, false)) !== 'granted') {
      setState((s) => (s.status === 'locked' ? s : { ...s, status: 'locked' }));
      return;
    }
    if (loud) setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await mirror(handle, docs);
      setState((s) => ({ ...s, status: 'ready', busy: false, lastSync: Date.now(), error: null }));
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const restore = useCallback(async (): Promise<Doc[] | null> => {
    const handle = handleRef.current;
    if (!handle) return null;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      if ((await permissionFor(handle, true)) !== 'granted') {
        setState((s) => ({ ...s, busy: false, status: 'locked' }));
        return null;
      }
      const docs = await readVault(handle);
      setState((s) => ({ ...s, busy: false, status: 'ready' }));
      return docs;
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : String(err),
      }));
      return null;
    }
  }, []);

  return { ...state, connect, unlock, disconnect, sync, restore };
}
