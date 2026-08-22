import type { MarkdownIt, StateBlock } from 'markdown-it';

export interface Frontmatter {
  title?: string;
  /** Target script for `:::lipi` blocks and bare `@(…)` macros. */
  script?: string;
  /** Roman scheme the document is written in. */
  scheme?: string;
  /** Document version, bumped on demand from the toolbar. */
  version?: string;
  /** Folder path, e.g. `Music/Carnatic`. At most three levels deep. */
  folder?: string;
  /** Shown as a byline under the title, and in the PDF footer. */
  author?: string;
  /** Shown beside the author. Free text — no date parsing is imposed. */
  date?: string;
  /** A web address for the byline; links the author's name when both are set. */
  link?: string;
  /** Every key as written, for presentation settings (see `docstyle.ts`). */
  raw: Record<string, string>;
}

/**
 * Deliberately not a YAML parser — just `key: value` lines. Anything richer
 * would be a dependency and a footgun for the non-technical audience.
 */
export function parseFrontmatter(src: string): Frontmatter {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(src);
  if (!m) return { raw: {} };

  const out: Frontmatter = { raw: {} };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/.exec(line);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].replace(/^["']|["']$/g, '');
    if (!value) continue;
    out.raw[key] = value;
    if (key === 'title') out.title = value;
    else if (key === 'script' || key === 'lang' || key === 'language') out.script = value;
    else if (key === 'scheme' || key === 'input') out.scheme = value;
    else if (key === 'version') out.version = value;
    else if (key === 'folder' || key === 'path') out.folder = value;
    else if (key === 'author' || key === 'by') out.author = value;
    else if (key === 'date') out.date = value;
    else if (key === 'link' || key === 'url' || key === 'website') out.link = value;
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

export const MAX_FOLDER_DEPTH = 3;

/**
 * Cleans a user-typed folder path: trims each level, drops empties, strips
 * characters that would make the path ambiguous, and caps the depth. Returns an
 * empty string for the top level.
 */
export function normalizeFolder(raw: string): string {
  return raw
    .split('/')
    .map((part) => part.trim().replace(/[\\:*?"<>|]/g, '').slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_FOLDER_DEPTH)
    .join('/');
}

/**
 * Inserts or replaces a frontmatter key, creating the block when there is none.
 * Passing null removes the key. Kept as a text edit because a document's
 * metadata lives in the document.
 */
export function upsertFrontmatterKey(text: string, key: string, value: string | null): string {
  const front = /^---(\r?\n)([\s\S]*?)(\r?\n---)/.exec(text);
  const encoded = value !== null && /[:#]/.test(value) ? JSON.stringify(value) : value;

  if (!front) {
    if (value === null) return text;
    return `---\n${key}: ${encoded}\n---\n\n${text}`;
  }

  const bodyStart = 3 + front[1].length;
  const body = front[2];
  const line = new RegExp(`^([ \\t]*${key}[ \\t]*:[ \\t]*)(.*)$`, 'im').exec(body);

  if (line) {
    const from = bodyStart + line.index;
    if (value === null) {
      // Drop the whole line, including the newline that precedes it.
      const lineEnd = from + line[0].length;
      const cutFrom = from > bodyStart ? from - 1 : from;
      const cutTo = from > bodyStart ? lineEnd : Math.min(lineEnd + 1, bodyStart + body.length);
      return text.slice(0, cutFrom) + text.slice(cutTo);
    }
    const valueFrom = from + line[1].length;
    return text.slice(0, valueFrom) + encoded + text.slice(valueFrom + line[2].length);
  }

  if (value === null) return text;
  const at = bodyStart + body.length;
  return `${text.slice(0, at)}\n${key}: ${encoded}${text.slice(at)}`;
}
