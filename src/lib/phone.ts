/**
 * Mobile numbers as the backend accepts them: it stores one form (Egyptian
 * mobiles as `01012345678`, foreign numbers as `+<digits>`) and normalizes
 * any spelling, so `+20 101 234 5678`, `00201012345678`, `201012345678`, and
 * `1012345678` are all the same number. The browser only rejects input that
 * can't be a phone number; the backend answers 400 for the rest.
 */
const PHONE_CHARACTERS = /^\+?[\d\s\-().]+$/;
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export const PHONE_INPUT_MAX_LENGTH = 20;

export function isAcceptablePhoneInput(value: string): boolean {
  const trimmed = value.trim();

  if (!PHONE_CHARACTERS.test(trimmed)) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
}
