import { renderStatic, type TranslitEnv } from '../markdown';
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
}
@media (prefers-color-scheme: dark) {
  :root { --fg: #e7ecf2; --fg-muted: #9aa6b2; --bg: #0e1116; --border: #262c36;
          --accent: #6ea8fe; --code-bg: #161b22; }
}
* { box-sizing: border-box; }
body {
  margin: 0 auto; padding: clamp(24px, 6vw, 48px) clamp(16px, 5vw, 24px) 96px;
  max-width: 46rem;
  background: var(--bg); color: var(--fg);
  font: clamp(15px, 0.95rem + 0.15vw, 17px)/1.7 ui-serif, Georgia, "Times New Roman", serif;
  -webkit-text-size-adjust: 100%;
}
/* Long URLs and unbroken strings must not force the page to scroll sideways. */
p, li, blockquote, td, th, figcaption { overflow-wrap: anywhere; }
h1, h2, h3, h4, h5, h6 {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.25; margin: 2em 0 .6em; font-weight: 700;
}
/* Headings scale with the viewport, so a phone is not given desktop type. */
h1 { font-size: clamp(1.55rem, 1.15rem + 1.9vw, 2rem); margin-top: 0; }
h2 { font-size: clamp(1.28rem, 1.05rem + 1.1vw, 1.5rem);
     border-bottom: 1px solid var(--border); padding-bottom: .3em; }
h3 { font-size: clamp(1.1rem, 1rem + 0.5vw, 1.2rem); }
p, ul, ol, blockquote, table, figure { margin: 0 0 1.1em; }
a { color: var(--accent); }
blockquote {
  margin-left: 0; padding: .2em 0 .2em 1.1em;
  border-left: 3px solid var(--border); color: var(--fg-muted);
}
hr { border: none; border-top: 1px solid var(--border); margin: 2.4em 0; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .88em; }
code { background: var(--code-bg); padding: .15em .35em; border-radius: 4px; }
pre { background: var(--code-bg); padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
figure.code-block { margin: 0 0 1.1em; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
figure.code-block figcaption {
  font: 600 11px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .04em;
  text-transform: uppercase; color: var(--fg-muted);
  padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--code-bg);
}
figure.code-block pre { margin: 0; border-radius: 0; }
figure.code-block button { display: none; }
/* A wide table scrolls within its own focusable region instead of stretching
   the page; min-width stops columns from being crushed on a phone. */
.table-scroll { overflow-x: auto; margin: 0 0 1.1em; -webkit-overflow-scrolling: touch; }
table { border-collapse: collapse; width: 100%; min-width: 24rem; }
th, td { border: 1px solid var(--border); padding: .5em .7em; text-align: left; }
th { background: var(--code-bg); }
img { max-width: 100%; height: auto; }
.lipi-tl, .lipi-block { font-family: inherit; }
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
figure.sketch figcaption {
  margin-top: .5em; font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; color: var(--fg-muted);
}
@page { margin: 18mm 16mm; }
@media print {
  /* Printers get the light palette; a dark page would flood the paper with ink. */
  :root {
    --fg: #111; --fg-muted: #555; --bg: #fff; --border: #ccc;
    --accent: #14459c; --code-bg: #f4f4f4;
  }
  body { max-width: none; padding: 0; background: #fff; color: #111; }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3, h4 { break-after: avoid; }
  .table-scroll { overflow: visible; }
  table { min-width: 0; }
  figure, pre, table, blockquote { break-inside: avoid; }
  .tok-keyword, .tok-string, .tok-number, .tok-function, .tok-comment { color: #333 !important; }
}
`.trim();

/**
 * markdown-it emits a bare `<table>`; wrapping it here (rather than in a shared
 * renderer rule) keeps the in-app preview markup unchanged.
 */
function wrapTables(html: string): string {
  return html
    .replace(/<table(\s[^>]*)?>/g, '<div class="table-scroll" role="region" tabindex="0"><table$1>')
    .replace(/<\/table>/g, '</table></div>');
}

export function exportHtml(
  title: string,
  source: string,
  translit: TranslitEnv,
  sketches: Record<string, string> = {},
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="generator" content="lipi.md">
<style>
${EXPORT_CSS}
</style>
</head>
<body>
${wrapTables(renderStatic(source, translit, sketches))}
</body>
</html>
`;
}
