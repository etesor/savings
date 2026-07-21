// App-wide configuration. Kept in one place so the project is easy to re-brand
// or adapt for other people who fork it (this repo is meant to be shareable).

export const APP_NAME = 'Ahorros';

/** Suggested filename when the user creates a new data file. */
export const DATA_FILE_NAME = 'savings.json';

/** Bumped whenever the shape of the persisted data changes (see migrations). */
export const SCHEMA_VERSION = 1;

/** Defaults for a brand-new data file. Stored inside the file so each user can change them. */
export const DEFAULT_CURRENCY = 'MXN';
export const DEFAULT_LOCALE = 'es-MX';

/** Palette offered when creating a bucket. */
export const BUCKET_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#db2777', // pink
  '#f59e0b', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#dc2626', // red
  '#4b5563', // slate
] as const;
