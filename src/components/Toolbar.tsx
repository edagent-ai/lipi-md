import { Menu, MenuItem } from './Menu';
import { TARGET_SCRIPTS } from '../translit/schemes';
import type { ViewMode } from '../types';

export type ToolbarAction =
  | { kind: 'wrap'; marker: string; placeholder: string }
  | { kind: 'heading'; level: number }
  | { kind: 'prefix'; prefix: string }
  | { kind: 'link' }
  | { kind: 'block'; snippet: keyof typeof import('../editor/commands').SNIPPETS }
  | { kind: 'macro'; script: string };

interface ToolbarProps {
  onAction(action: ToolbarAction): void;
  viewMode: ViewMode;
  onViewMode(mode: ViewMode): void;
  defaultScript: string;
  sidebarOpen: boolean;
  onToggleSidebar(): void;
  onExportMarkdown(): void;
  onExportHtml(): void;
  onPrint(): void;
  onOpenSettings(): void;
  onOpenHelp(): void;
}

const MOD = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';

export function Toolbar({
  onAction,
  viewMode,
  onViewMode,
  defaultScript,
  sidebarOpen,
  onToggleSidebar,
  onExportMarkdown,
  onExportHtml,
  onPrint,
  onOpenSettings,
  onOpenHelp,
}: ToolbarProps) {
  const quickScripts = TARGET_SCRIPTS.slice(0, 6);
  // Read view has no editor behind it, so authoring controls would be inert.
  const readOnly = viewMode === 'preview';
  const editTitle = (label: string) =>
    readOnly ? `${label} — switch to Write or Split view` : label;

  return (
    <div className="toolbar">
      <button
        type="button"
        className={`icon-btn${sidebarOpen ? ' is-on' : ''}`}
        onClick={onToggleSidebar}
        title="Toggle sidebar"
        aria-pressed={sidebarOpen}
      >
        ☰
      </button>

      <span className="toolbar-sep" />

      <button
        type="button"
        className="icon-btn"
        disabled={readOnly}
        title={editTitle(`Bold (${MOD}B)`)}
        onClick={() => onAction({ kind: 'wrap', marker: '**', placeholder: 'bold' })}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        className="icon-btn"
        disabled={readOnly}
        title={editTitle(`Italic (${MOD}I)`)}
        onClick={() => onAction({ kind: 'wrap', marker: '*', placeholder: 'italic' })}
      >
        <i>I</i>
      </button>
      <button
        type="button"
        className="icon-btn"
        disabled={readOnly}
        title={editTitle('Inline code')}
        onClick={() => onAction({ kind: 'wrap', marker: '`', placeholder: 'code' })}
      >
        {'</>'}
      </button>
      <button
        type="button"
        className="icon-btn"
        disabled={readOnly}
        title={editTitle(`Link (${MOD}K)`)}
        onClick={() => onAction({ kind: 'link' })}
      >
        🔗
      </button>

      <span className="toolbar-sep" />

      <Menu label="Text" disabled={readOnly}>
        <MenuItem onClick={() => onAction({ kind: 'heading', level: 1 })}>Heading 1</MenuItem>
        <MenuItem onClick={() => onAction({ kind: 'heading', level: 2 })}>Heading 2</MenuItem>
        <MenuItem onClick={() => onAction({ kind: 'heading', level: 3 })}>Heading 3</MenuItem>
        <hr />
        <MenuItem onClick={() => onAction({ kind: 'prefix', prefix: '- ' })}>Bullet list</MenuItem>
        <MenuItem onClick={() => onAction({ kind: 'prefix', prefix: '1. ' })}>
          Numbered list
        </MenuItem>
        <MenuItem onClick={() => onAction({ kind: 'prefix', prefix: '> ' })}>Quote</MenuItem>
        <hr />
        <MenuItem onClick={() => onAction({ kind: 'block', snippet: 'table' })}>Table</MenuItem>
      </Menu>

      <Menu label="Sketch" disabled={readOnly}>
        <MenuItem onClick={() => onAction({ kind: 'block', snippet: 'canvas' })}>
          Canvas 2D sketch
        </MenuItem>
        <MenuItem onClick={() => onAction({ kind: 'block', snippet: 'anime' })}>
          Anime.js animation
        </MenuItem>
        <MenuItem onClick={() => onAction({ kind: 'block', snippet: 'p5' })}>
          p5.js sketch
        </MenuItem>
      </Menu>

      <Menu label="Script" disabled={readOnly}>
        <MenuItem onClick={() => onAction({ kind: 'macro', script: 'lipi' })}>
          Document default ({defaultScript})
        </MenuItem>
        <hr />
        {quickScripts.map((script) => (
          <MenuItem key={script.id} onClick={() => onAction({ kind: 'macro', script: script.id })}>
            {script.label} · {script.native}
          </MenuItem>
        ))}
        <hr />
        <MenuItem onClick={() => onAction({ kind: 'block', snippet: 'translit' })}>
          Transliterated block
        </MenuItem>
      </Menu>

      <span className="toolbar-spacer" />

      <div className="segmented" role="group" aria-label="View mode">
        {(['editor', 'split', 'preview'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={viewMode === mode ? 'is-active' : ''}
            onClick={() => onViewMode(mode)}
            aria-pressed={viewMode === mode}
            title={`${mode[0].toUpperCase()}${mode.slice(1)} view`}
          >
            {mode === 'editor' ? 'Write' : mode === 'split' ? 'Split' : 'Read'}
          </button>
        ))}
      </div>

      <Menu label="Export" align="right">
        <MenuItem onClick={onExportMarkdown}>Markdown (.md)</MenuItem>
        <MenuItem onClick={onExportHtml}>Web page (.html)</MenuItem>
        <MenuItem onClick={onPrint}>Print / PDF</MenuItem>
      </Menu>

      <button type="button" className="icon-btn" title="Help" onClick={onOpenHelp}>
        ?
      </button>
      <button type="button" className="icon-btn" title="Settings" onClick={onOpenSettings}>
        ⚙
      </button>
    </div>
  );
}
