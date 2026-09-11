/**
 * A typeface carried inside the document.
 *
 * The alternative was a stylesheet link to a font service, which would have
 * told that service the reader's address every time the page was opened and
 * left the document looking wrong offline. Embedding costs weight and keeps
 * both promises: nothing is fetched, and the file is still itself on a machine
 * that has never heard of the font.
 */

/** Formats a browser can actually use, with what CSS calls each one. */
const FORMATS: Array<{ test: RegExp; mime: string; format: string }> = [
  { test: /\.woff2$/i, mime: 'font/woff2', format: 'woff2' },
  { test: /\.woff$/i, mime: 'font/woff', format: 'woff' },
  { test: /\.ttf$/i, mime: 'font/ttf', format: 'truetype' },
  { test: /\.otf$/i, mime: 'font/otf', format: 'opentype' },
];

/** Past this a document becomes unpleasant to open, save and sync. */
export const MAX_FONT_BYTES = 2 * 1024 * 1024;

export interface EmbeddedFont {
  family: string;
  /** `data:font/woff2;base64,…` */
  url: string;
  format: string;
  bytes: number;
}

/** A family name safe to drop into a stylesheet, and to read. */
export function familyFromName(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  const cleaned = stem
    // Foundries ship `Name-Regular`, `Name_400`, `NameVF`; none of that is the
    // family as a reader would say it.
    .replace(/[-_]+(regular|book|vf|variablefont|wght)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 48) || 'Custom';
}

export const isFontFile = (file: File): boolean =>
  FORMATS.some((f) => f.test.test(file.name)) || /^font\//i.test(file.type);

export async function embedFont(file: File): Promise<EmbeddedFont> {
  const match = FORMATS.find((f) => f.test.test(file.name));
  if (!match) {
    throw new Error(`${file.name} is not a .woff2, .woff, .ttf or .otf file`);
  }
  if (file.size > MAX_FONT_BYTES) {
    throw new Error(
      `${file.name} is ${(file.size / 1048576).toFixed(1)}MB. Use a woff2, which is usually a tenth of that.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  // In chunks: one apply() over a megabyte of arguments overflows the stack.
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const url = `data:${match.mime};base64,${btoa(binary)}`;

  return { family: familyFromName(file.name), url, format: match.format, bytes: url.length };
}
