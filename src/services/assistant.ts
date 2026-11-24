import { z } from 'zod';
import {
  ASSISTANT_SCOPES,
  type AssistantLanguage,
  type AssistantScope,
} from '@/src/lib/assistantChat';
import { useSessionStore } from '@/src/store/useSessionStore';

/**
 * The CRM assistant chat. The browser calls only this app's own route,
 * `POST /api/assistant/chat` (src/lib/assistantProxy.ts), never the assistant
 * service: who is asking and which screens they may ask about are decided on
 * the server, from the session.
 */
export const ASSISTANT_CHAT_PATH = '/api/assistant/chat';

/** The route waits up to 15 s for the menu and 60 s for the assistant. */
export const ASSISTANT_CLIENT_TIMEOUT_MS = 80_000;

export interface AssistantMessagePayload {
  session_id: string;
  message: string;
  ui_lang: AssistantLanguage;
}

export interface AssistantReply {
  sessionId: string;
  answer: string;
  scope: AssistantScope;
}

/**
 * `signed_out`: the API ended the session or wants a new password; the app
 * reacts as it does to any API call (SessionGate). `unavailable`: anything
 * else that isn't an answer.
 */
export class AssistantRequestError extends Error {
  constructor(readonly kind: 'signed_out' | 'unavailable') {
    super(
      kind === 'signed_out'
        ? 'The session ended'
        : 'The CRM assistant is unavailable',
    );
    this.name = 'AssistantRequestError';
  }
}

const replySchema = z.object({
  session_id: z.string().min(1),
  answer: z.string(),
  scope: z.enum(ASSISTANT_SCOPES),
});

export function toAssistantReply(data: unknown): AssistantReply {
  const parsed = replySchema.safeParse(data);
  if (!parsed.success) throw new AssistantRequestError('unavailable');
  return {
    sessionId: parsed.data.session_id,
    answer: parsed.data.answer,
    scope: parsed.data.scope,
  };
}

function withTimeout(signal: AbortSignal | undefined): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSISTANT_CLIENT_TIMEOUT_MS);
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forward, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forward);
    },
  };
}

/**
 * Sends one message. A cancelled call rejects with the abort error, which the
 * caller ignores; every other failure is an AssistantRequestError.
 */
export async function sendAssistantMessage(
  payload: AssistantMessagePayload,
  signal?: AbortSignal,
): Promise<AssistantReply> {
  const timed = withTimeout(signal);
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(ASSISTANT_CHAT_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: timed.signal,
    });
    data = await response.json().catch(() => null);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AssistantRequestError('unavailable');
  } finally {
    timed.done();
  }

  if (response.status === 200) return toAssistantReply(data);

  const code = (data as { error?: unknown } | null)?.error;
  if (response.status === 401 && code === 'unauthorized') {
    useSessionStore.getState().markSessionEnded('expired');
    throw new AssistantRequestError('signed_out');
  }
  if (response.status === 403 && code === 'password_change_required') {
    useSessionStore.getState().setMustChangePassword(true);
    throw new AssistantRequestError('signed_out');
  }
  throw new AssistantRequestError('unavailable');
}
