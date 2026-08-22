import { renderStatic, type DocDates, type TranslitEnv } from '../markdown';
import { styleDeclarations, type DocStyle } from '../markdown/docstyle';
import { escapeHtml } from '../lib/util';

/**
 * A self-contained page: rendered Markdown with the transliteration already
 * applied, so the exported file reads correctly anywhere — no fonts to install,
 * no scripts to run. Sketches are exported as their source, since a static page
 * has no sandbox to run them in.
 */
const EXPORT_CSS = `
:root {
  --fg: #1b1f24; --fg-muted: #59636e; --bg: #ffffff; --border: #d8dee4;
  --accent: #2f6feb; --code-bg: #f5f7fa;
  color-scheme: light dark;
  --font-serif: ui-serif, Georgia, "Times New Roman", serif;
  --font-ui: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --font-reading: Verdana, Tahoma, "Trebuchet MS", "DejaVu Sans", ui-sans-serif, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root { --fg: #e7ecf2; --fg-muted: #9aa6b2; --bg: #0e1116; --border: #262c36;
          --accent: #6ea8fe; --code-bg: #161b22; }
}
* { box-sizing: border-box; }
body {
  margin: 0 auto; padding: clamp(24px, 6vw, 48px) clamp(16px, 5vw, 24px) 96px;
  max-width: var(--doc-measure, 46rem);
  background: var(--doc-bg, var(--bg)); color: var(--doc-fg, var(--fg));
  font-family: var(--doc-font, ui-serif, Georgia, "Times New Roman", serif);
  font-size: var(--doc-size, clamp(15px, 0.95rem + 0.15vw, 17px));
  line-height: var(--doc-line-height, 1.7);
  letter-spacing: var(--doc-letter-spacing, normal);
  word-spacing: var(--doc-word-spacing, normal);
  text-align: var(--doc-align, start);
  -webkit-text-size-adjust: 100%;
}
pre, code, table, figcaption { text-align: initial; }
/* Long URLs and unbroken strings must not force the page to scroll sideways. */
p, li, blockquote, td, th, figcaption { overflow-wrap: anywhere; }
h1, h2, h3, h4, h5, h6 {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.25; margin: 2em 0 .6em; font-weight: 700;
  color: var(--doc-fg, var(--fg));
}
/* Headings scale with the viewport, so a phone is not given desktop type. */
h1 { font-size: clamp(1.55rem, 1.15rem + 1.9vw, 2rem); margin-top: 0; }
h1, h2, h3, h4, h5, h6 { text-align: start; }
h2 { font-size: clamp(1.28rem, 1.05rem + 1.1vw, 1.5rem);
     border-bottom: 1px solid var(--doc-border, var(--border)); padding-bottom: .3em; }
h3 { font-size: clamp(1.1rem, 1rem + 0.5vw, 1.2rem); }
p, ul, ol, blockquote, table, figure { margin: 0 0 1.1em; }
a { color: var(--doc-accent, var(--accent)); }
blockquote {
  margin-left: 0; padding: .2em 0 .2em 1.1em;
  border-left: 3px solid var(--doc-border, var(--border)); color: var(--doc-muted, var(--fg-muted));
}
hr { border: none; border-top: 1px solid var(--doc-border, var(--border)); margin: 2.4em 0; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .88em; }
code { background: var(--doc-code-bg, var(--code-bg)); padding: .15em .35em; border-radius: 4px; }
pre { background: var(--doc-code-bg, var(--code-bg)); padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
figure.code-block { margin: 0 0 1.1em; border: 1px solid var(--doc-border, var(--border)); border-radius: 10px; overflow: hidden; }
figure.code-block figcaption {
  font: 600 11px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .04em;
  text-transform: uppercase; color: var(--doc-muted, var(--fg-muted));
  padding: 8px 12px; border-bottom: 1px solid var(--doc-border, var(--border)); background: var(--doc-code-bg, var(--code-bg));
}
figure.code-block pre { margin: 0; border-radius: 0; }
figure.code-block button { display: none; }
/* A wide table scrolls within its own focusable region instead of stretching
   the page; min-width stops columns from being crushed on a phone. */
.table-scroll { overflow-x: auto; margin: 0 0 1.1em; -webkit-overflow-scrolling: touch; }
table { border-collapse: collapse; width: 100%; min-width: 24rem; }
th, td { border: 1px solid var(--doc-border, var(--border)); padding: .5em .7em; text-align: left; }
th { background: var(--doc-code-bg, var(--code-bg)); }
img { max-width: 100%; height: auto; }
.lipi-tl, .lipi-block { font-family: inherit; letter-spacing: normal; word-spacing: normal; }
.lipi-block { margin: 1.4em 0; padding-left: 1em; border-left: 3px solid var(--accent); }
.tok-keyword, .tok-modifier { color: #cf222e; }
.tok-string, .tok-string2 { color: #0a3069; }
.tok-number, .tok-bool { color: #0550ae; }
.tok-comment { color: var(--fg-muted); font-style: italic; }
.tok-variableName { color: inherit; }
.tok-function { color: #8250df; }
@media (prefers-color-scheme: dark) {
  .tok-keyword, .tok-modifier { color: #ff7b72; }
  .tok-string, .tok-string2 { color: #a5d6ff; }
  .tok-number, .tok-bool { color: #79c0ff; }
  .tok-function { color: #d2a8ff; }
}
figure.sketch { margin: 0 0 1.3em; text-align: center; }
figure.sketch img {
  max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: 10px;
}
p.doc-byline {
  margin: -.4em 0 1.6em; font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .9em; color: var(--doc-muted, var(--fg-muted));
}
.doc-byline-label { font-weight: 600; opacity: .75; }
.doc-version { font-size: .82em; font-variant-numeric: tabular-nums; letter-spacing: .02em; opacity: .85; }
figure.sketch figcaption {
  margin-top: .5em; font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; color: var(--fg-muted);
}
/* Maths is exported as MathML: no stylesheet and no webfonts needed, so the
   file stays self-contained. */
.math-block { margin: 1.5em 0; overflow-x: auto; text-align: center; }
math { font-size: 1.05em; }

.sidenote-ref {
  cursor: pointer; color: var(--doc-accent, var(--accent));
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .72em; font-weight: 650; vertical-align: super; line-height: 0; padding: 0 .15em;
}
.sidenote-toggle { display: none; }
.sidenote {
  display: none; font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .82em; line-height: 1.55; color: var(--doc-muted, var(--fg-muted)); text-align: start;
}
.sidenote-num { margin-right: .4em; color: var(--doc-accent, var(--accent)); font-weight: 650; }
.sidenote-toggle:checked + .sidenote {
  display: block; margin: .6em 0 .9em; padding: .6em .9em;
  border-left: 3px solid var(--border); background: var(--code-bg); border-radius: 0 6px 6px 0;
}
@media (min-width: 1200px) {
  .sidenote, .sidenote-toggle:checked + .sidenote {
    display: block; float: right; clear: right; width: 13rem;
    margin: .3rem -15rem .8rem 1.5rem; padding: 0; border: none; background: none;
  }
}

.media { margin: 1.6em 0; }
.media img, .media video, .media audio {
  display: block; max-width: 100%; height: auto; margin: 0 auto; border-radius: 10px;
}
.media audio { width: 100%; }
.media-embed {
  position: relative; aspect-ratio: 16 / 9; width: 100%;
  border-radius: 10px; overflow: hidden; background: var(--code-bg);
}
.media-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.media figcaption {
  margin-top: .55em; font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .83em; color: var(--doc-muted, var(--fg-muted)); text-align: center;
}

/* Chrome does render @page margin boxes, so the running header and footer can
   be described here rather than faked with fixed elements. */
@page {
  margin: 20mm 16mm;
  @top-left { content: var(--pdf-title); font: 9pt ui-sans-serif, system-ui, sans-serif; color: #555; }
  @top-right { content: counter(page) " / " counter(pages); font: 9pt ui-sans-serif, system-ui, sans-serif; color: #555; }
  @bottom-left { content: var(--pdf-author); font: 9pt ui-sans-serif, system-ui, sans-serif; color: #555; }
}
@media print {
  /* Printers get the light palette; a dark page would flood the paper with ink. */
  :root {
    --fg: #111; --fg-muted: #555; --bg: #fff; --border: #ccc;
    --accent: #14459c; --code-bg: #f4f4f4;
  }
  body { max-width: none; padding: 0; background: #fff; color: #111; }
  a { color: inherit; text-decoration: none; }

  /* Keep sections intact across page boundaries. A section longer than a page
     must still split, but a heading never strands at the foot of one, and no
     block is torn in half. */
  h1, h2, h3, h4, h5, h6 { break-after: avoid; break-inside: avoid; }
  h1 + *, h2 + *, h3 + *, h4 + * { break-before: avoid; }
  p, li, blockquote { orphans: 3; widows: 3; }
  li, .table-scroll, .media, .math-block, .sidenote, figure.sketch { break-inside: avoid; }
  .table-scroll { overflow: visible; }
  /* Every sidenote is shown on paper — a reader cannot click to reveal one. */
  .sidenote, .sidenote-toggle:checked + .sidenote {
    display: block; float: none; width: auto;
    margin: .5em 0 .8em 1.5em; padding: 0 0 0 .8em;
    border-left: 2px solid #bbb; background: none;
  }
  .media-embed { display: none; }
  table { min-width: 0; }
  figure, pre, table, blockquote { break-inside: avoid; }
  .tok-keyword, .tok-string, .tok-number, .tok-function, .tok-comment { color: #333 !important; }
}
`.trim();

/** Quotes a value for use inside a CSS `content:` string. */
const cssString = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export function exportHtml(
  title: string,
  source: string,
  translit: TranslitEnv,
  sketches: Record<string, string> = {},
  style: DocStyle = {},
  meta: { author?: string; date?: string } = {},
  dates: DocDates = {},
): string {
  const docVars = styleDeclarations(style);
  // Running header and footer text, read by the @page margin boxes above.
  const pdfVars = [
    `  --pdf-title: ${cssString(title)};`,
    `  --pdf-author: ${cssString([meta.author, meta.date].filter(Boolean).join(' · '))};`,
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="generator" content="lipi.md">
<style>
${EXPORT_CSS}
${`:root {\n${pdfVars}${docVars ? `\n${docVars}` : ''}\n}`}
</style>
</head>
<body>
${renderStatic(source, translit, sketches, dates)}
</body>
</html>
`;
}
