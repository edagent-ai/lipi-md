import { MAX_FONT_BYTES, type EmbeddedFont } from './font';

/**
 * Fetching a typeface from Google Fonts, once, and keeping it.
 *
 * This is the only place in the app that talks to anyone but its own origin,
 * and it only does so when asked by name. What comes back is embedded in the
 * document like any uploaded font, so the page is never fetched from again: a
 * stylesheet link would report every reader to Google forever, where this
 * reports the author once, at the moment they chose the font.
 */

/** Only what a family name can contain, so nothing else reaches the URL. */
const FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} ]{0,48}$/u;

const cssUrl = (family: string, variable: boolean) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}` +
  `${variable ? ':wght@400..700' : ''}&display=swap`;

/**
 * The block covering basic Latin.
 *
 * Google answers with one `@font-face` per subset — latin, latin-ext, cyrillic
 * and so on — and taking all of them would multiply the weight for alphabets
 * the document may never use. The one carrying U+0000-00FF is the one every
 * document needs.
 */
function latinFace(css: string): string | null {
  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
  if (!faces.length) return null;
  return faces.find((f) => /U\+0000-00FF/.test(f)) ?? faces[faces.length - 1];
}

async function toDataUrl(url: string): Promise<{ url: string; bytes: number }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Fonts returned ${response.status} for the font file`);
  const buffer = new Uint8Array(await response.arrayBuffer());

  let binary = '';
  for (let i = 0; i < buffer.length; i += 8192) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
  }
  const dataUrl = `data:font/woff2;base64,${btoa(binary)}`;
  return { url: dataUrl, bytes: dataUrl.length };
}

export async function fetchGoogleFont(name: string): Promise<EmbeddedFont> {
  const family = name.trim().replace(/\s+/g, ' ');
  if (!FAMILY.test(family)) {
    throw new Error('That does not look like a font name — letters, digits and spaces only');
  }

  // A variable range first: one file covering 400 to 700 beats two files, and
  // families that have no such axis simply refuse the request.
  let css = '';
  for (const variable of [true, false]) {
    const response = await fetch(cssUrl(family, variable)).catch(() => null);
    if (response?.ok) {
      css = await response.text();
      break;
    }
  }
  if (!css) throw new Error(`Google Fonts has no family called “${family}”`);

  const face = latinFace(css);
  const fileUrl = face && /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(face)?.[1];
  if (!fileUrl) throw new Error('Could not find a font file in what Google Fonts sent back');

  const { url, bytes } = await toDataUrl(fileUrl);
  if (bytes > MAX_FONT_BYTES) {
    throw new Error(`${family} is ${(bytes / 1048576).toFixed(1)}MB embedded, which is too much`);
  }

  // Google names the family exactly; prefer its spelling to the reader's.
  const named = /font-family:\s*'([^']+)'/.exec(face ?? '')?.[1] ?? family;
  return { family: named, url, format: 'woff2', bytes };
}
