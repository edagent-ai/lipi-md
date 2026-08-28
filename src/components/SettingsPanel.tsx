import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { SOURCE_SCHEMES, TARGET_SCRIPTS } from '../translit/schemes';
import { THEMES } from '../markdown/themes';
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
import { download, downloadBlob, formatWhen } from '../lib/util';
import { makeZip } from '../lib/zip';
import {
  backupJson,
  libraryFiles,
  parseBackup,
  persistenceGranted,
  requestPersistence,
  storageUsed,
  type VaultState,
} from '../store/vault';
import type { Doc, Settings } from '../types';

type Vault = VaultState & {
  connect(docs: Doc[]): Promise<void>;
  unlock(docs: Doc[]): Promise<void>;
  disconnect(): Promise<void>;
  sync(docs: Doc[], loud?: boolean): Promise<void>;
  restore(): Promise<Doc[] | null>;
};

interface SettingsPanelProps {
  settings: Settings;
  onChange(patch: Partial<Settings>): void;
  onClose(): void;
  vault: Vault;
  docs: Doc[];
  onImport(docs: Doc[]): Promise<number>;
}

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  vault,
  docs,
  onImport,
}: SettingsPanelProps) {
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

        <label className="field">
          <span>Document theme</span>
          <select
            value={settings.defaultTheme}
            onChange={(e) => onChange({ defaultTheme: e.target.value })}
          >
            <option value="">Follow the app theme</option>
            {Object.entries(THEMES).map(([name, preset]) => (
              <option key={name} value={name}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="field-hint">
          {settings.defaultTheme
            ? THEMES[settings.defaultTheme]?.blurb
            : 'Rendered pages follow the light or dark app theme.'}{' '}
          A document that names its own <code>theme:</code> always wins.
        </p>

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

      <DataSection
        vault={vault}
        docs={docs}
        onImport={onImport}
        settings={settings}
        onChange={onChange}
      />

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

interface DataSectionProps {
  vault: Vault;
  docs: Doc[];
  onImport(docs: Doc[]): Promise<number>;
  settings: Settings;
  onChange(patch: Partial<Settings>): void;
}

/**
 * Where the reader's writing actually lives, and how to stop the browser being
 * the only copy of it.
 */
function DataSection({ vault, docs, onImport, settings, onChange }: DataSectionProps) {
  const [durable, setDurable] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void persistenceGranted().then(setDurable);
    void storageUsed().then(setUsed);
  };
  useEffect(refresh, []);

  const askDurable = async () => {
    onChange({ keepData: 'yes' });
    const granted = await requestPersistence();
    setDurable(granted);
    setNote(
      granted
        ? 'The browser agreed to keep these documents.'
        : 'The browser declined for now. It often grants this once the app has been used a few times or installed; nothing else changes in the meantime.',
    );
  };

  const declineDurable = () => {
    onChange({ keepData: 'no' });
    setNote(null);
  };

  const connect = async () => {
    await vault.connect(docs);
    refresh();
  };

  const restoreFolder = async () => {
    const found = await vault.restore();
    if (!found) return;
    const n = await onImport(found);
    setNote(`${n} document${n === 1 ? '' : 's'} read back from the folder.`);
    refresh();
  };

  const stampToday = () => new Date().toISOString().slice(0, 10);

  const downloadBackup = () => {
    download(`lipi-md-backup-${stampToday()}.json`, backupJson(docs), 'application/json');
  };

  const downloadZip = async () => {
    setNote('Packing…');
    try {
      const files = libraryFiles(docs);
      downloadBlob(`lipi-md-${stampToday()}.zip`, await makeZip(files));
      setNote(`${files.length - 1} document${files.length === 2 ? '' : 's'} packed as Markdown.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    }
  };

  const restoreFile = async (file: File) => {
    try {
      const n = await onImport(parseBackup(await file.text()));
      setNote(`${n} document${n === 1 ? '' : 's'} restored from the backup.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    }
  };

  // KB below a megabyte: "0.0 MB" reads like nothing is stored at all.
  const size =
    used >= 1048576 ? `${(used / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(used / 1024))} KB`;

  return (
    <section className="settings-group">
      <h3>Your data</h3>

      <p className={`notice ${durable ? 'notice-ok' : 'notice-warn'}`}>
        {durable === null
          ? 'Checking how this browser is storing your documents…'
          : durable
            ? `Documents are stored on this device and marked durable — ${size} used.`
            : `Documents are stored on this device as best-effort — ${size} used. The browser may evict them if it runs short of space, and clearing site data erases them.`}
      </p>
      {durable === false && settings.keepData === 'ask' && (
        <div className="settings-ask">
          <p>
            Shall lipi.md ask this browser to keep your documents? It makes them far less likely
            to be thrown away when the device runs short of space. Nothing is uploaded either
            way — this only changes how the browser treats what is already on your machine.
          </p>
          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={() => void askDurable()}>
              Keep my documents
            </button>
            <button type="button" className="btn" onClick={declineDurable}>
              Not now
            </button>
          </div>
        </div>
      )}

      {durable === false && settings.keepData !== 'ask' && (
        <div className="button-row">
          <button type="button" className="btn" onClick={() => void askDurable()}>
            {settings.keepData === 'no' ? 'Ask the browser to keep it' : 'Try again'}
          </button>
        </div>
      )}

      <h4 className="settings-sub">Folder on this computer</h4>
      {vault.status === 'unsupported' ? (
        <p className="field-hint">
          This browser cannot write to a folder — that needs Chrome, Edge or another Chromium
          browser. The backup file below does the same job by hand.
        </p>
      ) : (
        <>
          <p className="field-hint">
            Keeps a copy of every document as an ordinary <code>.md</code> file in a folder you
            choose. Those files outlive this browser entirely: they open in any editor, and go
            wherever your usual backups go. Writing only goes one way — the app saves into the
            folder, and reads back when you ask it to.
          </p>
          {vault.status === 'ready' && (
            <p className="notice notice-ok">
              Saving into <strong>{vault.folderName}</strong>
              {vault.lastSync ? ` · written ${formatWhen(vault.lastSync)}` : ''}
            </p>
          )}
          {vault.status === 'locked' && (
            <p className="notice notice-warn">
              <strong>{vault.folderName}</strong> is remembered, but the browser drops folder
              permission when it restarts. Reconnect to resume saving.
            </p>
          )}
          <div className="button-row">
            {vault.status === 'off' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={vault.busy}
                onClick={() => void connect()}
              >
                Choose a folder
              </button>
            )}
            {vault.status === 'locked' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={vault.busy}
                onClick={() => void vault.unlock(docs)}
              >
                Reconnect
              </button>
            )}
            {vault.status === 'ready' && (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={vault.busy}
                  onClick={() => void vault.sync(docs, true)}
                >
                  Save now
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={vault.busy}
                  onClick={() => void restoreFolder()}
                >
                  Read back
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={vault.busy}
                  onClick={() => void vault.disconnect()}
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </>
      )}

      <h4 className="settings-sub">Download everything</h4>
      <p className="field-hint">
        The <strong>zip</strong> holds every document as a <code>.md</code> file in the folders you
        filed them under — readable anywhere, and if you unzip it and point “Choose a folder” at
        the result, it reads back with dates and identities intact. The <strong>backup file</strong>
        is the same library as a single file to restore here later; restoring matches documents by
        identity, so the same file twice changes nothing the second time.
      </p>
      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={() => void downloadZip()}>
          Download .md files (zip)
        </button>
        <button type="button" className="btn" onClick={downloadBackup}>
          Download backup
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Restore from backup
        </button>
      </div>

      {vault.error && <p className="notice notice-error">{vault.error}</p>}
      {note && <p className="field-hint">{note}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void restoreFile(file);
        }}
      />
    </section>
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
