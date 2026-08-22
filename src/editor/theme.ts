import { Decoration, EditorView, MatchDecorator, ViewPlugin, type DecorationSet } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Colours come from the app's CSS custom properties, so one theme definition
 * serves both light and dark — only CodeMirror's `dark` flag is swapped.
 */
export const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--fg)',
    backgroundColor: 'var(--bg-editor)',
    fontSize: 'var(--editor-font-size)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.7',
    overflowY: 'auto',
  },
  '.cm-content': {
    caretColor: 'var(--accent)',
    padding: '20px 0 50vh',
  },
  '.cm-line': { padding: '0 22px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--selection)',
  },
  '.cm-activeLine': { backgroundColor: 'var(--bg-active-line)' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--fg-faint)',
    border: 'none',
    paddingRight: '4px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--fg-muted)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--selection-match)' },
  '.cm-searchMatch': { backgroundColor: 'var(--selection-match)', outline: '1px solid var(--border)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--accent-soft)' },
  '.cm-panels': {
    backgroundColor: 'var(--bg-raised)',
    color: 'var(--fg)',
    border: 'none',
    borderTop: '1px solid var(--border)',
  },
  '.cm-panel input, .cm-panel button': {
    fontFamily: 'inherit',
    background: 'var(--bg-input)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    padding: '2px 6px',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
  },
});

export const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, color: 'var(--syn-heading)', fontWeight: '700', fontSize: '1.5em' },
  { tag: t.heading2, color: 'var(--syn-heading)', fontWeight: '700', fontSize: '1.3em' },
  { tag: t.heading3, color: 'var(--syn-heading)', fontWeight: '700', fontSize: '1.15em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: 'var(--syn-heading)', fontWeight: '700' },
  { tag: t.strong, fontWeight: '700', color: 'var(--fg-strong)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--fg-strong)' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--fg-muted)' },
  { tag: t.link, color: 'var(--syn-link)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--syn-link)' },
  { tag: t.monospace, color: 'var(--syn-code)' },
  { tag: t.quote, color: 'var(--fg-muted)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--syn-marker)' },
  { tag: t.contentSeparator, color: 'var(--syn-marker)' },
  // Markdown punctuation (`##`, `**`, fence markers) stays quiet.
  { tag: t.processingInstruction, color: 'var(--syn-marker)' },
  { tag: t.labelName, color: 'var(--syn-link)' },

  /* Fenced code, highlighted by the nested JavaScript grammar. */
  { tag: t.keyword, color: 'var(--syn-keyword)' },
  { tag: [t.controlKeyword, t.moduleKeyword], color: 'var(--syn-keyword)' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: 'var(--fg)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syn-fn)' },
  { tag: [t.definition(t.variableName)], color: 'var(--syn-def)' },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--syn-type)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syn-number)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--syn-string)' },
  { tag: [t.comment, t.blockComment, t.lineComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: 'var(--syn-punct)' },
  { tag: t.invalid, color: 'var(--danger)' },
]);

/**
 * Highlights transliteration macros (`@kannada(...)`, `:::telugu`) in the source
 * so it is obvious which text will change script in the preview.
 */
const macroMatcher = new MatchDecorator({
  regexp: /@([A-Za-z_][\w]*)?(?::[A-Za-z_][\w]*)?\([^)\n]*\)|^:::[ \t]*[A-Za-z_][\w]*.*$/gm,
  decoration: Decoration.mark({ class: 'cm-lipi-macro' }),
});

export const macroHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = macroMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = macroMatcher.updateDeco(update, this.decorations);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export const editorTheme = [baseTheme, syntaxHighlighting(markdownHighlight), macroHighlighter];
