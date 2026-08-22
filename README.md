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

**Everything else** is ordinary Markdown — CommonMark plus tables, with
syntax-highlighted code blocks, an outline, autosave to IndexedDB, multi-document
sidebar, import/export (`.md`, standalone `.html`, print/PDF), light and dark
themes, and full offline operation once loaded.

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

That opaque origin is also why the animation runtimes are pre-built as IIFE
bundles into `public/runtimes/`: a sandboxed frame cannot import ES modules from
our origin without CORS headers a static host will not send, but a classic script
loads fine.

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
