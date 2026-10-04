import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "./accountSession";

const TOKEN = "a".repeat(43);
const ACCOUNT = { id: "acc_1", email: "owner@client.example", name: "Client" };
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sessionWith(products: Record<string, unknown>) {
  return jsonResponse(200, { account: ACCOUNT, products });
}

beforeEach(() => {
  vi.stubEnv("ACCOUNT_SERVICE_URL", "http://localhost:3400");
  vi.stubEnv("ACCOUNT_SERVICE_CLIENT_ID", "ability-crm");
  vi.stubEnv("ACCOUNT_SERVICE_CLIENT_SECRET", "s3cret");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getSession", () => {
  it("sends the token with this app's credentials", async () => {
    fetchMock.mockResolvedValueOnce(sessionWith({ crm: { state: "available" } }));

    await getSession(TOKEN);

    const [url, init] = fetchMock.mock.lastCall ?? [];
    const headers = new Headers(init?.headers);
    expect(String(url)).toBe("http://localhost:3400/v1/auth/session");
    expect(init?.redirect).toBe("error");
    expect(headers.get("x-session-token")).toBe(TOKEN);
    expect(headers.get("authorization")).toBe(
      `Basic ${Buffer.from("ability-crm:s3cret").toString("base64")}`,
    );
  });

  it.each([
    ["available", "available"],
    ["not_subscribed", "not_subscribed"],
    ["locked", "locked"],
    ["trial_expired", "unknown"],
  ])("reads Ability CRM's %s state as %s", async (state, access) => {
    fetchMock.mockResolvedValueOnce(
      sessionWith({
        crm: { state },
        communityAdmin: { state: "available" },
      }),
    );

    expect(await getSession(TOKEN)).toEqual({
      status: "active",
      account: ACCOUNT,
      access,
    });
  });

  it("never opens the product when its entry is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      sessionWith({ communityAdmin: { state: "available" } }),
    );

    const result = await getSession(TOKEN);

    expect(result.status === "active" ? result.access : null).toBe("unknown");
  });

  it("reports an ended session", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: "session_invalid" } }),
    );

    expect(await getSession(TOKEN)).toEqual({ status: "invalid" });
  });

  it.each([
    ["wrong app credentials", () => Promise.resolve(jsonResponse(401, { error: { code: "invalid_client" } }))],
    ["a server error", () => Promise.resolve(jsonResponse(500, {}))],
    ["a body without an account", () => Promise.resolve(jsonResponse(200, { products: {} }))],
    ["a timeout", () => Promise.reject(new DOMException("timed out", "TimeoutError"))],
  ])("treats %s as unavailable", async (_name, respond) => {
    fetchMock.mockImplementationOnce(respond);

    expect(await getSession(TOKEN)).toEqual({ status: "unavailable" });
  });

  it("does not call the service without its configuration", async () => {
    vi.stubEnv("ACCOUNT_SERVICE_URL", "http://account.example.com");

    expect(await getSession(TOKEN)).toEqual({ status: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
