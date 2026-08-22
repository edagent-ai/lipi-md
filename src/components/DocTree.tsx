import { useMemo, useState } from 'react';
import { countWords, formatWhen } from '../lib/util';
import type { Doc } from '../types';

interface DocTreeProps {
  docs: Doc[];
  currentId: string;
  onSelect(id: string): void;
  onDuplicate(id: string): void;
  onRequestDelete(doc: Doc): void;
  onRequestReset(doc: Doc): void;
  onRequestMove(doc: Doc): void;
}

interface Node {
  name: string;
  path: string;
  children: Node[];
  docs: Doc[];
}

const newNode = (name: string, path: string): Node => ({ name, path, children: [], docs: [] });

/**
 * Groups documents into a folder tree from their `folder:` paths. Depth is
 * already capped when the path is normalised, so this just walks the segments.
 */
function buildTree(docs: Doc[]): Node {
  const root = newNode('', '');

  for (const doc of docs) {
    const segments = (doc.folder ?? '').split('/').filter(Boolean);
    let node = root;
    let path = '';

    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment;
      let child = node.children.find((c) => c.name === segment);
      if (!child) {
        child = newNode(segment, path);
        node.children.push(child);
      }
      node = child;
    }
    node.docs.push(doc);
  }

  const sortNode = (node: Node) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortNode);
  };
  sortNode(root);
  return root;
}

/** Every folder path in use, for the move dialog's suggestions. */
export function folderPaths(docs: Doc[]): string[] {
  const paths = new Set<string>();
  for (const doc of docs) {
    const segments = (doc.folder ?? '').split('/').filter(Boolean);
    let path = '';
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment;
      paths.add(path);
    }
  }
  return [...paths].sort();
}

export function DocTree({
  docs,
  currentId,
  onSelect,
  onDuplicate,
  onRequestDelete,
  onRequestReset,
  onRequestMove,
}: DocTreeProps) {
  const tree = useMemo(() => buildTree(docs), [docs]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const countIn = (node: Node): number =>
    node.docs.length + node.children.reduce((sum, child) => sum + countIn(child), 0);

  const renderDoc = (doc: Doc, depth: number) => (
    <li key={doc.id} style={{ ['--depth' as string]: depth }}>
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
          title="Move to a folder"
          aria-label={`Move ${doc.title || 'Untitled'} to a folder`}
          onClick={() => onRequestMove(doc)}
        >
          ⁄
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Duplicate"
          aria-label={`Duplicate ${doc.title || 'Untitled'}`}
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
  );

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const isCollapsed = collapsed.has(node.path);
    return (
      <li key={node.path} className="folder" style={{ ['--depth' as string]: depth }}>
        <button
          type="button"
          className="folder-row"
          aria-expanded={!isCollapsed}
          onClick={() => toggle(node.path)}
        >
          <span className={`folder-chevron${isCollapsed ? '' : ' is-open'}`} aria-hidden="true">
            ▸
          </span>
          <span className="folder-name">{node.name}</span>
          <span className="folder-count">{countIn(node)}</span>
        </button>
        {!isCollapsed && (
          <ul className="doc-list">
            {node.children.map((child) => renderNode(child, depth + 1))}
            {node.docs.map((doc) => renderDoc(doc, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="doc-list">
      {tree.children.map((child) => renderNode(child, 0))}
      {tree.docs.map((doc) => renderDoc(doc, 0))}
    </ul>
  );
}
