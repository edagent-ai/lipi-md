/**
 * The first-run document. It has to work with zero installs and zero network,
 * so it leads with the bundled Canvas and Anime runtimes and only *mentions*
 * the optional p5 add-on.
 */
export const WELCOME_DOC = `---
title: Welcome to lipi.md
script: kannada
scheme: optitrans
---

# lipi.md

**Type text. Render worlds.** Everything here is plain Markdown in a file you
own. No build step, no server, no account. It works on a plane.

## 1. Native script from phonetic English

Type how it sounds, keep the file searchable in English, and let the preview
paint the real script:

Good morning is @kannada(shubhodaya), and thank you is @kannada(dhanyavaada).
Telugu: @telugu(dhanyavaadamulu). Tamil: @tamil(nandri). Devanagari: @hindi(namaste).

For whole passages — song lyrics, verses, vocabulary drills — use a block. The
source stays readable and greppable in English:

:::lipi
bhaagyada lakshmi baaramma
nammamma nee saubhaagyada lakshmi baaramma
:::

> Hover any converted word to see the English you typed.
> Write \\@kannada(...) with a backslash to show the macro literally.

## 2. Live sketches, right in the document

A fenced code block with a runtime name runs instead of just sitting there.
Change a number and watch it update — no refresh:

\`\`\`canvas height=300
const dots = 60;

loop((t) => {
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * Math.PI * 2 + t / 2400;
    const r = 90 + Math.sin(t / 700 + i / 4) * 42;
    ctx.fillStyle = \`hsl(\${(i * 6 + t / 40) % 360} 85% 66%)\`;
    ctx.beginPath();
    ctx.arc(width / 2 + Math.cos(a) * r, height / 2 + Math.sin(a) * r, 5, 0, Math.PI * 2);
    ctx.fill();
  }
});
\`\`\`

Anime.js is bundled too, for animating DOM and SVG:

\`\`\`anime height=170
stage.innerHTML = '<div class="row">' +
  Array.from({ length: 14 }, () => '<i></i>').join('') + '</div>';

const css = document.createElement('style');
css.textContent = \`
  .row { display: flex; gap: 7px; align-items: center; justify-content: center; height: 100%; }
  i { width: 14px; height: 14px; border-radius: 4px; background: #6ea8fe; display: block; }
\`;
document.head.appendChild(css);

animate('.row i', {
  translateY: [0, -34],
  rotate: [0, 90],
  alternate: true,
  loop: true,
  duration: 820,
  ease: 'inOutQuad',
  delay: stagger(60),
});
\`\`\`

### The runtimes

| Fence | Runs on | Ships with the app |
| --- | --- | --- |
| \`canvas\` | a 2D canvas with \`ctx\`, \`width\`, \`height\`, \`loop()\` | yes |
| \`anime\` | Anime.js against \`stage\` | yes |
| \`js run\` | plain JavaScript against \`stage\` | yes |
| \`p5\` | p5.js \`setup()\` / \`draw()\` | optional add-on |

p5.js is LGPL rather than MIT, so it is not bundled. Install it once from
**Settings → p5.js add-on** and it is cached for offline use from then on.

Options go after the fence name: \`height=420\`, \`height=auto\`, \`title="..."\`,
\`manual\` to wait for a click, \`code\` to show the source, \`norun\` to keep a
block as documentation.

## 3. Formulas, media and sidenotes

Maths is LaTeX, inline as $e^{i\\pi} + 1 = 0$ or set on its own:

$$
\\int_{0}^{\\infty} e^{-x^{2}}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

Prices stay prices — $5 and $10 are left alone.

Pictures and video use the same link syntax; lipi.md picks the right player:

- \`![alt](photo.jpg "A caption")\` — a picture
- \`![alt](clip.mp4)\` — a video player
- \`![alt](https://youtu.be/ID)\` — an embedded talk

Add an aside with \`^[...]\`.^[Like this one. On a wide page it sits in the
margin; on a narrow one, tap the number to open it.]

Set the look of the page in its frontmatter — \`font\`, \`align\`, \`width\`,
\`size\`, \`background\`, \`color\` and \`accent\`. It travels with the file and
carries through to exports.

## 4. Everything else is just Markdown

Regular code blocks stay put and get highlighted:

\`\`\`js
const raaga = ['sa', 'ri', 'ga', 'ma', 'pa', 'dha', 'ni'];
console.log(raaga.map((s) => s.toUpperCase()));
\`\`\`

- Lists, **bold**, *italic*, \`inline code\`
- [Links](https://commonmark.org) open in a new tab
- Tables, quotes, and headings all work

---

Your writing saves itself to this browser as you type. Use the sidebar for more
documents, and **Export** to get a \`.md\` file you can keep anywhere.
`;

export const BLANK_DOC = `# Untitled

`;
