import api from './http';
import { useSessionStore } from '../store/useSessionStore';
import { browserSessionStorage, clearAssistantChats } from './assistantChat';

export const LOGOUT_ENDPOINT = '/auth/logout';

/**
 * Ends the session. Only the server can clear the HttpOnly `access_token`
 * cookie, so this is a round trip (`POST /auth/logout`). It is best effort:
 * if the API is down, the user still leaves the app, and the cookie expires
 * on its own. `SessionGate` then sends the user to the Portal's sign-in.
 */
export async function logoutAndClearSession(): Promise<void> {
  try {
    await api.post(LOGOUT_ENDPOINT, undefined, { skipSessionRedirect: true });
  } catch {
    // Leaving the app is what the user asked for.
  } finally {
    // The next employee to sign in on this tab must not see this one's
    // assistant chat.
    try {
      const storage = browserSessionStorage();
      if (storage) clearAssistantChats(storage);
    } catch {
      // Blocked storage holds no chat.
    }
    useSessionStore.getState().markSessionEnded('signed_out');
  }
}
