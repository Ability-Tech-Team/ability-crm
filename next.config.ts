import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";
import { devApiProxyRewrites } from "./src/lib/devApiProxy";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default function nextConfig(phase: string): NextConfig {
  return withNextIntl({
    // The container image (Dockerfile) builds the standalone server;
    // `npm run build` keeps the regular output for `next start`.
    output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
    // `next dev` only: the browser reaches the API through this app's own
    // address (src/lib/devApiProxy.ts). Builds have no rewrites.
    ...(phase === PHASE_DEVELOPMENT_SERVER
      ? {
          rewrites: async () => ({
            beforeFiles: devApiProxyRewrites(process.env.API_ALLOWED_URLS),
            afterFiles: [],
            fallback: [],
          }),
        }
      : {}),
  });
}
