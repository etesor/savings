import { DEFAULT_CURRENCY, DEFAULT_LOCALE, SCHEMA_VERSION } from '../config';

/** Where the money physically lives. */
export type Account = 'bank' | 'broker';

/**
 * The nature of a money movement. Everything is an event in an append-only log;
 * a bucket's balance is always derived by summing its movements — never stored.
 */
export type MovementKind =
  | 'initial' // seeding the starting balance you already had
  | 'deposit' // adding money
  | 'withdrawal' // taking money out
  | 'adjustment' // correcting a mistake / reconciling
  | 'transfer'; // one leg of a bucket-to-bucket move (Phase 2)

export interface Bucket {
  id: string;
  name: string;
  /** Target amount in the account's base currency. 0 means "no goal set". */
  goalAmount: number;
  account: Account;
  /** Hex color used as the card accent. */
  color: string;
  /** Manual ordering on the dashboard. */
  sortOrder: number;
  archived: boolean;
  createdAt: string; // ISO timestamp
}

export interface Movement {
  id: string;
  bucketId: string;
  date: string; // YYYY-MM-DD (the day the money moved)
  /** Signed: positive adds to the bucket, negative removes from it. */
  amount: number;
  kind: MovementKind;
  note: string;
  /** Links the two legs of a transfer together (Phase 2). */
  transferId?: string;
  createdAt: string; // ISO timestamp (when the record was entered)
}

export interface AppData {
  schemaVersion: number;
  /** ISO 4217 code, e.g. "MXN". */
  currency: string;
  /** BCP 47 locale used for formatting, e.g. "es-MX". */
  locale: string;
  buckets: Bucket[];
  movements: Movement[];
}

export function createEmptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    currency: DEFAULT_CURRENCY,
    locale: DEFAULT_LOCALE,
    buckets: [],
    movements: [],
  };
}
