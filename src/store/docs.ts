import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { idbAll, idbDel, idbGet, idbSet } from '../lib/idb';
import { debounce, uid } from '../lib/util';
import {
  normalizeFolder,
  parseFrontmatter,
  upsertFrontmatterKey,
} from '../markdown/frontmatter';
import type { Doc } from '../types';
import { BLANK_DOC, WELCOME_DOC } from './samples';

export type SaveState = 'saved' | 'saving' | 'dirty';

const CURRENT_KEY = 'current-doc';
const AUTOSAVE_MS = 500;

/** Frontmatter title wins, then the first heading, then the first line. */
export function deriveTitle(text: string): string {
  const front = parseFrontmatter(text).title;
  if (front) return front.slice(0, 120);

  const heading = /^#{1,6}\s+(.+)$/m.exec(text);
  if (heading) return heading[1].replace(/[#*`_]/g, '').trim().slice(0, 120);

  const body = text.replace(/^---[\s\S]*?\n---\n/, '');
  const firstLine = body.split('\n').find((l) => l.trim().length > 0);
  return firstLine ? firstLine.replace(/[#*`_>]/g, '').trim().slice(0, 120) : 'Untitled';
}

/** Folder path a document declares in its frontmatter, normalised. */
export const deriveFolder = (text: string): string =>
  normalizeFolder(parseFrontmatter(text).folder ?? '');

function newDoc(text: string, example = false): Doc {
  const now = Date.now();
  const doc: Doc = {
    id: uid(),
    title: deriveTitle(text),
    text,
    folder: deriveFolder(text),
    createdAt: now,
    updatedAt: now,
  };
  if (example) doc.example = true;
  return doc;
}

/** The shipped example is protected from deletion; everything else is fair game. */
export const isExample = (doc: Doc | undefined): boolean => doc?.example === true;

const byRecency = (a: Doc, b: Doc) => b.updatedAt - a.updatedAt;

/** `X (copy)`, then `X (copy 2)` … so a copy never collides with a sibling. */
function copyTitle(taken: string[], base: string): string {
  let candidate = `${base} (copy)`;
  for (let n = 2; taken.includes(candidate); n++) candidate = `${base} (copy ${n})`;
  return candidate;
}

/** Frontmatter splits on the first colon, so a title containing one is quoted. */
const quoteTitle = (title: string) => (/[:#]/.test(title) ? JSON.stringify(title) : title);

/**
 * Retitles a copy by editing the source, because a document's title is derived
 * from its text on every keystroke — anything stored alongside would be lost as
 * soon as the copy was edited.
 */
function retitle(text: string, title: string): string {
  const front = /^---(\r?\n)([\s\S]*?)(\r?\n---)/.exec(text);

  if (front) {
    const bodyStart = 3 + front[1].length;
    const line = /^([ \t]*title[ \t]*:[ \t]*)(.*)$/im.exec(front[2]);
    if (line) {
      const from = bodyStart + line.index + line[1].length;
      return text.slice(0, from) + quoteTitle(title) + text.slice(from + line[2].length);
    }
    const at = bodyStart + front[2].length;
    return `${text.slice(0, at)}\ntitle: ${quoteTitle(title)}${text.slice(at)}`;
  }

  const heading = /^(#{1,6}[ \t]+)(.+)$/m.exec(text);
  if (heading) {
    const from = heading.index + heading[1].length;
    return text.slice(0, from) + title + text.slice(from + heading[2].length);
  }

  // No title to rewrite; the sidebar falls back to the first line either way.
  return text;
}

export function useDocs() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  /* The autosave debouncer must survive re-renders, and needs the latest doc
   * without re-creating itself on every keystroke. */
  const pending = useRef<Doc | null>(null);
  /** Latest documents, for callbacks that must not depend on render order. */
  const docsRef = useRef<Doc[]>([]);

  const flush = useCallback(async () => {
    const doc = pending.current;
    if (!doc) return;
    pending.current = null;
    setSaveState('saving');
    await idbSet('docs', doc.id, doc);
    setSaveState((state) => (pending.current ? state : 'saved'));
  }, []);

  const scheduleSave = useMemo(() => debounce(() => void flush(), AUTOSAVE_MS), [flush]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = (await idbAll<Doc>('docs'))
        .filter((d) => d && typeof d.text === 'string')
        // Records written before folders existed carry none; derive on read so
        // no migration write is needed.
        .map((d) => (d.folder === undefined ? { ...d, folder: deriveFolder(d.text) } : d));
      const savedId = await idbGet<string>('kv', CURRENT_KEY);
      if (cancelled) return;

      if (!stored.length) {
        const welcome = newDoc(WELCOME_DOC, true);
        await idbSet('docs', welcome.id, welcome);
        await idbSet('kv', CURRENT_KEY, welcome.id);
        if (cancelled) return;
        setDocs([welcome]);
        setCurrentId(welcome.id);
      } else {
        // Installs seeded before the flag existed have an unmarked example.
        // Only an untouched copy is adopted, so a document the user has since
        // made their own is never silently made undeletable.
        if (!stored.some((d) => d.example)) {
          const pristine = stored.find((d) => d.text === WELCOME_DOC);
          if (pristine) {
            pristine.example = true;
            void idbSet('docs', pristine.id, pristine);
          }
        }
        stored.sort(byRecency);
        const id = savedId && stored.some((d) => d.id === savedId) ? savedId : stored[0].id;
        setDocs(stored);
        setCurrentId(id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // A tab close mid-debounce would otherwise lose the last few keystrokes.
  useEffect(() => {
    const onHide = () => {
      if (pending.current) {
        scheduleSave.cancel();
        void flush();
      }
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush, scheduleSave]);

  docsRef.current = docs;

  const current = useMemo(() => docs.find((d) => d.id === currentId), [docs, currentId]);

  const setText = useCallback(
    (text: string) => {
      setDocs((prev) => {
        const index = prev.findIndex((d) => d.id === currentId);
        if (index < 0) return prev;

        const updated: Doc = {
          ...prev[index],
          text,
          title: deriveTitle(text),
          folder: deriveFolder(text),
          updatedAt: Date.now(),
        };
        pending.current = updated;

        const next = prev.slice();
        next[index] = updated;
        return next;
      });
      setSaveState('dirty');
      scheduleSave();
    },
    [currentId, scheduleSave],
  );

  const select = useCallback(
    (id: string) => {
      scheduleSave.cancel();
      void flush();
      setCurrentId(id);
      void idbSet('kv', CURRENT_KEY, id);
    },
    [flush, scheduleSave],
  );

  const create = useCallback(
    async (text = BLANK_DOC) => {
      scheduleSave.cancel();
      await flush();
      const doc = newDoc(text);
      await idbSet('docs', doc.id, doc);
      await idbSet('kv', CURRENT_KEY, doc.id);
      setDocs((prev) => [doc, ...prev]);
      setCurrentId(doc.id);
      return doc;
    },
    [flush, scheduleSave],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = docsRef.current.find((d) => d.id === id);
      // Enforced here as well as in the UI, so no caller can delete the example.
      if (!target || target.example) return;

      await idbDel('docs', id);

      // Computed from the ref rather than from inside a setState updater: the
      // updater may not have run yet, and reading its result through a closure
      // variable made this think the library was empty and replace it with a
      // single blank document.
      const remaining = docsRef.current.filter((d) => d.id !== id);

      if (!remaining.length) {
        // Nothing left to show — hand back a blank page rather than an empty
        // shell with nothing to type into.
        const doc = newDoc(BLANK_DOC);
        await idbSet('docs', doc.id, doc);
        docsRef.current = [doc];
        setDocs([doc]);
        setCurrentId(doc.id);
        await idbSet('kv', CURRENT_KEY, doc.id);
        return;
      }

      docsRef.current = remaining;
      setDocs(remaining);

      if (id === currentId) {
        const nextId = remaining[0].id;
        setCurrentId(nextId);
        await idbSet('kv', CURRENT_KEY, nextId);
      }
    },
    [currentId],
  );

  /**
   * Restores the shipped example over whatever the document now contains. This
   * is what the example offers in place of deletion: it can always be put back,
   * so there is no need to keep a pristine copy around.
   */
  const reset = useCallback(
    async (id: string) => {
      const target = docsRef.current.find((d) => d.id === id);
      if (!target?.example) return;

      // Drop any queued autosave, or the debounced write would land after this
      // and put the edited text straight back.
      scheduleSave.cancel();
      if (pending.current?.id === id) pending.current = null;

      const restored: Doc = {
        ...target,
        text: WELCOME_DOC,
        title: deriveTitle(WELCOME_DOC),
        folder: deriveFolder(WELCOME_DOC),
        updatedAt: Date.now(),
      };
      await idbSet('docs', id, restored);

      const next = docsRef.current.map((d) => (d.id === id ? restored : d));
      docsRef.current = next;
      setDocs(next);
      setSaveState('saved');
    },
    [scheduleSave],
  );

  /**
   * Files a document under a folder path by rewriting its frontmatter, so the
   * placement travels with the document through export and re-import.
   */
  const move = useCallback(
    async (id: string, rawPath: string) => {
      const target = docsRef.current.find((d) => d.id === id);
      if (!target) return;

      const folder = normalizeFolder(rawPath);
      if (folder === (target.folder ?? '')) return;

      scheduleSave.cancel();
      if (pending.current?.id === id) pending.current = null;

      const text = upsertFrontmatterKey(target.text, 'folder', folder || null);
      const updated: Doc = { ...target, text, folder, updatedAt: Date.now() };
      await idbSet('docs', id, updated);

      const next = docsRef.current.map((d) => (d.id === id ? updated : d));
      docsRef.current = next;
      setDocs(next);
      setSaveState('saved');
    },
    [scheduleSave],
  );

  const duplicate = useCallback(
    async (id: string) => {
      const source = docsRef.current.find((d) => d.id === id);
      if (!source) return;
      const taken = docsRef.current.map((d) => d.title);
      // A copy is never the example, so it can be deleted like any other.
      await create(retitle(source.text, copyTitle(taken, source.title)));
    },
    [create],
  );

  const sorted = useMemo(() => docs.slice().sort(byRecency), [docs]);

  return {
    docs: sorted,
    current,
    currentId,
    loading,
    saveState,
    setText,
    select,
    create,
    remove,
    reset,
    move,
    duplicate,
    saveNow: flush,
  };
}
