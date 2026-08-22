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

function newDoc(text: string): Doc {
  const now = Date.now();
  return { id: uid(), title: deriveTitle(text), text, createdAt: now, updatedAt: now };
}

const byRecency = (a: Doc, b: Doc) => b.updatedAt - a.updatedAt;

export function useDocs() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  /* The autosave debouncer must survive re-renders, and needs the latest doc
   * without re-creating itself on every keystroke. */
  const pending = useRef<Doc | null>(null);

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
        const welcome = newDoc(WELCOME_DOC);
        await idbSet('docs', welcome.id, welcome);
        await idbSet('kv', CURRENT_KEY, welcome.id);
        if (cancelled) return;
        setDocs([welcome]);
        setCurrentId(welcome.id);
      } else {
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
      await idbDel('docs', id);
      let nextId = '';
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (id === currentId) nextId = next[0]?.id ?? '';
        return next;
      });
      if (id === currentId) {
        // Deleting the last document leaves the user with a blank page rather
        // than an empty shell with nothing to type into.
        if (!nextId) {
          const doc = newDoc(BLANK_DOC);
          await idbSet('docs', doc.id, doc);
          setDocs([doc]);
          nextId = doc.id;
        }
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
