import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface GoogleFontDialogProps {
  onCancel(): void;
  onChoose(family: string): void;
  busy: boolean;
  error: string | null;
}

/** A few that most people recognise, to save typing and spelling. */
const SUGGESTIONS = [
  'Crimson Pro',
  'Source Serif 4',
  'EB Garamond',
  'Inter',
  'Work Sans',
  'JetBrains Mono',
  'Noto Sans Kannada',
  'Noto Serif Devanagari',
];

/**
 * Asks for a family name before contacting anyone.
 *
 * The request is the point of the dialog: it is the one time the app talks to a
 * server that is not its own, and a reader deserves to be told that rather than
 * have it happen behind a menu item.
 */
export function GoogleFontDialog({ onCancel, onChoose, busy, error }: GoogleFontDialogProps) {
  const [family, setFamily] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (family.trim() && !busy) onChoose(family.trim());
  };

  return (
    <Modal title="Typeface from Google Fonts" onClose={onCancel}>
      <section className="settings-group">
        <p>
          Name a family and it will be fetched <strong>once</strong> and kept inside this document,
          the same as a font from your own machine. The page is never fetched from again, and no
          reader of it ever contacts Google.
        </p>
        <p className="field-hint">
          This is the only request lipi.md makes to anyone but itself, and it happens when you press
          the button below — Google will see your address at that moment.
        </p>

        <label className="delete-confirm">
          <span>Family</span>
          <input
            ref={inputRef}
            type="text"
            value={family}
            list="lipi-google-fonts"
            spellCheck={false}
            autoComplete="off"
            placeholder="Crimson Pro"
            aria-label="Font family"
            disabled={busy}
            onChange={(event) => setFamily(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
          <datalist id="lipi-google-fonts">
            {SUGGESTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <p className="field-hint">
          Only the Latin range is taken, which is usually 20–60KB. A family with an Indic or
          Cyrillic alphabet will need its own subset downloaded and added as a file instead.
        </p>
        {error && <p className="notice notice-error">{error}</p>}
      </section>

      <section className="settings-group">
        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!family.trim() || busy}
            onClick={submit}
          >
            {busy ? 'Fetching…' : 'Fetch and embed'}
          </button>
        </div>
      </section>
    </Modal>
  );
}
