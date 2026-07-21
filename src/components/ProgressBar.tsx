import type { GoalStatus } from '../model/calculations';

interface ProgressBarProps {
  progress: number; // 0..1+ (values above 1 are clamped for the bar width)
  status: GoalStatus;
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="progress" data-status={status}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
