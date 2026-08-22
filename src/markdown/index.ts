import MarkdownItCtor from 'markdown-it';
import type { MarkdownIt, StateCore, Token } from 'markdown-it';
import { frontmatterPlugin, parseFrontmatter, type Frontmatter } from './frontmatter';
import { translitPlugin, type TranslitEnv } from './translit-plugin';
import { runSpecFor, parseInfo, RUNTIME_LABEL, type RunSpec } from './fence';
import { highlightCode } from './highlight';
import { escapeHtml, slugify } from '../lib/util';

export type Segment =
  | { kind: 'html'; key: string; html: string }
  | { kind: 'run'; key: string; spec: RunSpec; code: string; line: number };

export interface Heading {
  level: number;
  text: string;
  id: string;
  line: number;
}

export interface BuildResult {
  segments: Segment[];
  headings: Heading[];
  frontmatter: Frontmatter;
}

/**
 * Stamps `data-line` onto every block element so the preview can be scrolled to
 * match the editor caret (and vice-versa).
 */
function lineAnchors(state: StateCore): boolean {
  for (const token of state.tokens) {
    if (token.type === 'inline' || token.nesting === -1) continue;
    if (token.map) token.attrSet('data-line', String(token.map[0]));
  }
  return true;
}

/** Slug ids for headings, derived from the roman source so links stay stable. */
function headingIds(state: StateCore): boolean {
  const used = new Map<string, number>();
  const { tokens } = state;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const inline = tokens[i + 1];
    if (!inline || inline.type !== 'inline') continue;

    let slug = slugify(inline.content);
    const seen = used.get(slug);
    if (seen !== undefined) {
      used.set(slug, seen + 1);
      slug = `${slug}-${seen + 1}`;
    } else {
      used.set(slug, 0);
    }
    tokens[i].attrSet('id', slug);
  }
  return true;
}

function renderFence(tokens: Token[], idx: number): string {
  const token = tokens[idx];
  const { lang } = parseInfo(token.info);
  const code = token.content.replace(/\n$/, '');
  const line = token.attrGet('data-line')?.toString() ?? null;

  // A runnable fence only reaches this renderer when it is nested inside a
  // quote or list, where it cannot get its own sandbox host.
  const strandedRun = token.level > 0 && runSpecFor(token.info) !== null;

  return (
    `<figure class="code-block"${line ? ` data-line="${escapeHtml(line)}"` : ''}>` +
    '<figcaption>' +
    `<span class="code-lang">${escapeHtml(lang || 'text')}</span>` +
    (strandedRun
      ? '<span class="code-note">move to the top level to run</span>'
      : '<button type="button" class="copy-code">Copy</button>') +
    '</figcaption>' +
    `<pre><code class="lang-${escapeHtml(lang || 'text')}">${highlightCode(code, lang)}</code></pre>` +
    '</figure>\n'
  );
}

export function createMarkdown(): MarkdownIt {
  const md = new MarkdownItCtor({
    // User input is Markdown only — raw HTML stays off, which removes the whole
    // injection surface rather than trying to sanitise it after the fact.
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
  });

  md.use(frontmatterPlugin);
  md.use(translitPlugin);
  md.core.ruler.after('inline', 'lipi_heading_ids', headingIds);
  md.core.ruler.push('lipi_line_anchors', lineAnchors);
  md.renderer.rules.fence = renderFence;

  // External links open in a new tab and never leak the referrer.
  const defaultLink =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx].attrGet('href') ?? '');
    if (/^[a-z][\w+.-]*:/i.test(href) && !href.startsWith('#')) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLink(tokens, idx, options, env, self);
  };

  return md;
}

const md = createMarkdown();

export function build(src: string, translit: TranslitEnv): BuildResult {
  const frontmatter = parseFrontmatter(src);
  const env = { translit };
  const tokens = md.parse(src, env);

  const segments: Segment[] = [];
  const headings: Heading[] = [];
  let buffer: Token[] = [];
  let runIndex = 0;

  const flush = () => {
    if (!buffer.length) return;
    const html = md.renderer.render(buffer, md.options, env);
    buffer = [];
    if (html.trim()) segments.push({ kind: 'html', key: `html:${segments.length}`, html });
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'heading_open') {
      const inline = tokens[i + 1];
      headings.push({
        level: Number(token.tag.slice(1)) || 1,
        text: inline?.content ?? '',
        id: token.attrGet('id')?.toString() ?? '',
        line: token.map?.[0] ?? 0,
      });
    }

    // Only top-level fences become sandboxes; nested ones cannot own a host
    // element without breaking the surrounding list or quote structure.
    if (token.type === 'fence' && token.level === 0) {
      const spec = runSpecFor(token.info);
      if (spec) {
        flush();
        segments.push({
          kind: 'run',
          key: `run:${runIndex++}`,
          spec,
          code: token.content.replace(/\n$/, ''),
          line: token.map?.[0] ?? 0,
        });
        continue;
      }
    }

    buffer.push(token);
  }
  flush();

  return { segments, headings, frontmatter };
}

/** Full-document HTML, used by the standalone `.html` export. */
export function renderStatic(src: string, translit: TranslitEnv): string {
  const { segments } = build(src, translit);
  return segments
    .map((seg) =>
      seg.kind === 'html'
        ? seg.html
        : `<figure class="code-block"><figcaption><span class="code-lang">${escapeHtml(
            RUNTIME_LABEL[seg.spec.runtime],
          )}</span></figcaption><pre><code>${highlightCode(seg.code, 'js')}</code></pre></figure>`,
    )
    .join('\n');
}

export { RUNTIME_LABEL };
export type { RunSpec, TranslitEnv, Frontmatter };
