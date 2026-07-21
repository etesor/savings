// A text input that displays whole-currency amounts with thousands separators as
// you type (e.g. "150,000"), so the magnitude is always legible and a stray zero
// is obvious. Integer amounts only — matching how the app formats money elsewhere.

interface MoneyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  locale: string;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

export function MoneyInput({ value, onChange, locale, id, autoFocus, placeholder }: MoneyInputProps) {
  const display =
    value === null ? '' : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits === '') {
      onChange(null);
      return;
    }
    // Cap length to avoid overflowing Number's safe integer range.
    const n = Number(digits.slice(0, 15));
    onChange(Number.isFinite(n) ? n : null);
  }

  return (
    <div className="money-input">
      <span className="money-prefix" aria-hidden>
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}
