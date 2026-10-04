import "server-only";
import { z } from "zod";
import { getAccountServiceConfig } from "@/src/lib/accountServiceConfig";
import { PRODUCT_KEY } from "@/src/lib/sessionCookie";
import type { AccountSummary, ProductAccessState } from "@/src/types/account";

/**
 * The session check against the central account service
 * (`GET /v1/auth/session`, docs/ACCOUNT-SERVICE-API.md, section 6.2), the
 * only endpoint this app calls. Anything outside the contract (no
 * configuration, network errors, timeouts, 5xx, unexpected bodies) is
 * "unavailable", which never grants access.
 */

const SESSION_PATH = "/v1/auth/session";
const TIMEOUT_MS = 5_000;

export type SessionCheck =
  | { status: "active"; account: AccountSummary; access: ProductAccessState }
  | { status: "invalid" }
  | { status: "unavailable" };

const sessionResponseSchema = z.object({
  account: z.object({
    id: z.string().min(1),
    email: z.string().min(1),
    name: z.string(),
  }),
  products: z.record(z.string(), z.unknown()),
});

const productEntrySchema = z.object({ state: z.string() });

const errorResponseSchema = z.object({
  error: z.object({ code: z.string() }),
});

export async function getSession(token: string): Promise<SessionCheck> {
  const config = getAccountServiceConfig();

  if (!config) {
    return { status: "unavailable" };
  }

  const requestId = crypto.randomUUID();
  let status: number;
  let body: unknown;

  try {
    const response = await fetch(`${config.baseUrl}${SESSION_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: config.authorization,
        "X-Request-Id": requestId,
        "X-Session-Token": token,
      },
      cache: "no-store",
      // The service never redirects; following one could send the app's
      // credentials elsewhere.
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    status = response.status;
    body = await readJsonBody(response);
  } catch (error) {
    // Never log the request itself: it holds the session token.
    console.error(
      `Account service GET ${SESSION_PATH} failed (request ${requestId}): ${describeError(error)}`,
    );
    return { status: "unavailable" };
  }

  if (status === 200) {
    const parsed = sessionResponseSchema.safeParse(body);

    if (parsed.success) {
      return {
        status: "active",
        account: parsed.data.account,
        access: toAccessState(parsed.data.products[PRODUCT_KEY]),
      };
    }
  }

  const code = errorResponseSchema.safeParse(body).data?.error.code;

  if (status === 401 && code === "session_invalid") {
    return { status: "invalid" };
  }

  console.error(
    `Account service GET ${SESSION_PATH} answered ${status}${code ? ` (${code})` : ""}; treated as unavailable.`,
  );
  return { status: "unavailable" };
}

function toAccessState(entry: unknown): ProductAccessState {
  const parsed = productEntrySchema.safeParse(entry);
  const state = parsed.success ? parsed.data.state : null;

  return state === "available" ||
    state === "not_subscribed" ||
    state === "locked"
    ? state
    : "unknown";
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "unknown error";
  }

  const cause = error.cause;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : null;

  return causeCode ? `${error.name} (${causeCode})` : error.name;
}
