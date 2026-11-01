'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/src/store/useSessionStore';
import {
  createNamespacedSocket,
  type SocketErrorPayload,
} from '@/src/lib/socket';
import {
  localizeTicketNotification,
  type TicketLocale,
  type TicketNotification,
} from '@/src/services/tickets';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'subscribed'
  | 'error'
  | 'disconnected';

export type TicketsLatestPayload = {
  project_id?: number;
  notifications?: TicketNotification[];
  event_type?: string;
  ticket_id?: number;
};

export type TicketsSubscribedPayload = {
  project_id?: number;
  is_dispatcher?: boolean;
  department_id?: number | null;
  count?: number;
};

export type UseTicketNotificationsSocketOptions = {
  enabled: boolean;
  locale?: TicketLocale;
};

export type UseTicketNotificationsSocketResult = {
  notifications: TicketNotification[] | null;
  status: RealtimeStatus;
  error: SocketErrorPayload | null;
  count: number | null;
  lastEvent: {
    type?: string;
    ticketId?: number;
    receivedAt: number;
  } | null;
};

const TOKEN_FAILURE_CODES = new Set(['INVALID_TOKEN', 'TOKEN_EXPIRED']);

export function useTicketNotificationsSocket({
  enabled,
  locale,
}: UseTicketNotificationsSocketOptions): UseTicketNotificationsSocketResult {
  const markSessionEnded = useSessionStore((state) => state.markSessionEnded);

  const [notifications, setNotifications] = useState<
    TicketNotification[] | null
  >(null);
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<SocketErrorPayload | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [lastEvent, setLastEvent] =
    useState<UseTicketNotificationsSocketResult['lastEvent']>(null);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle');
      return;
    }

    const socket = createNamespacedSocket('/tickets');
    setStatus('connecting');
    setError(null);

    const emitSubscribe = () => {
      // No token is sent: the HttpOnly auth cookie rides along on the
      // handshake (withCredentials) and the gateway reads it from there.
      socket.emit('tickets:subscribe', {});
    };

    socket.on('connect', emitSubscribe);

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setStatus('error');
    });

    socket.on('tickets:subscribed', (payload: TicketsSubscribedPayload) => {
      setStatus('subscribed');
      setError(null);
      if (typeof payload?.count === 'number') {
        setCount(payload.count);
      }
    });

    socket.on('tickets:latest', (payload: TicketsLatestPayload) => {
      if (Array.isArray(payload?.notifications)) {
        setNotifications(
          payload.notifications.map((row) =>
            localizeTicketNotification(row, locale),
          ),
        );
      }
      setLastEvent({
        type: payload?.event_type,
        ticketId: payload?.ticket_id,
        receivedAt: Date.now(),
      });
    });

    socket.on('tickets:error', (payload: SocketErrorPayload) => {
      setError(payload ?? { message: 'Unknown error' });
      setStatus('error');
      if (payload?.code && TOKEN_FAILURE_CODES.has(payload.code)) {
        markSessionEnded('expired');
      }
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, markSessionEnded, locale]);

  return { notifications, status, error, count, lastEvent };
}
