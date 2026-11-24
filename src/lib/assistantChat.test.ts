import { describe, expect, it } from 'vitest';
import {
  assistantAnswerPlainText,
  assistantChatReducer,
  assistantLanguageOf,
  assistantStorageKey,
  checkAssistantMessage,
  clearAssistantChats,
  createAssistantId,
  initialAssistantChat,
  isAssistantPending,
  parseAssistantAnswer,
  restoreAssistantChat,
  retryableEntry,
  serializeAssistantChat,
  type AssistantChatAction,
  type AssistantChatState,
  type AssistantScope,
} from './assistantChat';

const SESSION = '6f1c2c1e-8f0b-4f7e-9a53-2f6a3f0f5d11';
const KEY = assistantStorageKey('employee-1');

function run(...actions: AssistantChatAction[]): AssistantChatState {
  return actions.reduce(assistantChatReducer, {
    ...initialAssistantChat,
    restoredFrom: KEY,
  });
}

const send = (id: string, text = 'How do I add a ticket?', sessionId = SESSION): AssistantChatAction => ({
  type: 'send',
  id,
  text,
  sessionId,
});
const reply = (userEntryId: string, answer = '1. Open **Tickets**.', scope: AssistantScope = 'allowed', sessionId = SESSION): AssistantChatAction => ({
  type: 'reply',
  id: `${userEntryId}-answer`,
  userEntryId,
  sessionId,
  answer,
  scope,
});
const fail = (userEntryId: string, sessionId = SESSION): AssistantChatAction => ({
  type: 'fail',
  id: `${userEntryId}-error`,
  userEntryId,
  sessionId,
});

describe('the chat state', () => {
  it('shows the message at once, waits, then adds the answer', () => {
    const waiting = run(send('u1'));
    expect(waiting.sessionId).toBe(SESSION);
    expect(waiting.entries).toEqual([
      { id: 'u1', role: 'user', text: 'How do I add a ticket?', status: 'pending' },
    ]);
    expect(isAssistantPending(waiting)).toBe(true);

    const answered = assistantChatReducer(waiting, reply('u1'));
    expect(isAssistantPending(answered)).toBe(false);
    expect(answered.entries).toEqual([
      { id: 'u1', role: 'user', text: 'How do I add a ticket?', status: 'sent' },
      { id: 'u1-answer', role: 'assistant', text: '1. Open **Tickets**.', scope: 'allowed' },
    ]);
    expect(answered.announceId).toBe('u1-answer');
  });

  it('takes one message at a time', () => {
    const state = run(send('u1'), send('u2'));
    expect(state.entries.map((entry) => entry.id)).toEqual(['u1']);
  });

  it('keeps the chat id for the next messages', () => {
    const state = run(send('u1'), reply('u1'), send('u2', 'And edit it?', 'another-id'));
    expect(state.entries).toHaveLength(2);
    expect(run(send('u1'), reply('u1'), send('u2', 'And edit it?')).entries).toHaveLength(3);
  });

  it.each(['partial', 'not_allowed', 'off_topic'] as const)('shows a %s answer as an answer', (scope) => {
    const state = run(send('u1'), reply('u1', 'You cannot open that screen.', scope));
    expect(state.entries[1]).toMatchObject({ role: 'assistant', scope });
  });

  it('shows the assistant\'s own error text as a failure that can be retried', () => {
    const state = run(send('u1'), reply('u1', 'Something went wrong. Please try again.', 'error'));
    expect(state.entries).toEqual([
      { id: 'u1', role: 'user', text: 'How do I add a ticket?', status: 'failed' },
      {
        id: 'u1-answer',
        role: 'error',
        failure: 'assistant_error',
        text: 'Something went wrong. Please try again.',
        retryOf: 'u1',
      },
    ]);
    expect(retryableEntry(state)?.id).toBe('u1');
  });

  it('treats an empty answer as unavailable', () => {
    const state = run(send('u1'), reply('u1', '   '));
    expect(state.entries[1]).toMatchObject({ role: 'error', failure: 'unavailable', text: null });
  });

  it('retries the failed message with the same chat id, and removes its error', () => {
    const failed = run(send('u1'), fail('u1'));
    expect(failed.entries[1]).toMatchObject({ role: 'error', failure: 'unavailable', retryOf: 'u1' });

    const retrying = assistantChatReducer(failed, { type: 'retry', userEntryId: 'u1' });
    expect(retrying.sessionId).toBe(SESSION);
    expect(retrying.entries).toEqual([
      { id: 'u1', role: 'user', text: 'How do I add a ticket?', status: 'pending' },
    ]);
    expect(assistantChatReducer(retrying, reply('u1')).entries).toHaveLength(2);
  });

  it('offers Try again only on the last failure', () => {
    const state = run(send('u1'), fail('u1'), send('u2', 'Another question'), reply('u2'));
    expect(retryableEntry(state)).toBeNull();
    expect(assistantChatReducer(state, { type: 'retry', userEntryId: 'u1' })).toBe(state);
  });

  it('starts a new chat without its messages or id, and ignores the old chat\'s late answer', () => {
    const replaced = run(send('u1'), { type: 'new-chat' });
    expect(replaced.sessionId).toBeNull();
    expect(replaced.entries).toEqual([]);
    expect(assistantChatReducer(replaced, reply('u1'))).toBe(replaced);
    expect(assistantChatReducer(replaced, fail('u1'))).toBe(replaced);
  });

  it('ignores an answer for a message that is not waiting', () => {
    const answered = run(send('u1'), reply('u1'));
    expect(assistantChatReducer(answered, reply('u1', 'again'))).toBe(answered);
  });

  it('opens and closes', () => {
    expect(run({ type: 'open' }).open).toBe(true);
    expect(run({ type: 'open' }, { type: 'close' }).open).toBe(false);
  });
});

describe('keeping the chat in sessionStorage', () => {
  it('restores what was saved', () => {
    const state = run({ type: 'open' }, send('u1'), reply('u1'));
    expect(restoreAssistantChat(serializeAssistantChat(state))).toEqual({
      sessionId: SESSION,
      open: true,
      entries: state.entries,
    });
  });

  it('brings back a message that was waiting as failed, ready to retry', () => {
    const restored = restoreAssistantChat(serializeAssistantChat(run(send('u1'))));
    expect(restored.entries).toEqual([
      { id: 'u1', role: 'user', text: 'How do I add a ticket?', status: 'failed' },
      { id: 'u1:interrupted', role: 'error', failure: 'unavailable', text: null, retryOf: 'u1' },
    ]);
    const state = assistantChatReducer(initialAssistantChat, { type: 'restore', key: KEY, chat: restored });
    expect(state.restoredFrom).toBe(KEY);
    expect(state.announceId).toBeNull();
    expect(retryableEntry(state)?.id).toBe('u1');
  });

  it.each([
    ['nothing', null],
    ['broken JSON', '{"v":1,'],
    ['another version', JSON.stringify({ v: 2, sessionId: SESSION, open: true, entries: [] })],
    ['a wrong shape', JSON.stringify({ v: 1, sessionId: SESSION, open: true, entries: [{ id: 'x', role: 'system', text: 'hi' }] })],
  ])('starts empty from %s', (_name, raw) => {
    expect(restoreAssistantChat(raw)).toEqual({ sessionId: null, entries: [], open: false });
  });

  it('keeps chats apart per employee and drops other employees\' chats', () => {
    expect(assistantStorageKey('a')).not.toBe(assistantStorageKey('b'));
    const store = new Map<string, string>([
      [assistantStorageKey('a'), '{}'],
      [assistantStorageKey('b'), '{}'],
      ['ticket-create-unit', '{"id":1}'],
    ]);
    const storage = {
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
    };

    clearAssistantChats(storage, assistantStorageKey('b'));
    expect([...store.keys()]).toEqual([assistantStorageKey('b'), 'ticket-create-unit']);

    clearAssistantChats(storage);
    expect([...store.keys()]).toEqual(['ticket-create-unit']);
  });
});

describe('answers', () => {
  it('keeps line breaks and shows **bold** as bold', () => {
    expect(parseAssistantAnswer('1. Open **Tickets** > **Add Ticket**.\n2. Save.')).toEqual([
      [
        { text: '1. Open ', bold: false },
        { text: 'Tickets', bold: true },
        { text: ' > ', bold: false },
        { text: 'Add Ticket', bold: true },
        { text: '.', bold: false },
      ],
      [{ text: '2. Save.', bold: false }],
    ]);
  });

  it('leaves HTML as text and an unpaired ** as written', () => {
    expect(parseAssistantAnswer('<img src=x onerror=alert(1)> **open')).toEqual([
      [{ text: '<img src=x onerror=alert(1)> **open', bold: false }],
    ]);
  });

  it('never runs bold across lines, and keeps empty lines', () => {
    expect(parseAssistantAnswer('**one\ntwo**\n\nend')).toEqual([
      [{ text: '**one', bold: false }],
      [{ text: 'two**', bold: false }],
      [],
      [{ text: 'end', bold: false }],
    ]);
  });

  it('reads out an answer without its marks', () => {
    expect(assistantAnswerPlainText('Open **Tickets**.\r\nSave.')).toBe('Open Tickets.\nSave.');
  });
});

describe('messages and ids', () => {
  it('checks a message after trimming it', () => {
    expect(checkAssistantMessage('  hi  ')).toEqual({ text: 'hi', problem: null });
    expect(checkAssistantMessage(' \n ').problem).toBe('empty');
    expect(checkAssistantMessage('x'.repeat(2000)).problem).toBeNull();
    expect(checkAssistantMessage(`  ${'x'.repeat(2000)}  `).problem).toBeNull();
    expect(checkAssistantMessage('x'.repeat(2001)).problem).toBe('too_long');
  });

  it('sends the CRM language as en or ar', () => {
    expect(assistantLanguageOf('ar')).toBe('ar');
    expect(assistantLanguageOf('en')).toBe('en');
  });

  it('makes v4 UUIDs', () => {
    expect(createAssistantId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
