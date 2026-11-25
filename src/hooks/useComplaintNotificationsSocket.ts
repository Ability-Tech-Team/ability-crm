'use client';

import { useEffect, useState } from 'react';
import { useProjectScopeStore } from '@/src/store/useProjectScopeStore';
import {
  createNamespacedSocket,
  type SocketErrorPayload,
} from '@/src/lib/socket';
import {
  localizeComplaintNotification,
  type ComplaintLocale,
  type ComplaintNotification,
} from '@/src/services/complaints';
import type { RealtimeStatus } from '@/src/hooks/useTicketNotificationsSocket';

export type ComplainsLatestPayload = {
  project_id?: number;
  notifications?: ComplaintNotification[];
  event_type?: string;
  complain_id?: number;
  /** Every active row of the scope; `notifications` holds the newest 100. */
  count?: number;
};

export type ComplainsSubscribedPayload = {
  project_id?: number;
  is_dispatcher?: boolean;
  department_id?: number | null;
  count?: number;
};

export type UseComplaintNotificationsSocketOptions = {
  enabled: boolean;
  locale?: ComplaintLocale;
};

export type UseComplaintNotificationsSocketResult = {
  notifications: ComplaintNotification[] | null;
  status: RealtimeStatus;
  error: SocketErrorPayload | null;
  count: number | null;
  lastEvent: {
    type?: string;
    complainId?: number;
    receivedAt: number;
  } | null;
};

export function useComplaintNotificationsSocket({
  enabled,
  locale,
}: UseComplaintNotificationsSocketOptions): UseComplaintNotificationsSocketResult {
  // The Super Admin's working project (null for everyone else), as the HTTP
  // feed sends it; a switch subscribes again.
  const projectId = useProjectScopeStore((state) => state.projectId);

  const [notifications, setNotifications] = useState<
    ComplaintNotification[] | null
  >(null);
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<SocketErrorPayload | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [lastEvent, setLastEvent] =
    useState<UseComplaintNotificationsSocketResult['lastEvent']>(null);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle');
      return;
    }

    const socket = createNamespacedSocket('/complains');
    setStatus('connecting');
    setError(null);

    const emitSubscribe = () => {
      // No token is sent: the HttpOnly auth cookie rides along on the
      // handshake (withCredentials) and the gateway reads it from there.
      socket.emit(
        'complains:subscribe',
        projectId === null ? {} : { project_id: projectId },
      );
    };

    socket.on('connect', emitSubscribe);

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    // A refused handshake carries the API's message_code (`data.code`). It
    // never ends the session: the HTTP client's 401 handling decides that,
    // and the dashboard's list still loads over HTTP.
    socket.on('connect_error', (err: Error & { data?: SocketErrorPayload }) => {
      setError(err.data ?? { message: err.message });
      setStatus('error');
    });

    socket.on('complains:subscribed', (payload: ComplainsSubscribedPayload) => {
      setStatus('subscribed');
      setError(null);
      if (typeof payload?.count === 'number') {
        setCount(payload.count);
      }
    });

    socket.on('complains:latest', (payload: ComplainsLatestPayload) => {
      if (typeof payload?.count === 'number') {
        setCount(payload.count);
      }
      if (Array.isArray(payload?.notifications)) {
        setNotifications(
          payload.notifications.map((row) =>
            localizeComplaintNotification(row, locale),
          ),
        );
      }
      setLastEvent({
        type: payload?.event_type,
        complainId: payload?.complain_id,
        receivedAt: Date.now(),
      });
    });

    socket.on('complains:error', (payload: SocketErrorPayload) => {
      setError(payload ?? { message: 'Unknown error' });
      setStatus('error');
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, locale, projectId]);

  return { notifications, status, error, count, lastEvent };
}
