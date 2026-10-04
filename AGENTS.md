# Ability CRM: app-level agent notes

Read `../AGENTS.md` before working here. It is the canonical guide for the
`CRM/` workspace: architecture, repository boundaries, definitions-module
conventions, sign-in, subscription, and tenant rules, and verification
requirements. This file adds app-specific facts only. If anything here seems to
conflict, `../AGENTS.md` and the user's current request take precedence. In a
standalone clone without the parent folder, get the canonical `AGENTS.md` from
the workspace instead of assuming it exists.

- **Target:** a chat started in this directory targets Ability CRM, the
  commercial CRM product (npm package `ability-crm`, local port 3100). Ability
  CRM is also the workspace's default target for feature requests. Do not
  change sibling apps unless the request names them; a CRM change does not
  require a matching Community Admin change.
- **Independence:** this app has its own manifest, lockfile, environment files,
  build output, and local Git repository. Never import runtime code from
  `../Amer-CRM`, `../Ability-Community-Admin`, or `../Ability-Portal`. Copy and
  adapt reference code from Amer CRM when useful, and record its source in
  `../docs/MIGRATION.md`.
- **Status (2026-10-01):** the placeholder page now sits behind the access
  check; there is no business module or business API client yet. The checks
  below were verified against a contract stand-in, but the account service
  itself doesn't exist yet, so without it (or without the settings) every page
  shows the access-check error. Do not expose protected features without the
  check, and do not add a stub, bypass, or demo mode.
- **Sign-in and access** (rules in `../AGENTS.md`): clients sign in once, on
  Ability Portal; this app has no password form and keeps no passwords. It
  reads the Portal's `ability_session` cookie and never sets or deletes it.
  - `src/proxy.ts`: without a well-formed session cookie, redirects straight
    to `<PORTAL_URL>/<locale>/sign-in?returnTo=<this page>`. This is only an
    optimistic check.
  - `src/lib/access.ts` (server-only): `requireProductAccess(locale)` checks
    the session with the account service once per render, redirects
    signed-out clients to the Portal, and returns `available`, `denied`
    (`not_subscribed`, `locked`, or `unknown`), or `unavailable`. Every
    protected page and data request calls it first, not only a layout; the
    future business APIs must enforce the same checks on the server.
  - `src/services/accountSession.ts` makes the only account service call
    (`GET /v1/auth/session`, 5-second timeout, zod-checked response). This
    app's product key is `crm` (`src/lib/sessionCookie.ts`). Anything
    outside the contract counts as "unavailable", which never shows the
    product.
  - `src/components/`: `AccessNotice.tsx` (denied or unavailable),
    `AccountBar.tsx` (who is signed in, with a link back to the Portal), and
    `LocaleLinks.tsx`.
- **Structure:** follow Amer CRM's definitions module (route-colocated
  `hooks/`, `components/`, `schema.ts`, `types.ts`, `utils.ts`; entity API
  operations in `src/services/`; HTTP client and configuration in `src/lib/`).
  The `.gitkeep` folders mark that structure; they are not implemented modules.
- **Imports** use the root-based alias `"@/*": ["./*"]`, e.g.
  `@/src/i18n/routing`.
- **Locales:** routing lives in `src/proxy.ts` (the Next.js 16 name for
  middleware) and `src/i18n/`. `src/app/[locale]/layout.tsx` is the root
  layout, and the request locale comes from `next/root-params`. English is the
  default; Arabic renders right-to-left. This app owns `messages/en.json` and
  `messages/ar.json`.
- **Environment** (`.env.example`): `ACCOUNT_SERVICE_URL`,
  `ACCOUNT_SERVICE_CLIENT_ID` (`ability-crm`),
  `ACCOUNT_SERVICE_CLIENT_SECRET`, and `PORTAL_URL`, all server-only and read
  at runtime. Never reuse Amer CRM's API URL, cookies, or credentials.
  Document new keys in `.env.example` with placeholder values.
- **Tests:** `npm test` runs Vitest (`vitest.config.mts`) on
  `src/**/*.test.ts`; `test/server-only.ts` stands in for `server-only`. The
  tests cover the session check against the contract (with a mocked `fetch`)
  and the Portal URLs.

Commands, from this directory (details in `README.md`):

```bash
npm ci
cp .env.example .env.local   # account service and Portal settings
npm run dev -- --port 3100
npm run lint
npm run typecheck
npm test
npm run build
npm run start -- --port 3100
```

State, decisions, and the Ability CRM tracker: `../docs/MIGRATION.md`.
Workspace commands: `../README.md`.

The block below is managed by Next.js: `next dev` re-adds it when it is missing
or outdated. Keep it unchanged.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
