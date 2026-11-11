import { describe, expect, it } from 'vitest';
import {
  matchAllowedBaseUrl,
  parseAllowedBaseUrls,
  parseBaseUrl,
} from './baseUrl';

describe('parseBaseUrl', () => {
  it('needs https for a non-loopback host by default', () => {
    expect(parseBaseUrl('http://172.20.1.141:9999')).toEqual({
      status: 'invalid',
      problem: 'insecure-http',
    });
  });

  it('accepts plain http on private networks when allowed', () => {
    const options = { allowPrivateNetworkHttp: true };
    expect(parseBaseUrl('http://172.20.1.141:9999', options)).toEqual({
      status: 'configured',
      baseUrl: 'http://172.20.1.141:9999',
    });
    expect(parseBaseUrl('http://10.0.0.5/api/', options)).toMatchObject({
      baseUrl: 'http://10.0.0.5/api',
    });
    expect(parseBaseUrl('http://192.168.1.10', options).status).toBe('configured');
    // Public hosts still need https.
    expect(parseBaseUrl('http://8.8.8.8', options)).toMatchObject({
      problem: 'insecure-http',
    });
    expect(parseBaseUrl('http://172.32.0.1', options)).toMatchObject({
      problem: 'insecure-http',
    });
    expect(parseBaseUrl('http://api.example.com', options)).toMatchObject({
      problem: 'insecure-http',
    });
  });
});

describe('matchAllowedBaseUrl', () => {
  const options = { allowPrivateNetworkHttp: true };
  const allowed = ' http://172.20.1.141:9999/ , https://crm-api.example.com/v1';

  it('accepts an address on the list, normalized', () => {
    expect(matchAllowedBaseUrl('http://172.20.1.141:9999', allowed, options)).toBe(
      'http://172.20.1.141:9999',
    );
    expect(matchAllowedBaseUrl('https://crm-api.example.com/v1/', allowed, options)).toBe(
      'https://crm-api.example.com/v1',
    );
  });

  it('rejects anything else', () => {
    // Another port, host, or path is another server.
    expect(matchAllowedBaseUrl('http://172.20.1.141:9998', allowed, options)).toBeNull();
    expect(matchAllowedBaseUrl('https://attacker.example', allowed, options)).toBeNull();
    expect(matchAllowedBaseUrl('https://crm-api.example.com', allowed, options)).toBeNull();
    // Listed, but not acceptable without the private-network option.
    expect(matchAllowedBaseUrl('http://172.20.1.141:9999', allowed)).toBeNull();
    expect(matchAllowedBaseUrl(null, allowed, options)).toBeNull();
    expect(matchAllowedBaseUrl('http://172.20.1.141:9999', undefined, options)).toBeNull();
  });
});

describe('parseAllowedBaseUrls', () => {
  it('normalizes the list in order and leaves out invalid entries', () => {
    expect(
      parseAllowedBaseUrls(
        ' https://api.example.com/crm/ , not a url,http://172.20.1.141:9999/crm,http://8.8.8.8',
        { allowPrivateNetworkHttp: true },
      ),
    ).toEqual(['https://api.example.com/crm', 'http://172.20.1.141:9999/crm']);
  });

  it('is empty without a list', () => {
    expect(parseAllowedBaseUrls(undefined)).toEqual([]);
    expect(parseAllowedBaseUrls('')).toEqual([]);
  });
});
