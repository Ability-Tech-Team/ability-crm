'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { BotMessageSquare, SendHorizontal, SquarePen, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import {
  ASSISTANT_COUNTER_FROM,
  ASSISTANT_MESSAGE_MAX,
  assistantAnswerPlainText,
  type AssistantAnswerEntry,
  type AssistantEntry,
  type AssistantErrorEntry,
} from '@/src/lib/assistantChat';
import AssistantMessage, { AssistantWriting } from './AssistantMessage';

export interface AssistantPanelProps {
  id: string;
  open: boolean;
  entries: AssistantEntry[];
  pending: boolean;
  retryableId: string | null;
  announcement: AssistantAnswerEntry | AssistantErrorEntry | null;
  onSend: (text: string) => boolean;
  onRetry: () => void;
  onNewChat: () => void;
  onClose: () => void;
}

/** How close to the bottom still counts as "reading the newest message". */
const FOLLOW_THRESHOLD_PX = 48;
const INPUT_MAX_HEIGHT_PX = 160;

const ICON_BUTTON =
  'rounded-lg p-2 text-[#8F9BB3] transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

/**
 * The assistant's chat panel. It doesn't block or dim the page: the employee
 * follows the steps on the screen behind it. Anchored above the button on
 * wider screens; it fills the screen on small ones.
 */
export default function AssistantPanel({
  id,
  open,
  entries,
  pending,
  retryableId,
  announcement,
  onSend,
  onRetry,
  onNewChat,
  onClose,
}: AssistantPanelProps) {
  const t = useTranslations('assistant');
  const tForm = useTranslations('form');
  const titleId = useId();
  const inputId = useId();
  const noteId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const [draft, setDraft] = useState('');
  const [confirmingNewChat, setConfirmingNewChat] = useState(false);

  const length = draft.trim().length;
  const tooLong = length > ASSISTANT_MESSAGE_MAX;
  const showCounter = length >= ASSISTANT_COUNTER_FROM;
  const canSend = length > 0 && !tooLong && !pending;

  // Opening: the input gets the focus and the newest message is in view.
  useEffect(() => {
    if (!open) return;
    follow.current = true;
    inputRef.current?.focus();
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [open]);

  // New messages come into view, unless the employee scrolled up to reread.
  useEffect(() => {
    const list = listRef.current;
    if (open && list && follow.current) list.scrollTop = list.scrollHeight;
  }, [entries.length, pending, open]);

  // The input grows with its text, up to a few lines.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`;
  }, [draft]);

  const trackScroll = () => {
    const list = listRef.current;
    if (!list) return;
    follow.current =
      list.scrollHeight - list.scrollTop - list.clientHeight < FOLLOW_THRESHOLD_PX;
  };

  const submit = () => {
    if (!canSend) return;
    if (onSend(draft)) {
      setDraft('');
      follow.current = true;
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter starts a new line; never while an input method
    // is still composing a word.
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // The confirmation closes itself on Escape.
    if (event.key === 'Escape' && !confirmingNewChat) {
      event.stopPropagation();
      onClose();
    }
  };

  const confirmNewChat = () => {
    setConfirmingNewChat(false);
    onNewChat();
    follow.current = true;
    inputRef.current?.focus();
  };

  const announcementText = !announcement
    ? ''
    : announcement.role === 'assistant'
      ? assistantAnswerPlainText(announcement.text)
      : announcement.failure === 'assistant_error' && announcement.text
        ? assistantAnswerPlainText(announcement.text)
        : t('unavailable');

  const describedBy = tooLong || showCounter ? noteId : undefined;

  return (
    <section
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      hidden={!open}
      onKeyDown={handlePanelKeyDown}
      className="fixed inset-0 z-45 flex flex-col bg-white print:hidden sm:inset-auto sm:bottom-20 sm:end-4 sm:h-[min(36rem,calc(100dvh-7rem))] sm:w-96 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100">
          <BotMessageSquare size={18} className="text-sky-600" aria-hidden="true" />
        </div>
        <h2
          id={titleId}
          className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900"
        >
          {t('title')}
        </h2>
        <button
          type="button"
          onClick={() => setConfirmingNewChat(true)}
          disabled={entries.length === 0}
          aria-label={t('newChat')}
          title={t('newChat')}
          className={ICON_BUTTON}
        >
          <SquarePen size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          title={t('close')}
          className={ICON_BUTTON}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div
        ref={listRef}
        onScroll={trackScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <ol className="space-y-3">
          <li className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800">
              {t('welcome')}
            </div>
          </li>
          {entries.map((entry) => (
            <AssistantMessage
              key={entry.id}
              entry={entry}
              canRetry={entry.role === 'error' && entry.retryOf === retryableId}
              onRetry={onRetry}
            />
          ))}
          {pending && <AssistantWriting />}
        </ol>
      </div>

      {/* New answers are read out once, politely. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcementText}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="shrink-0 border-t border-gray-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <label htmlFor={inputId} className="sr-only">
          {t('inputLabel')}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            id={inputId}
            dir="auto"
            rows={1}
            value={draft}
            placeholder={t('placeholder')}
            aria-invalid={tooLong}
            aria-describedby={describedBy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className={`block min-h-10 w-full resize-none rounded-xl border px-3 py-2 text-sm leading-relaxed placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 [unicode-bidi:plaintext] ${
              tooLong
                ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 bg-white hover:border-gray-400 focus:border-sky-400 focus:ring-sky-400/20'
            }`}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t('send')}
            title={t('send')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:bg-slate-300 disabled:text-slate-500"
          >
            <SendHorizontal size={18} className="flip-rtl" aria-hidden="true" />
          </button>
        </div>
        {(tooLong || showCounter) && (
          <div
            id={noteId}
            className="mt-1.5 flex items-start justify-between gap-3 text-xs"
          >
            <p className="text-red-600">
              {tooLong ? t('tooLong', { max: ASSISTANT_MESSAGE_MAX }) : null}
            </p>
            <p
              className={`shrink-0 tabular-nums ${tooLong ? 'text-red-600' : 'text-gray-400'}`}
            >
              {t('counter', { count: length, max: ASSISTANT_MESSAGE_MAX })}
            </p>
          </div>
        )}
      </form>

      <ConfirmModal
        open={confirmingNewChat}
        title={t('newChat')}
        message={t('newChatConfirm')}
        confirmLabel={t('newChat')}
        cancelLabel={tForm('cancel')}
        confirmVariant="primary"
        onConfirm={confirmNewChat}
        onCancel={() => setConfirmingNewChat(false)}
      />
    </section>
  );
}
