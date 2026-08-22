import { schemeExists, transliterate } from '../translit';

/**
 * Search across the rendered page, including text the reader cannot type.
 *
 * The browser's own find-in-page only matches the glyphs on screen, so a
 * document written phonetically and rendered as ಕನ್ನಡ is unreachable unless you
 * have a Kannada keyboard — and the phonetic source we keep on every macro sits
 * in a `title` attribute, which find-in-page ignores outright.
 *
 * So a query is matched three ways: against the text as rendered, against the
 * phonetic source the author actually typed, and against a romanisation of the
 * native text. The last of those is what makes script typed directly into the
 * document — never passed through a macro — searchable too.
 */

/** Blocks whose presence identifies the script of a run of text. */
const SCRIPT_BLOCKS: Array<{ script: string; test: RegExp }> = [
  { script: 'devanagari', test: /[ऀ-ॿ]/ },
  { script: 'bengali', test: /[ঀ-৿]/ },
  { script: 'gurmukhi', test: /[਀-੿]/ },
  { script: 'gujarati', test: /[઀-૿]/ },
  { script: 'oriya', test: /[଀-୿]/ },
  { script: 'tamil', test: /[஀-௿]/ },
  { script: 'telugu', test: /[ఀ-౿]/ },
  { script: 'kannada', test: /[ಀ-೿]/ },
  { script: 'malayalam', test: /[ഀ-ൿ]/ },
  { script: 'sinhala', test: /[඀-෿]/ },
];

/**
 * Every script present, not merely the first. A single line of prose often
 * carries two or three — Latin, Kannada and Devanagari together — and
 * romanising from only one leaves the rest unsearchable.
 */
function scriptsIn(text: string): string[] {
  return SCRIPT_BLOCKS.filter(({ test }) => test.test(text)).map(({ script }) => script);
}

/**
 * Case- and diacritic-insensitive form, so `samskrta` finds `saṃskṛta`.
 *
 * Only U+0300–U+036F is stripped. That block is the Latin combining marks IAST
 * is built from; Indic vowel signs live in their own blocks and are left alone,
 * because there they are letters, not accents — stripping them would turn
 * ಕನ್ನಡ into something that means nothing.
 */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Folds while recording, for each character of the result, the offset it came
 * from in the original. Folding is not length-preserving — `ṃ` decomposes to
 * two characters and one is dropped — so a match found in the folded text can
 * only be turned back into a DOM range through this map.
 */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const piece = fold(text[i]);
    for (let k = 0; k < piece.length; k++) {
      folded += piece[k];
      map.push(i);
    }
  }
  map.push(text.length);
  return { folded, map };
}

/** The phonetic source a macro was written from, if this node came from one. */
function macroSource(node: Text): string | null {
  const host = node.parentElement?.closest('.lipi-tl, .lipi-block');
  const title = host?.getAttribute('title');
  if (!title) return null;
  // Rendered as `source → Script Name`.
  const arrow = title.lastIndexOf(' → ');
  return arrow > 0 ? title.slice(0, arrow) : title;
}

/** Romanisations of a native run, for matching a phonetic query against it. */
function romanisations(text: string, node: Text, sourceScheme: string): string[] {
  const declared = node.parentElement?.closest<HTMLElement>('[data-script]')?.dataset.script;
  const scripts = declared ? [declared] : scriptsIn(text);

  const out: string[] = [];
  for (const script of scripts) {
    if (!schemeExists(script)) continue;
    for (const target of [sourceScheme, 'iast']) {
      if (!schemeExists(target) || target === script) continue;
      const roman = transliterate(text, script, target);
      if (roman && roman !== text) out.push(fold(roman));
    }
  }
  return out;
}

function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest('script, style, .sandbox, .code-copy')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const found: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) found.push(n as Text);
  return found;
}

export interface FindResult {
  ranges: Range[];
  /** Matches found only through romanisation, which cover the whole run. */
  approximate: number;
}

/**
 * Every match for `query`, in document order.
 *
 * A match on the rendered text is highlighted exactly. A match reached through
 * romanisation covers the whole run instead: transliteration is not
 * character-aligned, so there is no honest way to point at the three glyphs
 * inside ನಮಸ್ಕಾರ that produced `kaara`.
 */
export function findMatches(root: HTMLElement, query: string, sourceScheme: string): FindResult {
  const needle = fold(query.trim());
  if (!needle) return { ranges: [], approximate: 0 };

  const ranges: Range[] = [];
  let approximate = 0;

  for (const node of textNodes(root)) {
    const raw = node.nodeValue ?? '';
    const { folded, map } = foldWithMap(raw);

    let hit = folded.indexOf(needle);
    if (hit >= 0) {
      while (hit >= 0) {
        const range = document.createRange();
        range.setStart(node, map[hit]);
        range.setEnd(node, map[hit + needle.length] ?? raw.length);
        ranges.push(range);
        hit = folded.indexOf(needle, hit + needle.length);
      }
      continue;
    }

    // Nothing visible matched, so try what the reader typed and what the
    // native text sounds like.
    const source = macroSource(node);
    const alternatives = source ? [fold(source)] : [];
    alternatives.push(...romanisations(raw, node, sourceScheme));

    if (alternatives.some((alt) => alt.includes(needle))) {
      const range = document.createRange();
      range.selectNodeContents(node);
      ranges.push(range);
      approximate++;
    }
  }

  return { ranges, approximate };
}

const ALL = 'lipi-find';
const CURRENT = 'lipi-find-current';

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

interface HighlightCtor {
  new (...ranges: Range[]): unknown;
}

function registry(): HighlightRegistry | null {
  const api = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
  return api && typeof Highlight !== 'undefined' ? api : null;
}

/** Whether the browser can paint matches without rewriting the document. */
export const canHighlight = (): boolean => registry() !== null;

/**
 * Paints matches with the Custom Highlight API rather than wrapping them in
 * elements. Wrapping would rewrite the DOM the preview renderer owns, and any
 * `<iframe>` caught in a rewritten subtree reloads — restarting every sketch on
 * the page each time the query changed.
 */
export function paint(ranges: Range[], current: number): void {
  const api = registry();
  if (!api) return;
  const Ctor = Highlight as unknown as HighlightCtor;
  api.set(ALL, new Ctor(...ranges));
  const active = ranges[current];
  if (active) api.set(CURRENT, new Ctor(active));
  else api.delete(CURRENT);
}

export function clearPaint(): void {
  const api = registry();
  if (!api) return;
  api.delete(ALL);
  api.delete(CURRENT);
}
