// Split into its own chunk: KaTeX plus its stylesheet is ~300KB, and most
// documents contain no maths at all. Imported dynamically by `./index.ts`.
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default katex;
