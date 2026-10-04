/**
 * Session tokens and password-link tokens are base64url strings of at least
 * 32 random bytes (docs/ACCOUNT-SERVICE-API.md, sections 5 and 6.4). Values in
 * any other format are rejected without calling the account service.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,256}$/;

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}
