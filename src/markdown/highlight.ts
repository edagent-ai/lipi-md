import { classHighlighter, highlightTree } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import type { Parser } from '@lezer/common';
import { escapeHtml } from '../lib/util';

/**
 * Static code blocks reuse the editor's own Lezer grammars, so highlighting
 * costs no extra dependency and always matches what CodeMirror shows.
 */
let jsParser: Parser | undefined;
let tsParser: Parser | undefined;
let mdParser: Parser | undefined;

function parserFor(lang: string): Parser | undefined {
  switch (lang.toLowerCase()) {
    case 'js':
    case 'jsx':
    case 'javascript':
    case 'mjs':
    case 'cjs':
    case 'p5':
    case 'p5js':
    case 'anime':
    case 'animejs':
    case 'canvas':
    case 'json':
      return (jsParser ??= javascript({ jsx: true }).language.parser);
    case 'ts':
    case 'tsx':
    case 'typescript':
      return (tsParser ??= javascript({ jsx: true, typescript: true }).language.parser);
    case 'md':
    case 'markdown':
      return (mdParser ??= markdown().language.parser);
    default:
      return undefined;
  }
}

export function highlightCode(code: string, lang: string): string {
  const parser = parserFor(lang);
  if (!parser) return escapeHtml(code);

  let out = '';
  let pos = 0;
  try {
    const tree = parser.parse(code);
    highlightTree(tree, classHighlighter, (from, to, classes) => {
      if (from > pos) out += escapeHtml(code.slice(pos, from));
      out += `<span class="${classes}">${escapeHtml(code.slice(from, to))}</span>`;
      pos = to;
    });
  } catch {
    return escapeHtml(code);
  }
  return out + escapeHtml(code.slice(pos));
}
