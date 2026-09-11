import type { MarkdownIt, StateBlock } from 'markdown-it';

/**
 * `\newpage` on a line of its own starts a new page when the document is
 * printed or exported as a PDF.
 *
 * The spelling is borrowed from LaTeX, by way of Pandoc, because the people who
 * want to break a page by hand are usually the same people already writing
 * `\frac` and `\sqrt` a few lines above. `\pagebreak` is accepted too, since
 * both are in common use and guessing wrong should not silently do nothing.
 *
 * It marks the place rather than doing the breaking: the rendered element
 * carries no height and only means something to `break-after` in print. On
 * screen it is drawn as a faint rule, so a writer can see where the page will
 * fall instead of finding out at the printer.
 */
const MARKER = /^\\(newpage|pagebreak)\s*$/;

function pageBreak(state: StateBlock, startLine: number, _endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];

  // Cheap rejection first: every other block rule has to get past this one.
  if (state.src.charCodeAt(start) !== 0x5c /* \ */) return false;
  if (!MARKER.test(state.src.slice(start, max))) return false;
  if (silent) return true;

  const token = state.push('lipi_pagebreak', 'div', 0);
  token.map = [startLine, startLine + 1];
  token.markup = state.src.slice(start, max).trim();
  token.block = true;

  state.line = startLine + 1;
  return true;
}

export function pageBreakPlugin(md: MarkdownIt): void {
  // Before `paragraph`, which would otherwise swallow the line as text.
  md.block.ruler.before('paragraph', 'lipi_pagebreak', pageBreak, {
    alt: ['paragraph', 'blockquote', 'list'],
  });

  md.renderer.rules.lipi_pagebreak = (tokens, idx) => {
    const line = tokens[idx].attrGet('data-line');
    return (
      `<div class="page-break"${line ? ` data-line="${line}"` : ''}` +
      ` role="separator" aria-label="Page break"></div>\n`
    );
  };
}
