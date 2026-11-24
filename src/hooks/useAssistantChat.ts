'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useLocale } from 'next-intl';
import {
  assistantChatReducer,
  assistantLanguageOf,
  assistantStorageKey,
  browserSessionStorage,
  checkAssistantMessage,
  clearAssistantChats,
  createAssistantId,
  initialAssistantChat,
  isAssistantPending,
  restoreAssistantChat,
  retryableEntry,
  serializeAssistantChat,
} from '@/src/lib/assistantChat';
import { runAfterCommit } from '@/src/lib/runAfterCommit';
import { sendAssistantMessage } from '@/src/services/assistant';

/**
 * The CRM assistant chat of the signed-in employee: one request at a time,
 * kept in this tab's `sessionStorage` under the employee's id (read after
 * mount, never during rendering), and the language read when a message is
 * sent.
 */
export function useAssistantChat(employeeId: string) {
  const locale = useLocale();
  const storageKey = assistantStorageKey(employeeId);
  const [state, dispatch] = useReducer(assistantChatReducer, initialAssistantChat);
  // The request in flight, if any. One object, so the unmount cleanup reads
  // the current request rather than the one at mount.
  const live = useRef<{ controller: AbortController | null }>({ controller: null });

  // Restore this employee's chat, and drop any other employee's from this tab.
  useEffect(() => {
    return runAfterCommit(() => {
      const storage = browserSessionStorage();
      let raw: string | null = null;
      try {
        if (storage) {
          clearAssistantChats(storage, storageKey);
          raw = storage.getItem(storageKey);
        }
      } catch {
        raw = null;
      }
      dispatch({ type: 'restore', key: storageKey, chat: restoreAssistantChat(raw) });
    });
  }, [storageKey]);

  // Save after every change, once this employee's chat has been restored.
  useEffect(() => {
    if (state.restoredFrom !== storageKey) return;
    try {
      browserSessionStorage()?.setItem(storageKey, serializeAssistantChat(state));
    } catch {
      // Storage full or blocked: the chat still works until the page is left.
    }
  }, [state, storageKey]);

  useEffect(() => {
    const current = live.current;
    return () => current.controller?.abort();
  }, []);

  const deliver = useCallback(
    async (userEntryId: string, text: string, sessionId: string) => {
      const controller = new AbortController();
      live.current.controller = controller;
      try {
        const reply = await sendAssistantMessage(
          { session_id: sessionId, message: text, ui_lang: assistantLanguageOf(locale) },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          dispatch({
            type: 'reply',
            id: createAssistantId(),
            userEntryId,
            sessionId,
            answer: reply.answer,
            scope: reply.scope,
          });
        }
      } catch {
        // A cancelled request belongs to a chat that was replaced or left. A
        // signed-out failure is handled by SessionGate; the message stays
        // failed so it can be sent again.
        if (!controller.signal.aborted) {
          dispatch({ type: 'fail', id: createAssistantId(), userEntryId, sessionId });
        }
      } finally {
        if (live.current.controller === controller) live.current.controller = null;
      }
    },
    [locale],
  );

  const pending = isAssistantPending(state);
  const retryable = retryableEntry(state);

  /** Sends `raw`; false when it can't be sent now (empty, too long, or busy). */
  const send = useCallback(
    (raw: string): boolean => {
      const { text, problem } = checkAssistantMessage(raw);
      if (problem || pending || live.current.controller) return false;
      const sessionId = state.sessionId ?? createAssistantId();
      const id = createAssistantId();
      dispatch({ type: 'send', id, text, sessionId });
      void deliver(id, text, sessionId);
      return true;
    },
    [deliver, pending, state.sessionId],
  );

  /** Sends the last failed message again, with the same chat id. */
  const retry = useCallback(() => {
    if (!retryable || !state.sessionId || live.current.controller) return;
    dispatch({ type: 'retry', userEntryId: retryable.id });
    void deliver(retryable.id, retryable.text, state.sessionId);
  }, [deliver, retryable, state.sessionId]);

  /** Forgets the chat: a new chat id and no messages. The old one can't be reopened. */
  const startNewChat = useCallback(() => {
    live.current.controller?.abort();
    live.current.controller = null;
    dispatch({ type: 'new-chat' });
  }, []);

  const setOpen = useCallback((open: boolean) => {
    dispatch({ type: open ? 'open' : 'close' });
  }, []);

  const announcement = useMemo(() => {
    const entry = state.entries.find((item) => item.id === state.announceId);
    return entry && entry.role !== 'user' ? entry : null;
  }, [state.announceId, state.entries]);

  return {
    entries: state.entries,
    open: state.open,
    ready: state.restoredFrom === storageKey,
    pending,
    retryableId: retryable?.id ?? null,
    announcement,
    send,
    retry,
    startNewChat,
    setOpen,
  };
}
