import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { countWords } from '../lib/util';
import type { Doc } from '../types';

interface DeleteDialogProps {
  doc: Doc;
  onCancel(): void;
  onConfirm(): void;
}

/**
 * Deletion is permanent and there is no server-side copy to recover from, so it
 * asks for the document's name rather than a single click on "OK". The name has
 * to be typed out, which makes deleting the wrong document take deliberate
 * effort instead of one mis-aimed click.
 */
export function DeleteDialog({ doc, onCancel, onConfirm }: DeleteDialogProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const name = doc.title || 'Untitled';
  // Only surrounding whitespace is forgiven; the name itself must match.
  const matches = useMemo(() => typed.trim() === name.trim(), [typed, name]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Modal title="Delete document" onClose={onCancel}>
      <section className="settings-group">
        <p>
          This deletes <strong>{name}</strong> from this browser. It cannot be undone, and
          lipi.md keeps no copy anywhere else.
        </p>
        <p className="field-hint">
          {countWords(doc.text)} words · {doc.text.length} characters. Export it first if you
          might want it back.
        </p>
      </section>

      <section className="settings-group">
        <label className="delete-confirm">
          <span>
            Type <strong>{name}</strong> to confirm:
          </span>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            spellCheck={false}
            autoComplete="off"
            placeholder={name}
            aria-label={`Type ${name} to confirm deletion`}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches) onConfirm();
            }}
          />
        </label>

        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!matches}
            title={matches ? undefined : 'Type the name exactly to enable this'}
            onClick={onConfirm}
          >
            Delete document
          </button>
        </div>
      </section>
    </Modal>
  );
}
