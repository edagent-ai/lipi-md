import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { MAX_FOLDER_DEPTH, normalizeFolder } from '../markdown/frontmatter';
import type { Doc } from '../types';

interface MoveDialogProps {
  doc: Doc;
  /** Every folder path already in use, for the suggestion list. */
  folders: string[];
  onCancel(): void;
  onMove(path: string): void;
}

export function MoveDialog({ doc, folders, onCancel, onMove }: MoveDialogProps) {
  const [path, setPath] = useState(doc.folder ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = useMemo(() => normalizeFolder(path), [path]);
  const depth = normalized ? normalized.split('/').length : 0;
  const trimmed = useMemo(
    () => path.split('/').filter((p) => p.trim()).length > MAX_FOLDER_DEPTH,
    [path],
  );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <Modal title="Move document" onClose={onCancel}>
      <section className="settings-group">
        <p>
          Choose a folder for <strong>{doc.title || 'Untitled'}</strong>. Separate levels with
          <code> / </code> — up to {MAX_FOLDER_DEPTH} deep. Leave it empty to keep the document at
          the top level.
        </p>

        <label className="delete-confirm">
          <span>Folder</span>
          <input
            ref={inputRef}
            type="text"
            value={path}
            list="lipi-folders"
            spellCheck={false}
            autoComplete="off"
            placeholder="Music/Carnatic"
            aria-label="Folder path"
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onMove(normalized);
            }}
          />
          <datalist id="lipi-folders">
            {folders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
        </label>

        <p className="field-hint">
          {normalized ? (
            <>
              Filed under <strong>{normalized.split('/').join(' › ')}</strong> ({depth} level
              {depth === 1 ? '' : 's'}).
            </>
          ) : (
            <>Kept at the top level.</>
          )}
          {trimmed && ` Only the first ${MAX_FOLDER_DEPTH} levels are kept.`}
        </p>
      </section>

      <section className="settings-group">
        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          {doc.folder && (
            <button type="button" className="btn" onClick={() => onMove('')}>
              Move to top level
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => onMove(normalized)}>
            Move
          </button>
        </div>
      </section>
    </Modal>
  );
}
