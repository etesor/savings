// Locale-aware formatting helpers. Currency and locale come from the data file,
// so a user in another country only changes those two fields.

export function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Signed currency, e.g. "+$5,000" / "-$8,000", for movement rows. */
export function formatSignedCurrency(amount: number, currency: string, locale: string): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return sign + formatCurrency(Math.abs(amount), currency, locale);
}

export function formatPercent(fraction: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction);
}

export function formatDate(iso: string, locale: string): string {
  // Parse as local date to avoid the UTC off-by-one that `new Date('YYYY-MM-DD')` causes.
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

const ACCOUNT_LABELS: Record<string, string> = {
  bank: 'Banco',
  broker: 'Inversión',
};

export function accountLabel(account: string): string {
  return ACCOUNT_LABELS[account] ?? account;
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
