import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type Settings, type ThemeMode } from '../types';

const KEY = 'lipi.settings';
/** Read by the inline script in index.html to avoid a flash of the wrong theme. */
const THEME_KEY = 'lipi.theme';

/**
 * Below 900px the sidebar is an overlay across the workspace, so starting it
 * open means a phone opens onto a file list covering the editor with no hint
 * that anything is behind it. Only applied when nothing is stored: once a
 * reader has an opinion, it is theirs.
 */
function firstRunDefaults(): Settings {
  const wide = typeof window === 'undefined' || window.innerWidth > 900;
  return wide ? DEFAULT_SETTINGS : { ...DEFAULT_SETTINGS, sidebarOpen: false };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return firstRunDefaults();
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return firstRunDefaults();
  }
}

function persist(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    localStorage.setItem(THEME_KEY, settings.theme);
  } catch {
    /* private mode — settings simply will not survive the session */
  }
}

export function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

export function resolveDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'auto' && prefersDark());
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [dark, setDark] = useState(() => resolveDark(loadSettings().theme));

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setDark(resolveDark(settings.theme));
    if (settings.theme !== 'auto') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#0b0d12' : '#ffffff');
  }, [dark]);

  return { settings, update, dark };
}
