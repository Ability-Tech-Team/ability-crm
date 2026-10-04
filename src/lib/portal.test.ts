import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBaseUrl } from "./baseUrl";
import {
  buildPortalHomeUrl,
  buildPortalSignInUrl,
  getPortalBaseUrl,
  localeFromPathname,
} from "./portal";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("buildPortalSignInUrl", () => {
  it("opens the Portal's sign-in page with this page to return to", () => {
    const url = new URL(
      buildPortalSignInUrl(
        "https://portal.example.com",
        "ar",
        "https://crm.example.com/ar/customers?page=2",
      ),
    );

    expect(url.origin + url.pathname).toBe(
      "https://portal.example.com/ar/sign-in",
    );
    expect(url.searchParams.get("returnTo")).toBe(
      "https://crm.example.com/ar/customers?page=2",
    );
  });

  it("keeps a Portal base path", () => {
    expect(
      buildPortalSignInUrl("https://apps.example.com/portal", "en", "x"),
    ).toBe("https://apps.example.com/portal/en/sign-in?returnTo=x");
  });
});

describe("buildPortalHomeUrl", () => {
  it("opens the Portal home in the locale", () => {
    expect(buildPortalHomeUrl("http://localhost:3300", "ar")).toBe(
      "http://localhost:3300/ar",
    );
  });
});

describe("localeFromPathname", () => {
  it.each([
    ["/ar", "ar"],
    ["/ar/customers", "ar"],
    ["/en", "en"],
    ["/", "en"],
    ["/fr/x", "en"],
    ["/arabic", "en"],
  ])("reads %j as %j", (pathname, locale) => {
    expect(localeFromPathname(pathname)).toBe(locale);
  });
});

describe("getPortalBaseUrl", () => {
  it("reads PORTAL_URL", () => {
    vi.stubEnv("PORTAL_URL", "https://portal.example.com/");
    expect(getPortalBaseUrl()).toBe("https://portal.example.com");
  });

  it("refuses an unusable value without logging it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("PORTAL_URL", "https://user:secret@portal.example.com");

    expect(getPortalBaseUrl()).toBeNull();
    expect(warn.mock.calls.flat().join(" ")).not.toContain("secret");
  });
});

describe("parseBaseUrl", () => {
  it.each([
    ["http://localhost:3300", "http://localhost:3300"],
    ["https://portal.example.com/", "https://portal.example.com"],
    ["https://apps.example.com/portal/", "https://apps.example.com/portal"],
  ])("accepts %j", (value, baseUrl) => {
    expect(parseBaseUrl(value)).toEqual({ status: "configured", baseUrl });
  });

  it.each([
    ["portal.example.com", "malformed"],
    ["ftp://portal.example.com", "unsupported-protocol"],
    ["http://portal.example.com", "insecure-http"],
    ["https://user:pass@portal.example.com", "credentials"],
    ["https://portal.example.com/?a=1", "query-or-fragment"],
  ])("rejects %j as %s", (value, problem) => {
    expect(parseBaseUrl(value)).toEqual({ status: "invalid", problem });
  });
});
