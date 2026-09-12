# lipi.md

**Type text. Render worlds.**

An offline-first Markdown editor that turns plain text into interactive documents:
live JavaScript sketches and native Indic script, with no build step, no server
and no account. Everything runs in the browser and stays on your device.

> *lipi* (ಲಿಪಿ) means "script" — the written form of a language.

---

## What it does

**Native script from phonetic English.** Type `@kannada(namaskaara)` and the
preview paints ನಮಸ್ಕಾರ. The `.md` file keeps the roman spelling, so it stays
searchable, diffable and editable on any keyboard.

```markdown
Good morning is @kannada(shubhodaya), and welcome is @sa(svāgatam).

:::lipi
bhaagyada lakshmi baaramma
nammamma nee saubhaagyada lakshmi baaramma
:::
```

Inline macros convert one phrase. `:::` blocks convert everything inside them —
built for lyrics and verse, so line breaks are preserved. Links, code spans and
emphasis markers are never touched. Two target scripts — Kannada and Devanagari
— and 11 input schemes. Sanscript can paint a dozen more, but offering a script
is a promise to have looked at its fonts, conjuncts and punctuation, and these
are the two that have been.

**Typefaces.** A document can carry its own font. *Insert → Typeface from a
file* embeds a `.woff2`, `.woff`, `.ttf` or `.otf` as a data URL in `fontsrc:`
and names it in `font:`, so the document looks the same wherever it is opened —
including offline, in the PDF, and on a machine that has never had the font.
*Typeface from Google Fonts* fetches one by name and embeds it the same way.
That request is the only one the app ever makes to anyone but itself, it happens
when you ask for it, and it happens once: reopening the document contacts no
one, and neither does a reader of the exported page. A stylesheet link, by
contrast, would report every reader to Google forever and leave the document
looking wrong with no network.

**Diagrams.** A ```` ```mermaid ```` fence is drawn with Mermaid (MIT), to SVG,
so it stays sharp in exports and the PDF with nothing fetched at read time. The
library is larger than the rest of the app put together, so it is deliberately
not precached: it is fetched the first time a document asks for a diagram —
about 640KB over the wire — and the service worker keeps it, so diagrams work
offline from then on. The offline install stays at 2MB for everyone else.

**Reports from a folder.** A folder of documents can be bound into one report —
contents list, page breaks, inherited styling — with the ▤ button beside its name
in the sidebar. See *Folders* below.

**Page breaks.** A line holding only `\newpage` (or `\pagebreak`) starts a new
page when the document is printed or exported as a PDF. It shows as a faint rule
while you write and leaves no mark on paper.

**Live sketches.** A fenced block with a runtime name runs instead of sitting
there. Edit a number and it updates in place — the frame is never reloaded, so
the library stays warm and there is no flash.

````markdown
```canvas height=300
loop((t) => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#6ea8fe';
  ctx.fillRect(Math.sin(t / 500) * 80 + width / 2, height / 2, 40, 40);
});
```
````

| Fence | Runs on | Ships with the app |
| --- | --- | --- |
| `canvas` | 2D canvas with `ctx`, `width`, `height`, `loop()` | yes |
| `js run` | plain JavaScript against a `stage` element | yes |

Options follow the name: `height=420`, `height=auto`, `title="…"`, `manual`
(wait for a click), `code` (show source), `norun` (keep as documentation).

**Formulas.** LaTeX inline as `$E = mc^2$` or displayed between `$$`. Prices are
safe — `$5 and $10` stays text. Exports emit MathML, so an exported page renders
maths with no fonts and no scripts.

**Pictures from your own machine.** *Insert → Picture from a file*, or drop one
on the window, embeds it in the document as a data URL — scaled to 1600px and
re-encoded if it is large. It goes in as a reference link, so the prose keeps
`![caption][label]` and the long URL sits at the foot of the file. Embedding
rather than linking is what lets a document stay one file that works offline and
survives export, the zip and the mirrored folder; the cost is that a picture
adds its own weight to the Markdown.

**Pictures, video and sidenotes.** One syntax; the link decides the player:

```markdown
![A photo](https://…/photo.jpg "Caption")     picture with a caption
![A clip](https://…/clip.mp4)                 video player
![A talk](https://youtu.be/ID)                YouTube / Vimeo embed

An assertion.^[A margin note, which may hold *emphasis* and [links](https://…).]
```

Sidenotes sit in the margin when the pane is wide enough, and collapse behind a
tappable number when it is not.

**Themes.** Nine presets — Paper, Manuscript, Slate, Terminal, Blueprint,
Academic, Technical, High contrast and Dyslexia-friendly — set from the toolbar
or as a default in Settings. Academic is a justified serif on a short measure,
the shape a journal article is read in; Technical is white on dark grey with
purple headings, on a wide measure for documents carrying tables, code and
figures that a prose column would crush; Terminal is green monospace on
near-black. A theme may colour headings apart from the body ink, and every
preset is checked for contrast against all of its own elements. The dyslexia-friendly one follows the usual guidance: a plain sans
face, larger text, loosened line, letter and word spacing, a short measure,
ragged-right lines and an off-white page. Letter-spacing is suppressed on Indic
text, where it would break conjuncts.

**Per-document styling,** declared in the file itself so it travels with it and
carries through to exports:

```yaml
---
font: serif        # sans | serif | mono
align: justify     # left | justify | center
width: wide        # narrow | normal | wide | full | 40rem
size: 17px
background: "#fffdf7"
color: "#2b2b2b"
accent: "#bf5700"
---
```

Every value is validated against an allowlist before it reaches a stylesheet —
these strings would otherwise be an easy route to injected CSS.

**Everything else** is ordinary Markdown — CommonMark plus tables, with
syntax-highlighted code blocks, an outline, autosave to IndexedDB, multi-document
sidebar, an auto-generated page menu that highlights the section you are
reading, light and dark themes, and full offline operation once loaded.

**Export** comes in three forms, all offline:

- **`.md`** — your source exactly as written, phonetic spellings intact.
- **`.html`** — one self-contained file with the transliteration already applied,
  so it reads correctly anywhere with no fonts to install and no scripts to run.
- **`.pdf`** — via the browser's own print pipeline, which is the only thing that
  shapes Indic conjuncts correctly (a JS PDF library would mangle them) and costs
  no dependency.

The HTML and PDF exports capture each sketch as a still image, snapshotted from
the live sandbox — including sketches you never scrolled to, which are started
just to be captured. A sketch that draws to the DOM rather than a canvas falls
back to printing its source.

---

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build
npm run typecheck
```

---

## Design notes

**Sandboxing.** Every sketch runs in an `<iframe sandbox="allow-scripts">`. With
no `allow-same-origin` the frame gets an opaque origin, so it cannot reach this
document, its IndexedDB, or its service worker. User code never travels in the
frame's markup — it arrives over `postMessage`, which sidesteps HTML escaping and
lets a sketch re-run without a reload.

That opaque origin is also why the sketch runtimes carry no library. A sandboxed
frame cannot import ES modules from our origin (a static host sends no CORS
headers), and it is not controlled by the service worker either — so a
`<script src>` from inside one bypasses the offline cache and goes to the
network. Every runtime is therefore self-contained: `canvas` and `js run` are a
few dozen lines of the bootstrap itself, and work offline because there is
nothing to fetch. Diagrams take the other route — Mermaid renders in the *parent*
page, where the service worker does apply.

**No CSP header is set,** deliberately. `srcdoc` frames inherit the parent
document's CSP, so a strict `script-src` would break every sandbox. Isolation is
enforced by the `sandbox` attribute instead, which is the stronger guarantee here.

**Live reload without remounting.** The preview is reconciled by hand rather than
through JSX, because re-inserting an `<iframe>` reloads it — which would restart
every animation on every keystroke. Segment keys are positional (`run:0`,
`html:1`), so ordinary typing leaves the key sequence untouched and each node
stays exactly where it is.

**Scroll sync** is line-anchored, not percentage-based: every block element
carries a `data-line` attribute, so the two panes interpolate between known
points instead of guessing.

**KaTeX loads only when a document contains maths** — it is a separate 258KB
chunk, still precached so offline documents render. Only its `woff2` fonts are
precached; the legacy `ttf`/`woff` variants that its stylesheet also references
are never requested by a current browser.

**Raw HTML is disabled** in the Markdown parser. Input is Markdown only, which
removes the injection surface rather than trying to sanitise it afterwards.

---

## Licence

lipi.md is **MIT** licensed, and every library it ships is MIT too:

| Dependency | Licence |
| --- | --- |
| markdown-it | MIT |
| CodeMirror 6 (`@codemirror/*`, `@lezer/*`) | MIT |
| `@indic-transliteration/sanscript` | MIT |
| KaTeX | MIT |
| Mermaid | MIT |
| OpenDyslexic (bundled font) | SIL OFL-1.1 |
| React | MIT |
| Vite, `vite-plugin-pwa` | MIT |

Build-time only (never shipped to the browser): TypeScript and Playwright, both
Apache-2.0/MIT permissive.

The app icon is the Kannada syllable **ಲಿ** (*li*), the first of *lipi*. It is
shaped from ಲ + ಿ, which the font resolves to a single ligature, and its outline
is derived from Noto Serif Kannada (SIL Open Font License 1.1) and converted to
a path — so the mark needs no font installed to render, and no proprietary font
is embedded.

---

## Privacy

Nothing is uploaded. The only network requests the app makes on its own are for
itself; fetching a Google font, or the diagram library the first time a document
draws one, are the exceptions, and both happen only when you ask, once. An embedded font is then part of the document,
so no reader of it ever contacts Google. Documents live in this browser's IndexedDB (with a localStorage
fallback where IndexedDB is blocked) and never leave the device. If you point the
app at a folder (see below), it writes copies there too — still on your machine,
still nowhere else.

**Folders.** Documents are filed by the `folder:` path in their own frontmatter,
so the arrangement travels with the file through export and re-import. The
sidebar shows them as a collapsible tree, nesting up to eight deep, and a
document or a whole branch can be dragged onto another folder — or onto the
empty space below the tree for the top level. The folder button above the
document list makes a new one and starts its first page.

A folder made that way is remembered in its own right, so deleting the documents
inside it leaves it standing; it goes when you remove it, and not before. Empty
folders are local to the app, since there is no document to carry one into an
export or the mirrored directory. Nothing the app writes to your own folder is
ever deleted for being empty.

**Reports.** A folder holding two or more documents offers a ▤ button beside its
name, which binds everything filed under it — subfolders included, depth first —
into one report document: a contents list linking each chapter, a `\newpage`
between them, and the folder's theme, typeface and byline carried over. Chapters
run alphabetically unless they name their own place with `order:` in their
frontmatter; ones that do come first, in the order they ask for.

The result is an ordinary Markdown document, filed in the folder it was built
from and marked `report:` in its frontmatter. That marker does two jobs: a report
is never bound into another report, and pressing ▤ again rebuilds the existing
one in place instead of leaving a trail of copies. Because it is an ordinary
document, every other feature already works on it — editing, searching, printing,
and export to Markdown, HTML or PDF.

**Search.** ⌘F searches the open page; the field above the document list
searches the whole library. Both match three ways — the text as rendered, the
phonetic spelling the author typed, and a romanisation of native script — so
`namaskaara`, `ನಮಸ್ಕಾರ` and `samskrta` all find what you meant regardless of how
it was written. A library hit opens the document with the same query running.

**On first run** the library holds one document: a guide. Its first half explains
how to write each part of the app; its second is a trilingual essay in English,
Sanskrit and Kannada — the Baudhāyana theorem — written with all of it, so the
pieces can be seen doing actual work rather than only described. It can be reset
but not deleted, so it is always there to come back to.

**A new document** starts with the full style block — every key that changes how
a page is presented, filled in — and a few lines of Markdown: a heading, a link,
a note, a macro, a list and a quotation. Delete a line and that decision returns
to `theme:`; delete `theme:` too and the page follows Settings.

## Keeping your documents

Documents live in this browser's IndexedDB, which is convenient and not durable:
the browser is entitled to evict it under storage pressure, and "clear site data"
erases it without warning. **Settings → Your data** offers three defences, and
reports honestly which of them are actually in effect.

The exported page and the PDF both carry the document's own colours. The PDF
colours the whole sheet, margins included: neither the root background nor a
fixed element reaches the margin area, but a background on the `@page` rule
paints all of it and leaves the running header and page numbers in place.

- **Durable storage.** Asks the browser to stop treating the library as
  disposable. Chrome decides from engagement and whether the app is installed and
  never prompts; Firefox asks. The panel says plainly whether the answer was yes.
- **A folder on your computer.** Every document is also written out as an
  ordinary `.md` file into a directory you pick, laid out in the folders you
  filed them under. Those files outlive the browser profile entirely, open in any
  editor, and go wherever your usual backups already go. A small `.lipi-md.json`
  manifest beside them records identity and timestamps, so reading the folder
  back updates documents in place instead of duplicating them — and Markdown you
  wrote elsewhere and dropped into the folder is picked up as a new document.
  Needs the File System Access API, so Chromium browsers only.
- **A zip of the Markdown.** Every document as a `.md` file in the folders you
  filed it under, plus the manifest — so unzipping it and pointing *Choose a
  folder* at the result reads the library back with dates and identities intact.
  Written with the browser's own `CompressionStream`, so no compressor is
  bundled to produce it.
- **A backup file.** The whole library as one file, for moving between browsers
  or for anywhere the folder option is unavailable. Restoring the same file twice
  changes nothing the second time.

The folder mirror is deliberately one-way: the app writes into it, and reads back
only when asked. Two-way sync needs conflict resolution, and silently guessing
which side won is a good way to lose the writing this exists to protect.

## Known limitations

- Motion-sensor APIs (`deviceMoved`, `rotationX`) are not granted to sandboxes,
  by design — least privilege for code that may have been pasted from elsewhere.
- Runnable fences must be at the top level; one nested in a list or quote renders
  as a static code block with a note explaining why.
- Indic rendering uses system fonts, so glyph coverage depends on the OS. No
  webfont is downloaded, which is what keeps the app fully offline.
