/**
 * Curated scheme metadata layered over Sanscript's ~80 raw scheme names.
 *
 * Two vocabularies matter here:
 *  - *source schemes* are the phonetic-roman spellings a user types (optitrans,
 *    ITRANS, IAST …). This is what stays in the `.md` file.
 *  - *target scripts* are what gets painted in the preview.
 *
 * Two scripts are offered, Kannada and Devanagari, and the macro names resolve
 * to those alone. Sanscript can paint a dozen more, but an option that is
 * offered is a promise to have looked at it — the fonts, the conjuncts, the
 * punctuation — and these are the two that have been.
 */

export interface TargetScript {
  /** Sanscript scheme id. */
  id: string;
  label: string;
  /** BCP-47 tag, set as `lang=` so the browser picks a matching font. */
  lang: string;
  /** Native-script name, shown in pickers. */
  native: string;
}

export interface SourceScheme {
  id: string;
  label: string;
  hint: string;
}

export const TARGET_SCRIPTS: TargetScript[] = [
  { id: 'kannada', label: 'Kannada', lang: 'kn', native: 'ಕನ್ನಡ' },
  { id: 'devanagari', label: 'Devanagari', lang: 'hi', native: 'देवनागरी' },
];

export const SOURCE_SCHEMES: SourceScheme[] = [
  {
    id: 'optitrans',
    label: 'OptiTrans',
    hint: 'Easiest. Type it how it sounds: namaskaara, lakshmi, meetidava',
  },
  { id: 'itrans', label: 'ITRANS', hint: 'Classic standard: namaskAra, lakShmI' },
  { id: 'hk', label: 'Harvard-Kyoto', hint: 'Case-sensitive: namaskAra, lakSmI' },
  { id: 'iast', label: 'IAST', hint: 'Diacritics: namaskāra, lakṣmī' },
  { id: 'iso', label: 'ISO 15919', hint: 'Diacritics: namaskāra, lakṣmī' },
  { id: 'baraha', label: 'Baraha', hint: 'As used by Baraha / Nudi input tools' },
  { id: 'velthuis', label: 'Velthuis', hint: 'namaskaara, lak.smii' },
  { id: 'slp1', label: 'SLP1', hint: 'Compact 1:1 encoding' },
  { id: 'wx', label: 'WX', hint: 'Computational-linguistics encoding' },
  {
    id: 'optitrans_dravidian',
    label: 'OptiTrans (Dravidian)',
    hint: 'Adds short e/o: distinguishes eLLu from ELLu',
  },
  { id: 'itrans_dravidian', label: 'ITRANS (Dravidian)', hint: 'ITRANS plus short e/o' },
];

/** Friendly macro names → Sanscript script id. */
const ALIASES: Record<string, string> = {
  kn: 'kannada',
  kan: 'kannada',
  kannada: 'kannada',
  hi: 'devanagari',
  hin: 'devanagari',
  hindi: 'devanagari',
  sa: 'devanagari',
  sanskrit: 'devanagari',
  mr: 'devanagari',
  marathi: 'devanagari',
  ne: 'devanagari',
  nepali: 'devanagari',
  dev: 'devanagari',
  devanagari: 'devanagari',
};

/**
 * `lipi` is the "use whatever this document is set to" alias, so a document can
 * be re-targeted between scripts without touching a word of its body text.
 */
export const DEFAULT_SCRIPT_ALIAS = 'lipi';

const LANG_BY_ID = new Map(TARGET_SCRIPTS.map((s) => [s.id, s.lang]));
const LABEL_BY_ID = new Map(TARGET_SCRIPTS.map((s) => [s.id, s.label]));

/** Resolve a macro name to a Sanscript script id, or null if unrecognised. */
export function resolveScript(name: string, documentDefault: string): string | null {
  const key = name.toLowerCase();
  if (key === DEFAULT_SCRIPT_ALIAS) return documentDefault;
  return ALIASES[key] ?? null;
}

export function langTag(scriptId: string): string {
  return LANG_BY_ID.get(scriptId) ?? 'und';
}

export function scriptLabel(scriptId: string): string {
  return LABEL_BY_ID.get(scriptId) ?? scriptId;
}

export const isKnownMacroName = (name: string) =>
  name.toLowerCase() === DEFAULT_SCRIPT_ALIAS || name.toLowerCase() in ALIASES;
