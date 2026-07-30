import { DEFAULT_CURRENCY, DEFAULT_LOCALE, SCHEMA_VERSION } from '../config';

/** Where the money physically lives. */
export type Account = 'bank' | 'broker';

/**
 * What a bucket's goal means, which decides how money leaving it is read:
 *  - 'target'  -> you're saving up for one thing (a trip, a laptop, a down payment).
 *                 Money spent *on that thing* still counts as covered — booking the
 *                 flight is the goal working, not the goal slipping.
 *  - 'ongoing' -> a balance you keep topped up (emergency fund, car maintenance).
 *                 Spending it is a setback you have to make back up.
 */
export type GoalType = 'target' | 'ongoing';

/**
 * The nature of a money movement. Everything is an event in an append-only log;
 * a bucket's balance is always derived by summing its movements — never stored.
 */
export type MovementKind =
  | 'initial' // seeding the starting balance you already had
  | 'deposit' // adding money
  | 'withdrawal' // taking money out for something other than what you saved it for
  | 'spend' // taking money out *for* what you saved it for (the goal stays covered)
  | 'adjustment' // correcting a mistake / reconciling
  | 'transfer'; // one leg of a bucket-to-bucket move (Phase 2)

export interface Bucket {
  id: string;
  name: string;
  /** Target amount in the account's base currency. 0 means "no goal set". */
  goalAmount: number;
  /** How spending against that goal is read. See GoalType. */
  goalType: GoalType;
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
