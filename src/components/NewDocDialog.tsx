import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { MAX_FOLDER_DEPTH, normalizeFolder, parseFrontmatter } from '../markdown/frontmatter';
import { THEMES } from '../markdown/themes';
import type { DocDetails } from '../store/samples';
import type { Doc } from '../types';

interface NewDocDialogProps {
  /** Every folder path already in use, for the suggestion list. */
  folders: string[];
  /** Where the reader is working, so a new page lands beside it by default. */
  currentFolder: string;
  /** The library, only to carry a byline forward from the last one written. */
  docs: Doc[];
  onCancel(): void;
  onCreate(details: DocDetails): void;
}

/**
 * Asks what a document is before opening it.
 *
 * All of this could be typed into the frontmatter afterwards, and often is. It
 * is asked here because the answers are known at the moment the document is
 * made and forgotten by the time anyone gets round to it — a library of pages
 * called Untitled, filed nowhere, is what happens otherwise.
 *
 * Nothing is compulsory. Every field left blank is a key left out, and a key
 * left out is one the page takes from Settings.
 */
export function NewDocDialog({
  folders,
  currentFolder,
  docs,
  onCancel,
  onCreate,
}: NewDocDialogProps) {
  /* Carried forward from the last document that named one: most people write
     as the same person twice running, and retyping it is the kind of friction
     that ends in no byline at all. */
  const lastAuthor = useMemo(() => {
    for (const doc of docs) {
      const author = parseFrontmatter(doc.text).author;
      if (author) return author;
    }
    return '';
  }, [docs]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState(currentFolder);
  const [author, setAuthor] = useState(lastAuthor);
  const [date, setDate] = useState(today);
  const [theme, setTheme] = useState('paper');
  const [sample, setSample] = useState(true);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const path = normalizeFolder(folder);
  const submit = () =>
    onCreate({ title, folder: path, author, date, theme, sample });

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') submit();
  };

  return (
    <Modal title="New document" onClose={onCancel}>
      <section className="settings-group">
        <label className="delete-confirm">
          <span>Title</span>
          <input
            ref={titleRef}
            type="text"
            value={title}
            placeholder="Untitled"
            aria-label="Title"
            autoComplete="off"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={onKey}
          />
        </label>

        <label className="delete-confirm">
          <span>Folder</span>
          <input
            type="text"
            value={folder}
            list="lipi-doc-folders"
            spellCheck={false}
            autoComplete="off"
            placeholder="Leave empty for the top level"
            aria-label="Folder"
            onChange={(event) => setFolder(event.target.value)}
            onKeyDown={onKey}
          />
          <datalist id="lipi-doc-folders">
            {folders.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <label className="delete-confirm">
          <span>Author</span>
          <input
            type="text"
            value={author}
            placeholder="Shown as a byline, if you want one"
            aria-label="Author"
            autoComplete="off"
            onChange={(event) => setAuthor(event.target.value)}
            onKeyDown={onKey}
          />
        </label>

        <label className="delete-confirm">
          <span>Date</span>
          <input
            type="text"
            value={date}
            placeholder="Free text — a year is enough"
            aria-label="Date"
            autoComplete="off"
            onChange={(event) => setDate(event.target.value)}
            onKeyDown={onKey}
          />
        </label>

        <label className="delete-confirm">
          <span>Theme</span>
          <select value={theme} aria-label="Theme" onChange={(event) => setTheme(event.target.value)}>
            <option value="">Follow Settings</option>
            {Object.entries(THEMES).map(([name, preset]) => (
              <option key={name} value={name}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={sample}
            onChange={(event) => setSample(event.target.checked)}
          />
          <span>
            Start with example content — a heading, a note, a sketch of the markup. Untick for an
            empty page.
          </span>
        </label>

        <p className="field-hint">
          Anything left blank is simply left out of the file, and can be added at the top of the
          document later.
          {path.split('/').filter(Boolean).length > MAX_FOLDER_DEPTH &&
            ` Only the first ${MAX_FOLDER_DEPTH} folder levels are kept.`}
        </p>
      </section>

      <section className="settings-group">
        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Create document
          </button>
        </div>
      </section>
    </Modal>
  );
}
