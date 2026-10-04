/**
 * The session cookie that Ability Portal sets at sign-in and shares with
 * Ability CRM and Community Admin (docs/ACCOUNT-SERVICE-API.md, section 7).
 * This app only reads it and checks it with the account service; it never
 * sets or deletes it.
 */
export const SESSION_COOKIE_NAME = "ability_session";

/** This app's key in the account service's product states. */
export const PRODUCT_KEY = "crm";
