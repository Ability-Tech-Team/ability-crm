type ProgressBarTone = 'sky' | 'green' | 'red';

type ProgressBarProps = {
  /** 0 to 100; null while the amount isn't known (an indeterminate bar). */
  value: number | null;
  /** What the bar measures, for assistive technology. */
  label: string;
  /** Read out instead of the bare percentage, e.g. "Checking rows: 40 of 120". */
  valueText?: string;
  tone?: ProgressBarTone;
  className?: string;
};

const FILL: Record<ProgressBarTone, string> = {
  sky: 'bg-sky-500',
  green: 'bg-green-600',
  red: 'bg-red-500',
};

/**
 * A horizontal progress bar. The fill grows from the inline start, so it runs
 * right to left in Arabic. Without a value it pulses across the whole track
 * (still for those who prefer reduced motion).
 */
export default function ProgressBar({
  value,
  label,
  valueText,
  tone = 'sky',
  className = '',
}: ProgressBarProps) {
  const percent =
    value === null ? null : Math.round(Math.min(Math.max(value, 0), 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={valueText}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
    >
      {percent === null ? (
        <div
          className={`h-full w-full rounded-full opacity-60 motion-safe:animate-pulse ${FILL[tone]}`}
        />
      ) : (
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${FILL[tone]}`}
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
}
