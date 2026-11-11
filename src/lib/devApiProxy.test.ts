import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  browserApiBaseUrl,
  DEV_API_PROXY_PATH,
  devApiProxyRewrites,
} from './devApiProxy';

const ALLOWED =
  'https://api.example.com/crm/, http://172.20.1.141:9999/crm, http://8.8.8.8/crm';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('devApiProxyRewrites', () => {
  it('maps each valid allowed address to its own numbered path', () => {
    const rewrites = devApiProxyRewrites(ALLOWED);

    expect(rewrites.map(({ source, destination }) => [source, destination])).toEqual([
      [`${DEV_API_PROXY_PATH}/0/:path*`, 'https://api.example.com/crm/:path*'],
      [`${DEV_API_PROXY_PATH}/1/:path*`, 'http://172.20.1.141:9999/crm/:path*'],
    ]);
  });

  it('only matches requests from the app itself or a typed address', () => {
    for (const rewrite of devApiProxyRewrites(ALLOWED)) {
      expect(rewrite.has).toEqual([
        { type: 'header', key: 'sec-fetch-site', value: '(same-origin|none)' },
      ]);
    }
  });

  it('has nothing to forward without allowed addresses', () => {
    expect(devApiProxyRewrites(undefined)).toEqual([]);
    expect(devApiProxyRewrites('not a url')).toEqual([]);
  });
});

describe('browserApiBaseUrl', () => {
  it('sends the browser through the proxy during next dev', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(browserApiBaseUrl('http://172.20.1.141:9999/crm', ALLOWED)).toBe(
      `${DEV_API_PROXY_PATH}/1`,
    );
    expect(browserApiBaseUrl('https://api.example.com/crm', ALLOWED)).toBe(
      `${DEV_API_PROXY_PATH}/0`,
    );
  });

  it('calls the API directly outside next dev', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(browserApiBaseUrl('https://api.example.com/crm', ALLOWED)).toBe(
      'https://api.example.com/crm',
    );
  });

  it('keeps an address the proxy has no rewrite for', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(browserApiBaseUrl('https://other.example.com/crm', ALLOWED)).toBe(
      'https://other.example.com/crm',
    );
  });
});
