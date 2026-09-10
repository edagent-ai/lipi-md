import { useEffect, useRef, useState } from 'react';

interface AboutPopoverProps {
  /** Opens the full About panel, for anything this summary leaves out. */
  onMore(): void;
}

const REPO_URL = 'https://github.com/edagent-ai/lipi-md';
const AUTHOR_URL = 'https://shashankbl.github.io';

/**
 * A short "what is this" for the corner of the bar.
 *
 * Deliberately a summary rather than a second copy of the About panel: what it
 * is, who made it, and which build you are looking at. Everything else stays in
 * one place, a click away.
 */
export function AboutPopover({ onMore }: AboutPopoverProps) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="about-pop" ref={hostRef}>
      <button
        type="button"
        className="about-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="About LIPI-MD"
        onClick={() => setOpen((was) => !was)}
      >
        About
      </button>

      {open && (
        <div className="about-panel" role="dialog" aria-label="About LIPI-MD">
          <p className="about-name">LIPI-MD</p>
          <p className="about-desc">
            A Markdown editor that writes in many scripts and runs entirely in your browser.
            Nothing is uploaded — your documents stay on this device.
          </p>
          <dl className="about-facts">
            <dt>Made by</dt>
            <dd>
              <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
                Shashank Bangalore Lakshman
              </a>
            </dd>
            <dt>Version</dt>
            <dd>
              {__APP_VERSION__} <span className="about-dim">· released {__BUILD_DATE__}</span>
            </dd>
          </dl>
          <div className="about-links">
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setOpen(false);
                onMore();
              }}
            >
              Licences and privacy
            </button>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
