import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  /**
   * When set, the user must type this string before confirming. Reserved for
   * actions with no way back — it makes hitting the wrong document take
   * deliberate effort rather than one mis-aimed click.
   */
  requireName?: string;
  danger?: boolean;
  children: ReactNode;
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmDialog({
  title,
  confirmLabel,
  requireName,
  danger,
  children,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only surrounding whitespace is forgiven; the name itself must match.
  const ready = useMemo(
    () => !requireName || typed.trim() === requireName.trim(),
    [typed, requireName],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Titles routinely carry diacritics — "Baudhāyana's theorem" is painful to
  // retype on most keyboards — so the name can be copied rather than typed.
  const copyName = async () => {
    if (!requireName) return;
    try {
      await navigator.clipboard.writeText(requireName);
    } catch {
      // Clipboard blocked (insecure context, denied permission): fall back to
      // filling the field directly, which is what the copy was for anyway.
      setTyped(requireName);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Modal title={title} onClose={onCancel}>
      <section className="settings-group">{children}</section>

      <section className="settings-group">
        {requireName && (
          <label className="delete-confirm">
            <span className="delete-confirm-label">
              <span>
                Type <strong>{requireName}</strong> to confirm:
              </span>
              <button type="button" className="link-btn" onClick={() => void copyName()}>
                {copied ? 'Copied' : 'Copy name'}
              </button>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              spellCheck={false}
              autoComplete="off"
              placeholder={requireName}
              aria-label={`Type ${requireName} to confirm`}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && ready) onConfirm();
              }}
            />
          </label>
        )}

        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={!ready}
            title={ready ? undefined : 'Type the name exactly to enable this'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </Modal>
  );
}
