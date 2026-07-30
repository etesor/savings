import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Account, AppData, Bucket, Movement, MovementKind } from '../model/types';
import { createEmptyData } from '../model/types';
import { todayISO } from '../model/format';
import * as storage from '../storage/storage';
import { clearHandle, loadHandle, saveHandle } from '../storage/fileHandleStore';

// --- Reducer (pure data transforms) ---------------------------------------

type Action =
  | { type: 'load'; data: AppData }
  | { type: 'replaceAll'; data: AppData }
  | { type: 'addBucket'; bucket: Bucket; initial?: Movement }
  | { type: 'updateBucket'; bucket: Bucket }
  | { type: 'removeBucket'; id: string }
  | { type: 'setArchived'; id: string; archived: boolean }
  | { type: 'addMovement'; movement: Movement }
  | { type: 'updateMovement'; movement: Movement }
  | { type: 'removeMovement'; id: string }
  | { type: 'reorderBuckets'; orderedIds: string[] };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'load':
    case 'replaceAll':
      return action.data;
    case 'addBucket':
      return {
        ...state,
        buckets: [...state.buckets, action.bucket],
        movements: action.initial ? [...state.movements, action.initial] : state.movements,
      };
    case 'updateBucket':
      return {
        ...state,
        buckets: state.buckets.map((b) => (b.id === action.bucket.id ? action.bucket : b)),
      };
    case 'removeBucket':
      return {
        ...state,
        buckets: state.buckets.filter((b) => b.id !== action.id),
        movements: state.movements.filter((m) => m.bucketId !== action.id),
      };
    case 'setArchived':
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          b.id === action.id ? { ...b, archived: action.archived } : b,
        ),
      };
    case 'addMovement':
      return { ...state, movements: [...state.movements, action.movement] };
    case 'updateMovement':
      return {
        ...state,
        movements: state.movements.map((m) =>
          m.id === action.movement.id ? action.movement : m,
        ),
      };
    case 'removeMovement':
      return { ...state, movements: state.movements.filter((m) => m.id !== action.id) };
    case 'reorderBuckets': {
      // Reassign sortOrder to match the given order of (active) bucket ids.
      const orderIndex = new Map(action.orderedIds.map((id, i) => [id, i]));
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          orderIndex.has(b.id) ? { ...b, sortOrder: orderIndex.get(b.id) ?? b.sortOrder } : b,
        ),
      };
    }
    default:
      return state;
  }
}

// --- Public shapes ---------------------------------------------------------

export interface NewBucketInput {
  name: string;
  goalAmount: number;
  account: Account;
  color: string;
  initialAmount?: number;
  initialDate?: string;
}

export interface NewMovementInput {
  bucketId: string;
  amount: number; // signed: positive deposit, negative withdrawal
  date: string;
  note: string;
  kind: MovementKind;
}

export type StoreStatus = 'loading' | 'welcome' | 'needs-permission' | 'ready';
export type StorageMode = 'file' | 'local';

interface StoreValue {
  data: AppData;
  status: StoreStatus;
  storageMode: StorageMode;
  fsSupported: boolean;
  fileName: string | null;
  // storage / connection
  connectExistingFile: () => Promise<void>;
  connectNewFile: () => Promise<void>;
  reconnect: () => Promise<void>;
  continueLocal: () => void;
  disconnectFile: () => Promise<void>;
  // data mutations
  addBucket: (input: NewBucketInput) => void;
  updateBucket: (bucket: Bucket) => void;
  removeBucket: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  addMovement: (input: NewMovementInput) => void;
  updateMovement: (movement: Movement) => void;
  removeMovement: (id: string) => void;
  reorderBuckets: (orderedIds: string[]) => void;
  // backup
  exportBackup: () => void;
  importBackup: (file: File) => Promise<void>;
  // undo (for destructive actions)
  pendingUndo: { label: string } | null;
  undo: () => void;
  dismissUndo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

// --- Provider --------------------------------------------------------------

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, createEmptyData);
  const [status, setStatus] = useState<StoreStatus>('loading');
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<{ snapshot: AppData; label: string } | null>(null);

  const undoTimer = useRef<number | null>(null);
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const saveTimer = useRef<number | null>(null);
  const persistedOnce = useRef(false); // skip the write triggered by the initial load

  // On mount: try to reconnect to a previously chosen file, else use local data,
  // else show the welcome screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (storage.fsSupported) {
        try {
          const handle = await loadHandle();
          if (handle) {
            handleRef.current = handle;
            setFileName(handle.name);
            if (await storage.verifyPermission(handle, false)) {
              const loaded = await storage.readFromHandle(handle);
              if (cancelled) return;
              setStorageMode('file');
              dispatch({ type: 'load', data: loaded });
              setStatus('ready');
              return;
            }
            if (cancelled) return;
            setStatus('needs-permission'); // handle exists but must re-grant access
            return;
          }
        } catch {
          // Ignore and fall through to local / welcome.
        }
      }

      const local = storage.readLocal();
      if (local) {
        if (cancelled) return;
        dispatch({ type: 'load', data: local });
        setStorageMode('local');
        setStatus('ready');
        return;
      }

      // First run on any browser: show the welcome gate so the user makes an
      // informed choice about where data lives (a real file where the browser
      // supports it, otherwise browser storage + manual backups).
      if (cancelled) return;
      setStatus('welcome');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change: always mirror to localStorage (synchronous, durable),
  // and debounce-write to the file when connected.
  useEffect(() => {
    if (status !== 'ready') return;
    if (!persistedOnce.current) {
      persistedOnce.current = true; // the first "ready" render is the load itself
      return;
    }
    storage.writeLocal(data);
    if (storageMode === 'file' && handleRef.current) {
      const handle = handleRef.current;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        storage.writeToHandle(handle, data).catch(() => {
          // Access to the file was lost mid-session; data is safe in localStorage.
          setStatus('needs-permission');
        });
      }, 500);
    }
  }, [data, status, storageMode]);

  async function finishConnect(handle: FileSystemFileHandle, loaded: AppData) {
    handleRef.current = handle;
    await saveHandle(handle);
    setFileName(handle.name);
    setStorageMode('file');
    dispatch({ type: 'load', data: loaded });
    setStatus('ready');
  }

  async function connectExistingFile() {
    const handle = await storage.pickExistingFile();
    if (!handle) return;
    if (!(await storage.verifyPermission(handle, true))) return;
    await finishConnect(handle, await storage.readFromHandle(handle));
  }

  async function connectNewFile() {
    const handle = await storage.createNewFile();
    if (!handle) return;
    // Carry over anything already entered in local mode into the new file.
    const seed = data.buckets.length || data.movements.length ? data : createEmptyData();
    await storage.writeToHandle(handle, seed);
    await finishConnect(handle, seed);
  }

  async function reconnect() {
    const handle = handleRef.current ?? (await loadHandle());
    if (!handle) {
      setStatus('welcome');
      return;
    }
    if (!(await storage.verifyPermission(handle, true))) return;
    await finishConnect(handle, await storage.readFromHandle(handle));
  }

  function continueLocal() {
    setStorageMode('local');
    setStatus('ready');
  }

  async function disconnectFile() {
    handleRef.current = null;
    setFileName(null);
    await clearHandle();
    setStorageMode('local');
  }

  // Snapshot the current data so a destructive action can be reverted for a few seconds.
  function pushUndo(label: string) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setPendingUndo({ snapshot: data, label });
    undoTimer.current = window.setTimeout(() => setPendingUndo(null), 8000);
  }

  function undo() {
    if (!pendingUndo) return;
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    dispatch({ type: 'replaceAll', data: pendingUndo.snapshot });
    setPendingUndo(null);
  }

  function dismissUndo() {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setPendingUndo(null);
  }

  function addBucket(input: NewBucketInput) {
    const now = new Date().toISOString();
    const bucket: Bucket = {
      id: uid(),
      name: input.name.trim(),
      goalAmount: input.goalAmount,
      account: input.account,
      color: input.color,
      sortOrder: nextSortOrder(data.buckets),
      archived: false,
      createdAt: now,
    };
    let initial: Movement | undefined;
    if (input.initialAmount && input.initialAmount !== 0) {
      initial = {
        id: uid(),
        bucketId: bucket.id,
        date: input.initialDate || todayISO(),
        amount: input.initialAmount,
        kind: 'initial',
        note: 'Saldo inicial',
        createdAt: now,
      };
    }
    dispatch({ type: 'addBucket', bucket, initial });
  }

  function updateBucket(bucket: Bucket) {
    dispatch({ type: 'updateBucket', bucket });
  }

  function removeBucket(id: string) {
    const bucket = data.buckets.find((b) => b.id === id);
    pushUndo(bucket ? `"${bucket.name}" eliminado` : 'Bucket eliminado');
    dispatch({ type: 'removeBucket', id });
  }

  function setArchived(id: string, archived: boolean) {
    dispatch({ type: 'setArchived', id, archived });
  }

  function addMovement(input: NewMovementInput) {
    const movement: Movement = {
      id: uid(),
      bucketId: input.bucketId,
      date: input.date || todayISO(),
      amount: input.amount,
      kind: input.kind,
      note: input.note.trim(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'addMovement', movement });
  }

  function updateMovement(movement: Movement) {
    dispatch({ type: 'updateMovement', movement });
  }

  function removeMovement(id: string) {
    pushUndo('Movimiento eliminado');
    dispatch({ type: 'removeMovement', id });
  }

  function reorderBuckets(orderedIds: string[]) {
    dispatch({ type: 'reorderBuckets', orderedIds });
  }

  function exportBackup() {
    storage.downloadBackup(data);
  }

  async function importBackup(file: File) {
    const imported = await storage.importFromFile(file);
    pushUndo('Importación aplicada');
    dispatch({ type: 'replaceAll', data: imported });
  }

  const value: StoreValue = {
    data,
    status,
    storageMode,
    fsSupported: storage.fsSupported,
    fileName,
    connectExistingFile,
    connectNewFile,
    reconnect,
    continueLocal,
    disconnectFile,
    addBucket,
    updateBucket,
    removeBucket,
    setArchived,
    addMovement,
    updateMovement,
    removeMovement,
    reorderBuckets,
    exportBackup,
    importBackup,
    pendingUndo: pendingUndo ? { label: pendingUndo.label } : null,
    undo,
    dismissUndo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

// --- helpers ---------------------------------------------------------------

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function nextSortOrder(buckets: Bucket[]): number {
  return buckets.reduce((max, b) => Math.max(max, b.sortOrder + 1), 0);
}
