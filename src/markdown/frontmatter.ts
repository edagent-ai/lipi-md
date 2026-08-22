import type { MarkdownIt, StateBlock } from 'markdown-it';

export interface Frontmatter {
  title?: string;
  /** Target script for `:::lipi` blocks and bare `@(…)` macros. */
  script?: string;
  /** Roman scheme the document is written in. */
  scheme?: string;
}

/**
 * Deliberately not a YAML parser — just `key: value` lines. Anything richer
 * would be a dependency and a footgun for the non-technical audience.
 */
export function parseFrontmatter(src: string): Frontmatter {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(src);
  if (!m) return {};

  const out: Frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/.exec(line);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].replace(/^["']|["']$/g, '');
    if (!value) continue;
    if (key === 'title') out.title = value;
    else if (key === 'script' || key === 'lang' || key === 'language') out.script = value;
    else if (key === 'scheme' || key === 'input') out.scheme = value;
  }
  return out;
}

/**
 * Consumes the frontmatter block so it never reaches the preview, while leaving
 * every following line's number untouched for scroll sync.
 */
export function frontmatterPlugin(md: MarkdownIt): void {
  md.block.ruler.before(
    'table',
    'lipi_frontmatter',
    (state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean => {
      if (startLine !== 0) return false;
      if (state.sCount[startLine] !== 0) return false;

      const open = state.src.slice(state.bMarks[0], state.eMarks[0]).trim();
      if (open !== '---') return false;

      let line = startLine + 1;
      for (; line < endLine; line++) {
        const text = state.src.slice(state.bMarks[line], state.eMarks[line]).trim();
        if (text === '---' || text === '...') break;
      }
      if (line >= endLine) return false;
      if (silent) return true;

      const token = state.push('lipi_frontmatter', '', 0);
      token.map = [startLine, line + 1];
      token.hidden = true;
      state.line = line + 1;
      return true;
    },
    { alt: [] },
  );

  md.renderer.rules.lipi_frontmatter = () => '';
}
