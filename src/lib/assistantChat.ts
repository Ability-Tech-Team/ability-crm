import { z } from 'zod';

/**
 * The CRM assistant chat (`src/components/assistant/`): its state, how it is
 * kept in `sessionStorage`, and how an answer is shown. Pure, so it is tested
 * without a browser. The spec is the assistant's
 * `ability-crm-assistant/docs/frontend/assistant-chat-spec.md`; the browser
 * talks only to this app's `POST /api/assistant/chat`
 * (`src/lib/assistantProxy.ts`).
 *
 * Employees have no chat history: a chat lives as long as the browser tab, in
 * `sessionStorage` under the employee's id, and logout clears it.
 */

/** The assistant service's limit, after trimming. */
export const ASSISTANT_MESSAGE_MAX = 2000;
/** From this length on, the input shows how many characters are left. */
export const ASSISTANT_COUNTER_FROM = 1800;
export const ASSISTANT_STORAGE_PREFIX = 'crm-assistant:';

export const ASSISTANT_SCOPES = [
  'allowed',
  'partial',
  'not_allowed',
  'off_topic',
  'error',
] as const;
export type AssistantScope = (typeof ASSISTANT_SCOPES)[number];
export type AssistantLanguage = 'en' | 'ar';

/**
 * Why a message got no answer: the assistant couldn't be asked or didn't
 * answer (`unavailable`), or it answered with its own error text
 * (`assistant_error`, `scope: "error"`).
 */
export type AssistantFailure = 'unavailable' | 'assistant_error';

export type AssistantUserEntry = {
  id: string;
  role: 'user';
  text: string;
  status: 'pending' | 'sent' | 'failed';
};
export type AssistantAnswerEntry = {
  id: string;
  role: 'assistant';
  text: string;
  scope: AssistantScope;
};
export type AssistantErrorEntry = {
  id: string;
  role: 'error';
  failure: AssistantFailure;
  /** The assistant's own text, for `assistant_error`. */
  text: string | null;
  /** The user message that Try again sends again. */
  retryOf: string;
};
export type AssistantEntry =
  | AssistantUserEntry
  | AssistantAnswerEntry
  | AssistantErrorEntry;

export type AssistantChatState = {
  /** Made when the chat's first message is sent; null for a new chat. */
  sessionId: string | null;
  entries: AssistantEntry[];
  open: boolean;
  /** The storage key the state was restored from; nothing is saved before. */
  restoredFrom: string | null;
  /** The answer or error that just arrived, for screen readers. */
  announceId: string | null;
};

export const initialAssistantChat: AssistantChatState = {
  sessionId: null,
  entries: [],
  open: false,
  restoredFrom: null,
  announceId: null,
};

export type AssistantChatAction =
  | { type: 'restore'; key: string; chat: StoredAssistantChat }
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'send'; id: string; text: string; sessionId: string }
  | {
      type: 'reply';
      id: string;
      userEntryId: string;
      sessionId: string;
      answer: string;
      scope: AssistantScope;
    }
  | {
      type: 'fail';
      id: string;
      userEntryId: string;
      sessionId: string;
    }
  | { type: 'retry'; userEntryId: string }
  | { type: 'new-chat' };

export function isAssistantPending(state: AssistantChatState): boolean {
  return state.entries.some(
    (entry) => entry.role === 'user' && entry.status === 'pending',
  );
}

/** The failed message Try again can send: only the last one, so the order stays. */
export function retryableEntry(
  state: AssistantChatState,
): AssistantUserEntry | null {
  const last = state.entries.at(-1);
  if (!last || last.role !== 'error' || isAssistantPending(state)) return null;
  const entry = state.entries.find((item) => item.id === last.retryOf);
  return entry?.role === 'user' && entry.status === 'failed' ? entry : null;
}

export function assistantChatReducer(
  state: AssistantChatState,
  action: AssistantChatAction,
): AssistantChatState {
  switch (action.type) {
    case 'restore':
      return {
        ...action.chat,
        restoredFrom: action.key,
        announceId: null,
      };
    case 'open':
      return state.open ? state : { ...state, open: true };
    case 'close':
      return state.open ? { ...state, open: false } : state;
    case 'send': {
      if (isAssistantPending(state)) return state;
      if (state.sessionId !== null && state.sessionId !== action.sessionId) {
        return state;
      }
      return {
        ...state,
        sessionId: action.sessionId,
        entries: [
          ...state.entries,
          { id: action.id, role: 'user', text: action.text, status: 'pending' },
        ],
      };
    }
    case 'reply':
    case 'fail': {
      // A reply for a chat the employee has since replaced, or for a message
      // that is no longer waiting, is stale.
      if (state.sessionId !== action.sessionId) return state;
      const waiting = state.entries.find(
        (entry) =>
          entry.id === action.userEntryId &&
          entry.role === 'user' &&
          entry.status === 'pending',
      );
      if (!waiting) return state;

      const answered =
        action.type === 'reply' &&
        action.scope !== 'error' &&
        action.answer.trim() !== '';
      const entries = state.entries.map((entry) =>
        entry.id === action.userEntryId && entry.role === 'user'
          ? { ...entry, status: answered ? ('sent' as const) : ('failed' as const) }
          : entry,
      );

      let added: AssistantEntry;
      if (action.type === 'reply' && answered) {
        added = {
          id: action.id,
          role: 'assistant',
          text: action.answer,
          scope: action.scope,
        };
      } else if (action.type === 'reply' && action.answer.trim() !== '') {
        added = {
          id: action.id,
          role: 'error',
          failure: 'assistant_error',
          text: action.answer,
          retryOf: action.userEntryId,
        };
      } else {
        added = {
          id: action.id,
          role: 'error',
          failure: 'unavailable',
          text: null,
          retryOf: action.userEntryId,
        };
      }

      return {
        ...state,
        entries: [...entries, added],
        announceId: action.id,
      };
    }
    case 'retry': {
      const entry = retryableEntry(state);
      if (!entry || entry.id !== action.userEntryId) return state;
      return {
        ...state,
        entries: state.entries
          .filter(
            (item) => !(item.role === 'error' && item.retryOf === entry.id),
          )
          .map((item) =>
            item.id === entry.id ? { ...entry, status: 'pending' as const } : item,
          ),
        announceId: null,
      };
    }
    case 'new-chat':
      return {
        ...state,
        sessionId: null,
        entries: [],
        announceId: null,
      };
  }
}

export function assistantLanguageOf(locale: string): AssistantLanguage {
  return locale === 'ar' ? 'ar' : 'en';
}

export type AssistantMessageCheck =
  | { text: string; problem: null }
  | { text: string; problem: 'empty' | 'too_long' };

/** The text that will be sent (trimmed) and whether it can be. */
export function checkAssistantMessage(raw: string): AssistantMessageCheck {
  const text = raw.trim();
  if (!text) return { text, problem: 'empty' };
  if (text.length > ASSISTANT_MESSAGE_MAX) return { text, problem: 'too_long' };
  return { text, problem: null };
}

// ---------------------------------------------------------------------------
// sessionStorage

const STORAGE_VERSION = 1;

const storedEntrySchema = z.discriminatedUnion('role', [
  z.object({
    id: z.string().min(1),
    role: z.literal('user'),
    text: z.string(),
    status: z.enum(['pending', 'sent', 'failed']),
  }),
  z.object({
    id: z.string().min(1),
    role: z.literal('assistant'),
    text: z.string(),
    scope: z.enum(ASSISTANT_SCOPES),
  }),
  z.object({
    id: z.string().min(1),
    role: z.literal('error'),
    failure: z.enum(['unavailable', 'assistant_error']),
    text: z.string().nullable(),
    retryOf: z.string().min(1),
  }),
]);

const storedChatSchema = z.object({
  v: z.literal(STORAGE_VERSION),
  sessionId: z.string().min(1).nullable(),
  open: z.boolean(),
  entries: z.array(storedEntrySchema),
});

export type StoredAssistantChat = Pick<
  AssistantChatState,
  'sessionId' | 'entries' | 'open'
>;

const emptyStoredChat: StoredAssistantChat = {
  sessionId: null,
  entries: [],
  open: false,
};

export function assistantStorageKey(employeeId: string): string {
  return `${ASSISTANT_STORAGE_PREFIX}${employeeId}`;
}

export function serializeAssistantChat(state: AssistantChatState): string {
  return JSON.stringify({
    v: STORAGE_VERSION,
    sessionId: state.sessionId,
    open: state.open,
    entries: state.entries,
  });
}

/**
 * The chat saved under a key, or an empty one when there is none or it can't
 * be read. A message that was waiting for its answer when the page was left
 * comes back as failed, so it can be sent again.
 */
export function restoreAssistantChat(raw: string | null): StoredAssistantChat {
  if (!raw) return emptyStoredChat;

  let parsed: z.infer<typeof storedChatSchema>;
  try {
    const result = storedChatSchema.safeParse(JSON.parse(raw));
    if (!result.success) return emptyStoredChat;
    parsed = result.data;
  } catch {
    return emptyStoredChat;
  }

  const entries: AssistantEntry[] = [];
  for (const entry of parsed.entries) {
    if (entry.role === 'user' && entry.status === 'pending') {
      entries.push({ ...entry, status: 'failed' });
      entries.push({
        id: `${entry.id}:interrupted`,
        role: 'error',
        failure: 'unavailable',
        text: null,
        retryOf: entry.id,
      });
    } else {
      entries.push(entry);
    }
  }

  return {
    // A chat without a session id has never been sent, so it has no messages.
    sessionId: parsed.sessionId,
    entries: parsed.sessionId ? entries : [],
    open: parsed.open,
  };
}

type KeyedStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;

/** Removes every saved assistant chat except `keepKey`'s. */
export function clearAssistantChats(storage: KeyedStorage, keepKey?: string) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(ASSISTANT_STORAGE_PREFIX) && key !== keepKey) {
      keys.push(key);
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}

/** `window.sessionStorage`, or null where it can't be used (blocked, server). */
export function browserSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Answers

export type AnswerSegment = { text: string; bold: boolean };

/**
 * An answer as lines of plain and bold text. The assistant writes plain text
 * with line breaks and `**bold**`; nothing in it is HTML, and it is shown as
 * text. A `**` without its closing pair stays as written, and bold never
 * crosses a line.
 */
export function parseAssistantAnswer(text: string): AnswerSegment[][] {
  return text.split(/\r?\n/).map((line) => {
    const segments: AnswerSegment[] = [];
    const pattern = /\*\*(.+?)\*\*/g;
    let last = 0;
    for (const match of line.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (start > last) segments.push({ text: line.slice(last, start), bold: false });
      segments.push({ text: match[1], bold: true });
      last = start + match[0].length;
    }
    if (last < line.length) segments.push({ text: line.slice(last), bold: false });
    return segments;
  });
}

/**
 * A random UUID. `crypto.randomUUID` exists only in secure contexts (https,
 * localhost); a plain-http development host still has `getRandomValues`.
 */
export function createAssistantId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** An answer without its `**` marks, for screen readers. */
export function assistantAnswerPlainText(text: string): string {
  return parseAssistantAnswer(text)
    .map((segments) => segments.map((segment) => segment.text).join(''))
    .join('\n');
}
