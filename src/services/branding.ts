import 'server-only';
import { z } from 'zod';

const TIMEOUT_MS = 5_000;

const brandingSchema = z.object({
  success: z.literal(true).optional(),
  result: z.object({
    logo_path: z.string().nullish(),
  }),
});

/** An absolute logo address: as given, or a path on the API's origin. */
export function toLogoUrl(
  path: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  const trimmed = path?.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return trimmed.startsWith('/')
    ? `${new URL(apiBaseUrl).origin}${trimmed}`
    : null;
}

/**
 * The client's logo (`GET /branding`, public). The backend signs the address
 * for 60 seconds, so it is fetched for every use and never cached.
 */
export async function getBrandingLogoUrl(
  apiBaseUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/branding`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const parsed = brandingSchema.safeParse(await response.json());

    if (!response.ok || !parsed.success) {
      return null;
    }

    return toLogoUrl(parsed.data.result.logo_path, apiBaseUrl);
  } catch (error) {
    console.warn(
      `GET /branding failed: ${error instanceof Error ? error.name : 'unknown error'}`,
    );
    return null;
  }
}
