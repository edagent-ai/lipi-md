export interface Doc {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ViewMode = 'split' | 'editor' | 'preview';

export interface Settings {
  theme: ThemeMode;
  viewMode: ViewMode;
  /** Phonetic (roman) scheme the user types in, e.g. `optitrans`. */
  sourceScheme: string;
  /** Script used by `:::lipi` blocks and bare `@(...)` macros. */
  defaultScript: string;
  editorFontSize: number;
  splitRatio: number;
  syncScroll: boolean;
  lineNumbers: boolean;
  sidebarOpen: boolean;
  /** Auto-run sandboxes as you type; when false they wait for an explicit run. */
  autoRun: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  viewMode: 'split',
  sourceScheme: 'optitrans',
  defaultScript: 'kannada',
  editorFontSize: 14,
  splitRatio: 0.5,
  syncScroll: true,
  lineNumbers: false,
  sidebarOpen: true,
  autoRun: true,
};
