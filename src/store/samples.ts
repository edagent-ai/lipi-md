/**
 * The document every new install opens with.
 *
 * A real piece of writing rather than a feature tour, which nonetheless
 * exercises the whole app: transliteration into two scripts, maths, a live
 * sketch, sidenotes, tables and per-document styling. It needs no network and
 * no add-on — the sketch uses the bundled Canvas runtime.
 */
export const WELCOME_DOC = `---
title: Baudhāyana's theorem
script: kannada
scheme: optitrans_dravidian
font: serif
width: normal
accent: "#bf5700"
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

:::lipi
eraDara vargamuulakke baudhaayana koTTa aMdaaju aidu dashamaaMsha
sthaanagaLavarege sariyaagide.
:::

## Where it sits in history

It is worth being exact about what is and is not being claimed.

| When | Who | What |
| --- | --- | --- |
| c. 1800 BCE | Babylonian scribes | Plimpton 322 tabulates Pythagorean triples |
| c. 800 BCE | Baudhāyana | earliest known general *statement* of the rule |
| c. 570–495 BCE | Pythagoras | the name attaches, by later tradition |
| c. 300 BCE | Euclid | first surviving deductive *proof*, *Elements* I.47 |
| 12th c. CE | Bhāskara II | a dissection proof, with the single word *behold* |

Babylonian scribes were working with triples a thousand years earlier, and their
value for $\\sqrt{2}$ on the tablet YBC 7289 is about three and a half times more
accurate than Baudhāyana's.^[YBC 7289 gives 1;24,51,10 in sexagesimal, that is
1.4142129…, an error of 6 × 10⁻⁷ against Baudhāyana's 2 × 10⁻⁶.] What is
distinctive about the Śulbasūtra is not priority over Babylon but form: a
general rule, stated for any rectangle, rather than a table of cases.

Nor is it a proof in the Greek sense. The Śulbasūtras assert and apply; they do
not derive. That difference is real, and it is why both names belong on the
theorem rather than either one alone.

## Sources

- S. N. Sen and A. K. Bag, *The Śulbasūtras* (Indian National Science Academy,
  1983) — the standard edition, with translation and commentary.
- Kim Plofker, *Mathematics in India* (Princeton University Press, 2009).
- Bibhutibhusan Datta, *The Science of the Śulba* (University of Calcutta, 1932).
- George Gheverghese Joseph, *The Crest of the Peacock*, 3rd ed. (Princeton
  University Press, 2011).

---

*Everything above is plain Markdown. The Sanskrit is typed in IAST and the
Kannada in Latin letters; the scripts are painted at render time, so the file
stays searchable in the alphabet you typed.*
`;

export const BLANK_DOC = `# Untitled

`;
