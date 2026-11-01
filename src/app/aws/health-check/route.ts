import { NextResponse } from 'next/server';

/**
 * The load balancer's health check (as in Amer CRM). Outside the locale
 * routes and the sign-in redirect (`src/proxy.ts`), and it calls nothing, so
 * it reports only that this server answers.
 */
export function GET() {
  return NextResponse.json({ status: 200 }, { status: 200 });
}
