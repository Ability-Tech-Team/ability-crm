'use client';

import { createContext, type ReactNode } from 'react';
import { setApiAddresses } from '@/src/lib/apiConfig';
import type { SessionDetails } from '@/src/lib/sessionDetails';

export type SessionContextValue = {
  details: SessionDetails;
  /**
   * Where the browser sends API calls: the client's Ability CRM API, already
   * checked against the trusted list, or during `next dev` the proxy in
   * front of it (src/lib/devApiProxy.ts).
   */
  apiBaseUrl: string;
  /** The API's own origin, for Socket.IO. */
  socketOrigin: string;
  /** Where signed-out users go to sign in; null when not configured. */
  portalBaseUrl: string | null;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

/** Provides the server-read session details to the client shell. */
export default function SessionProvider({
  value,
  children,
}: {
  value: SessionContextValue;
  children: ReactNode;
}) {
  // Set during render, not in an effect: the shell's children start their
  // requests in their own effects, which run before this component's.
  if (typeof window !== 'undefined') {
    setApiAddresses({
      baseUrl: value.apiBaseUrl,
      socketOrigin: value.socketOrigin,
    });
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
