/**
 * Turning a file on disk into something a document can carry.
 *
 * The picture goes into the Markdown itself, as a data URL. That is the only
 * form that keeps the app's bargain: a document is one file, it works offline,
 * and it survives export, the zip, the mirrored folder and being opened on
 * another machine. A reference to a file elsewhere would break all of that the
 * moment the document left this computer.
 *
 * The cost is size, so anything large is scaled down before it is embedded
 * rather than dropping a ten-megabyte photograph into a text file.
 */

/** Longest edge kept, in pixels. Past this, detail is invisible on a page. */
const MAX_EDGE = 1600;
/** Below this, the original bytes are kept as they are rather than re-encoded. */
const KEEP_ORIGINAL_UNDER = 384 * 1024;
/** Refused past this once encoded: a document should stay openable. */
export const MAX_EMBEDDED = 4 * 1024 * 1024;

export interface EmbeddedImage {
  url: string;
  width: number;
  height: number;
  /** Size of the data URL, which is what the document actually carries. */
  bytes: number;
  scaled: boolean;
}

export const isImage = (file: File): boolean => /^image\//i.test(file.type);

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That file is not an image this browser can read'));
    image.src = url;
  });
}

/**
 * Re-encodes through a canvas at a bounded size.
 *
 * WebP is asked for first because it keeps transparency and is markedly smaller
 * than PNG; a browser that cannot encode it hands back a PNG from the same
 * call, which is a worse ratio but still correct.
 */
function reEncode(image: HTMLImageElement, scale: number): { url: string; w: number; h: number } {
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser would not give us a canvas to resize with');
  ctx.drawImage(image, 0, 0, w, h);

  return { url: canvas.toDataURL('image/webp', 0.85), w, h };
}

export async function embedImage(file: File): Promise<EmbeddedImage> {
  if (!isImage(file)) throw new Error(`${file.name} is not an image`);

  const original = await readAsDataUrl(file);
  const image = await load(original);
  const edge = Math.max(image.naturalWidth, image.naturalHeight);

  // Small enough already: keep the file exactly as it is, format and all.
  if (file.size <= KEEP_ORIGINAL_UNDER && edge <= MAX_EDGE) {
    return {
      url: original,
      width: image.naturalWidth,
      height: image.naturalHeight,
      bytes: original.length,
      scaled: false,
    };
  }

  const { url, w, h } = reEncode(image, Math.min(1, MAX_EDGE / edge));
  // Re-encoding a small, already-efficient file can make it bigger; keep
  // whichever is actually smaller.
  const better = url.length < original.length ? { url, w, h } : { url: original, w: image.naturalWidth, h: image.naturalHeight };

  if (better.url.length > MAX_EMBEDDED) {
    throw new Error(
      `That picture is ${(better.url.length / 1048576).toFixed(1)}MB once embedded. Try a smaller one.`,
    );
  }

  return {
    url: better.url,
    width: better.w,
    height: better.h,
    bytes: better.url.length,
    scaled: better.url !== original,
  };
}

/** A label for the reference definition, unique within the document. */
export function imageLabel(text: string, name: string): string {
  const base =
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'image';

  let label = base;
  for (let n = 2; new RegExp(`^\\[${label}\\]:`, 'm').test(text); n++) label = `${base}-${n}`;
  return label;
}
