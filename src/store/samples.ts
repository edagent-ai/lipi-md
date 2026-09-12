/**
 * The document every new install opens with.
 *
 * A real piece of writing rather than a feature tour, which nonetheless
 * exercises the whole app: transliteration into two scripts, maths, a live
 * sketch, sidenotes, tables and per-document styling. It needs no network and
 * no add-on — the sketch uses the bundled Canvas runtime.
 */
export const WELCOME_DOC = `---
title: lipi.md — a guide
script: kannada
scheme: optitrans_dravidian
author: Shashank Bangalore Lakshman
link: https://shashankbl.github.io
version: 1.0
---

# lipi.md

A Markdown editor that writes in many scripts and runs entirely in your
browser. Nothing is uploaded; your documents stay on this device.

This page is the guide and the example at once. Everything below is plain
Markdown in the file behind it — open the **Write** pane and read the two side
by side. The second half is a real document written with all of it, so you can
see what the pieces look like when they are doing actual work.

## How to write it

**Scripts.** The Sanskrit is typed in IAST and the Kannada in Latin letters;
both are painted at render time, so the file stays searchable in the alphabet
you typed. Inline as \`@lipi(namaskaara)\` → @lipi(namaskaara), naming a script
as \`@kannada(kannaDa)\` → @kannada(kannaDa), or a whole \`:::lipi\` block.
\`script:\` and \`scheme:\` at the top of the file decide which script bare
macros use and which romanisation you type.

**Formulas.** Inline as \`$a^2+b^2=c^2$\`, or set apart between \`$$\`. They
export as MathML, so a saved page needs no fonts fetched from anywhere.

**Notes.** \`^[…]\` makes a note that rides with its sentence and shows in the
margin when there is room — the citations in the example below are all notes. Every one is
printed on paper, since a reader cannot click one open.

**Sketches.** A fence naming a runtime runs instead of sitting there as code.
A \`canvas\` fence hands you \`ctx\`, \`width\`, \`height\` and a \`loop()\` that is
called once a frame:

\`\`\`canvas height=130 title="Twelve knots in a rope"
loop((t) => {
  ctx.clearRect(0, 0, width, height);
  const gap = Math.min(34, width / 14);
  const left = (width - gap * 11) / 2;

  ctx.strokeStyle = '#c9b8a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, height / 2);
  ctx.lineTo(left + gap * 11, height / 2);
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    // A knot lifts, then the one after it, so the rope reads left to right.
    const lift = Math.sin(t / 160 - i * 0.5);
    const y = height / 2 - Math.max(0, lift) * 14;
    ctx.fillStyle = i % 4 === 0 ? '#bf5700' : '#c9b8a0';
    ctx.beginPath();
    ctx.arc(left + i * gap, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
});
\`\`\`

Each sketch has its own bar: pause, restart, read what it logged, or show the
source. Add \`bare\` to the fence — \`\`\`canvas height=200 bare\`\`\` — and the bar
goes, leaving the drawing alone as a figure. \`js run\` does the same against a
plain \`stage\` element. They run sandboxed and cannot read your documents.

**Diagrams.** A \`mermaid\` fence is drawn as a diagram — flowcharts, sequences,
state machines, Gantt charts and the rest:

\`\`\`mermaid
flowchart LR
  A[Write] --> B{Render}
  B -->|ok| C[Read]
  B -->|error| D[Fix]
\`\`\`

It renders to SVG, so it stays sharp in the exported page and the PDF with
nothing to fetch. Mermaid is large, so it is downloaded the first time a
document asks for a diagram — about 640KB, once — and kept from then on. Until
it arrives, and if it never does, the description you wrote is shown instead.

**Code.** A fence with an ordinary language name is highlighted and left alone:

\`\`\`js
const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [12, 35, 37]];
triples.every(([a, b, c]) => a * a + b * b === c * c); // true
\`\`\`

**Pictures.** *Insert → Picture from a file*, or drop one on the window, embeds
it as base64 — so it travels with the document into the zip, the exported page
and the PDF, needing nothing from the network.

![A figure, drawn into the file itself](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAIAAACoK28rAAABoklEQVR42u3dvW3CQBiA4cNiEyrqTEEGyAK0jEObBTJAMgV1KiZIxwQUNDQg4dyvv+dpI2HFeXO6O2N7dfk7J1iKySlA0CBoEDQIGkGDoEHQIGgQNIIGQYOgQdAgaAQNggZBg6DhkXWdw5wOm0c/eju6qZFsVkVvkn3SsbIZKeiXUpY1/QY9O2VZ092iMEvNGT8HQfdSoaZpGXSJ/jRNm6DLladpagddujlNUy/oOrVpmtTVlcLmPj/8S3Rn/3Xuax+68sA5b3NayqGy9uUkzKEbzWtnHNHwHG02aITGCA0LC7rVPtqrxy2xjsaiEJJ96JwDgNVhkH3otXOHOTQIGgQNgkbQEDnoVndluxscIzSChhTvQTNDfMH/5vfnPdqfdrv7Ti59L0/AlO9/8WhZT6Ms0SwHMYeOOzyHPQPTEAOn4Zl6I3Tp2tRM7SlHueb++ckxV/qRz8DU8zhqbCa1feB5xp3pvDXbhxa0J/gjaO9YwVuwpMwYQXtPIcsMGpJL3yBoBA2CBkGDoEHQCBoEDYIGQYOgETQIGgQNggZBI2gY0BUzYo9zZfYyWAAAAABJRU5ErkJggg== "Pictures take a caption in quotes")

The same syntax covers the rest; the link decides what is built:

\`\`\`text
![alt](photo.jpg "A caption")           an image
![alt](https://youtu.be/ID)             a privacy-mode YouTube embed
![alt](https://example.com/clip.mp4)    a video player
![alt](https://example.com/song.mp3)    an audio player
\`\`\`

**The page.** The block at the top sets how a document is presented. This one
names none of the styling keys, so it follows whatever you choose in **Settings
→ Document theme** — try Terminal or Academic and watch it change. A document
that wants its own look writes them out:

\`\`\`text
theme: paper          one of the nine presets
font: serif           serif, sans, mono, reading
size: 17px            any length
width: normal         narrow, normal, wide, full
align: justify        left or justify
background: "#fdf9f2" the page
color: "#2c2924"      the ink
heading: "#7a1f2b"    headings, when they should differ
accent: "#8f4100"     links, rules and marks
title, author, date, version, link    the byline under the title
script, scheme        which script, and how you type it
folder: Notes/Vedic   where it is filed
\`\`\`

The nine themes are **Paper**, **Manuscript**, **Slate**, **Terminal**,
**Blueprint**, **Academic**, **Technical**, **High contrast** and
**Dyslexia-friendly**.

**Filing and finding.** \`folder:\` decides where a document sits; folders
nest, and a document or a whole branch can be dragged onto another in the
sidebar. The folder button above the document list makes an empty one to file
into. Inside a folder, documents are listed by name, with the report — if there
is one — at the top; the loose documents above the folders stay newest first.
⌘F searches the page you are reading and the field above the document
list searches every document — both match the rendered text, the phonetic
spelling you typed, and a romanisation of native script, so *namaskaara* and
*ನಮಸ್ಕಾರ* find each other.

**Reports.** A folder holding two or more documents offers a ▤ button beside
its name. It binds everything filed under it — subfolders included — into one
report: a contents list at the front, a page break between the chapters, and
the folder's own look carried over. Chapters run alphabetically unless they say
otherwise with \`order: 1\`, \`order: 2\` in their frontmatter. The report is an
ordinary document, so edit it, print it, export it. Press ▤ again and it is
rebuilt from whatever the folder holds now.

**Typefaces.** *Insert → Typeface from a file* sets the document in a font from
your own machine, carried inside it as \`fontsrc:\` — so it looks the same in the
zip, the exported page and the PDF, on a computer that has never had that font
installed. *Typeface from Google Fonts* will fetch one by name and embed it the
same way: Google is contacted once, when you ask, and never again — not when the
document is reopened, and not by anyone you send it to. A \`.woff2\` is usually
20–60KB; a \`.ttf\` can be ten times that.

**Page breaks.** A line holding only \\\\newpage starts a new page when the
document is printed or exported as a PDF. It shows as a faint rule while you
write, and leaves no mark on paper. \\\\pagebreak does the same thing.

**Keeping and taking it.** **Settings → Your data** will write every document
out as ordinary \`.md\` files into a folder you choose, hand you the library as
a zip, and ask the browser to hold on to them. **Export** gives you the
Markdown, a standalone web page, or a PDF that keeps this page's own colours.



\\newpage

## A worked example: Baudhāyana's theorem


Some three centuries before Pythagoras was born, a Vedic ritualist writing
instructions for building altars set down the relation that now carries the
Greek name. This is a short summary in English, @sa:iast(saṃskṛta) and
@lipi(kannaDa).

### Practical origins of the theorem

The **Baudhāyana Śulbasūtra** belongs to the Kalpasūtra of the Taittirīya school
of the Kṛṣṇa Yajurveda, and is usually placed around the eighth century
BCE.^[Dates for the Śulbasūtras are inferred from language and ritual context
rather than fixed externally, so the range 800–500 BCE is safer than any single
year. Kim Plofker, *Mathematics in India* (Princeton, 2009), ch. 2.] *Śulba*
means cord, and that is exactly what the manual is about: laying out fire altars
of prescribed shape and area with pegs and a stretched rope.

The geometry is not decorative. A ritual altar had to have an exact area, and
was sometimes required to be rebuilt in a different shape while keeping that
area unchanged — turning a square into a rectangle, or into a circle of the same
size. Rules for squares, diagonals and areas were the working tools of the job,
which is why they were written down with such care.

### The rule, in Sanskrit

The general statement, for a rectangle:^[Baudhāyana Śulbasūtra 1.48 in the
Sen–Bag edition; other editions number it 1.12. S. N. Sen and A. K. Bag, *The
Śulbasūtras* (Indian National Science Academy, 1983).]

:::devanagari:iast
dīrghacaturasrasyākṣṇayā rajjuḥ pārśvamānī tiryaṅmānī ca
yatpṛthagbhūte kurutastadubhayaṃ karoti
:::

> The cord stretched along the diagonal of a rectangle makes an area that the
> upright and the horizontal sides make together.

Read it as an instruction rather than an equation. A cord along the diagonal
encloses a square; so does each side; and the first square equals the other two
put together. The same book states the square case separately — the diagonal of
a square gives an area twice as large:

:::devanagari:iast
samacaturasrasyākṣṇayārajjurdviṣṭāvatīṃ bhūmiṃ karoti
:::

### @lipi(kannaDadalli)

:::lipi
baudhaayana shulbasuutravu yajnavEdigaLannu kaTTuva bagge bareda praachiina
graMtha. haggadiMda aLate maaDi chadara mattu aayatagaLannu rachisuva
vidhaanagaLannu adu vivarisuttade.

aayatada karNada mEle eLeda chadaravu, udda mattu agalada mEle eLeda chadaragaLa
mottakke samanaagiruttade. idE niyamavannu iMdu paithaagoras pramEya eMdu
kareyuttaare.
:::

Every Kannada line above is typed in the Latin alphabet in the source file, so
the document stays searchable and editable on any keyboard.

### The mathematics

For a right triangle with legs $a$ and $b$ and hypotenuse $c$:

$$
a^{2} + b^{2} = c^{2}
$$

The sketch below draws the 3–4–5 case with a real square standing on each side.
Count the cells: $9 + 16 = 25$.

\`\`\`canvas height=380 title="Squares on the sides of a 3–4–5 triangle"
const u = Math.min(width / 14, height / 12);
const ox = width / 2 - u * 0.6;
const oy = height / 2 + u * 2.4;

const A = { x: ox, y: oy };            // the right angle
const B = { x: ox + 4 * u, y: oy };    // leg b = 4
const C = { x: ox, y: oy - 3 * u };    // leg a = 3

const poly = (pts, fill, stroke) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

// Rule a square into unit cells, so the areas can simply be counted.
const grid = (pts, n, colour) => {
  const ex = { x: (pts[1].x - pts[0].x) / n, y: (pts[1].y - pts[0].y) / n };
  const ey = { x: (pts[3].x - pts[0].x) / n, y: (pts[3].y - pts[0].y) / n };
  ctx.strokeStyle = colour;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x + ex.x * i, pts[0].y + ex.y * i);
    ctx.lineTo(pts[0].x + ex.x * i + ey.x * n, pts[0].y + ex.y * i + ey.y * n);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pts[0].x + ey.x * i, pts[0].y + ey.y * i);
    ctx.lineTo(pts[0].x + ey.x * i + ex.x * n, pts[0].y + ey.y * i + ex.y * n);
    ctx.stroke();
  }
};

const label = (text, x, y, colour) => {
  ctx.fillStyle = colour;
  ctx.font = '600 ' + Math.round(u * 0.6) + 'px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
};

loop(() => {
  ctx.clearRect(0, 0, width, height);

  const sb = [A, B, { x: B.x, y: B.y + 4 * u }, { x: A.x, y: A.y + 4 * u }];
  poly(sb, 'rgba(110,168,254,.20)', '#6ea8fe');
  grid(sb, 4, 'rgba(110,168,254,.45)');
  label('4² = 16', (A.x + B.x) / 2, A.y + 2 * u, '#3f7fd0');

  const sa = [A, { x: A.x - 3 * u, y: A.y }, { x: C.x - 3 * u, y: C.y }, C];
  poly(sa, 'rgba(46,160,67,.20)', '#2ea043');
  grid(sa, 3, 'rgba(46,160,67,.45)');
  label('3² = 9', A.x - 1.5 * u, (A.y + C.y) / 2, '#2ea043');

  const n = { x: 3 * u, y: -4 * u };
  const sc = [B, C, { x: C.x + n.x, y: C.y + n.y }, { x: B.x + n.x, y: B.y + n.y }];
  poly(sc, 'rgba(191,87,0,.18)', '#bf5700');
  grid(sc, 5, 'rgba(191,87,0,.38)');
  label('5² = 25', (B.x + C.x) / 2 + n.x / 2, (B.y + C.y) / 2 + n.y / 2, '#bf5700');

  poly([A, B, C], 'rgba(255,222,89,.65)', '#8f4100');
});
\`\`\`

### Triples the text lists

Baudhāyana does not only state the rule; he lists cords that give exact right
angles, which is to say integer solutions of $a^{2}+b^{2}=c^{2}$.

| $a$ | $b$ | $c$ | check |
| --- | --- | --- | --- |
| 3 | 4 | 5 | 9 + 16 = 25 |
| 5 | 12 | 13 | 25 + 144 = 169 |
| 8 | 15 | 17 | 64 + 225 = 289 |
| 7 | 24 | 25 | 49 + 576 = 625 |
| 12 | 35 | 37 | 144 + 1225 = 1369 |

A rope knotted into twelve equal parts and pulled taut into a 3–4–5 triangle
gives a true right angle with no instrument at all — precisely what a priest
laying out an altar needed.

### The diagonal of a square

The same text needs the diagonal of a unit square, the *dvikaraṇī*, and gives a
remarkably good value for it:^[Baudhāyana Śulbasūtra 2.12. The text gives a
construction in words; the fraction is the modern reading of it.]

:::devanagari:iast
pramāṇaṃ tṛtīyena vardhayet tac caturthenātmacatustriṃśonena saviśeṣaḥ
:::

> Increase the measure by its third, and that third by its own fourth, less the
> thirty-fourth part of that fourth.

$$
\\sqrt{2} \\;\\approx\\; 1 + \\frac{1}{3} + \\frac{1}{3 \\cdot 4} - \\frac{1}{3 \\cdot 4 \\cdot 34} = \\frac{577}{408}
$$

That is $1.414215686\\ldots$ against a true value of $1.414213562\\ldots$ — correct
to five decimal places, from a rule stated entirely in words.

:::lipi
eraDara vargamuulakke baudhaayana koTTa aMdaaju aidu dashamaaMsha
sthaanagaLavarege sariyaagide.
:::

### Where it sits in history

It is worth being exact about what is and is not being claimed.

| When | Who | What |
| --- | --- | --- |
| c. 1800 BCE | Babylonian scribes | [Plimpton 322](https://en.wikipedia.org/wiki/Plimpton_322) tabulates Pythagorean triples |
| c. 800 BCE | Baudhāyana | earliest known general *statement* of the rule |
| c. 570–495 BCE | Pythagoras | the name attaches, by later tradition |
| c. 300 BCE | Euclid | first surviving deductive *proof*, *Elements* I.47 |
| 12th c. CE | Bhāskara II | a dissection proof, with the single word *behold* |

Babylonian scribes were working with triples a thousand years earlier, and their
value for $\\sqrt{2}$ on the tablet [YBC 7289](https://en.wikipedia.org/wiki/YBC_7289) is about three and a half times more
accurate than Baudhāyana's.^[YBC 7289 gives 1;24,51,10 in sexagesimal, that is
1.4142129…, an error of 6 × 10⁻⁷ against Baudhāyana's 2 × 10⁻⁶.] What is
distinctive about the Śulbasūtra is not priority over Babylon but form: a
general rule, stated for any rectangle, rather than a table of cases.

Nor is it a proof in the Greek sense. The Śulbasūtras assert and apply; they do
not derive. That difference is real, and it is why both names belong on the
theorem rather than either one alone.

### Sources

- S. N. Sen and A. K. Bag, *The Śulbasūtras* (Indian National Science Academy,
  1983) — the standard edition, with translation and commentary.
- Kim Plofker, *Mathematics in India* (Princeton University Press, 2009).
- Bibhutibhusan Datta, *The Science of the Śulba* (University of Calcutta, 1932).
- George Gheverghese Joseph, *The Crest of the Peacock*, 3rd ed. (Princeton
  University Press, 2011).

---

*Compiled with lipi.md — type text, render worlds. This page cannot be deleted,
only **reset** from the sidebar, so it is always here to come back to.*
`;

export const BLANK_DOC = `---
title: Untitled
author:
date:
version: 1.0
folder:
script: kannada
scheme: optitrans
theme: paper
font: serif
size: 17px
width: normal
align: left
background: "#fdf9f2"
color: "#2c2924"
heading: "#2c2924"
accent: "#8f4100"
---

# Untitled

Start writing here. Everything above the second \`---\` is the page style block:
delete a line and that decision goes back to \`theme:\`, delete \`theme:\` too and
it follows whatever you chose in **Settings**.

## A section

A **bold** word, some *emphasis*, and a [link](https://example.com). A note can
ride alongside the sentence it belongs to.^[Notes show in the margin when the
pane is wide enough for them.]

Type phonetically to get another script: @lipi(namaskaara).

- something
- something else

> A quotation, for the rule beside it.

## Code and pictures

A fence with a language name is highlighted and left as code; naming a runtime
instead — \`canvas\`, or \`js run\` — runs it:

\`\`\`js
const greet = (name) => \`namaskaara, \${name}\`;
console.log(greet('world'));
\`\`\`

An image takes a caption in quotes. This one is drawn into the file itself, so
it needs nothing from the network:

![A small figure](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAIAAACoK28rAAABoklEQVR42u3dvW3CQBiA4cNiEyrqTEEGyAK0jEObBTJAMgV1KiZIxwQUNDQg4dyvv+dpI2HFeXO6O2N7dfk7J1iKySlA0CBoEDQIGkGDoEHQIGgQNIIGQYOgQdAgaAQNggZBg6DhkXWdw5wOm0c/eju6qZFsVkVvkn3SsbIZKeiXUpY1/QY9O2VZ092iMEvNGT8HQfdSoaZpGXSJ/jRNm6DLladpagddujlNUy/oOrVpmtTVlcLmPj/8S3Rn/3Xuax+68sA5b3NayqGy9uUkzKEbzWtnHNHwHG02aITGCA0LC7rVPtqrxy2xjsaiEJJ96JwDgNVhkH3otXOHOTQIGgQNgkbQEDnoVndluxscIzSChhTvQTNDfMH/5vfnPdqfdrv7Ti59L0/AlO9/8WhZT6Ms0SwHMYeOOzyHPQPTEAOn4Zl6I3Tp2tRM7SlHueb++ckxV/qRz8DU8zhqbCa1feB5xp3pvDXbhxa0J/gjaO9YwVuwpMwYQXtPIcsMGpJL3yBoBA2CBkGDoEHQCBoEDYIGQYOgETQIGgQNggZBI2gY0BUzYo9zZfYyWAAAAABJRU5ErkJggg== "Replace this with your own picture")
`;

