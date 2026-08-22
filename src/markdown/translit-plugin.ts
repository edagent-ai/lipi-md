import type { MarkdownIt, RendererRule, StateBlock, StateCore, StateInline } from 'markdown-it';
import { transliterate } from '../translit';
import { langTag, resolveScript, scriptLabel } from '../translit/schemes';
import { escapeHtml } from '../lib/util';

export interface TranslitEnv {
  /** Roman scheme the author types in. */
  sourceScheme: string;
  /** Script that `:::lipi` and bare `@(…)` resolve to. */
  defaultScript: string;
}

const AT = 0x40;
const BACKSLASH = 0x5c;
const LPAREN = 0x28;
const RPAREN = 0x29;
const NEWLINE = 0x0a;
const COLON = 0x3a;

const MACRO_HEAD = /^@([A-Za-z_][\w]*)?(?::([A-Za-z_][\w]*))?\(/;

function envOf(env: unknown): TranslitEnv {
  const e = (env ?? {}) as { translit?: TranslitEnv };
  return e.translit ?? { sourceScheme: 'optitrans', defaultScript: 'kannada' };
}

/** Scan to the paren matching `open`, honouring `\(` / `\)` escapes. */
function findClose(src: string, open: number, max: number): number {
  let depth = 1;
  let i = open + 1;
  while (i < max) {
    const c = src.charCodeAt(i);
    if (c === BACKSLASH) {
      i += 2;
      continue;
    }
    if (c === NEWLINE) return -1; // a macro never spans a line
    if (c === LPAREN) depth++;
    else if (c === RPAREN && --depth === 0) return i;
    i++;
  }
  return -1;
}

const unescapeParens = (s: string) => s.replace(/\\([()\\])/g, '$1');

/**
 * Inline macro: `@kannada(namaskaara)`, `@te:itrans(vandanamu)`, `@(…)`.
 *
 * A leading backslash needs no special handling here: `@` is CommonMark ASCII
 * punctuation, so markdown-it's own `escape` rule consumes `\@` first and this
 * rule simply never fires.
 */
function macroRule(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src.charCodeAt(pos) !== AT) return false;

  const head = MACRO_HEAD.exec(src.slice(pos, Math.min(pos + 64, state.posMax)));
  if (!head) return false;

  // `@:hk(…)` is meaningless — require a name or a bare `@(`.
  if (!head[1] && src.charCodeAt(pos + 1) === COLON) return false;

  const { sourceScheme, defaultScript } = envOf(state.env);
  const script = resolveScript(head[1] ?? 'lipi', defaultScript);
  if (!script) return false; // unknown name → leave the text alone

  const openParen = pos + head[0].length - 1;
  const close = findClose(src, openParen, state.posMax);
  if (close < 0) return false;

  if (!silent) {
    const source = unescapeParens(src.slice(openParen + 1, close));
    const from = head[2] ?? sourceScheme;
    const token = state.push('lipi_translit', '', 0);
    token.content = transliterate(source, from, script);
    token.meta = { source, script, from };
  }

  state.pos = close + 1;
  return true;
}

/** Block container: `:::kannada` … `:::` */
function containerRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(start, max);

  const open = /^:::[ \t]*([A-Za-z_][\w]*)(?::([A-Za-z_][\w]*))?[ \t]*$/.exec(line);
  if (!open) return false;

  const { sourceScheme, defaultScript } = envOf(state.env);
  const script = resolveScript(open[1], defaultScript);
  if (!script) return false;
  if (silent) return true;

  // Find the closing fence; an unterminated container runs to end of document
  // so the preview still updates while the user is mid-typing.
  let line_ = startLine + 1;
  let closed = false;
  for (; line_ < endLine; line_++) {
    const s = state.bMarks[line_] + state.tShift[line_];
    const text = state.src.slice(s, state.eMarks[line_]).trim();
    if (text === ':::') {
      closed = true;
      break;
    }
  }

  const oldParent = state.parentType;
  const oldLineMax = state.lineMax;
  state.parentType = 'lipi_container';
  state.lineMax = line_;

  const openToken = state.push('lipi_block_open', 'div', 1);
  openToken.markup = ':::';
  openToken.block = true;
  openToken.map = [startLine, line_];
  openToken.meta = { script, from: open[2] ?? sourceScheme };

  state.md.block.tokenize(state, startLine + 1, line_);

  const closeToken = state.push('lipi_block_close', 'div', -1);
  closeToken.markup = ':::';
  closeToken.block = true;

  state.parentType = oldParent;
  state.lineMax = oldLineMax;
  state.line = closed ? line_ + 1 : line_;
  return true;
}

/**
 * Walks the finished token stream and transliterates plain text inside
 * containers. Operating on tokens rather than raw source is what keeps links,
 * code spans and emphasis markers intact — only real prose is converted.
 */
function containerScan(state: StateCore): boolean {
  const stack: { script: string; from: string }[] = [];

  for (const token of state.tokens) {
    if (token.type === 'lipi_block_open') {
      stack.push(token.meta as { script: string; from: string });
      continue;
    }
    if (token.type === 'lipi_block_close') {
      stack.pop();
      continue;
    }
    if (!stack.length || token.type !== 'inline' || !token.children) continue;

    const { script, from } = stack[stack.length - 1];
    for (const child of token.children) {
      // `lipi_translit` children are already converted; code spans stay literal.
      if (child.type === 'text' && child.content) {
        child.content = transliterate(child.content, from, script);
      } else if (child.type === 'softbreak') {
        // These blocks exist for lyrics and verse, where a line ending is
        // meaningful — so newlines survive instead of being folded away.
        child.type = 'hardbreak';
        child.tag = 'br';
      }
    }
  }
  return true;
}

export function translitPlugin(md: MarkdownIt): void {
  md.inline.ruler.before('escape', 'lipi_macro', macroRule);
  md.block.ruler.before('fence', 'lipi_container', containerRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  md.core.ruler.push('lipi_container_scan', containerScan);

  const renderTranslit: RendererRule = (tokens, idx) => {
    const token = tokens[idx];
    const { source, script } = token.meta as { source: string; script: string };
    return (
      `<span class="lipi-tl" lang="${langTag(script)}" data-script="${escapeHtml(script)}"` +
      ` title="${escapeHtml(source)} → ${escapeHtml(scriptLabel(script))}">` +
      `${escapeHtml(token.content)}</span>`
    );
  };

  const renderBlockOpen: RendererRule = (tokens, idx) => {
    const { script } = tokens[idx].meta as { script: string };
    const lineAttr = tokens[idx].attrGet('data-line');
    return (
      `<div class="lipi-block" lang="${langTag(script)}" data-script="${escapeHtml(script)}"` +
      (lineAttr != null ? ` data-line="${escapeHtml(String(lineAttr))}"` : '') +
      '>\n'
    );
  };

  md.renderer.rules.lipi_translit = renderTranslit;
  md.renderer.rules.lipi_block_open = renderBlockOpen;
  md.renderer.rules.lipi_block_close = () => '</div>\n';
}
