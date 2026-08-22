import type { Doc } from '../types';
import type { Heading } from '../markdown';
import { countWords, formatWhen } from '../lib/util';

interface SidebarProps {
  docs: Doc[];
  currentId: string;
  headings: Heading[];
  activeHeading: string;
  onSelect(id: string): void;
  onCreate(): void;
  onRequestDelete(doc: Doc): void;
  onRequestReset(doc: Doc): void;
  onDuplicate(id: string): void;
  onImport(): void;
  onJumpToLine(line: number): void;
}

export function Sidebar({
  docs,
  currentId,
  headings,
  activeHeading,
  onSelect,
  onCreate,
  onRequestDelete,
  onRequestReset,
  onDuplicate,
  onImport,
  onJumpToLine,
}: SidebarProps) {
  const current = docs.find((d) => d.id === currentId);

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-head">
          <h2>Documents</h2>
          <div className="sidebar-head-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={onImport}
              title="Upload a Markdown file"
              aria-label="Upload a Markdown file"
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onCreate}
              title="New document"
              aria-label="New document"
            >
              +
            </button>
          </div>
        </div>

        <ul className="doc-list">
          {docs.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className={`doc-item${doc.id === currentId ? ' is-active' : ''}`}
                onClick={() => onSelect(doc.id)}
              >
                <span className="doc-title">{doc.title || 'Untitled'}</span>
                <span className="doc-meta">
                  {formatWhen(doc.updatedAt)} · {countWords(doc.text)} words
                </span>
              </button>
              <div className="doc-actions">
                <button
                  type="button"
                  className="icon-btn"
                  title="Duplicate"
                  onClick={() => onDuplicate(doc.id)}
                >
                  ⧉
                </button>
                {doc.example ? (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Reset to the original"
                    aria-label={`Reset ${doc.title || 'Untitled'} to the original`}
                    onClick={() => onRequestReset(doc)}
                  >
                    ↺
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-btn is-danger"
                    title={`Delete “${doc.title || 'Untitled'}”`}
                    aria-label={`Delete ${doc.title || 'Untitled'}`}
                    onClick={() => onRequestDelete(doc)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {headings.length > 0 && (
        <div className="sidebar-section sidebar-outline">
          <div className="sidebar-head">
            <h2>On this page</h2>
          </div>
          <ul className="outline-list">
            {headings.map((heading, index) => (
              <li key={`${heading.id}-${index}`}>
                <button
                  type="button"
                  className={`outline-item${
                    heading.id && heading.id === activeHeading ? ' is-active' : ''
                  }`}
                  style={{ paddingLeft: `${8 + (heading.level - 1) * 12}px` }}
                  onClick={() => onJumpToLine(heading.line)}
                  aria-current={heading.id === activeHeading ? 'location' : undefined}
                >
                  {heading.text || '—'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {current && (
        <div className="sidebar-foot">
          {countWords(current.text)} words · {current.text.length} characters
        </div>
      )}
    </aside>
  );
}
