import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { MAX_FOLDER_DEPTH, normalizeFolder } from '../markdown/frontmatter';

interface NewFolderDialogProps {
  /** Every folder path already in use, for the suggestion list. */
  folders: string[];
  onCancel(): void;
  /** Called with the normalised path; the caller creates the first document. */
  onCreate(path: string): void;
}

/**
 * Makes a folder by making its first document.
 *
 * A folder is not a thing that can be stored on its own: it exists exactly as
 * long as a document declares it, which is what lets the arrangement travel
 * with the files through export and re-import. So an empty one would vanish the
 * moment it was made, and this asks for a name and then puts a page in it.
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
          Name the folder, and a new document will be started inside it. Separate levels with
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
              A document will be created in <strong>{normalized.split('/').join(' › ')}</strong> (
              {depth} level{depth === 1 ? '' : 's'}).
              {exists && ' That folder already exists — the document joins it.'}
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
