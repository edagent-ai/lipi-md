import { useEffect, useRef, type ReactNode } from 'react';

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
    <details className={`menu menu-${align}${disabled ? ' is-disabled' : ''}`} ref={ref}>
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
