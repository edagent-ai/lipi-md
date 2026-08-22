import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canHighlight, clearPaint, findMatches, paint } from './find';

interface FindBarProps {
  /** The rendered document to search. */
  bodyRef: React.RefObject<HTMLDivElement | null>;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  /** Roman scheme the author types in, used to romanise native text. */
  sourceScheme: string;
  /** Bumped whenever the preview re-renders, so matches are recomputed. */
  revision: number;
  onClose(): void;
}

export function FindBar({ bodyRef, scrollerRef, sourceScheme, revision, onClose }: FindBarProps) {
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supported = useMemo(canHighlight, []);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const result = useMemo(() => {
    const root = bodyRef.current;
    if (!root || !query.trim()) return { ranges: [] as Range[], approximate: 0 };
    return findMatches(root, query, sourceScheme);
    // `revision` is a deliberate dependency: the ranges point into DOM nodes
    // the renderer may have just replaced, and a stale Range throws when used.
  }, [bodyRef, query, sourceScheme, revision]);

  const count = result.ranges.length;

  useEffect(() => {
    setCurrent((prev) => (count === 0 ? 0 : Math.min(prev, count - 1)));
  }, [count]);

  /* Bring the active match into view. Scrolling the pane directly rather than
     calling scrollIntoView, which would also scroll the page behind it. */
  useEffect(() => {
    if (!count) {
      clearPaint();
      return;
    }
    paint(result.ranges, current);

    const scroller = scrollerRef.current;
    const range = result.ranges[current];
    if (!scroller || !range) return;

    const box = range.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    if (box.height === 0 && box.width === 0) return;
    const above = box.top < view.top + 40;
    const below = box.bottom > view.bottom - 40;
    if (above || below) {
      scroller.scrollBy({ top: box.top - view.top - view.height / 3, behavior: 'smooth' });
    }
  }, [result, current, count, scrollerRef]);

  useEffect(() => clearPaint, []);

  const step = useCallback(
    (delta: number) => {
      if (!count) return;
      setCurrent((prev) => (prev + delta + count) % count);
    },
    [count],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    }
  };

  return (
    <div className="findbar" role="search">
      <input
        ref={inputRef}
        type="search"
        className="findbar-input"
        placeholder="Find — type phonetically or in script"
        aria-label="Find in the rendered page"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCurrent(0);
        }}
        onKeyDown={onKeyDown}
      />
      <span className="findbar-count" aria-live="polite">
        {query.trim() ? (count ? `${current + 1} / ${count}` : 'none') : ''}
      </span>
      <button
        type="button"
        className="icon-btn"
        onClick={() => step(-1)}
        disabled={!count}
        title="Previous match"
        aria-label="Previous match"
      >
        ↑
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => step(1)}
        disabled={!count}
        title="Next match"
        aria-label="Next match"
      >
        ↓
      </button>
      <button type="button" className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
        ✕
      </button>
      {result.approximate > 0 && (
        <span className="findbar-note">
          {result.approximate} matched by sound, shown whole
        </span>
      )}
      {!supported && <span className="findbar-note">This browser cannot highlight matches</span>}
    </div>
  );
}
