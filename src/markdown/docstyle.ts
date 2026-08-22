import type { Frontmatter } from './frontmatter';
import { findTheme } from './themes';

/**
 * Presentation settings, read from a document's own frontmatter so styling
 * travels with the file rather than living in app preferences:
 *
 *   ---
 *   font: sans
 *   align: justify
 *   background: "#fffdf7"
 *   color: "#2b2b2b"
 *   accent: "#bf5700"
 *   width: wide
 *   size: 18px
 *   ---
 *
 * Values become CSS custom properties. Everything is validated against an
 * allowlist first: these strings end up inside a stylesheet, so an unchecked
 * value could close the rule and inject arbitrary CSS.
 */
export interface DocStyle {
  font?: string;
  align?: string;
  background?: string;
  color?: string;
  accent?: string;
  measure?: string;
  size?: string;
  /** Set by a preset only, so code blocks and rules match the page. */
  codeBg?: string;
  border?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  theme?: string;
}

const FONT_STACKS: Record<string, string> = {
  serif: 'var(--font-serif)',
  sans: 'var(--font-ui)',
  mono: 'var(--font-mono)',
  system: 'var(--font-ui)',
  reading: 'var(--font-reading)',
};

const ALIGN = new Set(['left', 'justify', 'center', 'right', 'start', 'end']);

const MEASURE: Record<string, string> = {
  narrow: '34rem',
  normal: '46rem',
  wide: '58rem',
  full: 'none',
};

/** `12px`, `1.2rem`, `80ch` … and nothing else. */
const LENGTH = /^\d+(\.\d+)?(px|rem|em|ch|pt)$/;

/**
 * Colours are checked with the browser's own parser where available, which
 * rejects anything that is not a single valid colour value. The regex fallback
 * covers non-DOM contexts (tests, SSR).
 */
const COLOR_FALLBACK = /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl)a?\([\d\s.,%/]+\))$/i;

function safeColor(value: string): string | undefined {
  const v = value.trim();
  // No structural CSS characters, ever — that is the injection route.
  if (/[;{}()]/.test(v) && !/^(rgb|hsl)a?\([^;{}]*\)$/i.test(v)) return undefined;
  if (v.length > 64) return undefined;

  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    return CSS.supports('color', v) ? v : undefined;
  }
  return COLOR_FALLBACK.test(v) ? v : undefined;
}

function safeLength(value: string): string | undefined {
  const v = value.trim();
  return LENGTH.test(v) ? v : undefined;
}

/**
 * Syntax-highlighting palettes chosen for the document's own page rather than
 * the app's light/dark setting. Without this, a dark-paged theme read inside a
 * light app draws dark tokens on a dark code block — the code is still there,
 * but invisible — and a light-paged theme does the reverse in a dark app.
 */
const SYN_LIGHT: Record<string, string> = {
  keyword: '#cf222e',
  string: '#0a3069',
  number: '#0550ae',
  comment: '#5b6673',
  fn: '#8250df',
  def: '#953800',
  type: '#116329',
  punct: '#5b6673',
};

const SYN_DARK: Record<string, string> = {
  keyword: '#ff7b72',
  string: '#a5d6ff',
  number: '#79c0ff',
  comment: '#9aa7b8',
  fn: '#d2a8ff',
  def: '#ffa657',
  type: '#7ee0c4',
  punct: '#8d99a8',
};

/** `#abc`, `#aabbcc`, `rgb(…)` — and, in a browser, anything CSS understands. */
function toRgb(value: string): [number, number, number] | undefined {
  const v = value.trim();

  const hex = v.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    const wide = hex.length >= 6;
    const at = (i: number) =>
      wide ? parseInt(hex.slice(i * 2, i * 2 + 2), 16) : parseInt(hex[i] + hex[i], 16);
    const rgb: [number, number, number] = [at(0), at(1), at(2)];
    return rgb.every((n) => Number.isFinite(n)) ? rgb : undefined;
  }

  const inside = v.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (inside) {
    const n = inside
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (n.length >= 3 && n.slice(0, 3).every((x) => Number.isFinite(x))) {
      return [n[0], n[1], n[2]];
    }
  }

  // Named colours and every other syntax: let the browser resolve it.
  if (typeof document === 'undefined') return undefined;
  try {
    const probe = document.createElement('span');
    probe.style.color = v;
    if (!probe.style.color) return undefined;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved === v ? undefined : toRgb(resolved);
  } catch {
    return undefined;
  }
}

/** Whether the surface code sits on reads as dark. */
function isDarkSurface(style: DocStyle): boolean | undefined {
  const surface = style.codeBg ?? style.background;
  if (!surface) return undefined;
  const rgb = toRgb(surface);
  if (!rgb) return undefined;

  const channel = (v: number) => {
    const f = v / 255;
    return f <= 0.03928 ? f / 12.92 : ((f + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]) < 0.4;
}

export function parseDocStyle(front: Frontmatter): DocStyle {
  const raw = front.raw ?? {};
  const pick = (...keys: string[]) => {
    for (const key of keys) if (raw[key]) return raw[key].trim();
    return undefined;
  };

  // A preset provides the base; individual keys written alongside it still win.
  const preset = findTheme(raw.theme);
  const style: DocStyle = preset
    ? {
        theme: raw.theme.trim().toLowerCase(),
        font: FONT_STACKS[preset.font],
        align: preset.align,
        measure: preset.measure,
        size: preset.size,
        background: preset.background,
        color: preset.color,
        accent: preset.accent,
        codeBg: preset.codeBg,
        border: preset.border,
        lineHeight: preset.lineHeight,
        letterSpacing: preset.letterSpacing,
        wordSpacing: preset.wordSpacing,
      }
    : {};

  const font = pick('font', 'typeface')?.toLowerCase();
  if (font && FONT_STACKS[font]) style.font = FONT_STACKS[font];

  const align = pick('align', 'text-align')?.toLowerCase();
  if (align && ALIGN.has(align)) style.align = align;

  // A value that fails validation is ignored rather than applied. Assigning
  // the `undefined` it returns would strip whatever the theme had set and
  // leave the page half-styled — a dark theme's pale ink stranded on the app's
  // light background, say, which is far worse than the typo it came from.
  const background = pick('background', 'bg', 'paper');
  if (background) style.background = safeColor(background) ?? style.background;

  const color = pick('color', 'text', 'ink');
  if (color) style.color = safeColor(color) ?? style.color;

  const accent = pick('accent', 'link');
  if (accent) style.accent = safeColor(accent) ?? style.accent;

  const width = pick('width', 'measure')?.toLowerCase();
  if (width) style.measure = MEASURE[width] ?? safeLength(width) ?? style.measure;

  const size = pick('size', 'font-size');
  if (size) style.size = safeLength(size) ?? style.size;

  return style;
}

/** CSS custom properties, for `style=` on the preview root. */
export function styleVars(style: DocStyle): Record<string, string> {
  const vars: Record<string, string> = {};
  if (style.font) vars['--doc-font'] = style.font;
  if (style.align) vars['--doc-align'] = style.align;
  if (style.background) vars['--doc-bg'] = style.background;
  if (style.color) vars['--doc-fg'] = style.color;
  if (style.accent) vars['--doc-accent'] = style.accent;
  if (style.measure) vars['--doc-measure'] = style.measure;
  if (style.size) vars['--doc-size'] = style.size;
  if (style.codeBg) vars['--doc-code-bg'] = style.codeBg;
  if (style.border) vars['--doc-border'] = style.border;
  if (style.lineHeight) vars['--doc-line-height'] = style.lineHeight;
  if (style.letterSpacing) vars['--doc-letter-spacing'] = style.letterSpacing;
  if (style.wordSpacing) vars['--doc-word-spacing'] = style.wordSpacing;
  // Code tokens follow the document's page rather than the app's theme, for
  // the same reason the muted colour below does.
  const dark = isDarkSurface(style);
  if (dark !== undefined) {
    const palette = dark ? SYN_DARK : SYN_LIGHT;
    for (const [token, value] of Object.entries(palette)) {
      vars[`--doc-syn-${token}`] = value;
    }
  }

  // Headings and secondary text are derived from the document's own ink, not
  // the app theme's — otherwise a dark page inside a light app renders its
  // headings in near-black on near-black.
  if (style.color) {
    vars['--doc-muted'] = `color-mix(in srgb, ${style.color} 68%, transparent)`;
  }
  return vars;
}

/** The same settings as a stylesheet block, for the standalone HTML export. */
export function styleDeclarations(style: DocStyle): string {
  return Object.entries(styleVars(style))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

export const hasDocStyle = (style: DocStyle) => Object.keys(styleVars(style)).length > 0;

/**
 * Applies an app-level default to a document that names no theme of its own.
 * A document's explicit keys always win, which is why this only fills gaps.
 */
export function withDefaultTheme(style: DocStyle, themeName: string): DocStyle {
  if (style.theme || !themeName) return style;
  const preset = findTheme(themeName);
  if (!preset) return style;

  return {
    theme: themeName,
    font: FONT_STACKS[preset.font],
    align: preset.align,
    measure: preset.measure,
    size: preset.size,
    background: preset.background,
    color: preset.color,
    accent: preset.accent,
    codeBg: preset.codeBg,
    border: preset.border,
    lineHeight: preset.lineHeight,
    letterSpacing: preset.letterSpacing,
    wordSpacing: preset.wordSpacing,
    ...style,
  };
}
