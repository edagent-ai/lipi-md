import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Segment } from '../markdown';
import { SandboxHost, type SandboxDeps } from './SandboxHost';
import { collectAnchors, lineForOffset, offsetForLine, type Anchor } from './scrollSync';

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
}

interface PreviewProps {
  segments: Segment[];
  autoRun: boolean;
  onInstallP5: () => void;
  onScroll: () => void;
}

export const Preview = forwardRef<PreviewHandle, PreviewProps>(function Preview(
  { segments, autoRun, onInstallP5, onScroll },
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
  }, [segments, rendererEpoch]);

  // Sandboxes resize themselves after load, which shifts every anchor below.
  useEffect(() => {
    const host = bodyRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => rendererRef.current?.invalidate());
    observer.observe(host);
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
    <div className="preview" ref={scrollerRef} onScroll={onScroll}>
      <div className="preview-body markdown" ref={bodyRef} />
    </div>
  );
});
