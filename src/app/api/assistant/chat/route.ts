import { NextRequest, NextResponse } from 'next/server';
import {
  ASSISTANT_BODY_MAX_BYTES,
  handleAssistantChat,
  type AssistantRouteProblem,
} from '@/src/lib/assistantProxy';
import { readSession } from '@/src/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The backend's HttpOnly session cookie (docs/ABILITY-CRM-BACKEND-CHANGES.md). */
const API_SESSION_COOKIE = 'access_token';

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function report(problem: AssistantRouteProblem, detail?: string) {
  // The reason stays in the server log; the browser only learns "unavailable".
  console.warn(`[assistant] ${problem}${detail ? `: ${detail}` : ''}`);
}

/**
 * The CRM assistant chat (src/lib/assistantProxy.ts): the browser sends
 * `{ session_id, message, ui_lang }`; who is asking and what they may ask
 * about come from the session, never from the body.
 */
export async function POST(request: NextRequest) {
  // Only this app's own pages: the call spends the employee's session.
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return json({ error: 'forbidden' }, 403);

  const session = await readSession();

  let body: unknown = null;
  const raw = await request.text().catch(() => '');
  if (raw.length > ASSISTANT_BODY_MAX_BYTES) {
    return json({ error: 'invalid_request' }, 400);
  }
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  const result = await handleAssistantChat(
    {
      body,
      apiBaseUrl: session?.apiBaseUrl ?? null,
      apiToken: request.cookies.get(API_SESSION_COOKIE)?.value?.trim() || null,
      assistantUrl: process.env.CRM_ASSISTANT_URL ?? null,
    },
    { report },
  );

  return json(result.body, result.status);
}
