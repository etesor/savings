// Pure functions that derive every number the UI shows from the movement log.
// No state, no side effects — easy to reason about and to test.

import type { Account, AppData, Bucket, Movement } from './types';

/** Round to cents, so sums of decimal amounts don't drift into float noise. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Sum of all movements for a single bucket. */
export function balanceOf(bucketId: string, movements: Movement[]): number {
  let sum = 0;
  for (const m of movements) {
    if (m.bucketId === bucketId) sum += m.amount;
  }
  return sum;
}

/**
 * A bucket's balance at the end of a given day (YYYY-MM-DD). This is the baseline
 * a "the balance is now X" entry is measured against — using today's balance
 * instead would silently mis-state the delta whenever the date is backdated.
 */
export function balanceAsOf(bucketId: string, date: string, movements: Movement[]): number {
  let sum = 0;
  for (const m of movements) {
    if (m.bucketId === bucketId && m.date <= date) sum += m.amount;
  }
  return roundMoney(sum);
}

/** Whether the bucket has movements dated after `date` (so its balance moved on since then). */
export function hasMovementsAfter(bucketId: string, date: string, movements: Movement[]): boolean {
  return movements.some((m) => m.bucketId === bucketId && m.date > date);
}

/** Map of bucketId -> current balance, for the whole dataset in one pass. */
export function bucketBalances(data: AppData): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of data.buckets) map.set(b.id, 0);
  for (const m of data.movements) {
    map.set(m.bucketId, (map.get(m.bucketId) ?? 0) + m.amount);
  }
  return map;
}

/**
 * Money that left a bucket *for the thing it was saved for*, as a positive number.
 * Spends are stored negative like any other outflow, so the sign is flipped here —
 * which also means a refunded spend (entered positive) subtracts back out on its own.
 */
export function spentOf(bucketId: string, movements: Movement[]): number {
  let sum = 0;
  for (const m of movements) {
    if (m.bucketId === bucketId && m.kind === 'spend') sum -= m.amount;
  }
  return roundMoney(sum);
}

/** Map of bucketId -> amount spent on its purpose, for the whole dataset in one pass. */
export function bucketSpent(data: AppData): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of data.buckets) map.set(b.id, 0);
  for (const m of data.movements) {
    if (m.kind !== 'spend') continue;
    map.set(m.bucketId, (map.get(m.bucketId) ?? 0) - m.amount);
  }
  for (const [id, value] of map) map.set(id, roundMoney(value));
  return map;
}

/**
 * How much of the goal has actually been taken care of — the number the progress
 * bar measures. For a 'target' bucket it's the cash still sitting there plus
 * whatever already went to its purpose, so paying for the trip doesn't undo the
 * saving. For an 'ongoing' fund only the cash counts, because spending it leaves
 * you with a hole to refill.
 *
 * Note this collapses to plain `balance` for any bucket with no spends, which is
 * every bucket in a file written before spends existed.
 */
export function fundedOf(bucket: Bucket, balance: number, spent: number): number {
  return bucket.goalType === 'ongoing' ? roundMoney(balance) : roundMoney(balance + spent);
}

interface TotalsOptions {
  includeArchived?: boolean;
}

/** Total across all (active) buckets. */
export function totalBalance(data: AppData, opts: TotalsOptions = {}): number {
  const balances = bucketBalances(data);
  let sum = 0;
  for (const b of data.buckets) {
    if (!opts.includeArchived && b.archived) continue;
    sum += balances.get(b.id) ?? 0;
  }
  return sum;
}

/** Balance split by where the money lives (bank vs broker). */
export function balanceByAccount(data: AppData, opts: TotalsOptions = {}): Record<Account, number> {
  const balances = bucketBalances(data);
  const result: Record<Account, number> = { bank: 0, broker: 0 };
  for (const b of data.buckets) {
    if (!opts.includeArchived && b.archived) continue;
    result[b.account] += balances.get(b.id) ?? 0;
  }
  return result;
}

/** Sum of every goal across active buckets (for an overall progress figure). */
export function totalGoal(data: AppData, opts: TotalsOptions = {}): number {
  let sum = 0;
  for (const b of data.buckets) {
    if (!opts.includeArchived && b.archived) continue;
    sum += b.goalAmount;
  }
  return sum;
}

/**
 * Total covered across all (active) buckets — the counterpart to totalGoal, and
 * what the dashboard bar measures. Differs from totalBalance only by the spends
 * that still count toward a goal, so the overall bar agrees with the cards.
 */
export function totalFunded(data: AppData, opts: TotalsOptions = {}): number {
  const balances = bucketBalances(data);
  const spents = bucketSpent(data);
  let sum = 0;
  for (const b of data.buckets) {
    if (!opts.includeArchived && b.archived) continue;
    sum += fundedOf(b, balances.get(b.id) ?? 0, spents.get(b.id) ?? 0);
  }
  return roundMoney(sum);
}

/** Fraction of the goal reached. Can exceed 1 when over-funded. */
export function goalProgress(goalAmount: number, covered: number): number {
  if (goalAmount <= 0) return covered > 0 ? 1 : 0;
  return covered / goalAmount;
}

/** How much is still needed to hit the goal (never negative). */
export function remainingToGoal(goalAmount: number, covered: number): number {
  return Math.max(0, goalAmount - covered);
}

/** YYYY-MM for a date, in local time. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * How much the total balance moved during a given month (YYYY-MM), across active
 * buckets. Excludes seeded "initial" balances, which are a starting point rather
 * than a change. Deposits count up, withdrawals count down — and for investment
 * buckets this includes whatever the market did, since the app tracks how much
 * you *have*, not where each peso came from.
 */
export function changeInMonth(data: AppData, monthKey: string): number {
  const active = new Set(data.buckets.filter((b) => !b.archived).map((b) => b.id));
  let sum = 0;
  for (const m of data.movements) {
    if (m.kind === 'initial') continue;
    if (active.has(m.bucketId) && m.date.slice(0, 7) === monthKey) sum += m.amount;
  }
  return roundMoney(sum);
}

export type GoalStatus = 'empty' | 'far' | 'mid' | 'close' | 'reached';

/** Buckets the progress into bands that drive the color cues. */
export function goalStatus(progress: number): GoalStatus {
  if (progress >= 1) return 'reached';
  if (progress >= 0.67) return 'close';
  if (progress >= 0.34) return 'mid';
  if (progress > 0) return 'far';
  return 'empty';
}

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  balance: number; // running balance up to and including this date
}

/** Running balance over time for one bucket (one point per date that had activity). */
export function historySeries(bucketId: string, movements: Movement[]): HistoryPoint[] {
  return runningBalance(movements.filter((m) => m.bucketId === bucketId));
}

/** Running balance over time across every active bucket combined. */
export function overallHistorySeries(data: AppData): HistoryPoint[] {
  const active = new Set(data.buckets.filter((b) => !b.archived).map((b) => b.id));
  return runningBalance(data.movements.filter((m) => active.has(m.bucketId)));
}

function runningBalance(movements: Movement[]): HistoryPoint[] {
  const byDate = new Map<string, number>();
  for (const m of movements) {
    byDate.set(m.date, (byDate.get(m.date) ?? 0) + m.amount);
  }
  const dates = [...byDate.keys()].sort();
  const points: HistoryPoint[] = [];
  let running = 0;
  for (const date of dates) {
    running += byDate.get(date) ?? 0;
    points.push({ date, balance: running });
  }
  return points;
}
