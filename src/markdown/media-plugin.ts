import type { MarkdownIt, RendererRule, StateCore, Token } from 'markdown-it';
import { escapeHtml } from '../lib/util';

/**
 * Turns plain Markdown image syntax into the right media element, so a user
 * never has to write HTML (which the parser has disabled anyway):
 *
 *   ![caption](photo.jpg)                 → figure + image
 *   ![caption](clip.mp4)                  → figure + <video controls>
 *   ![caption](https://youtu.be/ID)       → privacy-mode YouTube embed
 *   [![caption](photo.jpg)](https://…)    → the image, linked (plain Markdown)
 *
 * A paragraph holding nothing but one image is promoted to a `<figure>`, which
 * is what makes captions and block-level video possible.
 */

const VIDEO_FILE = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i;
const AUDIO_FILE = /\.(mp3|wav|m4a|aac|flac|opus)(\?.*)?$/i;

const YOUTUBE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i;

/** Only http(s), data-image, and relative URLs reach an element attribute. */
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^[a-z][\w+.-]*:/i.test(trimmed)) return null; // javascript:, vbscript:, …
  return trimmed;
}

type Media =
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'audio'; src: string }
  | { kind: 'embed'; src: string; provider: string };

function classify(rawSrc: string): Media | null {
  const src = safeUrl(rawSrc);
  if (!src) return null;

  const youtube = YOUTUBE.exec(src);
  if (youtube) {
    return {
      kind: 'embed',
      provider: 'YouTube',
      // nocookie host: no tracking cookie unless the video is actually played.
      src: `https://www.youtube-nocookie.com/embed/${youtube[1]}`,
    };
  }
  const vimeo = VIMEO.exec(src);
  if (vimeo) {
    return { kind: 'embed', provider: 'Vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }
  if (VIDEO_FILE.test(src)) return { kind: 'video', src };
  if (AUDIO_FILE.test(src)) return { kind: 'audio', src };
  return { kind: 'image', src };
}

/** A paragraph whose only content is a single image. */
function loneImage(inline: Token): Token | null {
  const children = (inline.children ?? []).filter(
    (child) => !(child.type === 'text' && !child.content.trim()) && child.type !== 'softbreak',
  );
  return children.length === 1 && children[0].type === 'image' ? children[0] : null;
}

function promoteFigures(state: StateCore): boolean {
  const { tokens } = state;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'paragraph_open') continue;
    const inline = tokens[i + 1];
    const close = tokens[i + 2];
    if (!inline || inline.type !== 'inline' || close?.type !== 'paragraph_close') continue;

    const image = loneImage(inline);
    if (!image) continue;

    const media = classify(String(image.attrGet('src') ?? ''));
    if (!media) continue;

    const figure = new state.Token('lipi_media', 'figure', 0);
    figure.block = true;
    figure.map = tokens[i].map;
    figure.meta = {
      media,
      alt: image.content,
      // `![alt](src "caption")` — the title becomes the visible caption.
      caption: String(image.attrGet('title') ?? ''),
    };
    // `map` is carried over so the later line-anchor rule stamps this figure
    // with its own `data-line`, keeping scroll sync accurate.

    tokens.splice(i, 3, figure);
  }
  return true;
}

export function mediaPlugin(md: MarkdownIt): void {
  md.core.ruler.push('lipi_media', promoteFigures);

  const render: RendererRule = (tokens, idx) => {
    const { media, alt, caption } = tokens[idx].meta as {
      media: Media;
      alt: string;
      caption: string;
    };
    const line = tokens[idx].attrGet('data-line')?.toString() ?? null;
    const src = escapeHtml(media.src);
    const label = escapeHtml(alt || caption || '');
    const lineAttr = line ? ` data-line="${escapeHtml(line)}"` : '';

    let body: string;
    switch (media.kind) {
      case 'video':
        body = `<video controls playsinline preload="metadata" src="${src}"></video>`;
        break;
      case 'audio':
        body = `<audio controls preload="metadata" src="${src}"></audio>`;
        break;
      case 'embed':
        body =
          `<div class="media-embed"><iframe src="${src}" loading="lazy" allowfullscreen ` +
          `referrerpolicy="no-referrer" title="${label || escapeHtml(media.provider)}"></iframe></div>`;
        break;
      default:
        body = `<img src="${src}" alt="${label}" loading="lazy" decoding="async">`;
    }

    return (
      `<figure class="media media-${media.kind}"${lineAttr}>${body}` +
      (caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '') +
      '</figure>\n'
    );
  };

  md.renderer.rules.lipi_media = render;
}
