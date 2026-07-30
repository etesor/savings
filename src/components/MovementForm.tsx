import { useEffect, useState } from 'react';
import type { Bucket, Movement } from '../model/types';
import type { NewMovementInput } from '../state/store';
import { balanceAsOf, hasMovementsAfter, roundMoney } from '../model/calculations';
import { formatCurrency, formatSignedCurrency, todayISO } from '../model/format';
import { MoneyInput } from './MoneyInput';

type Sign = 'deposit' | 'withdrawal';

/**
 * Two ways to describe the same event. "balance" is what you read off your bank
 * screen ("ahora tengo 3,500") and the movement is derived from it; "delta" is the
 * movement itself ("metí 500"). Both end up as one signed entry in the log.
 */
export type EntryMode = 'balance' | 'delta';

interface MovementFormProps {
  bucket: Bucket;
  currentBalance: number; // the bucket's balance today (including `movement` when editing)
  movements: Movement[]; // all movements (filtered inside for this bucket)
  currency: string;
  locale: string;
  defaultMode?: EntryMode;
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
  movements,
  currency,
  locale,
  defaultMode = 'balance',
  defaultSign = 'deposit',
  movement,
  onSubmit,
  onUpdate,
  onDelete,
  onClose,
}: MovementFormProps) {
  const editing = Boolean(movement);
  // "initial" (seeded starting balance) keeps its kind and its positive sign — we
  // don't turn it into a regular deposit, so the monthly change figure stays honest.
  const isInitial = movement?.kind === 'initial';

  // Editing is always about one specific entry, so it stays in delta mode.
  const [mode, setMode] = useState<EntryMode>(editing ? 'delta' : defaultMode);
  const [sign, setSign] = useState<Sign>(
    movement ? (movement.amount < 0 ? 'withdrawal' : 'deposit') : defaultSign,
  );
  const [amount, setAmount] = useState<number | null>(
    movement ? Math.abs(movement.amount) : null,
  );
  const [date, setDate] = useState(movement?.date ?? todayISO());
  const [note, setNote] = useState(movement?.note ?? '');
  const [target, setTarget] = useState<number | null>(currentBalance);
  const [targetTouched, setTargetTouched] = useState(false);

  // What the bucket held at the end of the chosen day — the baseline the typed
  // balance is compared against.
  const baseline = balanceAsOf(bucket.id, date, movements);
  const laterMovements = hasMovementsAfter(bucket.id, date, movements);

  // Until the field is touched it mirrors the baseline, so opening the form on a
  // week with no change shows the right number and a delta of zero.
  useEffect(() => {
    if (!targetTouched) setTarget(baseline);
  }, [baseline, targetTouched]);

  const magnitude = amount ?? 0;
  const deltaFromSign = isInitial ? magnitude : sign === 'withdrawal' ? -magnitude : magnitude;
  const signed =
    mode === 'balance' ? roundMoney((target ?? 0) - baseline) : roundMoney(deltaFromSign);
  const kind: Movement['kind'] =
    mode === 'balance' ? (signed < 0 ? 'withdrawal' : 'deposit') : isInitial ? 'initial' : sign;

  const oldAmount = movement?.amount ?? 0;
  const nextBalance = roundMoney(currentBalance - oldAmount + signed);
  const valid =
    date !== '' && (mode === 'balance' ? target !== null && signed !== 0 : magnitude > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (editing && movement && onUpdate) {
      onUpdate({ ...movement, amount: signed, date, note: note.trim(), kind });
    } else {
      onSubmit({ bucketId: bucket.id, amount: signed, date, note, kind });
    }
    onClose();
  }

  return (
    <form className="form" onSubmit={submit}>
      {!editing && (
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'balance'}
            className={mode === 'balance' ? 'seg active' : 'seg'}
            onClick={() => setMode('balance')}
          >
            Saldo actual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'delta'}
            className={mode === 'delta' ? 'seg active' : 'seg'}
            onClick={() => setMode('delta')}
          >
            Movimiento
          </button>
        </div>
      )}

      {mode === 'balance' ? (
        <>
          <label className="field">
            <span>{date === todayISO() ? 'Saldo que tienes hoy' : 'Saldo en esa fecha'}</span>
            <MoneyInput
              value={target}
              onChange={(v) => {
                setTargetTouched(true);
                setTarget(v);
              }}
              locale={locale}
              autoFocus
              placeholder="0"
            />
          </label>
          <p className="muted small">
            Escribe el saldo tal como lo ves en tu cuenta. El movimiento se calcula solo.
          </p>
        </>
      ) : (
        <>
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
            <MoneyInput
              value={amount}
              onChange={setAmount}
              locale={locale}
              autoFocus
              placeholder="0"
            />
          </label>
        </>
      )}

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
          placeholder={
            mode === 'balance'
              ? 'ej. corte de quincena'
              : sign === 'withdrawal'
                ? 'ej. reparación del coche'
                : 'ej. ahorro mensual'
          }
        />
      </label>

      {mode === 'balance' ? (
        <div className="preview">
          <span className="muted">Movimiento</span>
          <strong className={signed > 0 ? 'mo-pos' : signed < 0 ? 'mo-neg' : 'muted'}>
            {signed === 0 ? 'Sin cambios' : formatSignedCurrency(signed, currency, locale)}
          </strong>
        </div>
      ) : (
        <div className="preview">
          <span className="muted">Saldo después</span>
          <strong>{formatCurrency(nextBalance, currency, locale)}</strong>
        </div>
      )}

      {mode === 'balance' && laterMovements && signed !== 0 && (
        <p className="muted small">
          Hay movimientos posteriores a esta fecha, así que este saldo no es el de hoy. Tu saldo
          actual quedará en {formatCurrency(nextBalance, currency, locale)}.
        </p>
      )}

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
