'use client';

import dynamic from 'next/dynamic';
import { useId, useRef, useState } from 'react';
import { MessageCircleQuestionMark, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAssistantChat } from '@/src/hooks/useAssistantChat';
import { useSession } from '@/src/hooks/useSession';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

// The panel's code loads the first time it opens.
const AssistantPanel = dynamic(() => import('./AssistantPanel'), {
  ssr: false,
});

/**
 * The CRM assistant on every signed-in page: a round button on the
 * inline-end corner (right in English, left in Arabic) that opens the chat.
 * Mounted once in the app shell, so the chat survives moving between pages;
 * `sessionStorage` keeps it across a refresh.
 */
export default function AssistantWidget() {
  const t = useTranslations('assistant');
  const { details } = useSession();
  const chat = useAssistantChat(details.employeeId);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  // Once opened, the panel stays mounted (hidden when closed) so a message
  // being written survives closing it.
  const [panelUsed, setPanelUsed] = useState(false);

  if (!chat.ready) return null;

  const close = () => {
    setPanelUsed(true);
    chat.setOpen(false);
    // The button is hidden while the panel fills a small screen; focus it
    // once it is back.
    runAfterCommit(() => buttonRef.current?.focus());
  };

  const toggle = () => {
    if (chat.open) {
      close();
      return;
    }
    setPanelUsed(true);
    chat.setOpen(true);
  };

  const panelMounted = chat.open || panelUsed;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={chat.open ? t('close') : t('open')}
        title={chat.open ? t('close') : t('open')}
        aria-expanded={chat.open}
        aria-controls={panelMounted ? panelId : undefined}
        className={`fixed bottom-4 end-4 z-45 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-colors hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 print:hidden ${
          chat.open ? 'max-sm:hidden' : ''
        }`}
      >
        {chat.open ? (
          <X size={24} aria-hidden="true" />
        ) : (
          <MessageCircleQuestionMark size={26} aria-hidden="true" />
        )}
      </button>

      {panelMounted && (
        <AssistantPanel
          id={panelId}
          open={chat.open}
          entries={chat.entries}
          pending={chat.pending}
          retryableId={chat.retryableId}
          announcement={chat.announcement}
          onSend={chat.send}
          onRetry={chat.retry}
          onNewChat={chat.startNewChat}
          onClose={close}
        />
      )}
    </>
  );
}
