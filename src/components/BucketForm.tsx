import { useState } from 'react';
import { BUCKET_COLORS } from '../config';
import type { Account, Bucket, GoalType } from '../model/types';
import type { NewBucketInput } from '../state/store';
import { formatCurrency, todayISO } from '../model/format';
import { MoneyInput } from './MoneyInput';

interface BucketFormProps {
  /** Provided when editing an existing bucket; omitted when creating. */
  initial?: Bucket;
  /** Already spent on this bucket's purpose — only used to warn before a type switch. */
  spent?: number;
  currency: string;
  locale: string;
  onCreate: (input: NewBucketInput) => void;
  onUpdate: (bucket: Bucket) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function BucketForm({
  initial,
  spent = 0,
  currency,
  locale,
  onCreate,
  onUpdate,
  onArchive,
  onDelete,
  onClose,
}: BucketFormProps) {
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [goal, setGoal] = useState<number | null>(initial ? initial.goalAmount : null);
  const [goalType, setGoalType] = useState<GoalType>(initial?.goalType ?? 'target');
  const [account, setAccount] = useState<Account>(initial?.account ?? 'bank');

  const [color, setColor] = useState(initial?.color ?? BUCKET_COLORS[0]);
  const [initialAmount, setInitialAmount] = useState<number | null>(null);
  const [initialDate, setInitialDate] = useState(todayISO());

  const valid = name.trim() !== '';

  // The type is only a lens over the movement log — nothing is destroyed by
  // switching it, and switching back restores the old numbers exactly. So this
  // just says what will move on screen, rather than asking you to confirm.
  const switchingWithSpends = editing && spent > 0 && goalType !== initial?.goalType;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const goalAmount = goal ?? 0;

    if (initial) {
      onUpdate({ ...initial, name: name.trim(), goalAmount, goalType, account, color });
    } else {
      onCreate({
        name,
        goalAmount,
        goalType,
        account,
        color,
        initialAmount: initialAmount ?? 0,
        initialDate,
      });
    }
    onClose();
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Nombre</span>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Fondo de emergencia"
        />
      </label>

      <label className="field">
        <span>Meta</span>
        <MoneyInput value={goal} onChange={setGoal} locale={locale} placeholder="150,000" />
      </label>

      <div className="field">
        <span>¿Qué es esta meta?</span>
        <div className="segmented">
          <button
            type="button"
            className={goalType === 'target' ? 'seg active' : 'seg'}
            onClick={() => setGoalType('target')}
          >
            Ahorro para algo
          </button>
          <button
            type="button"
            className={goalType === 'ongoing' ? 'seg active' : 'seg'}
            onClick={() => setGoalType('ongoing')}
          >
            Fondo que mantengo
          </button>
        </div>
        <p className="muted small">
          {goalType === 'target'
            ? 'Un viaje, una compra, un pago. Lo que gastes en ello sigue contando como meta cubierta.'
            : 'Emergencias, mantenimiento. Si lo gastas, tienes que reponerlo para volver a tu meta.'}
        </p>
        {switchingWithSpends && (
          <p className="muted small">
            Esta cuenta tiene {formatCurrency(spent, currency, locale)} gastados.{' '}
            {goalType === 'ongoing'
              ? 'Como fondo que mantienes, dejarán de contar para la meta y tu avance bajará.'
              : 'Como ahorro para algo, volverán a contar para la meta y tu avance subirá.'}
          </p>
        )}
      </div>

      <div className="field">
        <span>Cuenta</span>
        <div className="segmented">
          <button
            type="button"
            className={account === 'bank' ? 'seg active' : 'seg'}
            onClick={() => setAccount('bank')}
          >
            Banco
          </button>
          <button
            type="button"
            className={account === 'broker' ? 'seg active' : 'seg'}
            onClick={() => setAccount('broker')}
          >
            Inversión
          </button>
        </div>
      </div>

      <div className="field">
        <span>Color</span>
        <div className="swatches">
          {BUCKET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={color === c ? 'swatch selected' : 'swatch'}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {!editing && (
        <fieldset className="field-group">
          <legend>Saldo inicial (opcional)</legend>
          <p className="muted small">
            Lo que ya tienes ahorrado hoy. Se registra como tu primer movimiento para empezar el
            historial.
          </p>
          <div className="row">
            <label className="field grow">
              <span>Monto actual</span>
              <MoneyInput
                value={initialAmount}
                onChange={setInitialAmount}
                locale={locale}
                placeholder="30,000"
              />
            </label>
            <label className="field">
              <span>Desde</span>
              <input
                type="date"
                value={initialDate}
                onChange={(e) => setInitialDate(e.target.value)}
              />
            </label>
          </div>
        </fieldset>
      )}

      <div className="form-actions">
        {editing && initial && onDelete && (
          <button
            type="button"
            className="btn danger-ghost"
            onClick={() => {
              onDelete(initial.id);
              onClose();
            }}
          >
            Eliminar
          </button>
        )}
        {editing && initial && onArchive && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              onArchive(initial.id, !initial.archived);
              onClose();
            }}
          >
            {initial.archived ? 'Reactivar' : 'Archivar'}
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn primary" disabled={!valid}>
          {editing ? 'Guardar' : 'Crear bucket'}
        </button>
      </div>
    </form>
  );
}
