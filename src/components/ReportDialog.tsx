import { useState } from 'react';
import { Modal } from './Modal';
import type { Doc } from '../types';

interface ReportDialogProps {
  folder: string;
  /** The documents that will be bound, in the order they are filed. */
  sources: Doc[];
  /** The report this will replace, when one has been built before. */
  existing: Doc | null;
  onCancel(): void;
  onBuild(orderedIds: string[]): void;
}

/**
 * Settles the running order before binding a folder into a report.
 *
 * The order is the one decision a report cannot make for itself: alphabetical
 * is a filing order, not a reading one, and the app has no way to know that the
 * rope comes before the altar. So it is asked for here, once, and then written
 * into each document as `order:` — which keeps it where the rest of a
 * document's metadata lives, visible in the source, editable by hand, and
 * carried through an export and back.
 */
export function ReportDialog({
  folder,
  sources,
  existing,
  onCancel,
  onBuild,
}: ReportDialogProps) {
  const [order, setOrder] = useState<Doc[]>(sources);

  const swap = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= order.length) return;
    const next = order.slice();
    [next[index], next[to]] = [next[to], next[index]];
    setOrder(next);
  };

  const relative = (doc: Doc) => {
    const path = doc.folder ?? '';
    return path === folder ? '' : path.slice(folder.length + 1);
  };

  return (
    <Modal title={existing ? 'Rebuild the report' : 'Build a report'} onClose={onCancel}>
      <section className="settings-group">
        <p>
          These {order.length} documents become one report, in this order, with a contents list at
          the front and a page break between them.
        </p>

        <ol className="report-order">
          {order.map((doc, index) => (
            <li key={doc.id}>
              <span className="report-order-at">{index + 1}</span>
              <span className="report-order-name">
                {doc.title || 'Untitled'}
                {relative(doc) && <em> · {relative(doc)}</em>}
              </span>
              <span className="report-order-move">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={index === 0}
                  title="Move up"
                  aria-label={`Move ${doc.title || 'Untitled'} up`}
                  onClick={() => swap(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={index === order.length - 1}
                  title="Move down"
                  aria-label={`Move ${doc.title || 'Untitled'} down`}
                  onClick={() => swap(index, 1)}
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>

        <p className="field-hint">
          The order is saved into each document as <code>order:</code>, so it holds for the next
          rebuild and travels with the files.{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => setOrder((now) => now.slice().sort((a, b) => a.title.localeCompare(b.title)))}
          >
            Sort by name
          </button>
        </p>

        {existing && (
          <p className="notice">
            This replaces everything in <strong>{existing.title || 'Untitled'}</strong>, including
            anything you have written into the report itself. The documents above are not touched.
          </p>
        )}
      </section>

      <section className="settings-group">
        <div className="button-row">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onBuild(order.map((doc) => doc.id))}
          >
            {existing ? 'Rebuild' : 'Build report'}
          </button>
        </div>
      </section>
    </Modal>
  );
}
