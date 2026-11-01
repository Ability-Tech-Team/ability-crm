# Ability CRM

Ability CRM is Ability-Tech's commercial CRM product for independent client
organizations. It carries Amer CRM's screens (`../Amer-CRM`, `development`
branch), adapted to the Ability CRM backend, a copy of Amer CRM's backend
without SAP, Milango, or the API gateway. The backend's changes are listed in
`../docs/ABILITY-CRM-BACKEND-CHANGES.md`.

Users sign in on Ability Portal; this app has no sign-in page. The backend's
HttpOnly `access_token` cookie is the session, and the backend's users, roles,
and privileges decide what each user sees and may do.

Read `../AGENTS.md` (shared project instructions) and `../docs/MIGRATION.md`
(recorded state, decisions, and the Ability CRM tracker) before working here.

## Local development

Requires Node.js 22.12 or newer (the Vitest 5 test runner; Next.js alone
needs 20.9 or newer) and npm. Verified with Node.js 22.23.2.

From `CRM/`:

```bash
npm --prefix Ability-CRM ci
cp Ability-CRM/.env.example Ability-CRM/.env.local   # then list the API address
npm --prefix Ability-CRM run dev -- --port 3100
```

Or from this directory: `npm ci`, then `npm run dev -- --port 3100`.
Open <http://localhost:3100>. Without the Portal's `ability_portal_session`
cookie you are sent to the Portal's sign-in page (port 3300) and brought back
afterwards. `/` opens the dashboard; `/ar` renders right-to-left.

| Task | Command (from this directory) |
| --- | --- |
| Lint (ESLint) | `npm run lint` |
| Type check (`tsc --noEmit`) | `npm run typecheck` |
| Unit tests (Vitest) | `npm test` |
| Production build | `npm run build` |
| Production server | `npm run start -- --port 3100` |

## Environment

| Variable | Local value | Purpose |
| --- | --- | --- |
| `API_ALLOWED_URLS` | the dev CRM API (`.env.local`) | The Ability CRM API addresses this app accepts from the sign-in (`platforms[crm].apiUrl`), comma-separated. An unlisted address is never called. `https:`, or `http:` for loopback and private-network hosts |
| `PORTAL_URL` | `http://localhost:3300` | Where users sign in |
| `MEDIA_ALLOWED_HOSTS` | empty | Extra `https` hosts the media proxy may fetch private files from |

All three are server-only and read at runtime, so one build serves every
environment. The API must list this app's origin in its
`CORS_ALLOWED_ORIGINS`. This app
never uses Amer CRM's API URL, cookies, or secrets. Keep real values in the
ignored `.env.local` and add sanitized keys to `.env.example`.

## Sign-in and session

- **The Portal signs users in** (portal backend, `POST /api/auth/login`). The
  backend sets the HttpOnly `access_token` cookie; the API checks it on every
  call.
- **`ability_portal_session`**: the Portal also stores the sign-in answer's
  `session`, `client`, and `platforms` (base64url JSON) in this cookie,
  because only the Portal receives that answer. This app reads it on the
  server (`src/lib/session.ts`, `src/lib/sessionDetails.ts`) for display
  (user, role, project, safe, the client's name and logo) and for the
  client's API address. It never grants access.
  - A session whose `platforms` lacks `crm` gets a "not available" page.
  - The API address is `platforms[crm].apiUrl`, used only when it is listed
    in `API_ALLOWED_URLS`; otherwise the app shows "not set up" and calls
    nothing. `SessionProvider` hands it to the browser's client
    (`src/lib/apiConfig.ts`) before the first request.
- **`src/lib/http.ts`** (axios) classifies every answer by `statusCode` and
  `message_code` (`src/lib/apiErrors.ts`):
  - 401: back to the Portal's sign-in;
  - 403 `AUTH_PASSWORD_CHANGE_REQUIRED`: the forced password change;
  - 403 `NO_PERMISSION` and 429: the message;
  - the maintenance flag: the maintenance page.
- **`src/components/SessionGate.tsx`** loads the dropdowns, the permission
  tree, and the privilege catalogue; without them nothing is shown.
  `AppRouteGuard` denies any route the tree doesn't allow, or that has no rule
  in `src/lib/currentUserPrivileges.ts`.
- **Logout**: `POST /auth/logout`, then the Portal's sign-in.

## Structure

Amer CRM's layout, kept route by route: `src/app/[locale]/(app)/<module>/`
(`page.tsx`, `hooks/`, `components/`, `schema.ts`, `types.ts`, `utils.ts`),
API calls in `src/services/`, shared UI in `src/components/`, and state in
`src/store/`. Imports use the root-based alias `@/src/...` (`"@/*": ["./*"]`).

- `src/app/[locale]/(app)/layout.tsx`: reads the session cookie, then the
  client shell (`AppShell`: header, sidebar, `SessionGate`).
- `src/proxy.ts`: locale routing, and the redirect to the Portal's sign-in
  for visits without the session cookie.
- `src/app/aws/health-check/route.ts`: `GET /aws/health-check` answers 200
  with `{"status":200}` for the load balancer, as in Amer CRM; no locale,
  no session, no API call.
- `src/app/api/branding/logo/route.ts`, `src/services/branding.ts`: the
  client's logo. `GET /branding` signs its link for 60 seconds, so each
  request fetches a fresh one and redirects to it.
- `src/app/api/media/route.ts`: private media proxy.
- `messages/en.json`, `messages/ar.json`: this app's catalogs. The `apiCodes`
  namespace holds the wording for `message_code`s.
- `test/server-only.ts`: stands in for `server-only` in unit tests.

## Repository

This directory is its own local Git repository, with no remote. It shares no
history or remote with Amer CRM or the other apps.
