import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from './apiConfig';

export type SocketNamespace = '/tickets' | '/complains';

export type SocketErrorPayload = {
  code?: string;
  message?: string;
};

/**
 * Where the dashboards' sockets connect: the API's Socket.IO server sits
 * under the API's own address (`<apiUrl>/socket.io`, e.g.
 * `https://api.example.com/crm/socket.io`), so the sockets follow the HTTP
 * base URL. During `next dev` that is this app's proxy path
 * (`/api/dev-proxy/crm/<n>`, src/lib/devApiProxy.ts), which forwards the
 * handshake and its upgrade to the API with the `localhost` cookie.
 *
 * The namespace goes in the URL and the path in `path`: a path in the URL
 * would be read as part of the namespace.
 */
export function socketAddress(
  baseUrl: string,
  pageOrigin: string,
): { origin: string; path: string } {
  const base = new URL(baseUrl || '/', pageOrigin);
  const prefix = base.pathname.replace(/\/+$/, '');
  return { origin: base.origin, path: `${prefix}/socket.io` };
}

export function createNamespacedSocket(namespace: SocketNamespace): Socket {
  const { origin, path } = socketAddress(
    getApiBaseUrl() ?? '',
    window.location.origin,
  );

  return io(`${origin}${namespace}`, {
    path,
    // The API serves `/socket.io` without the slash, which Next.js's dev
    // rewrite needs (it redirects addresses that end in `/`).
    addTrailingSlash: false,
    autoConnect: false,
    // Sends the HttpOnly auth cookie on the handshake so the API can
    // authenticate the socket without the page ever holding a token.
    withCredentials: true,
    // The default: long-polling first, then the WebSocket upgrade when the
    // way to the API allows it, so a proxy without WebSocket support still
    // carries the updates.
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
}
