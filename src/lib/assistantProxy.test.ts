import { describe, expect, it } from 'vitest';
import {
  handleAssistantChat,
  readAcceptedTokenClaims,
  type AssistantRouteInput,
  type AssistantRouteProblem,
} from './assistantProxy';

const API = 'https://api.example.invalid/crm';
const ASSISTANT = 'http://assistant.internal:8000';
const SESSION = '6f1c2c1e-8f0b-4f7e-9a53-2f6a3f0f5d11';

function token(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256', typ: 'JWT' })}.${part(payload)}.signature`;
}

const EMPLOYEE_TOKEN = token({
  employee_id: '1d1c6b52-0000-4000-8000-000000000042',
  employee_name: 'Sara Ahmed',
  user_name: 'sara',
  role_id: 'role-1',
  aud: 'crm',
});

const MENU = {
  result: [
    {
      menuName: 'Tickets',
      id: 16,
      menuitems: [
        { id: 66, name: 'Add Ticket', href: '/tickets/add', privileges: [{ id: 34, name: 'Read', status: 1 }] },
      ],
    },
  ],
  success: true,
  statusCode: 200,
  is_maintenance: false,
};

type Call = { url: string; init: RequestInit };

/** A fetch that answers the API's menu route and the assistant's /chat from these handlers. */
function fakeFetch({
  menu = () => Response.json(MENU),
  assistant = (body: Record<string, unknown>) =>
    Response.json({ session_id: body.session_id, answer: '1. Open **Tickets** > Add Ticket.', scope: 'allowed' }),
}: {
  menu?: (init: RequestInit) => Response | Promise<Response>;
  assistant?: (body: Record<string, unknown>, init: RequestInit) => Response | Promise<Response>;
} = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === `${API}/roles/get-role-privileges`) return menu(init);
    if (url === `${ASSISTANT}/chat`) return assistant(JSON.parse(String(init.body)), init);
    throw new TypeError(`fetch failed: ${url}`);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const input = (overrides: Partial<AssistantRouteInput> = {}): AssistantRouteInput => ({
  body: { session_id: SESSION, message: '  How do I add a ticket?  ', ui_lang: 'en' },
  apiBaseUrl: API,
  apiToken: EMPLOYEE_TOKEN,
  assistantUrl: ASSISTANT,
  ...overrides,
});

function reporter() {
  const problems: AssistantRouteProblem[] = [];
  return { problems, report: (problem: AssistantRouteProblem) => problems.push(problem) };
}

/** A fetch that never answers, but stops when its signal does. */
const neverAnswers = (init: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

describe('the assistant chat route', () => {
  it('passes the reply through unchanged', async () => {
    const { fetchImpl } = fakeFetch();
    await expect(handleAssistantChat(input(), { fetchImpl })).resolves.toEqual({
      status: 200,
      body: { session_id: SESSION, answer: '1. Open **Tickets** > Add Ticket.', scope: 'allowed' },
    });
  });

  it('asks the API for the menu in English with the employee\'s own token, and sends it unchanged', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await handleAssistantChat(input({ body: { session_id: SESSION, message: 'إزاي أضيف تذكرة؟', ui_lang: 'ar' } }), { fetchImpl });

    const menuCall = calls[0];
    const headers = menuCall.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${EMPLOYEE_TOKEN}`);
    expect(headers.lang).toBe('en');
    expect(headers['Accept-Language']).toBe('en');
    expect(menuCall.init.cache).toBe('no-store');

    expect(calls[1].init.method).toBe('POST');
    expect(JSON.parse(String(calls[1].init.body))).toEqual({
      user_id: '1d1c6b52-0000-4000-8000-000000000042',
      session_id: SESSION,
      user_name: 'Sara Ahmed',
      message: 'إزاي أضيف تذكرة؟',
      ui_lang: 'ar',
      menu: MENU,
    });
  });

  it('ignores a user id, name or menu in the browser\'s body', async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await handleAssistantChat(
      input({
        body: {
          session_id: SESSION,
          message: 'How do I add a user?',
          ui_lang: 'en',
          user_id: 'someone-else',
          user_name: 'Admin',
          menu: { result: [{ menuName: 'Users', id: 23, menuitems: [{ id: 113, name: 'Add User' }] }] },
        },
      }),
      { fetchImpl },
    );
    expect(result.status).toBe(200);
    const sent = JSON.parse(String(calls[1].init.body));
    expect(sent.user_id).toBe('1d1c6b52-0000-4000-8000-000000000042');
    expect(sent.user_name).toBe('Sara Ahmed');
    expect(sent.menu).toEqual(MENU);
  });

  it('fetches the menu again for every message', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await handleAssistantChat(input(), { fetchImpl });
    await handleAssistantChat(input(), { fetchImpl });
    expect(calls.filter((call) => call.url.endsWith('/roles/get-role-privileges'))).toHaveLength(2);
  });

  it('answers 401 when nobody is signed in', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await expect(handleAssistantChat(input({ apiBaseUrl: null }), { fetchImpl })).resolves.toEqual({
      status: 401,
      body: { error: 'unauthorized' },
    });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['no body', null],
    ['an empty message', { session_id: SESSION, message: '   ', ui_lang: 'en' }],
    ['a message over 2000 characters', { session_id: SESSION, message: 'x'.repeat(2001), ui_lang: 'en' }],
    ['an unknown language', { session_id: SESSION, message: 'hi', ui_lang: 'fr' }],
    ['no session id', { message: 'hi', ui_lang: 'en' }],
    ['a session id with other characters', { session_id: 'a b', message: 'hi', ui_lang: 'en' }],
  ])('answers 400 for %s', async (_name, body) => {
    const { fetchImpl, calls } = fakeFetch();
    await expect(handleAssistantChat(input({ body }), { fetchImpl })).resolves.toEqual({
      status: 400,
      body: { error: 'invalid_request' },
    });
    expect(calls).toHaveLength(0);
  });

  it('answers 401 when the API no longer accepts the token (HTTP 200, statusCode 401)', async () => {
    const { fetchImpl, calls } = fakeFetch({
      menu: () =>
        Response.json({ result: { message: 'Unauthorized', message_code: 'AUTH_INVALID_CREDENTIALS' }, success: false, statusCode: 401 }),
    });
    await expect(handleAssistantChat(input(), { fetchImpl })).resolves.toEqual({
      status: 401,
      body: { error: 'unauthorized' },
    });
    expect(calls).toHaveLength(1);
  });

  it('answers 403 when the API wants a new password first', async () => {
    const { fetchImpl } = fakeFetch({
      menu: () =>
        Response.json({ result: { message: 'x', message_code: 'AUTH_PASSWORD_CHANGE_REQUIRED' }, success: false, statusCode: 403 }),
    });
    await expect(handleAssistantChat(input(), { fetchImpl })).resolves.toEqual({
      status: 403,
      body: { error: 'password_change_required' },
    });
  });

  it('answers 502 without signing out when the API cookie does not reach this server', async () => {
    const { fetchImpl, calls } = fakeFetch();
    const { problems, report } = reporter();
    await expect(handleAssistantChat(input({ apiToken: null }), { fetchImpl, report })).resolves.toEqual({
      status: 502,
      body: { error: 'assistant_unavailable' },
    });
    expect(problems).toEqual(['no_api_token']);
    expect(calls).toHaveLength(0);
  });

  it('answers 502 when CRM_ASSISTANT_URL is not set', async () => {
    const { fetchImpl, calls } = fakeFetch();
    const { problems, report } = reporter();
    const result = await handleAssistantChat(input({ assistantUrl: ' ' }), { fetchImpl, report });
    expect(result).toEqual({ status: 502, body: { error: 'assistant_unavailable' } });
    expect(problems).toEqual(['no_assistant_url']);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['the menu fails', { menu: () => Response.json({ result: { message: 'boom' }, success: false, statusCode: 500 }) }, 'menu_rejected'],
    ['the menu is not JSON', { menu: () => new Response('<html>', { status: 502 }) }, 'menu_rejected'],
    ['the menu has no list', { menu: () => Response.json({ result: {}, success: true, statusCode: 200 }) }, 'menu_rejected'],
    ['the menu does not answer', { menu: neverAnswers }, 'menu_failed'],
  ] as const)('answers 502 when %s', async (_name, handlers, problem) => {
    const { fetchImpl, calls } = fakeFetch(handlers);
    const { problems, report } = reporter();
    const result = await handleAssistantChat(input(), { fetchImpl, report, menuTimeoutMs: 50 });
    expect(result).toEqual({ status: 502, body: { error: 'assistant_unavailable' } });
    expect(problems).toEqual([problem]);
    expect(calls).toHaveLength(1);
  });

  it('answers 502 when the accepted token names no employee', async () => {
    const { fetchImpl } = fakeFetch();
    const { problems, report } = reporter();
    const result = await handleAssistantChat(input({ apiToken: token({ role_id: 'r' }) }), { fetchImpl, report });
    expect(result.status).toBe(502);
    expect(problems).toEqual(['token_unreadable']);
  });

  it('answers 400 when the assistant refuses the request (422)', async () => {
    const { fetchImpl } = fakeFetch({ assistant: () => Response.json({ detail: [{ msg: 'field required' }] }, { status: 422 }) });
    await expect(handleAssistantChat(input(), { fetchImpl })).resolves.toEqual({
      status: 400,
      body: { error: 'invalid_request' },
    });
  });

  it.each([
    ['a server error', { assistant: () => Response.json({ detail: 'Internal Server Error at http://assistant.internal' }, { status: 500 }) }, 'assistant_failed'],
    ['a redirect', { assistant: () => new Response(null, { status: 302, headers: { Location: 'http://elsewhere' } }) }, 'assistant_failed'],
    ['a reply that is not JSON', { assistant: () => new Response('<html>gateway</html>', { status: 200 }) }, 'assistant_reply_invalid'],
    ['a reply without an answer', { assistant: () => Response.json({ session_id: SESSION, scope: 'allowed' }) }, 'assistant_reply_invalid'],
    ['an unknown scope', { assistant: () => Response.json({ session_id: SESSION, answer: 'x', scope: 'maybe' }) }, 'assistant_reply_invalid'],
    ['no answer in time', { assistant: (_body: Record<string, unknown>, init: RequestInit) => neverAnswers(init) }, 'assistant_timeout'],
  ] as const)('answers 502 for %s, without passing anything on', async (_name, handlers, problem) => {
    const { fetchImpl } = fakeFetch(handlers);
    const { problems, report } = reporter();
    const result = await handleAssistantChat(input(), { fetchImpl, report, assistantTimeoutMs: 50 });
    expect(result).toEqual({ status: 502, body: { error: 'assistant_unavailable' } });
    expect(problems).toEqual([problem]);
  });

  it('answers 502 when the assistant cannot be reached', async () => {
    const { fetchImpl } = fakeFetch();
    const { problems, report } = reporter();
    const result = await handleAssistantChat(input({ assistantUrl: 'http://127.0.0.1:9' }), { fetchImpl, report });
    expect(result).toEqual({ status: 502, body: { error: 'assistant_unavailable' } });
    expect(problems).toEqual(['assistant_unreachable']);
  });

  it('keeps a base path in CRM_ASSISTANT_URL', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return String(url).endsWith('/roles/get-role-privileges')
        ? Response.json(MENU)
        : Response.json({ session_id: SESSION, answer: 'ok', scope: 'allowed' });
    }) as typeof fetch;
    await handleAssistantChat(input({ assistantUrl: 'https://tools.internal/assistant/' }), { fetchImpl });
    expect(calls[1]).toBe('https://tools.internal/assistant/chat');
  });
});

describe('reading the accepted token', () => {
  it('takes the employee id and full name, or the user name', () => {
    expect(readAcceptedTokenClaims(EMPLOYEE_TOKEN)).toEqual({
      userId: '1d1c6b52-0000-4000-8000-000000000042',
      userName: 'Sara Ahmed',
    });
    expect(readAcceptedTokenClaims(token({ employee_id: 7, employee_name: '', user_name: 'sara' }))).toEqual({
      userId: '7',
      userName: 'sara',
    });
    expect(readAcceptedTokenClaims(token({ employee_id: 'e1' }))).toEqual({ userId: 'e1', userName: undefined });
  });

  it.each(['', 'not-a-token', 'a.!!!.c', token({ employee_id: '' })])('reads nothing from %j', (value) => {
    expect(readAcceptedTokenClaims(value)).toBeNull();
  });
});
