import type { Doc } from '../types';
import type { Heading } from '../markdown';
import { DocTree } from './DocTree';
import { countWords } from '../lib/util';

interface SidebarProps {
  docs: Doc[];
  currentId: string;
  headings: Heading[];
  activeHeading: string;
  onSelect(id: string): void;
  onCreate(): void;
  onRequestDelete(doc: Doc): void;
  onRequestReset(doc: Doc): void;
  onRequestMove(doc: Doc): void;
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
  onRequestMove,
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

        <DocTree
          docs={docs}
          currentId={currentId}
          onSelect={onSelect}
          onDuplicate={onDuplicate}
          onRequestDelete={onRequestDelete}
          onRequestReset={onRequestReset}
          onRequestMove={onRequestMove}
        />
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
