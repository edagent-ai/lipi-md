import { useDeferredValue, useMemo, useState } from 'react';
import type { Doc } from '../types';
import type { Heading } from '../markdown';
import { DocTree } from './DocTree';
import { countWords } from '../lib/util';
import { searchLibrary } from '../search/library';

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
  /** Roman scheme the author types in, for matching native script by sound. */
  sourceScheme: string;
  /** Opens a document and runs the same query inside it. */
  onOpenMatch(id: string, query: string): void;
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
  sourceScheme,
  onOpenMatch,
}: SidebarProps) {
  const current = docs.find((d) => d.id === currentId);
  const [query, setQuery] = useState('');

  /* Deferred so a long library cannot make the field itself feel sticky:
     the keystroke lands immediately and the results catch up. */
  const deferred = useDeferredValue(query);
  const searching = deferred.trim().length > 0;
  const hits = useMemo(
    () => (searching ? searchLibrary(docs, deferred, sourceScheme) : []),
    [docs, deferred, searching, sourceScheme],
  );

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

        <input
          type="search"
          className="doc-search"
          placeholder="Search all documents"
          aria-label="Search all documents"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('');
          }}
        />

        {searching ? (
          hits.length ? (
            <ul className="hit-list">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className={`hit${hit.id === currentId ? ' is-active' : ''}`}
                    onClick={() => onOpenMatch(hit.id, deferred)}
                  >
                    <span className="hit-head">
                      <span className="hit-title">{hit.title || 'Untitled'}</span>
                      <span className="hit-count">
                        {hit.bySound ? 'by sound' : hit.count > 0 ? hit.count : 'title'}
                      </span>
                    </span>
                    {hit.folder && <span className="hit-folder">{hit.folder}</span>}
                    <span className="hit-snippet">
                      {hit.snippet.before}
                      {hit.snippet.match && <mark>{hit.snippet.match}</mark>}
                      {hit.snippet.after}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hit-empty">Nothing matches — try the phonetic spelling.</p>
          )
        ) : (
          <DocTree
            docs={docs}
            currentId={currentId}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onRequestDelete={onRequestDelete}
            onRequestReset={onRequestReset}
            onRequestMove={onRequestMove}
          />
        )}
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
