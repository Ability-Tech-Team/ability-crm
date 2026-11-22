import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';

export type EntryNoticeTone = 'success' | 'warning' | 'error';

export type EntryNoticeValue = { tone: EntryNoticeTone; message: string };

const TONES: Record<
  EntryNoticeTone,
  { className: string; Icon: typeof CircleCheck }
> = {
  success: {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    Icon: CircleCheck,
  },
  warning: {
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    Icon: TriangleAlert,
  },
  error: {
    className: 'border-red-200 bg-red-50 text-red-700',
    Icon: CircleAlert,
  },
};

/** The outcome of a manual entry, shown above its form. */
export default function EntryNotice({
  notice,
}: {
  notice: EntryNoticeValue | null;
}) {
  if (!notice) return null;
  const { className, Icon } = TONES[notice.tone];

  return (
    <div
      role={notice.tone === 'success' ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${className}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p>{notice.message}</p>
    </div>
  );
}
