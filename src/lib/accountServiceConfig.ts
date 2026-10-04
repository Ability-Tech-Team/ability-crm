import "server-only";
import { parseBaseUrl } from "./baseUrl";

export type AccountServiceConfig = {
  baseUrl: string;
  /** The app's credentials as an `Authorization: Basic` header value. */
  authorization: string;
};

let reportedProblems = "";

/**
 * Reads the account service settings from server-only environment variables
 * (docs/ACCOUNT-SERVICE-API.md, sections 3 and 4). When any is missing or
 * invalid, it logs the variable names, never their values, and returns null:
 * callers then treat the service as unavailable, which never grants access.
 */
export function getAccountServiceConfig(): AccountServiceConfig | null {
  const url = parseBaseUrl(process.env.ACCOUNT_SERVICE_URL);
  const clientId = process.env.ACCOUNT_SERVICE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.ACCOUNT_SERVICE_CLIENT_SECRET ?? "";
  const problems: string[] = [];

  if (url.status === "missing") {
    problems.push("ACCOUNT_SERVICE_URL is not set");
  } else if (url.status === "invalid") {
    problems.push(`ACCOUNT_SERVICE_URL is invalid (${url.problem})`);
  }

  if (!clientId) {
    problems.push("ACCOUNT_SERVICE_CLIENT_ID is not set");
  } else if (clientId.includes(":")) {
    problems.push("ACCOUNT_SERVICE_CLIENT_ID is invalid (it contains ':')");
  }

  if (!clientSecret.trim()) {
    problems.push("ACCOUNT_SERVICE_CLIENT_SECRET is not set");
  }

  if (url.status !== "configured" || problems.length > 0) {
    reportOnce(problems);
    return null;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`, "utf8");

  return {
    baseUrl: url.baseUrl,
    authorization: `Basic ${credentials.toString("base64")}`,
  };
}

function reportOnce(problems: string[]) {
  const summary = problems.join("; ");

  if (summary !== reportedProblems) {
    reportedProblems = summary;
    console.warn(
      `Account service is not configured: ${summary}. Sign-in and access checks report the service as unavailable.`,
    );
  }
}
