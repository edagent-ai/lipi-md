import { Modal } from './Modal';

interface AboutPanelProps {
  onClose(): void;
  onUpdate?(): void;
  updateReady: boolean;
}

const REPO_URL = 'https://github.com/edagent-ai/lipi-md';

const CREDITS = [
  ['markdown-it', 'MIT', 'Markdown parsing and the plugin hooks the macros ride on'],
  ['CodeMirror 6', 'MIT', 'The editor, its Markdown grammar, and code highlighting'],
  ['@indic-transliteration/sanscript', 'MIT', 'The transliteration engine'],
  ['KaTeX', 'MIT', 'Formula typesetting'],
  ['Mermaid', 'MIT', 'Diagrams, fetched the first time one is drawn'],
  ['React', 'MIT', 'Application shell'],
  ['Vite + vite-plugin-pwa', 'MIT', 'Build tooling and the offline service worker'],
  ['OpenDyslexic', 'OFL-1.1', 'The typeface used by the dyslexia-friendly theme'],
];

export function AboutPanel({ onClose, onUpdate, updateReady }: AboutPanelProps) {
  return (
    <Modal title="About lipi.md" onClose={onClose} wide>
      <section className="settings-group">
        <p>
          <strong>lipi.md</strong> — type text, render worlds. A Markdown editor that runs entirely
          in your browser: no server, no account, no build step. Your documents are stored on this
          device and never leave it.
        </p>
        <p className="field-hint">
          <em>lipi</em> (ಲಿಪಿ) means “script” — the written form of a language.
        </p>
      </section>

      <section className="settings-group">
        <h3>Made by</h3>
        <p>
          <strong>Shashank Bangalore Lakshman</strong>
          <br />
          <a href="https://shashankbl.github.io" target="_blank" rel="noopener noreferrer">
            shashankbl.github.io
          </a>
        </p>
        <p className="field-hint">Made in California with Claude Code and Conductor.</p>
      </section>

      {updateReady && (
        <section className="settings-group">
          <p className="notice notice-ok">A new version has been downloaded.</p>
          <button type="button" className="btn btn-primary" onClick={onUpdate}>
            Reload to update
          </button>
        </section>
      )}

      <section className="settings-group">
        <h3>License</h3>
        <p>
          lipi.md is released under the <strong>MIT License</strong>, and every library it ships is
          MIT-licensed too — with one addition: the OpenDyslexic typeface, under the SIL Open Font
          License, which permits bundling and redistribution. The source is on GitHub at{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {REPO_URL.replace('https://', '')}
          </a>
          .
        </p>
        <table className="cheat">
          <tbody>
            {CREDITS.map(([name, licence, what]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>
                  <span className="pill">{licence}</span>
                </td>
                <td>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="settings-group">
        <h3>Privacy</h3>
        <p className="field-hint">
          Nothing is uploaded anywhere. The only network requests lipi.md makes on its own are for
          the app itself; everything else happens when you ask for it by name — fetching a Google
          font, or the diagram library the first time a document draws one. Sketches run in sandboxed
          frames that cannot read your documents.
        </p>
      </section>
    </Modal>
  );
}
