import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryPoint } from '../model/calculations';
import { formatCurrency, formatDate } from '../model/format';

interface HistoryChartProps {
  points: HistoryPoint[];
  color: string;
  currency: string;
  locale: string;
}

export function HistoryChart({ points, color, currency, locale }: HistoryChartProps) {
  if (points.length === 0) {
    return <p className="muted small">Aún no hay movimientos para graficar.</p>;
  }

  const gradientId = `grad-${color.replace('#', '')}`;
  const compact = (value: number) =>
    new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(iso: string) => formatDate(iso, locale)}
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          stroke="var(--border)"
          minTickGap={24}
        />
        <YAxis
          tickFormatter={compact}
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          stroke="var(--border)"
          width={44}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value), currency, locale), 'Saldo']}
          labelFormatter={(iso) => formatDate(String(iso), locale)}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
