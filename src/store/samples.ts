/**
 * The document every new install opens with.
 *
 * A real piece of writing rather than a feature tour, which nonetheless
 * exercises nearly the whole app: transliteration into two scripts, inline and
 * display maths, sidenotes, tables, blockquotes, links, an embedded figure, a
 * live sketch, a diagram and a page break. The sketch runs offline, since the
 * Canvas runtime is part of the bundle; the diagram is the one thing here that
 * wants the network once, because Mermaid is fetched on first use — and it
 * falls back to showing its own description when there is none.
 *
 * Deliberately no presentation keys in its frontmatter. They would outrank the
 * theme picker in Settings, so the first document a reader opens would ignore
 * the theme they chose — which has confused people before, including me. The
 * colophon shows the keys instead of setting them.
 */
export const WELCOME_DOC = `---
title: Baudhāyana's theorem
script: kannada
scheme: optitrans_dravidian
author: Shashank Bangalore Lakshman
link: https://shashankbl.github.io
version: 1.0
---

# Baudhāyana's theorem


Some three centuries before Pythagoras was born, a Vedic ritualist writing
instructions for building altars set down the relation that now carries the
Greek name. This is a short summary in English, @sa:iast(saṃskṛta) and
@lipi(kannaDa).

## Practical origins of the theorem

The **Baudhāyana Śulbasūtra** belongs to the Kalpasūtra of the Taittirīya school
of the Kṛṣṇa Yajurveda, and is usually placed around the eighth century
BCE.^[Dates for the Śulbasūtras are inferred from language and ritual context
rather than fixed externally, so the range 800–500 BCE is safer than any single
year. Kim Plofker, *Mathematics in India* (Princeton, 2009), ch. 2.] *Śulba*
means cord, and that is exactly what the manual is about: laying out fire altars
of prescribed shape and area with pegs and a stretched rope.

\`\`\`mermaid
flowchart TD
  A["Kṛṣṇa Yajurveda"] --> B["Taittirīya school"]
  B --> C["Kalpasūtra — the ritual manuals"]
  C --> D["Śrautasūtra — public rites"]
  C --> E["Gṛhyasūtra — domestic rites"]
  C --> F["Śulbasūtra — laying out the altar"]
  F --> G["Baudhāyana, c. 800 BCE"]
\`\`\`

The geometry is not decorative. A ritual altar had to have an exact area, and
was sometimes required to be rebuilt in a different shape while keeping that
area unchanged — turning a square into a rectangle, or into a circle of the same
size. Rules for squares, diagonals and areas were the working tools of the job,
which is why they were written down with such care.

## The rule, in Sanskrit

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

## @lipi(kannaDadalli)

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

## The mathematics

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

## Triples the text lists

Baudhāyana does not only state the rule; he lists cords that give exact right
angles, which is to say integer solutions of $a^{2}+b^{2}=c^{2}$.

| $a$ | $b$ | $c$ | check |
| --- | --- | --- | --- |
| 3 | 4 | 5 | 9 + 16 = 25 |
| 5 | 12 | 13 | 25 + 144 = 169 |
| 8 | 15 | 17 | 64 + 225 = 289 |
| 7 | 24 | 25 | 49 + 576 = 625 |
| 12 | 35 | 37 | 144 + 1225 = 1369 |

Which is quickly checked:

\`\`\`js
const cords = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [12, 35, 37]];
cords.every(([a, b, c]) => a * a + b * b === c * c);   // true
\`\`\`

A rope knotted into twelve equal parts and pulled taut into a 3–4–5 triangle
gives a true right angle with no instrument at all — precisely what a priest
laying out an altar needed.

## The diagonal of a square

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

Why the diagonal matters so much to the manual: the square built on it has
exactly twice the area of the square you started with, which is how an altar
was doubled without changing its shape.

![A unit square beside the square built on its diagonal](data:image/webp;base64,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 "The square on the diagonal has twice the area — four triangles where the first square had two")

:::lipi
eraDara vargamuulakke baudhaayana koTTa aMdaaju aidu dashamaaMsha
sthaanagaLavarege sariyaagide.
:::

## Where it sits in history

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

\\newpage

## Sources

- S. N. Sen and A. K. Bag, *The Śulbasūtras* (Indian National Science Academy,
  1983) — the standard edition, with translation and commentary.
- Kim Plofker, *Mathematics in India* (Princeton University Press, 2009).
- Bibhutibhusan Datta, *The Science of the Śulba* (University of Calcutta, 1932).
- George Gheverghese Joseph, *The Crest of the Peacock*, 3rd ed. (Princeton
  University Press, 2011).

## A note on the setting

Everything above is one plain Markdown file. The Sanskrit and the Kannada are
typed in Latin letters and turned into their own scripts on the way to the page,
the formulas are TeX, the diagram is six lines of Mermaid, one figure is a
drawing carried inside the file and the other is a sketch that runs while you
read it. Open the **Write** pane and read the source beside the page.

These colours are the app's. To give a document its own, name them at the top of
the file — there are nine themes, and every part of the page can be set by hand:

\`\`\`
---
theme: paper
font: serif
align: justify
width: normal
---
\`\`\`

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

