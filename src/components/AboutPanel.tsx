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
  ['Anime.js', 'MIT', 'Bundled animation runtime'],
  ['React', 'MIT', 'Application shell'],
  ['Vite + vite-plugin-pwa', 'MIT', 'Build tooling and the offline service worker'],
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
        <h3>Licence</h3>
        <p>
          lipi.md is released under the <strong>MIT Licence</strong>, and every library it ships is
          MIT-licensed too. The source is on GitHub at{' '}
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
        <p className="field-hint">
          p5.js is the one exception, and the reason it is an opt-in add-on rather than a bundled
          dependency: it is licensed LGPL-2.1. It is downloaded unmodified, kept in a separate file,
          and can be replaced by you at any time — see <strong>Settings → p5.js add-on</strong>.
        </p>
      </section>

      <section className="settings-group">
        <h3>Privacy</h3>
        <p className="field-hint">
          Nothing is uploaded anywhere. The only network request lipi.md ever makes on its own is
          fetching the app itself; the optional p5.js download is the sole exception, and only when
          you ask for it. Sketches run in sandboxed frames that cannot read your documents.
        </p>
      </section>
    </Modal>
  );
}
