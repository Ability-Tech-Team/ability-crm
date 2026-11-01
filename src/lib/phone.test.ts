import { describe, expect, it } from 'vitest';
import { isAcceptablePhoneInput } from './phone';

describe('isAcceptablePhoneInput', () => {
  it.each([
    '01012345678',
    '+20 101 234 5678',
    '00201012345678',
    '201012345678',
    '1012345678',
    '+971 50 123 4567',
    '(010) 1234-5678',
  ])('accepts %s, which the backend normalizes', (value) => {
    expect(isAcceptablePhoneInput(value)).toBe(true);
  });

  it.each(['', 'abc', '12345', '+20 10x 234', '1234567890123456', '++201012345678'])(
    'rejects %j',
    (value) => {
      expect(isAcceptablePhoneInput(value)).toBe(false);
    },
  );
});
