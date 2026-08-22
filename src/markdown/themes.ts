/**
 * Named presentation presets, chosen with `theme:` in a document's frontmatter.
 *
 * A theme is nothing more than a bundle of the same keys a document can set by
 * hand, so any individual key written alongside `theme:` still wins. Each one
 * fixes its own colours rather than following the app's light/dark setting —
 * choosing a theme is choosing paper, not a UI preference.
 */
export interface ThemePreset {
  label: string;
  blurb: string;
  font: 'serif' | 'sans' | 'mono';
  align?: 'left' | 'justify';
  measure?: string;
  size?: string;
  background: string;
  color: string;
  accent: string;
  codeBg: string;
  border: string;
}

export const THEMES: Record<string, ThemePreset> = {
  paper: {
    label: 'Paper',
    blurb: 'Warm cream, serif — a printed book',
    font: 'serif',
    background: '#fdf9f2',
    color: '#2c2924',
    accent: '#8f4100',
    codeBg: '#f2ebdd',
    border: '#e0d7c5',
  },
  manuscript: {
    label: 'Manuscript',
    blurb: 'Ochre and justified, for verse and lyric',
    font: 'serif',
    align: 'justify',
    background: '#f7f0e1',
    color: '#3a2f21',
    accent: '#9a5b1d',
    codeBg: '#efe5d0',
    border: '#ded0b4',
  },
  slate: {
    label: 'Slate',
    blurb: 'Cool dark, sans — easy at night',
    font: 'sans',
    background: '#12161c',
    color: '#dbe3ec',
    accent: '#6ea8fe',
    codeBg: '#1b212b',
    border: '#2a323d',
  },
  terminal: {
    label: 'Terminal',
    blurb: 'Monospace on near-black',
    font: 'mono',
    size: '15px',
    background: '#0d1117',
    color: '#c9d1d9',
    accent: '#3fb950',
    codeBg: '#161b22',
    border: '#232b34',
  },
  blueprint: {
    label: 'Blueprint',
    blurb: 'Cool blue-white, technical',
    font: 'sans',
    background: '#f4f7fb',
    color: '#16283d',
    accent: '#1f5fb0',
    codeBg: '#e7eef7',
    border: '#d2deeb',
  },
  contrast: {
    label: 'High contrast',
    blurb: 'Large black-on-white, for presenting',
    font: 'sans',
    size: '19px',
    measure: '40rem',
    background: '#ffffff',
    color: '#000000',
    accent: '#0b34c4',
    codeBg: '#f0f0f0',
    border: '#767676',
  },
};

export const THEME_NAMES = Object.keys(THEMES);

export const findTheme = (name: string | undefined): ThemePreset | undefined =>
  name ? THEMES[name.trim().toLowerCase()] : undefined;
