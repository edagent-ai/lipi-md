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
        <h3>Frontmatter</h3>
        <pre className="cheat-block">{`---
title: Bhagyada Lakshmi
script: kannada
scheme: optitrans
---`}</pre>
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
