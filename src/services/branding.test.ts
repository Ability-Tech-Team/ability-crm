import { describe, expect, it } from 'vitest';
import { toLogoUrl } from './branding';

describe('toLogoUrl', () => {
  it("keeps a full address and puts a path on the API's origin", () => {
    expect(toLogoUrl(' https://bucket.s3.amazonaws.com/logo.png?X-Amz-Expires=60 ', 'http://172.20.1.141:9999')).toBe(
      'https://bucket.s3.amazonaws.com/logo.png?X-Amz-Expires=60',
    );
    expect(toLogoUrl('/uploads/logo.png', 'https://api.example.com/v1')).toBe(
      'https://api.example.com/uploads/logo.png',
    );
  });

  it('has no logo for an empty or relative-looking value', () => {
    expect(toLogoUrl(null, 'https://api.example.com')).toBeNull();
    expect(toLogoUrl('  ', 'https://api.example.com')).toBeNull();
    expect(toLogoUrl('logo.png', 'https://api.example.com')).toBeNull();
  });
});
