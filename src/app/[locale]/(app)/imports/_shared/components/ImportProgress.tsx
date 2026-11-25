'use client';

import { useFormatter, useTranslations } from 'next-intl';
import ProgressBar from '@/src/components/ui/ProgressBar';
import type { ImportRecord } from '@/src/services/imports';
import { toPercent, type ImportPhase } from '../utils';

type ImportProgressProps = {
  phase: Exclude<ImportPhase, 'idle'>;
  /** The share of the file sent, 0 to 1. */
  uploadFraction: number;
  record: ImportRecord | null;
};

type View = {
  /** The stage, announced once when it changes. */
  stage: string;
  /** Shown above the bar: the stage with its row numbers. */
  text: string;
  /** What the bar reads out: the text, with the percentage when it isn't in it. */
  valueText: string;
  value: number | null;
  /** Whether the percentage shows beside the text. */
  showPercent: boolean;
  tone: 'sky' | 'green' | 'red';
};

/**
 * The upload's progress: the file going up, the wait for the import worker,
 * its rows checked and records saved, then the outcome.
 */
export default function ImportProgress({
  phase,
  uploadFraction,
  record,
}: ImportProgressProps) {
  const t = useTranslations('imports.progress');
  const format = useFormatter();
  const asPercent = (value: number) =>
    format.number(value / 100, { style: 'percent' });

  const still = (label: string, tone: View['tone'], value: number | null): View => ({
    stage: label,
    text: label,
    valueText: label,
    value,
    showPercent: false,
    tone,
  });

  const view = ((): View => {
    switch (phase) {
      case 'uploading': {
        const percent = toPercent(uploadFraction);
        return {
          stage: t('uploadingStage'),
          text: t('uploadingStage'),
          valueText: t('uploading', { percent: asPercent(percent) }),
          value: percent,
          showPercent: true,
          tone: 'sky',
        };
      }
      case 'queued':
        return still(t('queued'), 'sky', null);
      case 'failed':
        return still(t('failed'), 'red', 100);
      case 'finished':
        return still(t('finished'), 'green', 100);
      case 'processing':
        break;
    }

    const progress = record?.progress ?? null;
    if (!progress || progress.stage === 'reading') {
      return still(progress ? t('reading') : t('processing'), 'sky', null);
    }
    const numbers = {
      done: format.number(progress.done),
      total: format.number(progress.total),
    };
    const text =
      progress.stage === 'checking'
        ? t('checking', numbers)
        : t('writing', numbers);
    return {
      stage: progress.stage === 'checking' ? t('checkingStage') : t('writingStage'),
      text,
      valueText: `${text} (${asPercent(progress.percent)})`,
      value: progress.percent,
      showPercent: true,
      tone: 'sky',
    };
  })();

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-baseline justify-between gap-3 text-sm"
        aria-hidden="true"
      >
        <span className="font-medium text-slate-700">{view.text}</span>
        {view.showPercent && view.value !== null ? (
          <span className="tabular-nums text-slate-500">
            {asPercent(view.value)}
          </span>
        ) : null}
      </div>
      <ProgressBar
        value={view.value}
        label={t('label')}
        valueText={view.valueText}
        tone={view.tone}
      />
      {/* Announces each new stage once, not every number that changes. */}
      <span role="status" className="sr-only">
        {view.stage}
      </span>
    </div>
  );
}
