import { create } from 'zustand';

export type SessionEndReason = 'expired' | 'signed_out';

interface SessionState {
  /** Set when the API answers 403 `AUTH_PASSWORD_CHANGE_REQUIRED`. */
  mustChangePassword: boolean;
  /** Set when the API answers 401, or after logout. */
  endedReason: SessionEndReason | null;
  setMustChangePassword: (value: boolean) => void;
  markSessionEnded: (reason: SessionEndReason) => void;
}

/**
 * Session state that the HTTP client changes from outside React. Not
 * persisted: the API decides on every request, and `SessionGate` reacts by
 * showing the password change or sending the user to the Portal.
 */
export const useSessionStore = create<SessionState>((set) => ({
  mustChangePassword: false,
  endedReason: null,
  setMustChangePassword: (value) => set({ mustChangePassword: value }),
  markSessionEnded: (reason) =>
    set((state) => (state.endedReason ? state : { endedReason: reason })),
}));
