export interface Anchor {
  line: number;
  el: HTMLElement;
}

/**
 * Every block element carries `data-line` (see the `lipi_line_anchors` core
 * rule), which turns scroll sync into interpolation between two known points
 * rather than a blunt scroll-percentage mapping.
 */
export function collectAnchors(host: HTMLElement): Anchor[] {
  const out: Anchor[] = [];
  for (const el of host.querySelectorAll<HTMLElement>('[data-line]')) {
    const line = Number(el.dataset.line);
    if (Number.isFinite(line)) out.push({ line, el });
  }
  return out;
}

function offsetIn(scroller: HTMLElement, anchor: Anchor): number {
  return (
    anchor.el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop
  );
}

/** Pixel offset within `scroller` that corresponds to a source line. */
export function offsetForLine(scroller: HTMLElement, anchors: Anchor[], line: number): number {
  if (!anchors.length) return 0;
  if (line <= anchors[0].line) return 0;

  let lo = 0;
  let hi = anchors.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (anchors[mid].line <= line) lo = mid;
    else hi = mid - 1;
  }

  const start = anchors[lo];
  const startTop = offsetIn(scroller, start);
  const next = anchors[lo + 1];
  if (!next) return startTop;

  const span = next.line - start.line;
  if (span <= 0) return startTop;

  const ratio = Math.min(1, (line - start.line) / span);
  return startTop + ratio * (offsetIn(scroller, next) - startTop);
}

/** Inverse of `offsetForLine`: which source line sits at the scroll position. */
export function lineForOffset(scroller: HTMLElement, anchors: Anchor[], offset: number): number {
  if (!anchors.length) return 0;

  let lo = 0;
  let hi = anchors.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsetIn(scroller, anchors[mid]) <= offset) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const start = anchors[best];
  const startTop = offsetIn(scroller, start);
  const next = anchors[best + 1];
  if (!next) return start.line;

  const height = offsetIn(scroller, next) - startTop;
  if (height <= 0) return start.line;

  const ratio = Math.min(1, Math.max(0, (offset - startTop) / height));
  return start.line + ratio * (next.line - start.line);
}

/**
 * Guards the two-way editor/preview binding: whichever pane the user is
 * actually scrolling owns the interaction until it goes quiet.
 */
export function createScrollLock(quietMs = 150) {
  let owner: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    claim(who: string): boolean {
      if (owner && owner !== who) return false;
      owner = who;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        owner = null;
      }, quietMs);
      return true;
    },
  };
}
