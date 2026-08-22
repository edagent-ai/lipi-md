import type { MarkdownIt, RendererRule, StateCore, StateInline } from 'markdown-it';

/**
 * Tufte-style sidenotes: `^[some aside]`.
 *
 * The note is emitted inline, right where it was written, and CSS floats it
 * into the margin on a wide page. On a narrow one it stays in the flow, which
 * is why the marker is a real numbered reference rather than pure decoration.
 */
const CARET = 0x5e;
const LBRACKET = 0x5b;
const BACKSLASH = 0x5c;

interface SidenoteEnv {
  sidenoteCount?: number;
}

function sidenoteRule(state: StateInline, silent: boolean): boolean {
  const { src, pos, posMax } = state;
  if (src.charCodeAt(pos) !== CARET || src.charCodeAt(pos + 1) !== LBRACKET) return false;
  if (pos > 0 && src.charCodeAt(pos - 1) === BACKSLASH) return false;

  // Balanced scan, so a sidenote may contain a Markdown link.
  let depth = 1;
  let end = -1;
  for (let i = pos + 2; i < posMax; i++) {
    const code = src.charCodeAt(i);
    if (code === BACKSLASH) {
      i++;
      continue;
    }
    if (code === LBRACKET) depth++;
    else if (code === 0x5d && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) return false;

  const inner = src.slice(pos + 2, end).trim();
  if (!inner) return false;

  if (!silent) {
    const env = state.env as SidenoteEnv;
    env.sidenoteCount = (env.sidenoteCount ?? 0) + 1;

    const token = state.push('lipi_sidenote', '', 0);
    token.meta = { index: env.sidenoteCount };
    token.children = [];
    // Nested inline parsing, so a note can hold emphasis, links or a macro.
    state.md.inline.parse(inner, state.md, state.env, token.children);
  }

  state.pos = end + 1;
  return true;
}

/** Numbering restarts per render, not per parse call. */
function resetCounter(state: StateCore): boolean {
  (state.env as SidenoteEnv).sidenoteCount = 0;
  return true;
}

export function sidenotePlugin(md: MarkdownIt): void {
  md.core.ruler.before('normalize', 'lipi_sidenote_reset', resetCounter);
  md.inline.ruler.before('escape', 'lipi_sidenote', sidenoteRule);

  const render: RendererRule = (tokens, idx, options, env, self) => {
    const { index } = tokens[idx].meta as { index: number };
    const body = self.renderInline(tokens[idx].children ?? [], options, env);
    return (
      `<span class="sidenote-wrap">` +
      `<label class="sidenote-ref" for="sn-${index}" role="doc-noteref">${index}</label>` +
      `<input type="checkbox" id="sn-${index}" class="sidenote-toggle" aria-hidden="true">` +
      `<small class="sidenote" role="doc-footnote">` +
      `<span class="sidenote-num" aria-hidden="true">${index}</span>${body}</small>` +
      `</span>`
    );
  };

  md.renderer.rules.lipi_sidenote = render;
}
