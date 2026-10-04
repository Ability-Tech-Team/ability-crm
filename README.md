# Ability CRM

Ability CRM is Ability-Tech's commercial CRM product for independent client
organizations. Its page is still a placeholder, now behind the access check:
clients sign in on Ability Portal, and this app opens only for a client whose
subscription includes Ability CRM and whom Ability-Tech hasn't locked out. It
has no business module or business API client yet. Features are added one
request at a time, using Amer CRM (`../Amer-CRM`) as the behavioral reference
and adapting them for independent client organizations.

Read `../AGENTS.md` (shared project instructions) and `../docs/MIGRATION.md`
(recorded state, decisions, and the Ability CRM tracker) before working here.

## Local development

Requires Node.js 22.12 or newer (the Vitest 5 test runner; Next.js alone
needs 20.9 or newer) and npm. Verified with Node.js 22.23.2.

From `CRM/`:

```bash
npm --prefix Ability-CRM ci
cp Ability-CRM/.env.example Ability-CRM/.env.local
npm --prefix Ability-CRM run dev -- --port 3100
```

Or from this directory: `npm ci`, then `npm run dev -- --port 3100`.
Open <http://localhost:3100>. Without a session you are sent to the
Portal's sign-in page (port 3300) and brought back afterwards; signed in, `/`
redirects to `/en` (or the browser's preferred supported locale), and `/ar`
renders right-to-left. Ability Portal (`../Ability-Portal`) links here by
default. Signing in needs the account service (see Environment).

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
| `ACCOUNT_SERVICE_URL` | `http://localhost:3400` | The account service (contract: `../docs/ACCOUNT-SERVICE-API.md`) |
| `ACCOUNT_SERVICE_CLIENT_ID` | `ability-crm` | This app's credentials, issued by the backend team |
| `ACCOUNT_SERVICE_CLIENT_SECRET` | from the backend team | Keep it in `.env.local`; never commit it |
| `PORTAL_URL` | `http://localhost:3300` | Where signed-out clients sign in |

These are server-only values, read when the server starts. A missing or
invalid value is logged by name, never by value, and every page then shows the
access-check error instead of the product. This app never uses Amer CRM's API
URL, cookies, or secrets. Keep real values in ignored `.env*` files and add
sanitized keys to `.env.example`.

## Structure

- `src/app/[locale]/` - root layout (`lang`/`dir`) and pages
- `src/proxy.ts` - locale routing, and the redirect to the Portal's sign-in
  for visits without a session cookie
- `src/lib/access.ts` - the access check every page runs (server-only)
- `src/services/accountSession.ts` - the session check with the account
  service (server-only)
- `src/lib/portal.ts`, `sessionCookie.ts`, `tokens.ts`, `baseUrl.ts`,
  `accountServiceConfig.ts` - helpers and settings
- `src/components/AccessNotice.tsx`, `AccountBar.tsx`, `LocaleLinks.tsx` -
  the access page, who is signed in, and the language links
- `src/i18n/` - locale routing, navigation, request config
- `messages/en.json`, `messages/ar.json` - this app's translation catalogs
- `test/server-only.ts` - stands in for `server-only` in unit tests
- Empty folders with `.gitkeep` mark the planned architecture (`(app)`,
  `(auth)`, `components/ui`, `hooks`, `store`, `public`); they are not
  implemented modules.

Imports use the root-based alias `@/src/...` (`"@/*": ["./*"]`).

## Repository

This directory is its own local Git repository, with one local commit and no
remote. It shares no history or remote with Amer CRM or the other apps.
