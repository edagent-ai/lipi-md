import { scriptLabel } from '../translit/schemes';
import { countWords } from '../lib/util';
import type { SaveState } from '../store/docs';

interface StatusBarProps {
  saveState: SaveState;
  text: string;
  script: string;
  scheme: string;
  online: boolean;
  /** Frontmatter `version:`, shown only once a document has one. */
  version?: string;
  onOpenAbout(): void;
}

const SAVE_LABEL: Record<SaveState, string> = {
  saved: 'Saved on this device',
  saving: 'Saving…',
  dirty: 'Unsaved changes',
};

export function StatusBar({
  saveState,
  text,
  script,
  scheme,
  online,
  version,
  onOpenAbout,
}: StatusBarProps) {
  const lines = text ? text.split('\n').length : 0;

  return (
    <footer className="statusbar">
      <span className={`save-dot save-${saveState}`} aria-hidden="true" />
      <span>{SAVE_LABEL[saveState]}</span>
      <span className="statusbar-sep">·</span>
      <span>{countWords(text)} words</span>
      <span className="statusbar-sep">·</span>
      <span>{lines} lines</span>

      {version && (
        <>
          <span className="statusbar-sep">·</span>
          <span title="Document version, from its frontmatter">v{version}</span>
        </>
      )}

      <span className="statusbar-spacer" />

      <span title="Input scheme → default script">
        {scheme} → {scriptLabel(script)}
      </span>
      <span className="statusbar-sep">·</span>
      <span className={online ? 'is-online' : 'is-offline'}>{online ? 'Online' : 'Offline'}</span>
      <span className="statusbar-sep">·</span>
      <button type="button" className="link-btn" onClick={onOpenAbout}>
        About
      </button>
    </footer>
  );
}
