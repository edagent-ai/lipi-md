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
  font: 'serif' | 'sans' | 'mono' | 'reading';
  align?: 'left' | 'justify';
  /** Typographic loosening, used by the dyslexia-friendly preset. */
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  measure?: string;
  size?: string;
  background: string;
  color: string;
  accent: string;
  /** Headings, when they should not simply follow the body ink. */
  heading?: string;
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
    blurb: 'Green monospace on near-black',
    font: 'mono',
    size: '15px',
    background: '#0d1117',
    // Headings are left to follow the body, so the whole page is one green.
    color: '#7ee787',
    accent: '#39d353',
    codeBg: '#161b22',
    border: '#28412e',
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
  academic: {
    label: 'Academic',
    blurb: 'White page, justified serif — a journal article',
    font: 'serif',
    // Justified with a short measure and open leading: the shape a paper is
    // read in, and narrow enough that justification does not open rivers.
    align: 'justify',
    measure: '40rem',
    size: '16.5px',
    lineHeight: '1.72',
    background: '#ffffff',
    color: '#1a1a1a',
    accent: '#7a1f2b',
    codeBg: '#f3f3f3',
    border: '#d6d6d6',
  },
  technical: {
    label: 'Technical',
    blurb: 'Dark grey page, white text, purple headings — specifications and reports',
    font: 'sans',
    // Wider than prose wants, because this is the theme for documents carrying
    // tables, code and figures that a 46rem column would crush.
    align: 'left',
    measure: '52rem',
    size: '15.5px',
    lineHeight: '1.62',
    background: '#22262c',
    color: '#ffffff',
    heading: '#c4a7ff',
    accent: '#6fd3e6',
    codeBg: '#1a1e23',
    border: '#3a424c',
  },
  dyslexic: {
    label: 'Dyslexia-friendly',
    blurb: 'OpenDyslexic, loose spacing, cream page, never justified',
    font: 'reading',
    // Every value here follows common dyslexia typography guidance: a plain
    // sans face, larger text, generous line and letter spacing, a short
    // measure, ragged-right lines, and an off-white page rather than a glaring
    // white one.
    align: 'left',
    size: '19px',
    measure: '38rem',
    lineHeight: '1.9',
    letterSpacing: '0.035em',
    wordSpacing: '0.16em',
    background: '#fbf7ee',
    color: '#33302b',
    accent: '#0f5c8c',
    codeBg: '#f1ebdd',
    border: '#ddd4c2',
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
