import { fold, foldWithMap, scriptsIn } from '../preview/find';
import { schemeExists, transliterate } from '../translit';
import type { Doc } from '../types';

/**
 * Searching every document, not only the one on screen.
 *
 * The find bar works over rendered DOM, which exists for the open document
 * alone. Here there is nothing rendered, so the match is made against source
 * text — and that changes which direction the transliteration has to run.
 *
 * A macro keeps its phonetic spelling in the source (`@kannada(namaskaara)`),
 * so a phonetic query finds it directly. Native script *typed* into a document
 * is only there in native script, so it is romanised to be found phonetically.
 * And a query written in native script has to be romanised the other way, or it
 * would never match the macro that renders to exactly those glyphs. Both
 * directions are tried, which is what makes the same query work regardless of
 * how the author happened to write the text.
 */

/**
 * A looser form for comparing spellings of the same sound.
 *
 * Transliteration is not reversible into one spelling: every scheme writes the
 * long vowel of ನಮಸ್ಕಾರ as `namaskAra`, while an author typing it phonetically
 * writes `namaskaara`. Folding removes the macron from `namaskāra` but cannot
 * join a doubled vowel to a single one, so the two never meet. Collapsing runs
 * of the same vowel puts every spelling on the same footing.
 *
 * Kept to its own lane. It is a blunt instrument — it would match `see` to `se`
 * — so it is only tried once an exact match has failed, and what it finds is
 * reported as matched by sound rather than shown as a precise hit.
 */
function phonetic(text: string): string {
  return fold(text).replace(/([aeiou])\1+/gu, '$1');
}

/** Frontmatter is configuration, not prose; matching it is mostly noise. */
function body(text: string): { text: string; offset: number } {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  return match ? { text: text.slice(match[0].length), offset: match[0].length } : { text, offset: 0 };
}

/** The query as written, plus romanised forms if it was typed in script. */
function queryForms(query: string, sourceScheme: string): string[] {
  const forms = [fold(query)];
  for (const script of scriptsIn(query)) {
    if (!schemeExists(script)) continue;
    for (const target of [sourceScheme, 'iast']) {
      if (!schemeExists(target) || target === script) continue;
      const roman = transliterate(query, script, target);
      if (roman && roman !== query) forms.push(fold(roman));
    }
  }
  return [...new Set(forms.filter(Boolean))];
}

/** Romanised forms of whatever native script a document contains. */
function romanisedBody(text: string, sourceScheme: string): string[] {
  const out: string[] = [];
  for (const script of scriptsIn(text)) {
    if (!schemeExists(script)) continue;
    for (const target of [sourceScheme, 'iast']) {
      if (!schemeExists(target) || target === script) continue;
      const roman = transliterate(text, script, target);
      if (roman && roman !== text) out.push(fold(roman));
    }
  }
  return out;
}

export interface LibraryHit {
  id: string;
  title: string;
  folder: string;
  /** Direct occurrences; 0 when the document was reached by sound alone. */
  count: number;
  /** True when only a romanisation matched, so there is no exact position. */
  bySound: boolean;
  snippet: { before: string; match: string; after: string };
}

const SNIPPET_BEFORE = 34;
const SNIPPET_AFTER = 76;

function snippetAt(text: string, start: number, end: number) {
  const from = Math.max(0, start - SNIPPET_BEFORE);
  const to = Math.min(text.length, end + SNIPPET_AFTER);
  const tidy = (s: string) => s.replace(/\s+/g, ' ');
  return {
    before: (from > 0 ? '…' : '') + tidy(text.slice(from, start)),
    match: tidy(text.slice(start, end)),
    after: tidy(text.slice(end, to)) + (to < text.length ? '…' : ''),
  };
}

function opening(text: string) {
  const tidy = text.replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
  return { before: '', match: '', after: tidy.slice(0, 110) + (tidy.length > 110 ? '…' : '') };
}

/**
 * Every document matching `query`, most matches first.
 *
 * Romanising a whole document is not free, so it is only attempted when the
 * plain text did not match and the document actually contains script that could
 * be romanised. Results are memoised inside `transliterate`, so a query typed
 * one letter at a time pays that cost once.
 */
export function searchLibrary(docs: Doc[], query: string, sourceScheme: string): LibraryHit[] {
  const forms = queryForms(query.trim(), sourceScheme);
  if (!forms.length || !forms[0]) return [];

  const hits: LibraryHit[] = [];

  for (const doc of docs) {
    const { text } = body(doc.text);
    const { folded, map } = foldWithMap(text);
    const foldedTitle = fold(doc.title);

    let count = 0;
    let first: { start: number; end: number } | null = null;

    for (const form of forms) {
      let at = folded.indexOf(form);
      while (at >= 0) {
        count++;
        if (!first) first = { start: map[at], end: map[at + form.length] ?? text.length };
        at = folded.indexOf(form, at + form.length);
      }
    }

    if (count > 0 && first) {
      hits.push({
        id: doc.id,
        title: doc.title,
        folder: doc.folder ?? '',
        count,
        bySound: false,
        snippet: snippetAt(text, first.start, first.end),
      });
      continue;
    }

    const titleHit = forms.some((f) => foldedTitle.includes(f));

    // Same sound, different spelling: the query's romanisations against the
    // document's text and against romanisations of any script inside it.
    const heard = forms.map(phonetic).filter(Boolean);
    const haystacks = [phonetic(text), ...romanisedBody(text, sourceScheme).map(phonetic)];
    const sounded = !titleHit && heard.some((h) => haystacks.some((stack) => stack.includes(h)));

    if (titleHit || sounded) {
      hits.push({
        id: doc.id,
        title: doc.title,
        folder: doc.folder ?? '',
        count: 0,
        bySound: sounded,
        snippet: opening(text),
      });
    }
  }

  return hits.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}
