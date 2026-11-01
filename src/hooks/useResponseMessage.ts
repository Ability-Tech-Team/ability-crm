import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getErrorCode, readEnvelopeMessage } from '@/src/lib/apiErrors';

/**
 * Extracts the human-readable error message from a backend error response:
 * the envelope's `result.message` or `message`, else the error's own message
 * (network / generic JS errors).
 */
export function getBackendErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const { response, message } = error as {
    response?: { data?: unknown };
    message?: unknown;
  };

  return (
    readEnvelopeMessage(response?.data).message ??
    (typeof message === 'string' && message ? message : null)
  );
}

export function useResponseMessage() {
  const t = useTranslations('messages');
  const tCodes = useTranslations('apiCodes');

  /** Show a translated success toast. Pass an i18n key from the `messages` namespace. */
  const success = useCallback(
    (key: string) => {
      toast.success(t(key));
    },
    [t],
  );

  /**
   * Show an error toast: this app's wording for the API's `message_code`
   * when it has one, else the backend's message, else a generic error.
   */
  const error = useCallback(
    (err: unknown, fallbackKey = 'genericError') => {
      const code = getErrorCode(err);

      if (code && tCodes.has(code)) {
        toast.error(tCodes(code));
        return;
      }

      toast.error(getBackendErrorMessage(err) || t(fallbackKey));
    },
    [t, tCodes],
  );

  return { success, error };
}
