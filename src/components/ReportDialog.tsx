import { useState } from 'react';
import { Modal } from './Modal';
import { isBound } from '../store/report';
import type { Doc } from '../types';

interface ReportDialogProps {
  folder: string;
  /** Every document the folder could contribute, in the order last settled on. */
  sources: Doc[];
  /** The report this will replace, when one has been built before. */
  existing: Doc | null;
  onCancel(): void;
  /** The whole run in order, and which of it to leave out of the report. */
  onBuild(orderedIds: string[], heldOutIds: string[]): void;
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
 *
 * Which documents take part is asked the same way and for the same reason: a
 * folder collects the working notes and the abandoned draft alongside the
 * chapters, and keeping one out of the report should not mean filing it
 * somewhere it does not belong. A document held out keeps its place in this
 * list, so letting it back in returns it to where it was.
 */
export function ReportDialog({
  folder,
  sources,
  existing,
  onCancel,
  onBuild,
}: ReportDialogProps) {
  const [order, setOrder] = useState<Doc[]>(sources);
  const [out, setOut] = useState<Set<string>>(
    () => new Set(sources.filter((doc) => !isBound(doc)).map((doc) => doc.id)),
  );

  const taking = order.filter((doc) => !out.has(doc.id));
  /* A report of one document is not a report of anything, so the button waits
     for a second. The folder still offers the dialog either way — otherwise
     holding everything out would hide the only way to let it back in. */
  const enough = taking.length > 1;

  const toggle = (id: string) =>
    setOut((now) => {
      const next = new Set(now);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
          {taking.length === order.length
            ? `These ${order.length} documents become one report, in this order, with a contents list at the front and a page break between them.`
            : `${taking.length} of these ${order.length} documents become one report, in this order, with a contents list at the front and a page break between them.`}
        </p>

        <ol className="report-order">
          {order.map((doc, index) => {
            const held = out.has(doc.id);
            const at = taking.indexOf(doc);
            return (
            <li key={doc.id} className={held ? 'is-held' : undefined}>
              <span className="report-order-at">{held ? '—' : at + 1}</span>
              <label className="report-order-take">
                <input
                  type="checkbox"
                  checked={!held}
                  aria-label={`Include ${doc.title || 'Untitled'} in the report`}
                  onChange={() => toggle(doc.id)}
                />
              </label>
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
            );
          })}
        </ol>

        <p className="field-hint">
          Unticking a document leaves it out without moving it — the folder keeps it, the report
          does not. The arrangement is saved into each document as <code>order:</code> and{' '}
          <code>bind: no</code>, so it holds for the next rebuild and travels with the files.{' '}
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
            disabled={!enough}
            title={enough ? undefined : 'A report needs at least two documents'}
            onClick={() =>
              onBuild(
                order.map((doc) => doc.id),
                order.filter((doc) => out.has(doc.id)).map((doc) => doc.id),
              )
            }
          >
            {existing ? 'Rebuild' : 'Build report'}
          </button>
        </div>
      </section>
    </Modal>
  );
}
