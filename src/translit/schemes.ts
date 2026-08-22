/**
 * Curated scheme metadata layered over Sanscript's ~80 raw scheme names.
 *
 * Two vocabularies matter here:
 *  - *source schemes* are the phonetic-roman spellings a user types (optitrans,
 *    ITRANS, IAST …). This is what stays in the `.md` file.
 *  - *target scripts* are what gets painted in the preview (Kannada, Tamil …).
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
  { id: 'telugu', label: 'Telugu', lang: 'te', native: 'తెలుగు' },
  { id: 'tamil', label: 'Tamil', lang: 'ta', native: 'தமிழ்' },
  { id: 'malayalam', label: 'Malayalam', lang: 'ml', native: 'മലയാളം' },
  { id: 'bengali', label: 'Bengali', lang: 'bn', native: 'বাংলা' },
  { id: 'gujarati', label: 'Gujarati', lang: 'gu', native: 'ગુજરાતી' },
  { id: 'gurmukhi', label: 'Gurmukhi', lang: 'pa', native: 'ਗੁਰਮੁਖੀ' },
  { id: 'oriya', label: 'Odia', lang: 'or', native: 'ଓଡ଼ିଆ' },
  { id: 'sinhala', label: 'Sinhala', lang: 'si', native: 'සිංහල' },
  { id: 'grantha', label: 'Grantha', lang: 'sa', native: 'grantha' },
  { id: 'sharada', label: 'Sharada', lang: 'sa', native: 'sharada' },
  { id: 'tibetan', label: 'Tibetan', lang: 'bo', native: 'བོད་ཡིག' },
  { id: 'brahmi', label: 'Brahmi', lang: 'sa', native: 'brahmi' },
  { id: 'modi', label: 'Modi', lang: 'mr', native: 'modi' },
  { id: 'thai', label: 'Thai', lang: 'th', native: 'ไทย' },
  { id: 'khmer', label: 'Khmer', lang: 'km', native: 'ខ្មែរ' },
  { id: 'burmese', label: 'Burmese', lang: 'my', native: 'မြန်မာ' },
  { id: 'urdu', label: 'Urdu', lang: 'ur', native: 'اردو' },
  // Roman targets are useful for *normalising* casual spelling into a
  // scholarly transcription rather than switching script.
  { id: 'iast', label: 'IAST (roman)', lang: 'en', native: 'IAST' },
  { id: 'iso', label: 'ISO 15919 (roman)', lang: 'en', native: 'ISO' },
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
  te: 'telugu',
  tel: 'telugu',
  telugu: 'telugu',
  ta: 'tamil',
  tam: 'tamil',
  tamil: 'tamil',
  ml: 'malayalam',
  mal: 'malayalam',
  malayalam: 'malayalam',
  bn: 'bengali',
  ben: 'bengali',
  bangla: 'bengali',
  bengali: 'bengali',
  as: 'assamese',
  assamese: 'assamese',
  gu: 'gujarati',
  guj: 'gujarati',
  gujarati: 'gujarati',
  pa: 'gurmukhi',
  punjabi: 'gurmukhi',
  gurmukhi: 'gurmukhi',
  or: 'oriya',
  odia: 'oriya',
  oriya: 'oriya',
  si: 'sinhala',
  sinhala: 'sinhala',
  ur: 'urdu',
  urdu: 'urdu',
  bo: 'tibetan',
  tibetan: 'tibetan',
  th: 'thai',
  thai: 'thai',
  km: 'khmer',
  khmer: 'khmer',
  my: 'burmese',
  burmese: 'burmese',
  grantha: 'grantha',
  sharada: 'sharada',
  brahmi: 'brahmi',
  modi: 'modi',
  iast: 'iast',
  iso: 'iso',
  slp1: 'slp1',
  hk: 'hk',
  itrans: 'itrans',
  optitrans: 'optitrans',
};

/**
 * `lipi` is the "use whatever this document is set to" alias, so a lyric sheet
 * can be re-targeted from Kannada to Telugu without touching its body text.
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
