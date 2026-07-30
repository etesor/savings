import type { GoalStatus } from '../model/calculations';

interface ProgressBarProps {
  progress: number; // 0..1+ (values above 1 are clamped for the bar width)
  status: GoalStatus;
  /**
   * Share of the goal already spent on its purpose. Drawn as a hatched leading
   * segment so money that did its job stays on the bar instead of vanishing —
   * the fill changes texture rather than shrinking.
   */
  spentProgress?: number;
}

export function ProgressBar({ progress, status, spentProgress = 0 }: ProgressBarProps) {
  const covered = clamp(progress);
  const spent = Math.min(clamp(spentProgress), covered);
  const cash = covered - spent;

  return (
    <div className="progress" data-status={status}>
      {spent > 0 && <div className="progress-fill spent" style={{ width: `${spent * 100}%` }} />}
      {cash > 0 && <div className="progress-fill" style={{ width: `${cash * 100}%` }} />}
    </div>
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
