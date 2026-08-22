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
  theme?: string;
}

const FONT_STACKS: Record<string, string> = {
  serif: 'var(--font-serif)',
  sans: 'var(--font-ui)',
  mono: 'var(--font-mono)',
  system: 'var(--font-ui)',
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
      }
    : {};

  const font = pick('font', 'typeface')?.toLowerCase();
  if (font && FONT_STACKS[font]) style.font = FONT_STACKS[font];

  const align = pick('align', 'text-align')?.toLowerCase();
  if (align && ALIGN.has(align)) style.align = align;

  const background = pick('background', 'bg', 'paper');
  if (background) style.background = safeColor(background);

  const color = pick('color', 'text', 'ink');
  if (color) style.color = safeColor(color);

  const accent = pick('accent', 'link');
  if (accent) style.accent = safeColor(accent);

  const width = pick('width', 'measure')?.toLowerCase();
  if (width) style.measure = MEASURE[width] ?? safeLength(width);

  const size = pick('size', 'font-size');
  if (size) style.size = safeLength(size);

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
    ...style,
  };
}
