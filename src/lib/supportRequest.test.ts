import { describe, expect, it } from 'vitest';
import {
  buildSupportRequestPayload,
  createSupportRequestSchema,
  SUPPORT_LIMITS,
  toFieldErrors,
} from './supportRequest';

const schema = createSupportRequestSchema({
  categoryRequired: 'category',
  subjectLength: 'subject length',
  subjectSingleLine: 'subject line',
  messageLength: 'message length',
});

const valid = {
  category: 'technical_issue',
  subject: 'Export fails',
  message: 'The units export stops at 50%.',
};

function errorsOf(values: Record<string, string>) {
  const result = schema.safeParse(values);
  return result.success ? {} : toFieldErrors(result.error.issues);
}

describe('the support request form', () => {
  it('accepts a complete request and trims it as the API does', () => {
    const result = schema.parse({
      ...valid,
      subject: '  Export fails  ',
      message: '\n  The units export stops at 50%.  \n',
    });
    expect(result).toEqual(valid);
  });

  it('needs one of the API categories', () => {
    expect(errorsOf({ ...valid, category: '' })).toEqual({ category: ['category'] });
    expect(errorsOf({ ...valid, category: 'urgent' })).toEqual({ category: ['category'] });
  });

  it('keeps the subject and message within the API limits, counted after trimming', () => {
    expect(errorsOf({ ...valid, subject: '  Hi  ' })).toEqual({ subject: ['subject length'] });
    expect(
      errorsOf({ ...valid, subject: 'x'.repeat(SUPPORT_LIMITS.subjectMax + 1) }),
    ).toEqual({ subject: ['subject length'] });
    expect(errorsOf({ ...valid, message: ' '.repeat(40) })).toEqual({
      message: ['message length'],
    });
    expect(
      errorsOf({ ...valid, message: 'x'.repeat(SUPPORT_LIMITS.messageMax + 1) }),
    ).toEqual({ message: ['message length'] });
    expect(errorsOf({ ...valid, message: 'x'.repeat(SUPPORT_LIMITS.messageMax) })).toEqual({});
  });

  it('refuses a subject with a line break, which the API would reject', () => {
    expect(errorsOf({ ...valid, subject: 'One\nBcc: someone@example.invalid' })).toEqual({
      subject: ['subject line'],
    });
  });

  it('accepts Arabic text', () => {
    expect(errorsOf({ ...valid, subject: 'لا يعمل التصدير', message: 'يتوقف تصدير الوحدات عند ٥٠٪.' })).toEqual({});
  });
});

describe('the support request body', () => {
  const values = schema.parse(valid);

  it('names the page the user was on', () => {
    expect(buildSupportRequestPayload(values, '/customers/12')).toEqual({
      ...valid,
      page: '/customers/12',
    });
  });

  it('leaves out a page the API would refuse, rather than failing the request', () => {
    for (const pathname of [null, undefined, '', 'customers', '/a b', `/${'x'.repeat(SUPPORT_LIMITS.pageMax)}`]) {
      expect(buildSupportRequestPayload(values, pathname)).toEqual(valid);
    }
  });
});
