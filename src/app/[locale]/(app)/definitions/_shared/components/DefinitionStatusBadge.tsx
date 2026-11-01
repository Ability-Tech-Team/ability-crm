'use client';

type DefinitionStatusBadgeProps = {
  isActive?: number | null;
  activeLabel: string;
  inactiveLabel: string;
};

export default function DefinitionStatusBadge({
  isActive,
  activeLabel,
  inactiveLabel,
}: DefinitionStatusBadgeProps) {
  const isEnabled = Number(isActive ?? 1) === 1;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isEnabled
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-200 text-slate-700'
      }`}
    >
      {isEnabled ? activeLabel : inactiveLabel}
    </span>
  );
}
