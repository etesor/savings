import type { Bucket, Movement } from '../model/types';
import { goalProgress, goalStatus, historySeries, remainingToGoal } from '../model/calculations';
import { accountLabel, formatCurrency, formatDate, formatPercent, formatSignedCurrency } from '../model/format';
import { ProgressBar } from './ProgressBar';
import { HistoryChart } from './HistoryChart';

const STATUS_LABEL: Record<string, string> = {
  reached: '¡Meta cumplida! 🎉',
  close: 'Casi lo logras',
  mid: 'Vas a la mitad',
  far: 'Apenas empezando',
  empty: 'Sin ahorro aún',
};

interface BucketCardProps {
  bucket: Bucket;
  balance: number;
  movements: Movement[]; // all movements (filtered inside for this bucket)
  currency: string;
  locale: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onSetBalance: () => void;
  onMovement: () => void;
  onEdit: () => void;
  onEditMovement: (movement: Movement) => void;
  onDeleteMovement: (id: string) => void;
}

export function BucketCard({
  bucket,
  balance,
  movements,
  currency,
  locale,
  expanded,
  onToggleExpand,
  onSetBalance,
  onMovement,
  onEdit,
  onEditMovement,
  onDeleteMovement,
}: BucketCardProps) {
  const progress = goalProgress(bucket.goalAmount, balance);
  const status = goalStatus(progress);
  const remaining = remainingToGoal(bucket.goalAmount, balance);
  const excess = balance - bucket.goalAmount;
  const points = historySeries(bucket.id, movements);
  const recent = movements
    .filter((m) => m.bucketId === bucket.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  return (
    <article className="card" style={{ ['--accent' as string]: bucket.color }} data-status={status}>
      <div className="card-accent" />
      <header className="card-head">
        <span className="drag-grip" title="Arrastra para reordenar" aria-hidden>
          ⠿
        </span>
        <div className="card-title">
          <h3>{bucket.name}</h3>
          <span className="tag">{accountLabel(bucket.account)}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onEdit} aria-label="Editar bucket">
          ✎
        </button>
      </header>

      <div className="balance">{formatCurrency(balance, currency, locale)}</div>
      <div className="goal-line muted">
        {bucket.goalAmount > 0 ? (
          <>
            {remaining > 0 ? (
              <span>
                Faltan <strong className="remaining">{formatCurrency(remaining, currency, locale)}</strong>{' '}
                de {formatCurrency(bucket.goalAmount, currency, locale)}
              </span>
            ) : (
              <span>
                Meta cumplida{excess > 0 ? ` · +${formatCurrency(excess, currency, locale)} extra` : ''}
              </span>
            )}
            <span className="pct" data-status={status}>
              {formatPercent(progress, locale)}
            </span>
          </>
        ) : (
          <span>Sin meta definida</span>
        )}
      </div>

      {bucket.goalAmount > 0 && <ProgressBar progress={progress} status={status} />}
      <div className="status-label" data-status={status}>
        {STATUS_LABEL[status]}
      </div>

      <div className="card-actions">
        <button type="button" className="btn small primary" onClick={onSetBalance}>
          Actualizar saldo
        </button>
        <button type="button" className="btn small" onClick={onMovement}>
          Movimiento
        </button>
        <button type="button" className="btn small ghost" onClick={onToggleExpand}>
          {expanded ? 'Ocultar' : 'Historial'}
        </button>
      </div>

      {expanded && (
        <div className="card-history">
          <HistoryChart points={points} color={bucket.color} currency={currency} locale={locale} />
          {recent.length > 0 && (
            <ul className="movements">
              {recent.map((m) => (
                <li key={m.id}>
                  <span className="mv-date muted">{formatDate(m.date, locale)}</span>
                  <button
                    type="button"
                    className="mv-note"
                    onClick={() => onEditMovement(m)}
                    title="Editar movimiento"
                  >
                    {m.note || movementKindLabel(m.kind)}
                  </button>
                  <span className={m.amount < 0 ? 'mv-amount neg' : 'mv-amount pos'}>
                    {formatSignedCurrency(m.amount, currency, locale)}
                  </span>
                  <button
                    type="button"
                    className="icon-btn tiny"
                    aria-label="Editar movimiento"
                    onClick={() => onEditMovement(m)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-btn tiny"
                    aria-label="Eliminar movimiento"
                    onClick={() => onDeleteMovement(m.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function movementKindLabel(kind: Movement['kind']): string {
  switch (kind) {
    case 'initial':
      return 'Saldo inicial';
    case 'deposit':
      return 'Depósito';
    case 'withdrawal':
      return 'Retiro';
    case 'transfer':
      return 'Transferencia';
    default:
      return 'Ajuste';
  }
}
