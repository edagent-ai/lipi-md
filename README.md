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
Good morning is @kannada(shubhodaya), and thank you is @telugu(dhanyavaadamulu).

:::lipi
bhaagyada lakshmi baaramma
nammamma nee saubhaagyada lakshmi baaramma
:::
```

Inline macros convert one phrase. `:::` blocks convert everything inside them —
built for lyrics and verse, so line breaks are preserved. Links, code spans and
emphasis markers are never touched. 20+ target scripts, 11 input schemes.

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
| `anime` | Anime.js against a `stage` element | yes |
| `js run` | plain JavaScript against `stage` | yes |
| `p5` | p5.js `setup()` / `draw()` | optional add-on |

Options follow the name: `height=420`, `height=auto`, `title="…"`, `manual`
(wait for a click), `code` (show source), `norun` (keep as documentation).

**Formulas.** LaTeX inline as `$E = mc^2$` or displayed between `$$`. Prices are
safe — `$5 and $10` stays text. Exports emit MathML, so an exported page renders
maths with no fonts and no scripts.

**Pictures, video and sidenotes.** One syntax; the link decides the player:

```markdown
![A photo](https://…/photo.jpg "Caption")     picture with a caption
![A clip](https://…/clip.mp4)                 video player
![A talk](https://youtu.be/ID)                YouTube / Vimeo embed

An assertion.^[A margin note, which may hold *emphasis* and [links](https://…).]
```

Sidenotes sit in the margin when the pane is wide enough, and collapse behind a
tappable number when it is not.

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

`npm run build:runtimes` (wired into `dev` and `build`) pre-bundles the sandbox
animation runtimes into `public/runtimes/` — see the note on sandboxing below.

---

## Design notes

**Sandboxing.** Every sketch runs in an `<iframe sandbox="allow-scripts">`. With
no `allow-same-origin` the frame gets an opaque origin, so it cannot reach this
document, its IndexedDB, or its service worker. User code never travels in the
frame's markup — it arrives over `postMessage`, which sidesteps HTML escaping and
lets a sketch re-run without a reload.

That opaque origin also dictates how runtimes load. A sandboxed frame cannot
import ES modules from our origin (a static host sends no CORS headers), and it
is not controlled by the service worker either — so a `<script src>` from inside
one bypasses the offline cache and goes to the network. Runtimes are therefore
pre-built as IIFE bundles into `public/runtimes/`, fetched by the *parent* where
the service worker does apply, and injected as inline source. The p5 add-on
takes the same path out of IndexedDB.

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
| Anime.js | MIT |
| KaTeX | MIT |
| React | MIT |
| Vite, `vite-plugin-pwa` | MIT |

Build-time only (never shipped to the browser): TypeScript and Playwright, both
Apache-2.0/MIT permissive.

### Why p5.js is an add-on

p5.js is **LGPL-2.1**, not MIT, so bundling it would break the "100% MIT
dependencies" property. It is instead an opt-in add-on: installed once from
**Settings → p5.js add-on**, stored unmodified and separately in IndexedDB, and
replaceable at any time with your own build ("Install from file" also works
fully offline). After the one-time install, p5 sketches run offline like
everything else.

---

## Privacy

Nothing is uploaded. The only network request the app makes on its own is
fetching itself; the optional p5.js download is the sole exception, and only when
you ask for it. Documents live in this browser's IndexedDB (with a localStorage
fallback where IndexedDB is blocked) and never leave the device.

## Known limitations

- Motion-sensor APIs (`deviceMoved`, `rotationX`) are not granted to sandboxes,
  by design — least privilege for code that may have been pasted from elsewhere.
- Runnable fences must be at the top level; one nested in a list or quote renders
  as a static code block with a note explaining why.
- Indic rendering uses system fonts, so glyph coverage depends on the OS. No
  webfont is downloaded, which is what keeps the app fully offline.
