import type { MarkdownIt, RendererRule, StateBlock, StateInline } from 'markdown-it';
import { renderMath, type MathOutput } from '../math';

const DOLLAR = 0x24;
const BACKSLASH = 0x5c;

const outputOf = (env: unknown): MathOutput =>
  ((env as { mathOutput?: MathOutput } | undefined)?.mathOutput ?? 'html');

/**
 * Inline `$…$`.
 *
 * The delimiter is also a currency symbol, so this deliberately refuses to
 * match when it looks like money: the opening `$` must be followed by
 * non-space, the closing `$` preceded by non-space, and a closing `$` followed
 * by a digit is treated as a second price rather than a delimiter.
 */
function inlineMath(state: StateInline, silent: boolean): boolean {
  const { src, pos, posMax } = state;
  if (src.charCodeAt(pos) !== DOLLAR) return false;
  if (pos > 0 && src.charCodeAt(pos - 1) === BACKSLASH) return false;
  if (src.charCodeAt(pos + 1) === DOLLAR) return false;

  const first = src.charCodeAt(pos + 1);
  if (Number.isNaN(first) || /\s/.test(src[pos + 1] ?? ' ')) return false;

  let end = -1;
  for (let i = pos + 1; i < posMax; i++) {
    const code = src.charCodeAt(i);
    if (code === BACKSLASH) {
      i++;
      continue;
    }
    if (code === 0x0a) return false; // inline maths never spans a line
    if (code === DOLLAR && !/\s/.test(src[i - 1] ?? ' ')) {
      end = i;
      break;
    }
  }
  if (end < 0) return false;
  if (/\d/.test(src[end + 1] ?? '')) return false;

  const tex = src.slice(pos + 1, end);
  if (!tex.trim()) return false;

  if (!silent) {
    const token = state.push('math_inline', 'span', 0);
    token.content = tex;
  }
  state.pos = end + 1;
  return true;
}

/** Block `$$ … $$`, either on one line or spanning several. */
function blockMath(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const first = state.src.slice(start, max).trim();
  if (!first.startsWith('$$')) return false;
  if (silent) return true;

  // `$$ x = 1 $$` all on one line.
  const single = /^\$\$(.*)\$\$$/.exec(first);
  if (single && single[1].trim()) {
    const token = state.push('math_block', 'div', 0);
    token.content = single[1].trim();
    token.map = [startLine, startLine + 1];
    token.block = true;
    state.line = startLine + 1;
    return true;
  }

  let line = startLine;
  let closed = false;
  const body: string[] = [];
  const head = first.slice(2);
  if (head.trim()) body.push(head);

  while (++line < endLine) {
    const text = state.src
      .slice(state.bMarks[line] + state.tShift[line], state.eMarks[line])
      .replace(/\s+$/, '');
    if (text.trim().endsWith('$$')) {
      const tail = text.trim().slice(0, -2);
      if (tail.trim()) body.push(tail);
      closed = true;
      break;
    }
    body.push(text);
  }

  const token = state.push('math_block', 'div', 0);
  token.content = body.join('\n').trim();
  token.map = [startLine, line + 1];
  token.block = true;
  state.line = closed ? line + 1 : line;
  return true;
}

export function mathPlugin(md: MarkdownIt): void {
  md.inline.ruler.before('escape', 'lipi_math_inline', inlineMath);
  md.block.ruler.before('fence', 'lipi_math_block', blockMath, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  const inlineRule: RendererRule = (tokens, idx, _options, env) =>
    `<span class="math math-inline">${renderMath(tokens[idx].content, false, outputOf(env))}</span>`;

  const blockRule: RendererRule = (tokens, idx, _options, env) => {
    const line = tokens[idx].attrGet('data-line')?.toString();
    return (
      `<div class="math math-block"${line ? ` data-line="${line}"` : ''}>` +
      `${renderMath(tokens[idx].content, true, outputOf(env))}</div>\n`
    );
  };

  md.renderer.rules.math_inline = inlineRule;
  md.renderer.rules.math_block = blockRule;
}
