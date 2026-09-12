import { useMemo, useState } from 'react';
import { countWords, formatWhen } from '../lib/util';
import { bindableCount, docReport } from '../store/report';
import { DocIcon, FolderIcon, ReportIcon } from './icons';
import type { Doc } from '../types';

interface DocTreeProps {
  docs: Doc[];
  currentId: string;
  onSelect(id: string): void;
  onDuplicate(id: string): void;
  onRequestDelete(doc: Doc): void;
  onRequestReset(doc: Doc): void;
  onRequestMove(doc: Doc): void;
  /** Files a document under a folder path; empty means the top level. */
  onMoveDoc(id: string, folder: string): void;
  /** Moves a whole folder, and everything filed below it, under a new parent. */
  onMoveFolder(from: string, toParent: string): void;
  /** Folders that exist in their own right, not only through a document. */
  folders: string[];
  onForgetFolder(path: string): void;
  /** Binds every document filed under a folder into one report document. */
  onBuildReport(path: string): void;
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
function buildTree(docs: Doc[], extra: string[]): Node {
  const root = newNode('', '');

  /** Walks a path into the tree, creating the nodes it passes through. */
  const reach = (segments: string[]): Node => {
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
    return node;
  };

  // Folders the reader made stand on their own, so one still shows after the
  // last document in it is deleted.
  for (const path of extra) reach(path.split('/').filter(Boolean));

  for (const doc of docs) {
    reach((doc.folder ?? '').split('/').filter(Boolean)).docs.push(doc);
  }

  /* Inside a folder, by name. A folder is somewhere things are filed, and a
     filed thing should be where it was put — an order that reshuffled itself
     every time a document was edited would make it impossible to learn.
     The top level keeps the recency order, which is what it is good for: it is
     where documents are before anyone has decided where they go. */
  const sortNode = (node: Node, isRoot: boolean) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    if (!isRoot) node.docs.sort((a, b) => a.title.localeCompare(b.title));
    node.children.forEach((child) => sortNode(child, false));
  };
  sortNode(root, true);
  return root;
}

/** Every folder path in use, for the move dialog's suggestions. */
export function folderPaths(docs: Doc[], extra: string[] = []): string[] {
  const paths = new Set<string>();
  const walk = (folder: string) => {
    let path = '';
    for (const segment of folder.split('/').filter(Boolean)) {
      path = path ? `${path}/${segment}` : segment;
      paths.add(path);
    }
  };
  for (const doc of docs) walk(doc.folder ?? '');
  for (const folder of extra) walk(folder);
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
  onMoveDoc,
  onMoveFolder,
  folders,
  onForgetFolder,
  onBuildReport,
}: DocTreeProps) {
  const tree = useMemo(() => buildTree(docs, folders), [docs, folders]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  /** Path of the row a drag is currently over; '' is the top level. */
  const [over, setOver] = useState<string | null>(null);


  /* Dragging carries what is being moved, so a drop knows whether it is filing
     a single document or re-parenting a whole branch. */
  const startDrag = (event: React.DragEvent, kind: 'doc' | 'folder', value: string) => {
    event.dataTransfer.setData('application/x-lipi', `${kind}:${value}`);
    event.dataTransfer.effectAllowed = 'move';
    event.stopPropagation();
  };

  /** Clears the highlight when a drag is abandoned rather than dropped. */
  const endDrag = () => setOver(null);

  const payload = (event: React.DragEvent): { kind: string; value: string } | null => {
    const raw = event.dataTransfer.getData('application/x-lipi');
    const at = raw.indexOf(':');
    return at < 0 ? null : { kind: raw.slice(0, at), value: raw.slice(at + 1) };
  };

  /* A folder cannot be filed inside itself or anything it contains — that would
     detach the branch from the tree and lose every document under it. */
  const wouldSwallow = (from: string, toParent: string) =>
    toParent === from || toParent.startsWith(`${from}/`);

  const canDrop = (event: React.DragEvent, target: string) => {
    const item = payload(event);
    if (!item) return event.dataTransfer.types.includes('application/x-lipi');
    if (item.kind === 'folder') {
      const parent = item.value.split('/').slice(0, -1).join('/');
      return !wouldSwallow(item.value, target) && target !== parent;
    }
    return true;
  };

  const onDrop = (event: React.DragEvent, target: string) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(null);
    const item = payload(event);
    if (!item) return;
    if (item.kind === 'doc') onMoveDoc(item.value, target);
    else if (!wouldSwallow(item.value, target)) onMoveFolder(item.value, target);
  };

  const dropProps = (target: string) => ({
    onDragOver: (event: React.DragEvent) => {
      if (!canDrop(event, target)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move' as const;
      setOver(target);
    },
    onDragLeave: () => setOver((now) => (now === target ? null : now)),
    onDrop: (event: React.DragEvent) => onDrop(event, target),
  });

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const countIn = (node: Node): number =>
    node.docs.length + node.children.reduce((sum, child) => sum + countIn(child), 0);

  /* Offered from two documents up. One document is not a report of anything,
     and a previous report is not a chapter of the next one — so this counts
     what would actually be bound, not what the folder holds. */
  const bindable = (path: string) => bindableCount(path, docs);

  const renderDoc = (doc: Doc, depth: number) => {
    const report = docReport(doc);
    return (
    <li key={doc.id} style={{ ['--depth' as string]: depth }}>
      <button
        type="button"
        className={`doc-item${doc.id === currentId ? ' is-active' : ''}${report ? ' is-report' : ''}`}
        title={report ? `Built from the documents in ${report}` : undefined}
        draggable
        onDragStart={(event) => startDrag(event, 'doc', doc.id)}
        onDragEnd={endDrag}
        onClick={() => onSelect(doc.id)}
      >
        <span className="doc-title">
          {report ? <ReportIcon className="row-icon" /> : <DocIcon className="row-icon" />}
          <span className="doc-name-text">{doc.title || 'Untitled'}</span>
        </span>
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
  };

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const isCollapsed = collapsed.has(node.path);
    return (
      <li key={node.path} className="folder" style={{ ['--depth' as string]: depth }}>
        <div className="folder-head">
        <button
          type="button"
          className={`folder-row${over === node.path ? ' is-drop' : ''}`}
          aria-expanded={!isCollapsed}
          draggable
          onDragStart={(event) => startDrag(event, 'folder', node.path)}
          onDragEnd={endDrag}
          {...dropProps(node.path)}
          onClick={() => toggle(node.path)}
        >
          <span className={`folder-chevron${isCollapsed ? '' : ' is-open'}`} aria-hidden="true">
            ▸
          </span>
          <FolderIcon className="row-icon" />
          <span className="folder-name">{node.name}</span>
          <span className="folder-count">{countIn(node)}</span>
        </button>
        {countIn(node) === 0 && (
          <button
            type="button"
            className="icon-btn is-danger folder-forget"
            title={`Remove the empty folder “${node.name}”`}
            aria-label={`Remove the empty folder ${node.name}`}
            onClick={() => onForgetFolder(node.path)}
          >
            ✕
          </button>
        )}
        {bindable(node.path) > 1 && (
          <button
            type="button"
            className="icon-btn folder-report"
            title={`Build one report from the ${bindable(node.path)} documents in “${node.name}”`}
            aria-label={`Build a report from ${node.name}`}
            onClick={() => onBuildReport(node.path)}
          >
            <ReportIcon size={12} />
          </button>
        )}
        </div>
        {!isCollapsed && (
          <ul className="doc-list">
            {/* The report first, above the subfolders it was built from: it is
                what the folder amounts to, so it reads as the folder's cover
                rather than as one more document filed in it. */}
            {node.docs.filter((doc) => docReport(doc)).map((doc) => renderDoc(doc, depth + 1))}
            {node.children.map((child) => renderNode(child, depth + 1))}
            {node.docs.filter((doc) => !docReport(doc)).map((doc) => renderDoc(doc, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className={`tree-root${over === '' ? ' is-drop' : ''}`}
      {...dropProps('')}
      aria-label="Documents"
    >
      <ul className="doc-list">
        {tree.children.map((child) => renderNode(child, 0))}
        {tree.docs.map((doc) => renderDoc(doc, 0))}
      </ul>
      <p className="tree-hint">Drag onto a folder to file it, or here for the top level.</p>
    </div>
  );
}
