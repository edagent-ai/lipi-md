import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { idbAll, idbDel, idbGet, idbSet } from '../lib/idb';
import { debounce, uid } from '../lib/util';
import { parseFrontmatter } from '../markdown/frontmatter';
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

function newDoc(text: string, example = false): Doc {
  const now = Date.now();
  const doc: Doc = { id: uid(), title: deriveTitle(text), text, createdAt: now, updatedAt: now };
  if (example) doc.example = true;
  return doc;
}

/** The shipped example is protected from deletion; everything else is fair game. */
export const isExample = (doc: Doc | undefined): boolean => doc?.example === true;

const byRecency = (a: Doc, b: Doc) => b.updatedAt - a.updatedAt;

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
      const stored = (await idbAll<Doc>('docs')).filter((d) => d && typeof d.text === 'string');
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

  const duplicate = useCallback(
    async (id: string) => {
      const source = docs.find((d) => d.id === id);
      if (!source) return;
      await create(source.text);
    },
    [create, docs],
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
    duplicate,
    saveNow: flush,
  };
}
