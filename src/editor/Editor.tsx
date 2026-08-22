import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
  rectangularSelection,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redoDepth,
  undoDepth,
} from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { LanguageDescription } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { editorTheme } from './theme';

/** Fenced blocks get real syntax highlighting inside the editor too. */
const codeLanguages = [
  LanguageDescription.of({
    name: 'javascript',
    alias: ['js', 'jsx', 'mjs', 'p5', 'p5js', 'anime', 'animejs', 'canvas', 'sketch'],
    load: async () => javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    name: 'typescript',
    alias: ['ts', 'tsx'],
    load: async () => javascript({ jsx: true, typescript: true }),
  }),
];

export interface EditorHandle {
  view(): EditorView | null;
  scrollToLine(line: number): void;
  topLine(): number;
  focus(): void;
}

interface EditorProps {
  docId: string;
  value: string;
  onChange(value: string): void;
  onScroll(): void;
  /** Reports whether undo/redo currently have anything to do. */
  onHistoryChange?(state: { canUndo: boolean; canRedo: boolean }): void;
  fontSize: number;
  showLineNumbers: boolean;
  dark: boolean;
}

const PLACEHOLDER = `# Start typing

Write Markdown. Add @kannada(namaskaara) to render native script,
or a \`\`\`p5 block to run a live sketch.`;

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { docId, value, onChange, onScroll, onHistoryChange, fontSize, showLineNumbers, dark },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Callbacks live in refs so the (expensive) EditorView is created exactly once.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const onHistoryRef = useRef(onHistoryChange);
  onHistoryRef.current = onHistoryChange;
  const lastEmitted = useRef(value);

  const lineNumberComp = useRef(new Compartment()).current;
  const darkComp = useRef(new Compartment()).current;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumberComp.of(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
          darkComp.of(EditorView.darkTheme.of(dark)),
          history(),
          drawSelection(),
          dropCursor(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          search({ top: true }),
          closeBrackets(),
          EditorState.allowMultipleSelections.of(true),
          keymap.of([
            ...closeBracketsKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...defaultKeymap,
            indentWithTab,
          ]),
          markdown({ base: markdownLanguage, codeLanguages, addKeymap: true }),
          EditorView.lineWrapping,
          placeholderExt(PLACEHOLDER),
          editorTheme,
          EditorView.updateListener.of((update) => {
            // Depth is reported on every update, not only document changes:
            // undo itself does not change the document from React's point of
            // view on the redo side.
            onHistoryRef.current?.({
              canUndo: undoDepth(update.state) > 0,
              canRedo: redoDepth(update.state) > 0,
            });
            if (!update.docChanged) return;
            const text = update.state.doc.toString();
            lastEmitted.current = text;
            onChangeRef.current(text);
          }),
        ],
      }),
    });

    viewRef.current = view;
    // Dev-only handle: makes the editor drivable from the console and from
    // browser tests. Stripped from production builds.
    if (import.meta.env.DEV) {
      (window as unknown as { __lipiEditor?: EditorView }).__lipiEditor = view;
    }
    const scroller = view.scrollDOM;
    const handleScroll = () => onScrollRef.current();
    scroller.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Adopt external changes (document switch, import, undo from elsewhere)
   * without clobbering what the user is typing. */
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === lastEmitted.current) return;
    if (value === view.state.doc.toString()) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      selection: { anchor: 0 },
      scrollIntoView: false,
    });
    lastEmitted.current = value;
  }, [value]);

  // A new document starts at the top, not wherever the last one was scrolled to.
  useEffect(() => {
    const view = viewRef.current;
    if (view) view.scrollDOM.scrollTop = 0;
  }, [docId]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: lineNumberComp.reconfigure(
        showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [],
      ),
    });
  }, [showLineNumbers, lineNumberComp]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: darkComp.reconfigure(EditorView.darkTheme.of(dark)) });
  }, [dark, darkComp]);

  useImperativeHandle(ref, () => ({
    view: () => viewRef.current,
    focus: () => viewRef.current?.focus(),

    scrollToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const { doc } = view.state;
      const number = Math.max(1, Math.min(doc.lines, Math.floor(line) + 1));
      const pos = doc.line(number).from;
      const coords = view.coordsAtPos(pos);
      if (!coords) {
        // Target is outside the rendered viewport, so let CodeMirror get there.
        view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'start' }) });
        return;
      }
      const top = view.scrollDOM.getBoundingClientRect().top;
      view.scrollDOM.scrollTop += coords.top - top;
    },

    topLine() {
      const view = viewRef.current;
      if (!view) return 0;
      const rect = view.scrollDOM.getBoundingClientRect();
      const pos = view.posAtCoords({ x: rect.left + 8, y: rect.top + 1 }, false);
      const line = view.state.doc.lineAt(pos);
      const coords = view.coordsAtPos(line.from);
      if (!coords) return line.number - 1;
      const height = Math.max(1, coords.bottom - coords.top);
      const fraction = Math.min(1, Math.max(0, (rect.top - coords.top) / height));
      return line.number - 1 + fraction;
    },
  }));

  return (
    <div
      className="editor"
      ref={hostRef}
      style={{ ['--editor-font-size' as string]: `${fontSize}px` }}
    />
  );
});
