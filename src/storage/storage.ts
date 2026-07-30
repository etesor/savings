// Storage adapter. Two backends behind one small API:
//   - File System Access API  -> reads/writes a real .json file the user owns.
//   - localStorage            -> fallback + always-on mirror so data is never lost
//                                if the file gets disconnected or the browser lacks FS support.

import { DATA_FILE_NAME, DEFAULT_CURRENCY, DEFAULT_LOCALE, SCHEMA_VERSION } from '../config';
import type { AppData, Bucket, Movement } from '../model/types';
import { createEmptyData } from '../model/types';

export const fsSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

const LOCAL_KEY = 'savings-data';

const JSON_TYPE: FilePickerAcceptType = {
  description: 'Savings data',
  accept: { 'application/json': ['.json'] },
};

// --- File System Access API ------------------------------------------------

export async function pickExistingFile(): Promise<FileSystemFileHandle | null> {
  if (!window.showOpenFilePicker) return null;
  const [handle] = await window.showOpenFilePicker({ multiple: false, types: [JSON_TYPE] });
  return handle ?? null;
}

export async function createNewFile(): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null;
  const handle = await window.showSaveFilePicker({ suggestedName: DATA_FILE_NAME, types: [JSON_TYPE] });
  await writeToHandle(handle, createEmptyData()); // initialise the file immediately
  return handle;
}

export async function readFromHandle(handle: FileSystemFileHandle): Promise<AppData> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return createEmptyData();
  return normalize(JSON.parse(text));
}

export async function writeToHandle(handle: FileSystemFileHandle, data: AppData): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

/**
 * Ensures we still have permission to touch the file. Returns true if granted.
 * `interactive: false` only checks silently; true may prompt the user.
 */
export async function verifyPermission(
  handle: FileSystemFileHandle,
  interactive: boolean,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  if (interactive && (await handle.requestPermission?.(opts)) === 'granted') return true;
  return false;
}

// --- localStorage ----------------------------------------------------------

export function readLocal(): AppData | null {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLocal(data: AppData): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / private-mode errors; the file is the source of truth.
  }
}

// --- Manual backup (works in every browser) --------------------------------

export function downloadBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `savings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<AppData> {
  return normalize(JSON.parse(await file.text()));
}

// --- Validation / migration -----------------------------------------------

/**
 * Coerces arbitrary parsed JSON into a valid AppData, filling defaults and
 * dropping malformed records. This is the one place old files get migrated.
 */
function normalize(raw: unknown): AppData {
  const base = createEmptyData();
  if (typeof raw !== 'object' || raw === null) return base;
  const obj = raw as Partial<AppData>;

  return {
    schemaVersion: typeof obj.schemaVersion === 'number' ? obj.schemaVersion : SCHEMA_VERSION,
    currency: typeof obj.currency === 'string' && obj.currency ? obj.currency : DEFAULT_CURRENCY,
    locale: typeof obj.locale === 'string' && obj.locale ? obj.locale : DEFAULT_LOCALE,
    buckets: Array.isArray(obj.buckets) ? obj.buckets.filter(isBucket).map(fillBucket) : [],
    movements: Array.isArray(obj.movements) ? obj.movements.filter(isMovement).map(fillMovement) : [],
  };
}

function fillBucket(b: Bucket, index: number): Bucket {
  return {
    id: b.id,
    name: b.name,
    goalAmount: b.goalAmount,
    // Files written before goal types existed have no spends, so 'target' and
    // 'ongoing' would compute identically for them — defaulting to 'target'
    // keeps every number unchanged, and the first withdrawal on a bucket that's
    // really a standing fund surfaces the question that prompts a correction.
    goalType: b.goalType === 'ongoing' ? 'ongoing' : 'target',
    account: b.account,
    color: typeof b.color === 'string' && b.color ? b.color : '#2563eb',
    sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : index,
    archived: b.archived === true,
    createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
  };
}

function fillMovement(m: Movement): Movement {
  return {
    id: m.id,
    bucketId: m.bucketId,
    date: m.date,
    amount: m.amount,
    kind: m.kind ?? 'adjustment',
    note: typeof m.note === 'string' ? m.note : '',
    transferId: m.transferId,
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
  };
}

function isBucket(value: unknown): value is Bucket {
  const b = value as Partial<Bucket>;
  return (
    typeof b?.id === 'string' &&
    typeof b.name === 'string' &&
    typeof b.goalAmount === 'number' &&
    (b.account === 'bank' || b.account === 'broker')
  );
}

function isMovement(value: unknown): value is Movement {
  const m = value as Partial<Movement>;
  return (
    typeof m?.id === 'string' &&
    typeof m.bucketId === 'string' &&
    typeof m.date === 'string' &&
    typeof m.amount === 'number'
  );
}
