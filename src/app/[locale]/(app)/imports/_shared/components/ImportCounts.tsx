'use client';

import { useTranslations } from 'next-intl';
import type { ImportRecord } from '@/src/services/imports';

/** Inserted, updated, and skipped rows of an import. */
export default function ImportCounts({ record }: { record: ImportRecord }) {
  const t = useTranslations('imports');
  const items = [
    { key: 'insertedRows', value: record.insertedRows, tone: 'text-green-700' },
    { key: 'updatedRows', value: record.updatedRows, tone: 'text-sky-700' },
    { key: 'skippedRows', value: record.skippedRows, tone: 'text-amber-700' },
  ] as const;

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t(`counts.${item.key}`)}
          </dt>
          <dd className={`mt-1 text-xl font-semibold ${item.tone}`}>
            {item.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
