'use client';

import Button from '@/src/components/ui/Button';

interface TicketCommentComposerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  submitLabel?: string;
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
  maxLength?: number;
}

export default function TicketCommentComposer({
  value,
  onChange,
  placeholder,
  label,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  error,
  rows = 3,
  maxLength = 1000,
}: TicketCommentComposerProps) {
  const isDisabled = disabled || isSubmitting;

  return (
    <div>
      {label && (
        <label
          htmlFor="ticket-comment"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <div
        className={`rounded-xl border bg-white p-3 ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}
      >
        <textarea
          id="ticket-comment"
          name="comment"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          dir="auto"
          rows={rows}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          className={`w-full resize-y rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 [unicode-bidi:plaintext] ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-sky-400 focus:ring-sky-100'
          }`}
          disabled={isDisabled}
        />

        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <p className="shrink-0 text-xs text-slate-400">
            {value.length}/{maxLength}
          </p>
        </div>

        {onSubmit && submitLabel && (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                void onSubmit();
              }}
              isLoading={isSubmitting}
              disabled={isDisabled || !value.trim()}
            >
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
