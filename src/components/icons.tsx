/**
 * The three things the document tree holds, drawn rather than typed.
 *
 * Drawn because there is no character for any of them that can be relied on to
 * have a glyph — the nearest folder codepoint renders as a placeholder box on
 * this very machine — and because three shapes tell a folder from a document
 * from a report faster than three different words would.
 */

interface IconProps {
  /** Rendered size in px; 13 matches the type beside it in the sidebar. */
  size?: number;
  className?: string;
}

const frame = (size: number, className?: string) => ({
  viewBox: '0 0 16 16',
  width: size,
  height: size,
  className,
  'aria-hidden': true as const,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** A folder. */
export function FolderIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size, className)}>
      <path d="M1.9 12.6V3.7a.8.8 0 0 1 .8-.8h3l1.4 1.6h5.2a.8.8 0 0 1 .8.8v7.3a.8.8 0 0 1-.8.8H2.7a.8.8 0 0 1-.8-.8Z" />
    </svg>
  );
}

/** A folder, and the making of one. */
export function NewFolderIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size, className)}>
      <path d="M1.9 12.6V3.7a.8.8 0 0 1 .8-.8h3l1.4 1.6h5.2a.8.8 0 0 1 .8.8v7.3a.8.8 0 0 1-.8.8H2.7a.8.8 0 0 1-.8-.8Z" />
      <path d="M8 7.6v3.1M6.5 9.2h3" />
    </svg>
  );
}

/** One document: a page with its corner turned. */
export function DocIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size, className)}>
      <path d="M4.2 2.3h4l3.6 3.6v7.9a.8.8 0 0 1-.8.8H5a.8.8 0 0 1-.8-.8V3.1a.8.8 0 0 1 .8-.8Z" />
      <path d="M8.1 2.3v3.7h3.7" />
    </svg>
  );
}

/** A report: several pages, bound. */
export function ReportIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size, className)}>
      <path d="M2.4 5.6a.9.9 0 0 1 .9-.9h5.2a.9.9 0 0 1 .9.9v7a.9.9 0 0 1-.9.9H3.3a.9.9 0 0 1-.9-.9Z" />
      <path d="M5.2 4.6V3.4a.9.9 0 0 1 .9-.9h5.2a.9.9 0 0 1 .9.9v7a.9.9 0 0 1-.9.9h-1.2" />
    </svg>
  );
}
