import { useCallback, useEffect, useRef, type ReactNode } from 'react';

interface MenuProps {
  label: string;
  title?: string;
  children: ReactNode;
  align?: 'left' | 'right';
  disabled?: boolean;
}

/** A `<details>`-based dropdown: keyboard-navigable for free, closes on outside
 * click and on any activation inside it. */
export function Menu({ label, title, children, align = 'left', disabled }: MenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* A panel is anchored to its trigger, so one near an edge opens past it —
     a right-aligned menu that has wrapped to the start of a row hangs off the
     left of the screen entirely. Nudge it back inside once it is open, which
     costs one measurement and keeps every menu reachable at any width. */
  const keepOnScreen = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || !ref.current?.open) return;
    // Shifted with a transform, not a margin: the panel is absolutely
    // positioned against `right: 0`, and a margin there only moves the edge the
    // box is not anchored by, leaving it exactly where it was.
    panel.style.transform = '';
    const rect = panel.getBoundingClientRect();
    const edge = 8;
    let shift = 0;
    if (rect.left < edge) shift = edge - rect.left;
    else if (rect.right > window.innerWidth - edge) shift = window.innerWidth - edge - rect.right;
    if (shift) panel.style.transform = `translateX(${Math.round(shift)}px)`;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', keepOnScreen);
    return () => window.removeEventListener('resize', keepOnScreen);
  }, [keepOnScreen]);

  useEffect(() => {
    const close = (event: Event) => {
      const node = ref.current;
      if (!node?.open) return;
      if (node.contains(event.target as Node) && event.type === 'mousedown') return;
      node.open = false;
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('menu:close', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('menu:close', close);
    };
  }, []);

  return (
    <details
      className={`menu menu-${align}${disabled ? ' is-disabled' : ''}`}
      ref={ref}
      onToggle={keepOnScreen}
    >
      <summary
        className="menu-trigger"
        title={disabled ? `${label} — switch to Write or Split view` : (title ?? label)}
        aria-disabled={disabled || undefined}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        {label}
      </summary>
      <div
        className="menu-panel"
        ref={panelRef}
        onClick={() => document.dispatchEvent(new CustomEvent('menu:close'))}
      >
        {children}
      </div>
    </details>
  );
}

interface MenuItemProps {
  onClick(): void;
  children: ReactNode;
  hint?: string;
}

export function MenuItem({ onClick, children, hint }: MenuItemProps) {
  return (
    <button type="button" className="menu-item" onClick={onClick}>
      <span>{children}</span>
      {hint && <kbd>{hint}</kbd>}
    </button>
  );
}
