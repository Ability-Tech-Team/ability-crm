'use client';

import { Fragment } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  parseAssistantAnswer,
  type AssistantEntry,
} from '@/src/lib/assistantChat';

/**
 * An answer's text with its line breaks and `**bold**`, built from text nodes:
 * whatever the answer contains, nothing in it is ever rendered as HTML.
 */
export function AssistantAnswerText({ text }: { text: string }) {
  return (
    <>
      {parseAssistantAnswer(text).map((segments, line) => (
        <Fragment key={line}>
          {line > 0 && '\n'}
          {segments.map((segment, part) =>
            segment.bold ? (
              <strong key={part} className="font-semibold">
                {segment.text}
              </strong>
            ) : (
              <Fragment key={part}>{segment.text}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}

// Each message takes its direction from its own text (`dir="auto"`, line by
// line), because an employee can write English while the CRM is in Arabic.
// The row around it keeps the page's direction, so it stays on its side.
const TEXT =
  'whitespace-pre-wrap break-words [overflow-wrap:anywhere] [unicode-bidi:plaintext]';

interface AssistantMessageProps {
  entry: AssistantEntry;
  canRetry: boolean;
  onRetry: () => void;
}

export default function AssistantMessage({
  entry,
  canRetry,
  onRetry,
}: AssistantMessageProps) {
  const t = useTranslations('assistant');

  if (entry.role === 'user') {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-sky-600 px-3.5 py-2 text-sm leading-relaxed text-white">
          <span className="sr-only">{t('you')}: </span>
          <p dir="auto" className={TEXT}>
            {entry.text}
          </p>
        </div>
      </li>
    );
  }

  if (entry.role === 'assistant') {
    return (
      <li className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800">
          <span className="sr-only">{t('assistant')}: </span>
          <p dir="auto" className={TEXT}>
            <AssistantAnswerText text={entry.text} />
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-relaxed text-red-800">
        <span className="sr-only">{t('assistant')}: </span>
        <p dir="auto" className={TEXT}>
          {entry.failure === 'assistant_error' && entry.text ? (
            <AssistantAnswerText text={entry.text} />
          ) : (
            t('unavailable')
          )}
        </p>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t('retry')}
          </button>
        )}
      </div>
    </li>
  );
}

export function AssistantWriting() {
  const t = useTranslations('assistant');

  return (
    <li className="flex justify-start" role="status">
      <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500">
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
        </span>
        {t('writing')}
      </div>
    </li>
  );
}
