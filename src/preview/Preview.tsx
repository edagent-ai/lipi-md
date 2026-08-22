import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Segment } from '../markdown';
import { SandboxHost, type SandboxDeps } from './SandboxHost';
import { collectAnchors, lineForOffset, offsetForLine, type Anchor } from './scrollSync';

/**
 * Narrowest pane that can carry a text column and a sidenote column side by
 * side. Below it the notes stay in the flow rather than being hidden.
 */
const SIDENOTE_COLUMN_MIN = 560;

interface Entry {
  node: HTMLElement;
  segment: Segment;
  sandbox?: SandboxHost;
}

/**
 * Reconciles segments into the preview DOM by key.
 *
 * The reason this is hand-rolled rather than JSX: re-inserting an `<iframe>`
 * reloads it, which would restart every animation on every keystroke. Keys are
 * positional (`run:0`, `html:1`) so ordinary typing leaves the key sequence
 * untouched, and each node is left exactly where it is — only its contents
 * change. Sandboxes then receive new code over postMessage instead of remounting.
 */
class SegmentRenderer {
  private entries = new Map<string, Entry>();
  private anchorCache: Anchor[] | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly deps: SandboxDeps,
  ) {}

  update(segments: Segment[]): void {
    const next = new Map<string, Entry>();
    const ordered: HTMLElement[] = [];

    for (const segment of segments) {
      const prev = this.entries.get(segment.key);

      if (prev && prev.segment.kind === segment.kind) {
        if (segment.kind === 'html') {
          if ((prev.segment as { html: string }).html !== segment.html) {
            prev.node.innerHTML = segment.html;
          }
        } else {
          prev.sandbox?.update(segment.spec, segment.code);
          prev.node.dataset.line = String(segment.line);
        }
        prev.segment = segment;
        next.set(segment.key, prev);
        ordered.push(prev.node);
        continue;
      }

      if (segment.kind === 'html') {
        const node = document.createElement('div');
        node.className = 'md-chunk';
        node.innerHTML = segment.html;
        next.set(segment.key, { node, segment });
        ordered.push(node);
      } else {
        const sandbox = new SandboxHost(segment.spec, segment.code, this.deps);
        sandbox.el.dataset.line = String(segment.line);
        next.set(segment.key, { node: sandbox.el, segment, sandbox });
        ordered.push(sandbox.el);
      }
    }

    for (const [key, entry] of this.entries) {
      if (next.has(key)) continue;
      entry.sandbox?.destroy();
      entry.node.remove();
    }
    this.entries = next;

    // Touch the DOM only where the order actually differs, so untouched
    // iframes are never re-inserted.
    let index = 0;
    for (const node of ordered) {
      if (this.host.childNodes[index] !== node) {
        this.host.insertBefore(node, this.host.childNodes[index] ?? null);
      }
      index++;
    }
    while (this.host.childNodes.length > ordered.length) {
      this.host.lastChild?.remove();
    }

    this.anchorCache = null;
  }

  /** PNG of each running sketch, keyed by segment, for HTML/PDF export. */
  async snapshots(): Promise<Record<string, string>> {
    const shots = await Promise.all(
      [...this.entries.entries()]
        .filter(([, entry]) => entry.sandbox)
        .map(async ([key, entry]) => [key, await entry.sandbox!.snapshot()] as const),
    );
    return Object.fromEntries(shots.filter(([, url]) => url)) as Record<string, string>;
  }

  anchors(): Anchor[] {
    return (this.anchorCache ??= collectAnchors(this.host));
  }

  invalidate(): void {
    this.anchorCache = null;
  }

  destroy(): void {
    for (const entry of this.entries.values()) entry.sandbox?.destroy();
    this.entries.clear();
    this.host.replaceChildren();
  }
}

export interface PreviewHandle {
  scrollToLine(line: number): void;
  topLine(): number;
  scroller(): HTMLElement | null;
  snapshots(): Promise<Record<string, string>>;
}

interface PreviewProps {
  segments: Segment[];
  autoRun: boolean;
  onInstallP5: () => void;
  onScroll: () => void;
  /** CSS custom properties from the document's frontmatter. */
  docStyle: Record<string, string>;
  /** Reports the heading currently at the top, to drive the outline. */
  onActiveHeading?: (id: string) => void;
}

export const Preview = forwardRef<PreviewHandle, PreviewProps>(function Preview(
  { segments, autoRun, onInstallP5, onScroll, docStyle, onActiveHeading },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SegmentRenderer | null>(null);
  // Bumped whenever the renderer is (re)created, so the render effect below
  // re-runs against the new instance — StrictMode remounts it without the
  // segments themselves ever changing.
  const [rendererEpoch, setRendererEpoch] = useState(0);

  // Deps are read through refs so the renderer never has to be rebuilt when a
  // setting changes — rebuilding would drop every running sketch.
  const autoRunRef = useRef(autoRun);
  autoRunRef.current = autoRun;
  const installRef = useRef(onInstallP5);
  installRef.current = onInstallP5;

  /* Which heading sits at the top right now — drives the outline highlight.
   * Recomputed behind a rAF, since scroll fires far more often than the sidebar
   * needs updating. */
  const activeRef = useRef('');
  const tickingRef = useRef(false);
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const onActiveRef = useRef(onActiveHeading);
  onActiveRef.current = onActiveHeading;

  const syncActiveHeading = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;

    requestAnimationFrame(() => {
      tickingRef.current = false;
      const scroller = scrollerRef.current;
      const host = bodyRef.current;
      const report = onActiveRef.current;
      if (!scroller || !host || !report) return;

      const headings = [...host.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id]')];
      // A line a little below the top reads more naturally than the very edge.
      const line = scroller.getBoundingClientRect().top + Math.min(120, scroller.clientHeight * 0.25);

      let current = '';
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > line) break;
        current = heading.id;
      }
      // The preview ends with 50vh of padding, so the final sections can never
      // scroll to the top; at the bottom, the last heading is the right answer.
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8;
      if (atBottom && headings.length) current = headings[headings.length - 1].id;
      if (current !== activeRef.current) {
        activeRef.current = current;
        report(current);
      }
    });
  }, []);

  const handleScroll = useCallback(() => {
    onScrollRef.current();
    syncActiveHeading();
  }, [syncActiveHeading]);

  useEffect(() => {
    const host = bodyRef.current;
    if (!host) return;
    const renderer = new SegmentRenderer(host, {
      autoRun: () => autoRunRef.current,
      onInstallP5: () => installRef.current(),
    });
    rendererRef.current = renderer;
    setRendererEpoch((epoch) => epoch + 1);
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(segments);
    syncActiveHeading();
  }, [segments, rendererEpoch, syncActiveHeading]);

  // Sandboxes resize themselves after load, which shifts every anchor below.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const host = bodyRef.current;
    if (!scroller || !host || typeof ResizeObserver === 'undefined') return;

    const sync = () => {
      rendererRef.current?.invalidate();
      // Whether the pane can carry a sidenote column depends on the pane, not
      // the viewport — a wide window split in two often cannot. Measured here
      // because CSS cannot see the pane width without containment that would
      // trap the fullscreen sandbox overlay.
      scroller.classList.toggle('is-roomy', scroller.clientWidth >= SIDENOTE_COLUMN_MIN);
    };

    const observer = new ResizeObserver(sync);
    observer.observe(host);
    observer.observe(scroller);
    sync();
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToLine(line: number) {
      const scroller = scrollerRef.current;
      const renderer = rendererRef.current;
      if (!scroller || !renderer) return;
      scroller.scrollTop = offsetForLine(scroller, renderer.anchors(), line);
    },
    topLine() {
      const scroller = scrollerRef.current;
      const renderer = rendererRef.current;
      if (!scroller || !renderer) return 0;
      return lineForOffset(scroller, renderer.anchors(), scroller.scrollTop);
    },
    scroller: () => scrollerRef.current,
    snapshots: () => rendererRef.current?.snapshots() ?? Promise.resolve({}),
  }));


  /* Copy buttons and in-page heading links are delegated rather than bound per
   * node, since chunks are replaced wholesale on edit. */
  useEffect(() => {
    const host = bodyRef.current;
    if (!host) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const copy = target.closest('.copy-code');
      if (copy) {
        const code = copy.closest('.code-block')?.querySelector('code')?.textContent ?? '';
        void navigator.clipboard?.writeText(code).then(
          () => {
            copy.textContent = 'Copied';
            setTimeout(() => (copy.textContent = 'Copy'), 1200);
          },
          () => (copy.textContent = 'Failed'),
        );
        return;
      }

      const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (link) {
        const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
        const heading = host.querySelector(`[id="${CSS.escape(id)}"]`);
        if (heading) {
          event.preventDefault();
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    host.addEventListener('click', onClick);
    return () => host.removeEventListener('click', onClick);
  }, []);

  return (
    <div
      className="preview"
      ref={scrollerRef}
      onScroll={handleScroll}
      style={docStyle as React.CSSProperties}
    >
      <div className="preview-body markdown" ref={bodyRef} />
    </div>
  );
});
