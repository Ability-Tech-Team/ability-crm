'use client';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

export default function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'bg-emerald-500 focus-visible:ring-emerald-500'
          : 'bg-slate-300 focus-visible:ring-slate-400'
      }`}
    >
      <span
        className={`pointer-events-none absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform ltr:left-0.5 rtl:right-0.5 ${
          checked ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
