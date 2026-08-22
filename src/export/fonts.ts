import regularUrl from '@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?url';
import boldUrl from '@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2?url';

/**
 * OpenDyslexic, inlined into an export as base64.
 *
 * An exported file has no access to the app's assets, so without this the
 * dyslexia-friendly theme would silently fall back to a system face the moment
 * the file left the browser. It costs roughly 320KB, so it is only ever
 * embedded for documents that actually use that theme.
 */
const cache = new Map<string, string>();

async function toDataUrl(url: string): Promise<string | null> {
  const hit = cache.get(url);
  if (hit) return hit;
  try {
    // Same-origin and precached, so this resolves offline too.
    const blob = await (await fetch(url)).blob();
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    cache.set(url, encoded);
    return encoded;
  } catch {
    return null;
  }
}

/** `@font-face` rules with the font embedded, or '' if it could not be read. */
export async function openDyslexicFaces(): Promise<string> {
  const [regular, bold] = await Promise.all([toDataUrl(regularUrl), toDataUrl(boldUrl)]);
  if (!regular || !bold) return '';

  const face = (weight: number, src: string) =>
    `@font-face{font-family:'OpenDyslexic';font-style:normal;font-weight:${weight};` +
    `font-display:swap;src:url(${src}) format('woff2');}`;

  return `${face(400, regular)}\n${face(700, bold)}`;
}
