/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected at build time from package.json — see vite.config.ts. */
declare const __APP_VERSION__: string;
/** The day the running build was produced, as YYYY-MM-DD. */
declare const __BUILD_DATE__: string;
