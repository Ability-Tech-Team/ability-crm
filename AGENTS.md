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
- **Status (2026-10-29):** Amer CRM's screens are ported from its
  `development` branch and adapted to the Ability CRM backend
  (`../docs/ABILITY-CRM-BACKEND-CHANGES.md`): SAP removed, ERP account codes,
  `customer_id` on tickets, complaints, invoices, CTS, and documents, uploaded
  unit debt, ownership end and edit, and the new Imports screens. The dev API
  accepts the Portal's cookie but lacks the startup routes and CORS, so the
  screens were checked against a contract stand-in only (`../docs/MIGRATION.md`). Not ported: the public
  rental-request pages, Amer's legal templates, and the walk-in request edit
  (its route was removed). Do not add a stub, bypass, or demo mode to the app.
- **Sign-in and session** (decided 2026-10-29; rules in `../AGENTS.md`): users
  sign in on Ability Portal; this app has no sign-in page and keeps no
  passwords. The backend's HttpOnly `access_token` cookie is the session, and
  the backend's users, roles, and privileges are the authority.
  - `src/proxy.ts`: without the Portal's `ability_portal_session` cookie,
    redirects to `<PORTAL_URL>/<locale>/sign-in?returnTo=<this page>`. Only an
    optimistic check. The page's address comes from `requestOrigin` in
    `src/lib/portal.ts` (`X-Forwarded-Host` or `Host`), as in `entryUrl`;
    `request.nextUrl` reports the server's own address, such as
    `0.0.0.0:3000` in the container.
  - `src/lib/session.ts`, `src/lib/sessionDetails.ts`: read and validate
    `ability_portal_session` (the Portal's sign-in `session`, `client`, and
    `platforms`, base64url JSON) in `(app)/layout.tsx`. Display data (user,
    role, project, safe, the client's brand); it never grants access. Without
    `crm` in its `platforms`, the app shows "not available".
  - The API address is the session's `platforms[crm].apiUrl`, used only when
    `API_ALLOWED_URLS` lists it (otherwise "not set up"). `SessionProvider`
    sets it in `src/lib/apiConfig.ts` for the HTTP client, sockets, and
    exports; server code takes it from `readSession()`. There is no
    build-time API address.
  - The logo goes through `/api/branding/logo`, because `/branding` signs it
    for 60 seconds; never cache or store that link.
  - `src/lib/http.ts`, `src/lib/apiErrors.ts`: the only API client. It
    classifies answers by `statusCode` and `message_code`, never by message
    text. A 401 ends the session (back to the Portal), and 403
    `AUTH_PASSWORD_CHANGE_REQUIRED` blocks the app until the password is
    changed; `skipSessionRedirect` exempts calls whose 401 means something
    else.
  - `src/components/SessionGate.tsx`: loads the dropdowns, the permission
    tree, and the privilege catalogue, and shows nothing if they fail.
    `AppRouteGuard` fails closed; every new route needs a rule in
    `src/lib/currentUserPrivileges.ts` (routes follow the tree's `href`s,
    e.g. `/definitions/erp-codes`).
  - The API enforces sessions and privileges on every call; the menus and
    hidden buttons are presentation.
- **Structure:** Amer CRM's layout (route-colocated `hooks/`, `components/`,
  `schema.ts`, `types.ts`, `utils.ts`; entity API operations in
  `src/services/`; HTTP client and configuration in `src/lib/`). Effects that
  fetch on load start through `src/lib/runAfterCommit.ts`; storage handed
  between pages is read with `src/hooks/useSessionStorageJson.ts`.
- **Imports** use the root-based alias `"@/*": ["./*"]`, e.g.
  `@/src/i18n/routing`.
- **Locales:** routing lives in `src/proxy.ts` (the Next.js 16 name for
  middleware) and `src/i18n/`. `src/app/[locale]/layout.tsx` is the root
  layout, and the request locale comes from `next/root-params`. English is the
  default; Arabic renders right-to-left. This app owns `messages/en.json` and
  `messages/ar.json`; `apiCodes` holds the wording for API `message_code`s.
- **Environment** (`.env.example`): `API_ALLOWED_URLS` (the Ability CRM API
  addresses accepted from the sign-in), `PORTAL_URL`, and
  `MEDIA_ALLOWED_HOSTS`, all server-only and read at runtime. Never reuse
  Amer CRM's API URL, cookies, or credentials. Document new keys in
  `.env.example` with placeholder values.
- **Container** (README.md, Container): `Dockerfile` (the standalone server,
  built with `NEXT_OUTPUT=standalone`; `next.config.ts` keeps the regular
  output otherwise), `.dockerignore` (no env file enters the image), and
  `scripts/docker.sh`, run by `npm run docker:prod:update`, `docker:prod`,
  `docker:prod:build`, `docker:prod:logs`, and `docker:prod:stop`. The
  container reads `.env.production` when it starts and is ready when
  `/aws/health-check` answers. Reading the scripts doesn't authorize
  running them; Docker isn't installed on the development Mac.
- **Tests:** `npm test` runs Vitest (`vitest.config.mts`) on
  `src/**/*.test.ts`; `test/server-only.ts` stands in for `server-only`. The
  tests cover the envelope classification and the client's reactions, the
  session cookie and its API address, the trusted-address check, route rules
  and the sidebar, refund actions, ownership payloads, phone input, imports,
  unit debt, logo addresses, and base URLs.

Commands, from this directory (details in `README.md`):

```bash
npm ci
cp .env.example .env.local   # API addresses and Portal settings
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

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
