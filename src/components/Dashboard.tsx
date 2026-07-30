import type { AppData } from '../model/types';
import {
  balanceByAccount,
  changeInMonth,
  goalProgress,
  goalStatus,
  monthKeyOf,
  overallHistorySeries,
  remainingToGoal,
  totalBalance,
  totalGoal,
} from '../model/calculations';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../model/format';
import { ProgressBar } from './ProgressBar';
import { HistoryChart } from './HistoryChart';

const TREND_COLOR = '#2563eb';

interface DashboardProps {
  data: AppData;
}

export function Dashboard({ data }: DashboardProps) {
  const total = totalBalance(data);
  const goal = totalGoal(data);
  const progress = goalProgress(goal, total);
  const status = goalStatus(progress);
  const remaining = remainingToGoal(goal, total);
  const byAccount = balanceByAccount(data);
  const { currency, locale } = data;

  const now = new Date();
  const changeThisMonth = changeInMonth(data, monthKeyOf(now));
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const changeLastMonth = changeInMonth(data, monthKeyOf(prevMonth));

  const points = overallHistorySeries(data);

  return (
    <section className="dashboard">
      <div className="dash-top">
        <div className="dash-total">
          <span className="muted">Ahorro total</span>
          <div className="dash-amount">{formatCurrency(total, currency, locale)}</div>
          {goal > 0 && (
            <div className="dash-goal">
              <ProgressBar progress={progress} status={status} />
              <span className="muted small">
                {remaining > 0
                  ? `Faltan ${formatCurrency(remaining, currency, locale)} · ${formatPercent(progress, locale)} de ${formatCurrency(goal, currency, locale)}`
                  : `¡Todas tus metas cumplidas! ${formatCurrency(total, currency, locale)} ahorrados 🎉`}
              </span>
            </div>
          )}
        </div>

        <div className="dash-split">
          <div className="split-item">
            <span className="muted small">Banco</span>
            <strong>{formatCurrency(byAccount.bank, currency, locale)}</strong>
          </div>
          <div className="split-item">
            <span className="muted small">Inversión</span>
            <strong>{formatCurrency(byAccount.broker, currency, locale)}</strong>
          </div>
        </div>
      </div>

      <div className="dash-momentum">
        <div className="mo-item">
          <span className="muted small">Cambio este mes</span>
          <strong className={changeThisMonth > 0 ? 'mo-pos' : changeThisMonth < 0 ? 'mo-neg' : ''}>
            {formatSignedCurrency(changeThisMonth, currency, locale)}
          </strong>
        </div>
        <div className="mo-item">
          <span className="muted small">Mes pasado</span>
          <strong className="muted">{formatSignedCurrency(changeLastMonth, currency, locale)}</strong>
        </div>
      </div>

      {points.length >= 2 && (
        <div className="dash-chart">
          <span className="muted small">Evolución de tu ahorro total</span>
          <HistoryChart points={points} color={TREND_COLOR} currency={currency} locale={locale} />
        </div>
      )}
    </section>
  );
}
