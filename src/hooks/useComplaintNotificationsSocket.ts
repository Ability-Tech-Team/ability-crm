'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/src/store/useSessionStore';
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

const TOKEN_FAILURE_CODES = new Set(['INVALID_TOKEN', 'TOKEN_EXPIRED']);

export function useComplaintNotificationsSocket({
  enabled,
  locale,
}: UseComplaintNotificationsSocketOptions): UseComplaintNotificationsSocketResult {
  const markSessionEnded = useSessionStore((state) => state.markSessionEnded);

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
      socket.emit('complains:subscribe', {});
    };

    socket.on('connect', emitSubscribe);

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', () => {
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
