import type { EditorView } from '@codemirror/view';
import type { ChangeSpec, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

/** Toolbar and shortcut actions, all written as plain CodeMirror transactions. */

function selectionText(view: EditorView): string {
  const { from, to } = view.state.selection.main;
  return view.state.sliceDoc(from, to);
}

/** Wrap or unwrap the selection with a marker such as `**` or `` ` ``. */
export function toggleWrap(view: EditorView, marker: string, placeholder = ''): void {
  const { from, to, empty } = view.state.selection.main;
  const text = view.state.sliceDoc(from, to);
  const len = marker.length;

  const outerBefore = view.state.sliceDoc(Math.max(0, from - len), from);
  const outerAfter = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + len));

  if (text.startsWith(marker) && text.endsWith(marker) && text.length >= len * 2) {
    const inner = text.slice(len, -len);
    view.dispatch({
      changes: { from, to, insert: inner },
      selection: { anchor: from, head: from + inner.length },
    });
  } else if (outerBefore === marker && outerAfter === marker) {
    view.dispatch({
      changes: [
        { from: from - len, to: from, insert: '' },
        { from: to, to: to + len, insert: '' },
      ],
      selection: { anchor: from - len, head: to - len },
    });
  } else {
    const body = empty ? placeholder : text;
    view.dispatch({
      changes: { from, to, insert: `${marker}${body}${marker}` },
      selection: { anchor: from + len, head: from + len + body.length },
    });
  }
  view.focus();
}

/** Set or clear an ATX heading on every line the selection touches. */
export function toggleHeading(view: EditorView, level: number): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const changes: ChangeSpec[] = [];
  const prefix = '#'.repeat(level);

  for (let n = state.doc.lineAt(from).number; n <= state.doc.lineAt(to).number; n++) {
    const line = state.doc.line(n);
    const existing = /^(#{1,6})\s+/.exec(line.text);
    if (existing && existing[1] === prefix) {
      changes.push({ from: line.from, to: line.from + existing[0].length, insert: '' });
    } else if (existing) {
      changes.push({ from: line.from, to: line.from + existing[0].length, insert: `${prefix} ` });
    } else {
      changes.push({ from: line.from, insert: `${prefix} ` });
    }
  }
  view.dispatch({ changes });
  view.focus();
}

/** Prefix each selected line, or strip the prefix if every line already has it. */
export function togglePrefix(view: EditorView, prefix: string): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const first = state.doc.lineAt(from).number;
  const last = state.doc.lineAt(to).number;

  let allPrefixed = true;
  for (let n = first; n <= last; n++) {
    if (!state.doc.line(n).text.startsWith(prefix)) allPrefixed = false;
  }

  const changes: ChangeSpec[] = [];
  for (let n = first; n <= last; n++) {
    const line = state.doc.line(n);
    if (allPrefixed) changes.push({ from: line.from, to: line.from + prefix.length, insert: '' });
    else changes.push({ from: line.from, insert: prefix });
  }
  view.dispatch({ changes });
  view.focus();
}

export function insertLink(view: EditorView): void {
  const { from, to, empty } = view.state.selection.main;
  const label = empty ? 'link text' : selectionText(view);
  const insert = `[${label}](https://)`;
  view.dispatch({
    changes: { from, to, insert },
    // Land the caret in the URL, which is what the user still has to fill in.
    selection: { anchor: from + insert.length - 1 },
  });
  view.focus();
}

/**
 * End of the frontmatter block, or 0 when there is none. The caret starts at
 * position 0 in a freshly opened document, so without this a menu insertion
 * would split the frontmatter and the rest of the file would be swallowed as
 * metadata.
 */
function frontmatterEnd(state: EditorState): number {
  if (state.doc.lines < 2 || state.doc.line(1).text.trim() !== '---') return 0;
  for (let n = 2; n <= state.doc.lines; n++) {
    const line = state.doc.line(n);
    const text = line.text.trim();
    if (text === '---' || text === '...') return line.to;
  }
  return 0;
}

/**
 * Nesting a fence inside another fence silently produces broken Markdown, so an
 * insertion landing inside a code block is pushed past the end of it.
 */
function blockInsertPoint(state: EditorState, pos: number): number {
  const node = syntaxTree(state).resolveInner(pos, 1);
  for (let current: typeof node | null = node; current; current = current.parent) {
    if (current.name === 'FencedCode' || current.name === 'CodeBlock') {
      return Math.max(current.to, frontmatterEnd(state));
    }
  }
  return Math.max(pos, frontmatterEnd(state));
}

/** Insert a block on a line of its own, separated from the surrounding prose. */
export function insertBlock(view: EditorView, block: string): void {
  const { state } = view;
  const pos = blockInsertPoint(state, state.selection.main.to);
  const line = state.doc.lineAt(pos);

  const atLineStart = pos === line.from && line.text.length === 0;
  const insertAt = atLineStart ? line.from : line.to;
  const before = atLineStart ? '' : '\n\n';
  const insert = `${before}${block}\n`;

  // Leave the caret on the first line inside the block, ready to edit.
  const firstBreak = block.indexOf('\n');
  const anchor = insertAt + before.length + (firstBreak < 0 ? block.length : firstBreak + 1);

  view.dispatch({
    changes: { from: insertAt, to: insertAt, insert },
    selection: { anchor },
    scrollIntoView: true,
  });
  view.focus();
}

/** Wrap the selection in a transliteration macro, e.g. `@kannada(...)`. */
export function wrapMacro(view: EditorView, script: string): void {
  const { from, to, empty } = view.state.selection.main;
  const body = empty ? 'namaskaara' : selectionText(view);
  const open = `@${script}(`;
  view.dispatch({
    changes: { from, to, insert: `${open}${body})` },
    selection: { anchor: from + open.length, head: from + open.length + body.length },
  });
  view.focus();
}

export const SNIPPETS = {
  p5: `\`\`\`p5 height=340
let angle = 0;

function setup() {
  createCanvas(400, 320);
}

function draw() {
  background(14, 16, 22);
  translate(width / 2, height / 2);
  noFill();
  stroke(120, 180, 255);
  strokeWeight(2);
  for (let i = 0; i < 24; i++) {
    rotate(angle / 40 + i);
    ellipse(0, 60, 140, 60);
  }
  angle += 1;
}
\`\`\``,

  canvas: `\`\`\`canvas height=280
loop((t) => {
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < 40; i++) {
    const x = width / 2 + Math.cos(t / 900 + i) * (40 + i * 4);
    const y = height / 2 + Math.sin(t / 700 + i) * (30 + i * 3);
    ctx.fillStyle = \`hsl(\${(i * 9 + t / 30) % 360} 80% 65%)\`;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
});
\`\`\``,

  anime: `\`\`\`anime height=200
stage.innerHTML = Array.from(
  { length: 12 },
  () => '<div class="dot"></div>'
).join('');

const style = document.createElement('style');
style.textContent = \`
  #stage { display: flex; gap: 8px; align-items: center; justify-content: center; }
  .dot { width: 18px; height: 18px; border-radius: 50%; background: #6ea8fe; }
\`;
document.head.appendChild(style);

animate('.dot', {
  translateY: [0, -40],
  scale: [1, 1.4],
  alternate: true,
  loop: true,
  duration: 900,
  ease: 'inOutSine',
  delay: stagger(80),
});
\`\`\``,

  translit: ':::lipi\nbhaagyada lakshmi baaramma\nnammamma shri saumangalyavanta\nlakshmi baaramma\n:::',

  table: '| Term | Meaning |\n| --- | --- |\n| @lipi(raaga) | melodic mode |\n| @lipi(taala) | rhythmic cycle |',
} as const;
