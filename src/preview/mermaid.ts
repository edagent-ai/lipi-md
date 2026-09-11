/**
 * Drawing Mermaid diagrams into the preview.
 *
 * The library is large — larger than the rest of the app put together — so it is
 * imported only when a document actually contains a diagram, and it is not
 * precached. A reader who never draws one never pays for it; a reader who does
 * fetches it once, and the browser keeps it from then on.
 *
 * Rendering happens here rather than in a sandbox because Mermaid takes a
 * description and returns SVG: there is no author code to run. That is also why
 * a diagram survives an export untouched, where a canvas sketch has to be
 * photographed first.
 */

type Mermaid = {
  initialize(config: Record<string, unknown>): void;
  render(id: string, text: string): Promise<{ svg: string }>;
};

let loading: Promise<Mermaid> | null = null;

function load(): Promise<Mermaid> {
  loading ??= import('mermaid').then((module) => {
    const mermaid = (module.default ?? module) as unknown as Mermaid;
    mermaid.initialize({
      startOnLoad: false,
      // Mermaid sanitises what it produces; `strict` also refuses the HTML
      // labels that would let a diagram smuggle markup into the page.
      securityLevel: 'strict',
      theme: 'neutral',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    });
    return mermaid;
  });
  return loading;
}

let counter = 0;

/**
 * Fills in every diagram that has not been drawn yet.
 *
 * Keyed by the source text: the preview reuses its DOM between renders, so a
 * figure whose description has not changed keeps the SVG it already has instead
 * of being redrawn on every keystroke.
 */
export async function drawDiagrams(root: HTMLElement): Promise<void> {
  const pending = [...root.querySelectorAll<HTMLElement>('.mermaid-figure')].filter(
    (figure) => figure.dataset.drawn !== figure.dataset.mermaid,
  );
  if (!pending.length) return;

  let mermaid: Mermaid;
  try {
    mermaid = await load();
  } catch {
    for (const figure of pending) fail(figure, 'Diagrams need to be fetched once, while online');
    return;
  }

  for (const figure of pending) {
    const source = figure.dataset.mermaid ?? '';
    try {
      const { svg } = await mermaid.render(`lipi-mermaid-${(counter += 1)}`, source);
      figure.innerHTML = svg;
      figure.dataset.drawn = source;
      figure.classList.remove('is-broken');
    } catch (error) {
      fail(figure, error instanceof Error ? error.message : String(error));
      figure.dataset.drawn = source;
    }
  }
}

/** Shows the description and what was wrong with it, rather than nothing. */
function fail(figure: HTMLElement, message: string): void {
  const source = figure.dataset.mermaid ?? '';
  figure.classList.add('is-broken');
  figure.innerHTML = '';

  const pre = document.createElement('pre');
  pre.className = 'mermaid-pending';
  pre.textContent = source;

  const note = document.createElement('figcaption');
  note.className = 'mermaid-error';
  note.textContent = message.split('\n')[0].slice(0, 160);

  figure.append(pre, note);
}

/** The drawn SVG of every diagram, for an export to carry. */
export function diagramSvgs(root: HTMLElement): Map<string, string> {
  const out = new Map<string, string>();
  for (const figure of root.querySelectorAll<HTMLElement>('.mermaid-figure')) {
    const svg = figure.querySelector('svg');
    if (svg && figure.dataset.mermaid) out.set(figure.dataset.mermaid, svg.outerHTML);
  }
  return out;
}
