import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { SOURCE_SCHEMES, TARGET_SCRIPTS } from '../translit/schemes';
import {
  getP5Meta,
  installFromFile,
  installFromNetwork,
  uninstallP5,
  P5_CDN,
  P5_LICENSE_URL,
  type P5Meta,
} from '../sandbox/p5addon';
import { usingFallback } from '../lib/idb';
import type { Settings } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onChange(patch: Partial<Settings>): void;
  onClose(): void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  return (
    <Modal title="Settings" onClose={onClose} wide>
      <section className="settings-group">
        <h3>Appearance</h3>

        <label className="field">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(e) => onChange({ theme: e.target.value as Settings['theme'] })}
          >
            <option value="auto">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="field">
          <span>Editor text size</span>
          <span className="field-inline">
            <input
              type="range"
              min={11}
              max={22}
              step={1}
              value={settings.editorFontSize}
              onChange={(e) => onChange({ editorFontSize: Number(e.target.value) })}
            />
            <output>{settings.editorFontSize}px</output>
          </span>
        </label>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={settings.lineNumbers}
            onChange={(e) => onChange({ lineNumbers: e.target.checked })}
          />
          <span>Show line numbers</span>
        </label>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={settings.syncScroll}
            onChange={(e) => onChange({ syncScroll: e.target.checked })}
          />
          <span>Synchronise scrolling between panes</span>
        </label>
      </section>

      <section className="settings-group">
        <h3>Transliteration</h3>

        <label className="field">
          <span>I type in</span>
          <select
            value={settings.sourceScheme}
            onChange={(e) => onChange({ sourceScheme: e.target.value })}
          >
            {SOURCE_SCHEMES.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.label}
              </option>
            ))}
          </select>
        </label>
        <p className="field-hint">
          {SOURCE_SCHEMES.find((s) => s.id === settings.sourceScheme)?.hint}
        </p>

        <label className="field">
          <span>Default script</span>
          <select
            value={settings.defaultScript}
            onChange={(e) => onChange({ defaultScript: e.target.value })}
          >
            {TARGET_SCRIPTS.map((script) => (
              <option key={script.id} value={script.id}>
                {script.label} · {script.native}
              </option>
            ))}
          </select>
        </label>
        <p className="field-hint">
          Used by <code>@lipi(…)</code>, <code>@(…)</code> and <code>:::lipi</code> blocks. A
          document can override this with <code>script:</code> in its frontmatter.
        </p>
      </section>

      <section className="settings-group">
        <h3>Sketches</h3>
        <label className="field field-check">
          <input
            type="checkbox"
            checked={settings.autoRun}
            onChange={(e) => onChange({ autoRun: e.target.checked })}
          />
          <span>Re-run sketches automatically as I type</span>
        </label>
        <p className="field-hint">
          When off, edited sketches show an “Update sketch” button instead of restarting on every
          keystroke.
        </p>
      </section>

      <P5AddonSection />

      {usingFallback() && (
        <section className="settings-group">
          <h3>Storage</h3>
          <p className="notice notice-warn">
            IndexedDB is unavailable in this browser, so documents are being kept in localStorage
            instead. Export anything you want to keep.
          </p>
        </section>
      )}
    </Modal>
  );
}

function P5AddonSection() {
  const [meta, setMeta] = useState<P5Meta | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => void getP5Meta().then((m) => setMeta(m ?? null));
  useEffect(refresh, []);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-group">
      <h3>p5.js add-on</h3>
      <p className="field-hint">
        p5.js is licensed <strong>LGPL-2.1</strong>, not MIT, so it is not bundled with lipi.md.
        Install it once and the unmodified library is cached on this device for offline use. You can
        replace it at any time with your own build.{' '}
        <a href={P5_LICENSE_URL} target="_blank" rel="noopener noreferrer">
          p5.js licence
        </a>
      </p>

      {meta === undefined ? (
        <p className="field-hint">Checking…</p>
      ) : meta ? (
        <>
          <p className="notice notice-ok">
            Installed · {(meta.bytes / 1024).toFixed(0)} KB from {meta.origin} on{' '}
            {new Date(meta.installedAt).toLocaleDateString()}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void run(() => uninstallP5().then(() => setMeta(null)))}
            >
              Remove
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Replace from file
            </button>
          </div>
        </>
      ) : (
        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void run(installFromNetwork)}
          >
            {busy ? 'Downloading…' : 'Download and install'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Install from file
          </button>
        </div>
      )}

      <p className="field-hint">
        Downloads from <code>{P5_CDN}</code>. Offline? Save <code>p5.min.js</code> from any machine
        and use “Install from file”.
      </p>

      {error && <p className="notice notice-error">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept=".js,text/javascript"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void run(() => installFromFile(file));
        }}
      />
    </section>
  );
}
