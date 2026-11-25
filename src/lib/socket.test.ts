import { describe, expect, it } from 'vitest';
import { socketAddress } from './socket';

describe('socketAddress', () => {
  it('puts the sockets under the API address, path and all', () => {
    expect(
      socketAddress(
        'https://api-prd.ability-tech.com/crm',
        'https://app.ability-tech.com',
      ),
    ).toEqual({
      origin: 'https://api-prd.ability-tech.com',
      path: '/crm/socket.io',
    });
  });

  it('goes through this app during next dev, where the base is the proxy path', () => {
    expect(
      socketAddress('/api/dev-proxy/crm/0', 'http://localhost:9994'),
    ).toEqual({
      origin: 'http://localhost:9994',
      path: '/api/dev-proxy/crm/0/socket.io',
    });
  });

  it('ignores a trailing slash on the base', () => {
    expect(
      socketAddress('http://172.20.1.141:9999/crm/', 'http://localhost:9994'),
    ).toEqual({ origin: 'http://172.20.1.141:9999', path: '/crm/socket.io' });
  });

  it('falls back to the page itself before the session names the API', () => {
    expect(socketAddress('', 'http://localhost:9994')).toEqual({
      origin: 'http://localhost:9994',
      path: '/socket.io',
    });
  });
});
