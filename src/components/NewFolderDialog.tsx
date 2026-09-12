import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { MAX_FOLDER_DEPTH, normalizeFolder } from '../markdown/frontmatter';

interface NewFolderDialogProps {
  /** Every folder path already in use, for the suggestion list. */
  folders: string[];
  onCancel(): void;
  /** Called with the normalised path. */
  onCreate(path: string): void;
}

/**
 * Makes an empty folder.
 *
 * It used to make a document too, because a folder existed only as a path some
 * document declared and an empty one would have vanished the moment it was
 * made. Folders are recorded in their own right now, so the page is no longer
 * needed to hold one up — and a folder someone made to file existing documents
 * into should not come with a stray Untitled already in it.
 */
export function NewFolderDialog({ folders, onCancel, onCreate }: NewFolderDialogProps) {
  const [path, setPath] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = useMemo(() => normalizeFolder(path), [path]);
  const depth = normalized ? normalized.split('/').length : 0;
  const trimmed = useMemo(
    () => path.split('/').filter((p) => p.trim()).length > MAX_FOLDER_DEPTH,
    [path],
  );
  const exists = folders.includes(normalized);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (normalized) onCreate(normalized);
  };

  return (
    <Modal title="New folder" onClose={onCancel}>
      <section className="settings-group">
        <p>
          Name the folder and it is made empty, ready to file documents into. Separate levels with
          <code> / </code> to nest — up to {MAX_FOLDER_DEPTH} deep.
        </p>

        <label className="delete-confirm">
          <span>Folder</span>
          <input
            ref={inputRef}
            type="text"
            value={path}
            list="lipi-new-folders"
            spellCheck={false}
            autoComplete="off"
            placeholder="Music/Carnatic"
            aria-label="Folder name"
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
          <datalist id="lipi-new-folders">
            {folders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
        </label>

        <p className="field-hint">
          {normalized ? (
            <>
              Makes <strong>{normalized.split('/').join(' › ')}</strong> ({depth} level
              {depth === 1 ? '' : 's'}).
              {exists && ' That folder already exists — nothing will change.'}
            </>
          ) : (
            <>Type a name to continue.</>
          )}
          {trimmed && ` Only the first ${MAX_FOLDER_DEPTH} levels are kept.`}
        </p>
      </section>

      <section className="settings-group">
        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!normalized} onClick={submit}>
            Create folder
          </button>
        </div>
      </section>
    </Modal>
  );
}
