import { useState } from 'react';
import type { Bucket, Movement } from '../model/types';
import type { NewMovementInput } from '../state/store';
import { formatCurrency, todayISO } from '../model/format';
import { MoneyInput } from './MoneyInput';

type Sign = 'deposit' | 'withdrawal';

interface MovementFormProps {
  bucket: Bucket;
  currentBalance: number; // the bucket's balance today (including `movement` when editing)
  currency: string;
  locale: string;
  defaultSign?: Sign;
  /** Present when editing an existing movement. */
  movement?: Movement;
  onSubmit: (input: NewMovementInput) => void;
  onUpdate?: (movement: Movement) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function MovementForm({
  bucket,
  currentBalance,
  currency,
  locale,
  defaultSign = 'deposit',
  movement,
  onSubmit,
  onUpdate,
  onDelete,
  onClose,
}: MovementFormProps) {
  const editing = Boolean(movement);
  // "initial" (seeded starting balance) keeps its kind and its positive sign — we
  // don't turn it into a regular deposit, so the "saved this month" figure stays honest.
  const isInitial = movement?.kind === 'initial';

  const [sign, setSign] = useState<Sign>(
    movement ? (movement.amount < 0 ? 'withdrawal' : 'deposit') : defaultSign,
  );
  const [amount, setAmount] = useState<number | null>(
    movement ? Math.abs(movement.amount) : null,
  );
  const [date, setDate] = useState(movement?.date ?? todayISO());
  const [note, setNote] = useState(movement?.note ?? '');

  const magnitude = amount ?? 0;
  const signed = isInitial ? magnitude : sign === 'withdrawal' ? -magnitude : magnitude;
  const oldAmount = movement?.amount ?? 0;
  const nextBalance = currentBalance - oldAmount + signed;
  const valid = magnitude > 0 && date !== '';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (editing && movement && onUpdate) {
      onUpdate({
        ...movement,
        amount: signed,
        date,
        note: note.trim(),
        kind: isInitial ? 'initial' : sign,
      });
    } else {
      onSubmit({ bucketId: bucket.id, amount: signed, date, note, kind: sign });
    }
    onClose();
  }

  return (
    <form className="form" onSubmit={submit}>
      {isInitial ? (
        <p className="muted small">Saldo inicial — el punto de partida de tu historial.</p>
      ) : (
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={sign === 'deposit'}
            className={sign === 'deposit' ? 'seg active seg-deposit' : 'seg'}
            onClick={() => setSign('deposit')}
          >
            + Agregar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sign === 'withdrawal'}
            className={sign === 'withdrawal' ? 'seg active seg-withdraw' : 'seg'}
            onClick={() => setSign('withdrawal')}
          >
            − Retirar
          </button>
        </div>
      )}

      <label className="field">
        <span>Monto</span>
        <MoneyInput value={amount} onChange={setAmount} locale={locale} autoFocus placeholder="0" />
      </label>

      <label className="field">
        <span>Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="field">
        <span>Nota (opcional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={sign === 'withdrawal' ? 'ej. reparación del coche' : 'ej. ahorro mensual'}
        />
      </label>

      <div className="preview">
        <span className="muted">Saldo después</span>
        <strong>{formatCurrency(nextBalance, currency, locale)}</strong>
      </div>

      <div className="form-actions">
        {editing && movement && onDelete && (
          <button
            type="button"
            className="btn danger-ghost"
            onClick={() => {
              onDelete(movement.id);
              onClose();
            }}
          >
            Eliminar
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn primary" disabled={!valid}>
          {editing ? 'Guardar' : 'Guardar movimiento'}
        </button>
      </div>
    </form>
  );
}
