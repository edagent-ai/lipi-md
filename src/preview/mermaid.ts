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
  loading ??= import('mermaid').then((module) => module.default ?? module) as Promise<Mermaid>;
  return loading;
}

/**
 * The document's own colours, read off the page it is being drawn on.
 *
 * A diagram that ignored the theme would be a white card sitting in the middle
 * of a dark page — the one thing on it that had not been asked. Mermaid cannot
 * read CSS variables itself, so the values are resolved here and handed over as
 * a palette.
 */
function paletteOf(root: HTMLElement): Record<string, string> {
  /* Resolved through the browser rather than read as text. A custom property
     comes back as whatever was written — `--doc-muted` is a `color-mix(…)`
     expression — and Mermaid takes these apart to shade them, so it needs real
     colours. Painting each onto a throwaway element makes the browser do the
     resolving. */
  const probe = document.createElement('span');
  probe.style.display = 'none';
  root.append(probe);

  /* Flattened onto a canvas rather than passed along as written. The browser
     resolves a `color-mix(…)` to `color(srgb … / 0.68)`, which Mermaid's colour
     library refuses outright — every themed diagram failed to draw — and a
     translucent value would be wrong here anyway, since Mermaid shades these
     rather than compositing them. Painting the colour over the page gives the
     opaque value a reader actually sees. */
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const flat = canvas.getContext('2d', { willReadFrequently: true });

  const resolve = (expression: string, fallback: string, over?: string): string => {
    probe.style.color = '';
    probe.style.color = expression;
    const value = getComputedStyle(probe).color;
    if (!value || value === 'rgba(0, 0, 0, 0)') return fallback;
    if (!flat) return value;
    try {
      flat.clearRect(0, 0, 1, 1);
      flat.fillStyle = over ?? '#ffffff';
      flat.fillRect(0, 0, 1, 1);
      flat.fillStyle = value;
      flat.fillRect(0, 0, 1, 1);
      const [r, g, b] = flat.getImageData(0, 0, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return fallback;
    }
  };

  const bg = resolve('var(--doc-bg, var(--bg-preview))', 'rgb(255, 255, 255)');
  const fg = resolve('var(--doc-fg, var(--fg))', 'rgb(17, 17, 17)', bg);
  const muted = resolve('var(--doc-muted, var(--fg-muted))', 'rgb(102, 102, 102)', bg);
  const border = resolve('var(--doc-border, var(--border))', 'rgb(204, 204, 204)', bg);
  const surface = resolve('var(--doc-code-bg, var(--code-bg))', 'rgb(244, 244, 244)', bg);
  const accent = resolve('var(--doc-accent, var(--accent))', 'rgb(51, 85, 187)', bg);

  const css = getComputedStyle(root);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  probe.remove();

  return {
    background: bg,
    mainBkg: surface,
    primaryColor: surface,
    primaryTextColor: fg,
    primaryBorderColor: border,
    secondaryColor: surface,
    secondaryTextColor: fg,
    secondaryBorderColor: border,
    tertiaryColor: bg,
    tertiaryTextColor: fg,
    tertiaryBorderColor: border,
    lineColor: muted,
    textColor: fg,
    nodeTextColor: fg,
    titleColor: fg,
    // Sequence diagrams and notes have their own names for the same things.
    actorBkg: surface,
    actorBorder: border,
    actorTextColor: fg,
    signalColor: muted,
    signalTextColor: fg,
    labelBoxBkgColor: surface,
    labelBoxBorderColor: border,
    labelTextColor: fg,
    loopTextColor: fg,
    noteBkgColor: surface,
    noteBorderColor: accent,
    noteTextColor: fg,
    fontFamily: read('--doc-font', 'ui-sans-serif, system-ui, sans-serif'),
  };
}

let counter = 0;
/** What the palette was last configured as, so it is only re-applied when it moves. */
let appliedPalette = '';

/**
 * Fills in every diagram that has not been drawn yet.
 *
 * Keyed by the source text: the preview reuses its DOM between renders, so a
 * figure whose description has not changed keeps the SVG it already has instead
 * of being redrawn on every keystroke.
 */
export async function drawDiagrams(root: HTMLElement): Promise<void> {
  const figures = [...root.querySelectorAll<HTMLElement>('.mermaid-figure')];
  if (!figures.length) return;

  const palette = paletteOf(root);
  const key = JSON.stringify(palette);

  // A diagram is redrawn when its description changes *or* when the page it
  // sits on changes colour, which is why the mark records both.
  const pending = figures.filter((figure) => figure.dataset.drawn !== `${key}\u0000${figure.dataset.mermaid}`);
  if (!pending.length) return;

  let mermaid: Mermaid;
  try {
    mermaid = await load();
  } catch {
    for (const figure of pending) fail(figure, 'Diagrams need to be fetched once, while online');
    return;
  }

  if (appliedPalette !== key) {
    mermaid.initialize({
      startOnLoad: false,
      // Mermaid sanitises what it produces; strict also refuses the HTML
      // labels that would let a diagram smuggle markup into the page.
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: palette,
    });
    appliedPalette = key;
  }

  for (const figure of pending) {
    const source = figure.dataset.mermaid ?? '';
    try {
      const { svg } = await mermaid.render(`lipi-mermaid-${(counter += 1)}`, source);
      figure.innerHTML = svg;
      figure.classList.remove('is-broken');
    } catch (error) {
      fail(figure, error instanceof Error ? error.message : String(error));
    }
    figure.dataset.drawn = `${key}\u0000${source}`;
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
