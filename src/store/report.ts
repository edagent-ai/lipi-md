/**
 * Binding a folder full of documents into one report.
 *
 * The documents stay as they are. What comes out is an ordinary Markdown
 * document — page breaks between the chapters, a contents list at the front —
 * which means every existing path works on it unchanged: it can be edited,
 * themed, searched, printed, and exported to PDF or HTML like anything else.
 * Nothing here knows about exporting, because nothing here needs to.
 */

import { slugify } from '../lib/util';
import { parseFrontmatter } from '../markdown/frontmatter';
import type { Doc } from '../types';

/**
 * Frontmatter key marking a generated report, holding the folder it was built
 * from. It earns its place twice: it keeps a rebuild from folding the previous
 * report into the next one as though it were a chapter, and it lets a second
 * build replace the first in place rather than leave a trail of copies.
 */
export const REPORT_KEY = 'report';

/** The folder a document is a report of; empty for an ordinary document. */
export const reportedFolder = (text: string): string =>
  parseFrontmatter(text).raw[REPORT_KEY] ?? '';

/**
 * The same answer, remembered per document.
 *
 * The tree asks this of every document on every render, and it re-renders on
 * every keystroke — so without a cache each character typed would re-parse the
 * frontmatter of the whole library. Keyed on the record rather than its id,
 * because an edit makes a new record and should therefore miss.
 */
const remembered = new WeakMap<Doc, string>();

export function docReport(doc: Doc): string {
  let folder = remembered.get(doc);
  if (folder === undefined) {
    folder = reportedFolder(doc.text);
    remembered.set(doc, folder);
  }
  return folder;
}

/** Whether a folder path holds `folder` or anything nested inside it. */
const under = (path: string, folder: string) =>
  path === folder || path.startsWith(`${folder}/`);

/**
 * How many documents a report of this folder would bind. Separate from
 * `reportSources` because the tree needs it on every render and does not need
 * them sorted — which is the expensive half.
 */
export function bindableCount(folder: string, docs: Doc[]): number {
  let n = 0;
  for (const doc of docs) if (under(doc.folder ?? '', folder) && !docReport(doc)) n += 1;
  return n;
}

/** Keys that describe one document rather than how a page looks. */
const PERSONAL = new Set(['title', 'folder', 'order', 'version', REPORT_KEY]);

/**
 * The byline, which is taken from one chapter or none.
 *
 * Everything else is merged key by key, but a name from one document beside a
 * date from another would be a byline that was never true of anything.
 */
const BYLINE = ['author', 'by', 'date', 'link', 'url', 'website'];

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/** A document without its frontmatter block. */
const bodyOf = (text: string) => text.replace(FRONTMATTER, '').trim();

/**
 * Where a document sits in the running order.
 *
 * Filed order is alphabetical, which is rarely the order a report should read
 * in, so a document may name its own place with `order: 2` in its frontmatter.
 * Ones that do come first, in the order they ask for; the rest follow by title.
 */
function orderOf(doc: Doc): number {
  const raw = parseFrontmatter(doc.text).raw.order;
  const n = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/**
 * The documents a report of `folder` would be built from, in reading order:
 * the folder's own documents first, then each subfolder, depth first.
 *
 * A previous report is never a chapter — it is the thing being rebuilt.
 */
export function reportSources(folder: string, docs: Doc[]): Doc[] {
  return docs
    .filter((doc) => under(doc.folder ?? '', folder) && !docReport(doc))
    .sort((a, b) => {
      const place = (a.folder ?? '').localeCompare(b.folder ?? '');
      if (place) return place;
      const [x, y] = [orderOf(a), orderOf(b)];
      if (x !== y) return x - y;
      return a.title.localeCompare(b.title);
    });
}

/** An existing report for this folder, if one has been built before. */
export const findReport = (folder: string, docs: Doc[]): Doc | undefined =>
  docs.find((doc) => docReport(doc) === folder);

const ATX = /^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * The id markdown-it will give every heading, worked out the same way it does:
 * slugified in document order, with a counter appended when a title repeats.
 * Mirrored rather than imported because the contents list has to be written
 * into the Markdown, before anything has been parsed.
 *
 * Fences are tracked so that a `# comment` inside a code block is not counted
 * as a heading — which would shift every id after it by one.
 */
function headingSlugs(lines: string[]): Map<number, string> {
  const slugs = new Map<number, string>();
  const used = new Map<string, number>();
  let fence = '';

  lines.forEach((line, index) => {
    if (fence) {
      if (line.trim().startsWith(fence)) fence = '';
      return;
    }
    const opening = FENCE.exec(line);
    if (opening) {
      fence = opening[1];
      return;
    }

    const heading = ATX.exec(line);
    if (!heading) return;

    let slug = slugify(heading[2]);
    const seen = used.get(slug);
    if (seen === undefined) used.set(slug, 0);
    else {
      used.set(slug, seen + 1);
      slug = `${slug}-${seen + 1}`;
    }
    slugs.set(index, slug);
  });

  return slugs;
}

/** `[` and `]` would end a link label early. */
const label = (text: string) => text.replace(/([[\]])/g, '\\$1');

/**
 * The report's own frontmatter: its title and filing, over whatever the chapters
 * had to say about how a page should look.
 *
 * Settings are inherited key by key from the first chapter that names one, so a
 * folder with a house style comes out wearing it even when the document that
 * happens to sort first left everything at the default.
 */
function frontmatterFor(folder: string, sources: Doc[]): string {
  const quote = (value: string) => (/[:#]/.test(value) ? JSON.stringify(value) : value);
  const title = folder.split('/').pop() || folder;
  const inherited = new Map<string, string>();

  for (const doc of sources) {
    const { raw } = parseFrontmatter(doc.text);
    for (const [key, value] of Object.entries(raw)) {
      if (PERSONAL.has(key) || BYLINE.includes(key)) continue;
      if (!inherited.has(key)) inherited.set(key, value);
    }
  }

  const credited = sources.find((doc) => {
    const { raw } = parseFrontmatter(doc.text);
    return BYLINE.some((key) => raw[key]);
  });
  if (credited) {
    const { raw } = parseFrontmatter(credited.text);
    for (const key of BYLINE) if (raw[key]) inherited.set(key, raw[key]);
  }

  const lines = [`title: ${quote(title)}`];
  for (const [key, value] of inherited) lines.push(`${key}: ${quote(value)}`);
  // Last, so the report files itself where its chapters live and is found again
  // on the next build.
  lines.push(`folder: ${folder}`, `${REPORT_KEY}: ${folder}`);

  return `---\n${lines.join('\n')}\n---`;
}

/**
 * Assembles the report. Returns null when there is nothing to bind — one
 * document is not a report of anything.
 */
export function buildReport(folder: string, docs: Doc[]): string | null {
  const sources = reportSources(folder, docs);
  if (sources.length < 2) return null;

  const name = folder.split('/').pop() || folder;
  const lines: string[] = [`# ${name}`, ''];
  /** Where the contents list goes once the ids underneath it are known. */
  const contentsAt = lines.length;

  const chapters: Array<{ at: number; title: string; under: string }> = [];

  sources.forEach((doc, index) => {
    if (index > 0) lines.push('\\newpage', '');

    const chapter = bodyOf(doc.text).split('\n');
    // A chapter that opens with prose gets its title as a heading, so it can be
    // told apart in the contents and in the outline.
    const first = chapter.find((line) => line.trim().length > 0) ?? '';
    if (!ATX.test(first)) chapter.unshift(`# ${doc.title || 'Untitled'}`, '');

    const at = lines.length + chapter.findIndex((line) => ATX.test(line));
    const heading = ATX.exec(chapter.find((line) => ATX.test(line)) ?? '');
    chapters.push({
      at,
      title: heading?.[2] ?? doc.title,
      // Subfolders are worth showing: a reader of the contents can see that a
      // chapter came from somewhere further down.
      under: (doc.folder ?? '') === folder ? '' : (doc.folder ?? '').slice(folder.length + 1),
    });

    lines.push(...chapter, '');
  });

  const slugs = headingSlugs(lines);
  const contents = ['**Contents**', ''];
  chapters.forEach((chapter, index) => {
    const slug = slugs.get(chapter.at);
    const text = label(chapter.title);
    const link = slug ? `[${text}](#${slug})` : text;
    contents.push(`${index + 1}. ${link}${chapter.under ? ` — *${chapter.under}*` : ''}`);
  });
  contents.push('', '\\newpage', '');

  lines.splice(contentsAt, 0, ...contents);

  return `${frontmatterFor(folder, sources)}\n\n${lines.join('\n').trimEnd()}\n`;
}
