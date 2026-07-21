// Pure functions that derive every number the UI shows from the movement log.
// No state, no side effects — easy to reason about and to test.

import type { Account, AppData, Movement } from './types';

/** Sum of all movements for a single bucket. */
export function balanceOf(bucketId: string, movements: Movement[]): number {
  let sum = 0;
  for (const m of movements) {
    if (m.bucketId === bucketId) sum += m.amount;
  }
  return sum;
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

/** Fraction of the goal reached. Can exceed 1 when over-funded. */
export function goalProgress(goalAmount: number, balance: number): number {
  if (goalAmount <= 0) return balance > 0 ? 1 : 0;
  return balance / goalAmount;
}

/** How much is still needed to hit the goal (never negative). */
export function remainingToGoal(goalAmount: number, balance: number): number {
  return Math.max(0, goalAmount - balance);
}

/** YYYY-MM for a date, in local time. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Net amount actually *saved* during a given month (YYYY-MM), across active buckets.
 * Excludes seeded "initial" balances so the figure reflects real new effort, and
 * subtracts withdrawals (a month where you took money out saved less).
 */
export function savedInMonth(data: AppData, monthKey: string): number {
  const active = new Set(data.buckets.filter((b) => !b.archived).map((b) => b.id));
  let sum = 0;
  for (const m of data.movements) {
    if (m.kind === 'initial') continue;
    if (active.has(m.bucketId) && m.date.slice(0, 7) === monthKey) sum += m.amount;
  }
  return sum;
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
