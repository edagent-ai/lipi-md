import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, type EditorHandle } from './editor/Editor';
import { Preview, type PreviewHandle } from './preview/Preview';
import { Toolbar, type ToolbarAction } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpPanel } from './components/HelpPanel';
import { AboutPanel } from './components/AboutPanel';
import { ConfirmDialog } from './components/ConfirmDialog';
import { redo, undo } from '@codemirror/commands';
import {
  bumpVersion,
  insertBlock,
  insertLink,
  SNIPPETS,
  surround,
  toggleHeading,
  togglePrefix,
  toggleWrap,
  wrapMacro,
} from './editor/commands';
import { build } from './markdown';
import { parseFrontmatter } from './markdown/frontmatter';
import { resolveScript } from './translit/schemes';
import { schemeExists } from './translit';
import { exportHtml } from './export/html';
import { captureSketches } from './export/capture';
import { useDocs } from './store/docs';
import { useSettings } from './store/settings';
import { countWords, download, slugify } from './lib/util';
import { createScrollLock } from './preview/scrollSync';
import { styleVars } from './markdown/docstyle';
import { loadMath, looksLikeMath, mathReady } from './math';
import type { Doc, ViewMode } from './types';
import logoUrl from './assets/logo.png';

type Panel = 'settings' | 'help' | 'about' | null;

const VIEW_ORDER: ViewMode[] = ['editor', 'split', 'preview'];

interface AppProps {
  updateReady: boolean;
  onUpdate(): void;
}

export default function App({ updateReady, onUpdate }: AppProps) {
  const { settings, update: updateSettings, dark } = useSettings();
  const docs = useDocs();
  const [panel, setPanel] = useState<Panel>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [activeHeading, setActiveHeading] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
  const [pendingReset, setPendingReset] = useState<Doc | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  // Bumped when KaTeX finishes loading, to re-render maths that first rendered
  // as raw TeX.
  const [mathEpoch, setMathEpoch] = useState(0);

  const editorRef = useRef<EditorHandle>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollLock = useRef(createScrollLock()).current;

  const text = docs.current?.text ?? '';

  /* Rendering trails typing by a frame or two on big documents, which keeps
   * keystrokes responsive without the preview ever feeling behind. */
  const deferredText = useDeferredValue(text);

  // Frontmatter overrides the global settings for this document only.
  const translitEnv = useMemo(() => {
    const front = parseFrontmatter(deferredText);
    const script = front.script ? resolveScript(front.script, settings.defaultScript) : null;
    const scheme = front.scheme && schemeExists(front.scheme) ? front.scheme : null;
    return {
      sourceScheme: scheme ?? settings.sourceScheme,
      defaultScript: script ?? settings.defaultScript,
    };
  }, [deferredText, settings.sourceScheme, settings.defaultScript]);

  const { segments, headings, style } = useMemo(
    () => build(deferredText, translitEnv),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mathEpoch forces
    // a rebuild once KaTeX is available.
    [deferredText, translitEnv, mathEpoch],
  );

  const docStyle = useMemo(() => styleVars(style), [style]);

  // KaTeX is fetched only when a document actually contains maths.
  useEffect(() => {
    if (mathReady() || !looksLikeMath(deferredText)) return;
    let cancelled = false;
    void loadMath().then(() => {
      if (!cancelled && mathReady()) setMathEpoch((epoch) => epoch + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [deferredText]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /* ----------------------------- scroll sync ----------------------------- */

  const onEditorScroll = useCallback(() => {
    if (!settings.syncScroll || settings.viewMode !== 'split') return;
    if (!scrollLock.claim('editor')) return;
    const line = editorRef.current?.topLine();
    if (line !== undefined) previewRef.current?.scrollToLine(line);
  }, [scrollLock, settings.syncScroll, settings.viewMode]);

  const onPreviewScroll = useCallback(() => {
    if (!settings.syncScroll || settings.viewMode !== 'split') return;
    if (!scrollLock.claim('preview')) return;
    const line = previewRef.current?.topLine();
    if (line !== undefined) editorRef.current?.scrollToLine(line);
  }, [scrollLock, settings.syncScroll, settings.viewMode]);

  /* ------------------------------- actions ------------------------------- */

  const runAction = useCallback((action: ToolbarAction) => {
    const view = editorRef.current?.view();
    if (!view) return;
    switch (action.kind) {
      case 'wrap':
        toggleWrap(view, action.marker, action.placeholder);
        break;
      case 'heading':
        toggleHeading(view, action.level);
        break;
      case 'prefix':
        togglePrefix(view, action.prefix);
        break;
      case 'link':
        insertLink(view);
        break;
      case 'block':
        insertBlock(view, SNIPPETS[action.snippet]);
        break;
      case 'surround':
        surround(view, action.open, action.close, action.placeholder);
        break;
      case 'macro':
        wrapMacro(view, action.script);
        break;
      case 'history':
        (action.direction === 'undo' ? undo : redo)(view);
        view.focus();
        break;
      case 'bumpVersion':
        bumpVersion(view);
        break;
    }
  }, []);

  const jumpToLine = useCallback((line: number) => {
    editorRef.current?.scrollToLine(line);
    previewRef.current?.scrollToLine(line);
  }, []);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const markdown = Array.from(files).filter(
        (file) => /\.(md|markdown|txt)$/i.test(file.name) || file.type.startsWith('text/'),
      );
      for (const file of markdown) {
        await docs.create(await file.text());
      }
    },
    [docs],
  );

  const doExportMarkdown = useCallback(() => {
    if (!docs.current) return;
    download(`${slugify(docs.current.title)}.md`, docs.current.text, 'text/markdown');
  }, [docs]);

  /**
   * Prefer the live preview, so an export reflects exactly what is on screen.
   * With no preview mounted (Write view) fall back to an offscreen capture,
   * rather than quietly exporting a document with its sketches missing.
   */
  const gatherSketches = useCallback(async (): Promise<Record<string, string>> => {
    if (previewRef.current) return previewRef.current.snapshots();
    return captureSketches(segments);
  }, [segments]);

  const doExportHtml = useCallback(async () => {
    if (!docs.current) return;
    if (looksLikeMath(docs.current.text)) await loadMath();
    const sketches = await gatherSketches();
    download(
      `${slugify(docs.current.title)}.html`,
      exportHtml(docs.current.title, docs.current.text, translitEnv, sketches, style),
      'text/html',
    );
  }, [docs, gatherSketches, style, translitEnv]);

  /**
   * PDF goes through the browser's own print pipeline rather than a JS PDF
   * library: it is the only thing here that shapes Kannada, Devanagari and the
   * rest correctly, and it needs no dependency. Printing the exported document
   * inside a hidden same-origin frame (rather than the app window) means the
   * result is identical in every view mode — the old approach printed a blank
   * page unless you happened to be in Split view.
   */
  const doExportPdf = useCallback(async () => {
    if (!docs.current) return;
    if (looksLikeMath(docs.current.text)) await loadMath();
    const sketches = await gatherSketches();
    const html = exportHtml(docs.current.title, docs.current.text, translitEnv, sketches, style);

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText =
      'position:fixed;right:0;bottom:0;width:210mm;height:0;border:0;visibility:hidden;';
    frame.srcdoc = html;

    frame.addEventListener('load', () => {
      const win = frame.contentWindow;
      if (!win) {
        frame.remove();
        return;
      }
      const cleanup = () => setTimeout(() => frame.remove(), 0);
      win.addEventListener('afterprint', cleanup, { once: true });
      // Safari never fires afterprint from a frame; sweep up regardless.
      setTimeout(() => frame.remove(), 60_000);
      win.focus();
      win.print();
    });

    document.body.appendChild(frame);
  }, [docs, gatherSketches, style, translitEnv]);

  /* ------------------------------ shortcuts ------------------------------ */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void docs.saveNow();
      } else if (key === 'n' && event.shiftKey) {
        event.preventDefault();
        void docs.create();
      } else if (key === '\\') {
        event.preventDefault();
        const next = VIEW_ORDER[(VIEW_ORDER.indexOf(settings.viewMode) + 1) % VIEW_ORDER.length];
        updateSettings({ viewMode: next });
      } else if (key === 'b') {
        event.preventDefault();
        runAction({ kind: 'wrap', marker: '**', placeholder: 'bold' });
      } else if (key === 'i') {
        event.preventDefault();
        runAction({ kind: 'wrap', marker: '*', placeholder: 'italic' });
      } else if (key === 'k') {
        event.preventDefault();
        runAction({ kind: 'link' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [docs, runAction, settings.viewMode, updateSettings]);

  /* ------------------------------ drag & drop ---------------------------- */

  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let depth = 0;
    const onOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
    };
    const onEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      depth++;
      setDragging(true);
    };
    const onLeave = () => {
      if (--depth <= 0) {
        depth = 0;
        setDragging(false);
      }
    };
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      void importFiles(event.dataTransfer.files);
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [importFiles]);

  /* -------------------------------- render ------------------------------- */

  if (docs.loading) {
    return (
      <div className="boot">
        <div className="boot-mark">ಲಿ</div>
        <p>Opening your documents…</p>
      </div>
    );
  }

  const editorPane = (
    <Editor
      ref={editorRef}
      docId={docs.currentId}
      value={text}
      onChange={docs.setText}
      onScroll={onEditorScroll}
      onHistoryChange={setHistory}
      fontSize={settings.editorFontSize}
      showLineNumbers={settings.lineNumbers}
      dark={dark}
    />
  );

  const previewPane = (
    <Preview
      ref={previewRef}
      segments={segments}
      autoRun={settings.autoRun}
      onInstallP5={() => setPanel('settings')}
      onScroll={onPreviewScroll}
      docStyle={docStyle}
      onActiveHeading={setActiveHeading}
    />
  );

  return (
    <div className={`app${settings.sidebarOpen ? ' has-sidebar' : ''}`}>
      <header className="appbar">
        <div className="brand">
          <img
            className="brand-logo"
            src={logoUrl}
            alt="lipi.md"
            width={556}
            height={160}
            draggable={false}
          />
        </div>
        <h1 className="doc-name" title={docs.current?.title}>
          {docs.current?.title || 'Untitled'}
        </h1>
      </header>

      <Toolbar
        onAction={runAction}
        viewMode={settings.viewMode}
        onViewMode={(viewMode) => updateSettings({ viewMode })}
        defaultScript={translitEnv.defaultScript}
        sidebarOpen={settings.sidebarOpen}
        onToggleSidebar={() => updateSettings({ sidebarOpen: !settings.sidebarOpen })}
        onExportMarkdown={doExportMarkdown}
        onExportHtml={() => void doExportHtml()}
        onExportPdf={() => void doExportPdf()}
        onOpenSettings={() => setPanel('settings')}
        onOpenHelp={() => setPanel('help')}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />

      <div className="workspace">
        {settings.sidebarOpen && (
          <Sidebar
            docs={docs.docs}
            currentId={docs.currentId}
            headings={headings}
            activeHeading={activeHeading}
            onSelect={docs.select}
            onCreate={() => void docs.create()}
            onRequestDelete={setPendingDelete}
            onRequestReset={setPendingReset}
            onDuplicate={(id) => void docs.duplicate(id)}
            onImport={() => fileInputRef.current?.click()}
            onJumpToLine={jumpToLine}
          />
        )}

        <main className="main">
          {settings.viewMode === 'split' ? (
            <div className="split">
              <div className="pane" style={{ flexBasis: `${settings.splitRatio * 100}%` }}>
                {editorPane}
              </div>
              <Divider
                ratio={settings.splitRatio}
                onRatio={(splitRatio) => updateSettings({ splitRatio })}
              />
              <div className="pane" style={{ flexBasis: `${(1 - settings.splitRatio) * 100}%` }}>
                {previewPane}
              </div>
            </div>
          ) : (
            <div className="split split-single">
              <div className="pane">
                {settings.viewMode === 'editor' ? editorPane : previewPane}
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar
        saveState={docs.saveState}
        text={text}
        script={translitEnv.defaultScript}
        scheme={translitEnv.sourceScheme}
        version={parseFrontmatter(text).version}
        online={online}
        onOpenAbout={() => setPanel('about')}
      />

      {panel === 'settings' && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'help' && <HelpPanel onClose={() => setPanel(null)} />}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete document"
          confirmLabel="Delete document"
          requireName={pendingDelete.title || 'Untitled'}
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void docs.remove(pendingDelete.id);
            setPendingDelete(null);
          }}
        >
          <p>
            This deletes <strong>{pendingDelete.title || 'Untitled'}</strong> from this browser.
            It cannot be undone, and lipi.md keeps no copy anywhere else.
          </p>
          <p className="field-hint">
            {countWords(pendingDelete.text)} words · {pendingDelete.text.length} characters.
            Export it first if you might want it back.
          </p>
        </ConfirmDialog>
      )}
      {pendingReset && (
        <ConfirmDialog
          title="Reset to the original"
          confirmLabel="Reset document"
          onCancel={() => setPendingReset(null)}
          onConfirm={() => {
            void docs.reset(pendingReset.id);
            setPendingReset(null);
          }}
        >
          <p>
            This puts the original example back into{' '}
            <strong>{pendingReset.title || 'Untitled'}</strong>, discarding any changes you have
            made to it.
          </p>
          <p className="field-hint">
            Your other documents are untouched. To keep the current version, duplicate it first.
          </p>
        </ConfirmDialog>
      )}
      {panel === 'about' && (
        <AboutPanel
          onClose={() => setPanel(null)}
          updateReady={updateReady}
          onUpdate={onUpdate}
        />
      )}

      {dragging && <div className="drop-veil">Drop Markdown files to import</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        multiple
        hidden
        onChange={(event) => {
          // Copy the FileList out first: resetting `value` (so the same file
          // can be picked twice in a row) empties the live list, which was
          // silently importing nothing.
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length) void importFiles(files);
        }}
      />
    </div>
  );
}

/** Split divider. Kept here because it only ever drives one setting. */
function Divider({ ratio, onRatio }: { ratio: number; onRatio(ratio: number): void }) {
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const host = document.querySelector('.main .split');
      if (!host) return;
      event.preventDefault();
      const rect = host.getBoundingClientRect();
      onRatio(Math.min(0.85, Math.max(0.15, (event.clientX - rect.left) / rect.width)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove('is-resizing');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onRatio]);

  return (
    <div
      className="divider"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panes"
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        dragging.current = true;
        document.body.classList.add('is-resizing');
      }}
      onDoubleClick={() => onRatio(0.5)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onRatio(Math.max(0.15, ratio - 0.02));
        if (event.key === 'ArrowRight') onRatio(Math.min(0.85, ratio + 0.02));
      }}
    >
      <span className="divider-grip" />
    </div>
  );
}
