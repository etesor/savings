// A text input for currency amounts. Shows thousands separators as you type
// (e.g. "150,000") so the magnitude stays legible, and accepts up to two decimal
// places for cents (e.g. "96,508.17"). The locales this app targets (es-MX) use
// "." for the decimal point and "," for grouping.

import { useEffect, useState } from 'react';

interface MoneyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  locale: string;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

const MAX_INT_DIGITS = 15; // Keep the whole part within Number's safe integer range.

// Strip everything except digits and a single decimal point, and cap to two
// decimal places and MAX_INT_DIGITS whole digits. Returns a bare numeric string
// like "96508.17" (no grouping), or "" / "96508." for in-progress typing.
function sanitize(input: string): string {
  let s = input.replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot === -1) {
    return s.slice(0, MAX_INT_DIGITS);
  }
  const whole = s.slice(0, dot).slice(0, MAX_INT_DIGITS);
  const frac = s.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return `${whole}.${frac}`;
}

// Add thousands separators to the whole part while preserving the decimal
// portion exactly as typed (including a trailing dot or trailing zeros).
function group(raw: string, locale: string): string {
  if (raw === '') return '';
  const dot = raw.indexOf('.');
  const whole = dot === -1 ? raw : raw.slice(0, dot);
  const groupedWhole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Number(whole || '0'),
  );
  return dot === -1 ? groupedWhole : `${groupedWhole}${raw.slice(dot)}`;
}

function parse(raw: string): number | null {
  if (raw === '' || raw === '.') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Render a numeric value coming from props as an editable, grouped string.
function fromValue(value: number | null, locale: string): string {
  return value === null
    ? ''
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

export function MoneyInput({ value, onChange, locale, id, autoFocus, placeholder }: MoneyInputProps) {
  // The raw text is owned locally so decimals-in-progress ("96,508.", "96,508.10")
  // survive re-renders instead of being flattened back through the numeric value.
  const [text, setText] = useState(() => fromValue(value, locale));

  // Resync when the value changes externally (e.g. editing loads a bucket, or a
  // reset), but not for changes that merely echo what's already typed.
  // Deliberately keyed on value/locale only — `text` is the thing being
  // reconciled, so depending on it would re-run on every keystroke.
  useEffect(() => {
    if (parse(text.replace(/,/g, '')) !== value) {
      setText(fromValue(value, locale));
    }
  }, [value, locale]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = sanitize(e.target.value);
    setText(group(raw, locale));
    onChange(parse(raw));
  }

  return (
    <div className="money-input">
      <span className="money-prefix" aria-hidden>
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}
