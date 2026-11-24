import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/src/store/useSessionStore';
import {
  ASSISTANT_CHAT_PATH,
  AssistantRequestError,
  sendAssistantMessage,
} from './assistant';

const payload = {
  session_id: '6f1c2c1e-8f0b-4f7e-9a53-2f6a3f0f5d11',
  message: 'How do I add a ticket?',
  ui_lang: 'en' as const,
};

function answer(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    typeof body === 'string' ? new Response(body, { status }) : Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function failure(promise: Promise<unknown>): Promise<AssistantRequestError> {
  const error = await promise.catch((err: unknown) => err);
  expect(error).toBeInstanceOf(AssistantRequestError);
  return error as AssistantRequestError;
}

beforeEach(() => {
  useSessionStore.setState({ mustChangePassword: false, endedReason: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sending a message to the CRM assistant', () => {
  it('posts only the session id, message and language to this app\'s route', async () => {
    const fetchMock = answer(200, { session_id: payload.session_id, answer: '1. Open **Tickets**.', scope: 'allowed' });

    await expect(sendAssistantMessage(payload)).resolves.toEqual({
      sessionId: payload.session_id,
      answer: '1. Open **Tickets**.',
      scope: 'allowed',
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ASSISTANT_CHAT_PATH);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toEqual(payload);
  });

  it('ends the session on 401, as any API call does', async () => {
    answer(401, { error: 'unauthorized' });
    expect((await failure(sendAssistantMessage(payload))).kind).toBe('signed_out');
    expect(useSessionStore.getState().endedReason).toBe('expired');
  });

  it('asks for the new password on 403 password_change_required', async () => {
    answer(403, { error: 'password_change_required' });
    expect((await failure(sendAssistantMessage(payload))).kind).toBe('signed_out');
    expect(useSessionStore.getState().mustChangePassword).toBe(true);
    expect(useSessionStore.getState().endedReason).toBeNull();
  });

  it.each([
    ['502', 502, { error: 'assistant_unavailable' }],
    ['400', 400, { error: 'invalid_request' }],
    ['a 401 that is not the route\'s', 401, '<html>proxy</html>'],
    ['a 200 without an answer', 200, { session_id: 's', scope: 'allowed' }],
    ['a 200 that is not JSON', 200, '<html>'],
  ])('reports %s as unavailable, without ending the session', async (_name, status, body) => {
    answer(status, body);
    expect((await failure(sendAssistantMessage(payload))).kind).toBe('unavailable');
    expect(useSessionStore.getState().endedReason).toBeNull();
  });

  it('reports a network error as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    expect((await failure(sendAssistantMessage(payload))).kind).toBe('unavailable');
  });

  it('passes a cancellation on as it is', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    ));
    const controller = new AbortController();
    const sent = sendAssistantMessage(payload, controller.signal);
    controller.abort();
    const error = await sent.catch((err: unknown) => err);
    expect(error).not.toBeInstanceOf(AssistantRequestError);
    expect((error as Error).name).toBe('AbortError');
  });
});
