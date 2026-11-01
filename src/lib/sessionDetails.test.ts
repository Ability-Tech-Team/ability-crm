import { describe, expect, it } from 'vitest';
import { includesCrmPlatform, parseSessionCookie } from './sessionDetails';

// The shape of the portal backend's sign-in answer (2026-10-29), with made-up
// values.
const LOGIN = {
  session: {
    employee_id: '00000000-0000-4000-8000-000000000001',
    role_name: 'Super Admin',
    role_id: '00000000-0000-4000-8000-000000000002',
    user_name: 'superAdmin',
    employee_name: 'Super Admin',
    department_id: null,
    company_project_id: 2,
    company_code: 'MAIN',
    employee_type_id: 1,
    project_code: 'MAIN',
    project_name: 'Main Project',
    employee_type_name: 'Master Account',
    safe_id: 1,
    safe_name: 'Default Safe',
    must_change_password: 0,
    platforms: ['crm', 'community-admin'],
  },
  client: {
    code: 'client',
    nameEn: 'Client',
    nameAr: 'العميل',
    branding: {
      nameEn: 'CRM',
      nameAr: 'سي آر إم',
      logoUrl: 'https://bucket.s3.eu-west-1.amazonaws.com/logo.jpg?X-Amz-Expires=60',
      supportEmail: 'support@example.com',
      websiteUrl: 'https://example.com',
      addressEn: null,
      addressAr: null,
    },
  },
  platforms: [
    { key: 'crm', url: 'http://localhost:3100/', apiUrl: 'http://172.20.1.141:9999' },
    { key: 'community-admin', url: 'http://localhost:3200/', apiUrl: 'http://172.20.1.141:9998' },
  ],
};

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

describe('parseSessionCookie', () => {
  it('reads the Portal-written cookie', () => {
    const parsed = parseSessionCookie(encode(LOGIN));

    expect(parsed?.details).toMatchObject({
      employeeId: '00000000-0000-4000-8000-000000000001',
      userName: 'superAdmin',
      fullName: 'Super Admin',
      roleName: 'Super Admin',
      companyProjectId: '2',
      projectName: 'Main Project',
      employeeTypeName: 'Master Account',
      safeId: 1,
      departmentId: null,
      platforms: ['crm', 'community-admin'],
      client: {
        nameAr: 'العميل',
        brandNameEn: 'CRM',
        brandNameAr: 'سي آر إم',
        hasLogo: true,
      },
    });
    expect(includesCrmPlatform(parsed!.details)).toBe(true);
  });

  it("takes this app's API address, not Community Admin's", () => {
    expect(parseSessionCookie(encode(LOGIN))?.crmApiUrl).toBe('http://172.20.1.141:9999');
  });

  it('keeps the expiring logo link out of the details', () => {
    expect(JSON.stringify(parseSessionCookie(encode(LOGIN)))).not.toContain('X-Amz');
  });

  it('accepts a session without a client, platforms, or optional fields', () => {
    const parsed = parseSessionCookie(
      encode({ session: { employee_id: 7, user_name: 'cashier' } }),
    );

    expect(parsed).toEqual({
      details: expect.objectContaining({
        employeeId: '7',
        userName: 'cashier',
        safeId: null,
        platforms: null,
        client: null,
      }),
      crmApiUrl: null,
    });
    // No platforms listed: never assumed to include this app.
    expect(includesCrmPlatform(parsed!.details)).toBe(false);
  });

  it('accepts a client without branding', () => {
    const client = { code: 'client', nameEn: 'Client', nameAr: 'العميل' };
    const parsed = parseSessionCookie(encode({ ...LOGIN, client }));

    expect(parsed?.details.client).toEqual({
      code: 'client',
      nameEn: 'Client',
      nameAr: 'العميل',
      brandNameEn: null,
      brandNameAr: null,
      hasLogo: false,
    });
  });

  it('has no API address when platforms lacks crm', () => {
    const parsed = parseSessionCookie(
      encode({ ...LOGIN, platforms: [LOGIN.platforms[1]] }),
    );
    expect(parsed?.crmApiUrl).toBeNull();
  });

  it('does not open the app for a session without crm', () => {
    const parsed = parseSessionCookie(
      encode({ ...LOGIN, session: { ...LOGIN.session, platforms: ['community-admin'] } }),
    );
    expect(includesCrmPlatform(parsed!.details)).toBe(false);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not base64url', 'not a cookie!'],
    ['not JSON', Buffer.from('{oops', 'utf8').toString('base64url')],
    ['without a session', encode({ client: LOGIN.client })],
    ['with a wrong type', encode({ session: { ...LOGIN.session, safe_id: 'one' } })],
    ['with a malformed platform', encode({ ...LOGIN, platforms: [{ apiUrl: 'x' }] })],
    ['too long', 'a'.repeat(5000)],
  ])('rejects a %s value', (_, raw) => {
    expect(parseSessionCookie(raw)).toBeNull();
  });
});
