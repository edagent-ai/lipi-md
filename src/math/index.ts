import { escapeHtml } from '../lib/util';

type Katex = typeof import('katex').default;

let katex: Katex | null = null;
let loading: Promise<void> | null = null;

/** True once KaTeX is in memory and `renderMath` will produce real output. */
export const mathReady = () => katex !== null;

/** Cheap pre-check so a document without maths never downloads KaTeX. */
export const looksLikeMath = (source: string) => source.includes('$');

export function loadMath(): Promise<void> {
  if (katex) return Promise.resolve();
  loading ??= import('./katex-bundle')
    .then((mod) => {
      katex = mod.default;
    })
    .catch(() => {
      // Offline before the chunk was ever cached: fall through to showing the
      // raw TeX rather than breaking the whole render.
      loading = null;
    });
  return loading;
}

export type MathOutput = 'html' | 'mathml';

/**
 * `mathml` is used for exports: it needs no stylesheet and no webfonts, so an
 * exported page stays genuinely self-contained. The preview uses `html`, which
 * is what KaTeX renders best with its own fonts loaded.
 */
export function renderMath(tex: string, display: boolean, output: MathOutput): string {
  if (!katex) {
    return `<code class="math-pending" title="Loading maths…">${escapeHtml(tex)}</code>`;
  }
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      output,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `<code class="math-error" title="${escapeHtml(message)}">${escapeHtml(tex)}</code>`;
  }
}
