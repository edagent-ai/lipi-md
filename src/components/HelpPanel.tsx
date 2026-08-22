import { Modal } from './Modal';

interface HelpPanelProps {
  onClose(): void;
}

const MOD = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';

export function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <Modal title="Cheat sheet" onClose={onClose} wide>
      <section className="settings-group">
        <h3>Native script from phonetic English</h3>
        <table className="cheat">
          <tbody>
            <tr>
              <td>
                <code>@kannada(namaskaara)</code>
              </td>
              <td>one word or phrase in Kannada</td>
            </tr>
            <tr>
              <td>
                <code>@te(vandanamu)</code>
              </td>
              <td>short codes work too — <code>kn te ta ml hi bn gu pa or si</code></td>
            </tr>
            <tr>
              <td>
                <code>@lipi(…)</code> or <code>@(…)</code>
              </td>
              <td>the document’s default script</td>
            </tr>
            <tr>
              <td>
                <code>@kn:itrans(namaskAra)</code>
              </td>
              <td>override the input scheme for one macro</td>
            </tr>
            <tr>
              <td>
                <code>\@kannada(…)</code>
              </td>
              <td>show the macro literally instead of converting</td>
            </tr>
            <tr>
              <td>
                <code>:::kannada</code> … <code>:::</code>
              </td>
              <td>convert a whole block — ideal for lyrics and verses</td>
            </tr>
          </tbody>
        </table>
        <p className="field-hint">
          Inside a <code>:::</code> block <em>every</em> word converts, including English ones, so
          use it for passages that are entirely in one language. For mixed prose, use inline macros.
          Links, code spans and bold markers are always left alone.
        </p>
      </section>

      <section className="settings-group">
        <h3>Live sketches</h3>
        <table className="cheat">
          <tbody>
            <tr>
              <td>
                <code>```canvas</code>
              </td>
              <td>
                gives you <code>ctx</code>, <code>canvas</code>, <code>width</code>,{' '}
                <code>height</code> and <code>loop(fn)</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>```anime</code>
              </td>
              <td>
                Anime.js — <code>animate</code>, <code>stagger</code>, <code>createTimeline</code>,
                plus a <code>stage</code> element
              </td>
            </tr>
            <tr>
              <td>
                <code>```p5</code>
              </td>
              <td>
                p5.js <code>setup()</code> / <code>draw()</code> (needs the add-on)
              </td>
            </tr>
            <tr>
              <td>
                <code>```js run</code>
              </td>
              <td>plain JavaScript against a <code>stage</code> element</td>
            </tr>
          </tbody>
        </table>
        <p className="field-hint">
          Add options after the name: <code>height=420</code>, <code>height=auto</code>,{' '}
          <code>title="My sketch"</code>, <code>manual</code> to wait for a click,{' '}
          <code>code</code> to show the source, <code>norun</code> to leave it as documentation.
          Each sketch runs in its own sandboxed frame with no access to your documents.
        </p>
      </section>

      <section className="settings-group">
        <h3>Formulas</h3>
        <table className="cheat">
          <tbody>
            <tr>
              <td>
                <code>$E = mc^2$</code>
              </td>
              <td>inline LaTeX, mid-sentence</td>
            </tr>
            <tr>
              <td>
                <code>$$ … $$</code>
              </td>
              <td>a display equation on its own lines</td>
            </tr>
          </tbody>
        </table>
        <p className="field-hint">
          Prices are safe: <code>$5 and $10</code> stays as text, because a formula may not open
          or close against a space. Exports use MathML, so an exported page needs no fonts and no
          scripts to show maths correctly.
        </p>
      </section>

      <section className="settings-group">
        <h3>Pictures, video and audio</h3>
        <table className="cheat">
          <tbody>
            <tr>
              <td>
                <code>![alt](https://…/photo.jpg "Caption")</code>
              </td>
              <td>a picture with an optional caption</td>
            </tr>
            <tr>
              <td>
                <code>![alt](https://…/clip.mp4)</code>
              </td>
              <td>a video player — also <code>.webm</code>, <code>.mov</code></td>
            </tr>
            <tr>
              <td>
                <code>![alt](https://youtu.be/ID)</code>
              </td>
              <td>YouTube or Vimeo, embedded</td>
            </tr>
            <tr>
              <td>
                <code>[![alt](img.png)](https://…)</code>
              </td>
              <td>a picture that links somewhere</td>
            </tr>
          </tbody>
        </table>
        <p className="field-hint">
          Same syntax throughout — the link tells lipi.md which player to use. YouTube is embedded
          through <code>youtube-nocookie.com</code>, so nothing is set until a viewer presses play.
          Embedded players need a connection; pictures and video files behave like any other link.
        </p>
      </section>

      <section className="settings-group">
        <h3>Sidenotes</h3>
        <table className="cheat">
          <tbody>
            <tr>
              <td>
                <code>text^[the aside]</code>
              </td>
              <td>a numbered note, set in the margin</td>
            </tr>
          </tbody>
        </table>
        <p className="field-hint">
          Notes carry their own formatting — <em>emphasis</em>, links and transliteration macros
          all work inside one. When the page is wide enough the note sits in the right margin;
          when it is not, the number becomes a button that reveals the note in place.
        </p>
      </section>

      <section className="settings-group">
        <h3>Themes</h3>
        <p className="field-hint">
          <strong>Theme</strong> in the toolbar sets a <code>theme:</code> preset — Paper,
          Manuscript, Slate, Terminal, Blueprint or High contrast. A preset fixes its own colours
          and type, so the page looks the same for every reader and in every export. Any of the
          keys below written alongside it still wins, so a theme is a starting point rather than a
          cage.
        </p>
      </section>

      <section className="settings-group">
        <h3>Page appearance</h3>
        <pre className="cheat-block">{`---
font: serif        sans | serif | mono
align: justify     left | justify | center
width: normal      narrow | normal | wide | full | 40rem
size: 17px
background: "#fffdf7"
color: "#2b2b2b"
accent: "#bf5700"
---`}</pre>
        <p className="field-hint">
          Styling lives in the document, so it travels with the file and carries through to the
          HTML and PDF exports. Colours accept anything CSS understands — <code>#bf5700</code>,{' '}
          <code>rgb(191 87 0)</code>, <code>tomato</code>. Anything unrecognised is ignored rather
          than applied.
        </p>
      </section>

      <section className="settings-group">
        <h3>Frontmatter</h3>
        <pre className="cheat-block">{`---
title: Bhagyada Lakshmi
script: kannada
scheme: optitrans
---`}</pre>
        <p className="field-hint">
          <strong>Insert → Bump version</strong> raises a <code>version:</code> key here, creating
          the frontmatter if there is none. It increments the last number, so <code>3</code>
          becomes <code>4</code> and <code>1.2.9</code> becomes <code>1.2.10</code>. The current
          version shows in the status bar.
        </p>
        <p className="field-hint">
          Optional, and only at the very top. Sets the title in the sidebar and the default script
          and input scheme for this document.
        </p>
      </section>

      <section className="settings-group">
        <h3>Keyboard</h3>
        <table className="cheat">
          <tbody>
            <tr>
              <td>
                <kbd>{MOD}</kbd> <kbd>B</kbd> / <kbd>I</kbd> / <kbd>K</kbd>
              </td>
              <td>bold, italic, link</td>
            </tr>
            <tr>
              <td>
                <kbd>{MOD}</kbd> <kbd>S</kbd>
              </td>
              <td>save now (it also saves itself)</td>
            </tr>
            <tr>
              <td>
                <kbd>{MOD}</kbd> <kbd>Shift</kbd> <kbd>N</kbd>
              </td>
              <td>new document</td>
            </tr>
            <tr>
              <td>
                <kbd>{MOD}</kbd> <kbd>\</kbd>
              </td>
              <td>cycle write / split / read</td>
            </tr>
            <tr>
              <td>
                <kbd>{MOD}</kbd> <kbd>F</kbd>
              </td>
              <td>find in document</td>
            </tr>
          </tbody>
        </table>
      </section>
    </Modal>
  );
}
