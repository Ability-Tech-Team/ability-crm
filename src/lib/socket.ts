import { io, type Socket } from 'socket.io-client';
import { getApiOrigin } from './apiConfig';

export type SocketNamespace = '/tickets' | '/complains';

export type SocketErrorPayload = {
  code?: string;
  message?: string;
};

/**
 * Socket.IO is mounted at the API's **origin** with the default `/socket.io/`
 * path, and namespaces sit directly under it (`ws(s)://<host>/tickets`). A
 * path prefix on the API address would be read as part of the namespace and
 * fail the handshake, so only the origin is used.
 */
export function createNamespacedSocket(namespace: SocketNamespace): Socket {
  return io(`${getApiOrigin() ?? ''}${namespace}`, {
    autoConnect: false,
    // Sends the HttpOnly auth cookie on the handshake so the API can
    // authenticate the socket without the page ever holding a token.
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
}
