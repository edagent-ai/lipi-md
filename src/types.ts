export interface Doc {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  /**
   * True for the document lipi.md ships with. It can be edited freely but not
   * deleted, so the reference example is always there to come back to.
   */
  example?: boolean;
  /** Folder path from the document's frontmatter, e.g. `Music/Carnatic`. */
  folder?: string;
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
  /**
   * Whether to ask the browser to keep documents durably. `ask` means the
   * reader has not been asked yet — the decision is theirs, so it is never
   * made on their behalf.
   */
  keepData: 'ask' | 'yes' | 'no';
  /** Applied to documents that do not name a theme. Empty follows the app. */
  defaultTheme: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  viewMode: 'split',
  sourceScheme: 'optitrans',
  defaultScript: 'kannada',
  editorFontSize: 14,
  // Write : read = 1 : 2. Reading is what the pane is for; the source only
  // needs enough room to edit a line comfortably.
  splitRatio: 1 / 3,
  syncScroll: true,
  lineNumbers: false,
  sidebarOpen: true,
  autoRun: true,
  defaultTheme: '',
  keepData: 'ask',
};
