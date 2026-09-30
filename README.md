# Ability CRM

Ability CRM is Ability-Tech's commercial CRM product for independent client
organizations. This app is currently an **empty foundation**: a localized
public placeholder page with English/Arabic routing and nothing else. It has no
sign-in, licensing check, backend connection, or business module yet. Features
are added one request at a time, using Amer CRM (`../Amer-CRM`) as the
behavioral reference and adapting them for independent client organizations.

Read `../AGENTS.md` (shared project instructions) and `../docs/MIGRATION.md`
(recorded state, decisions, and the Ability CRM tracker) before working here.

## Local development

Requires Node.js 20.9 or newer (verified with 22.23.2) and npm.

From `CRM/`:

```bash
npm --prefix Ability-CRM ci
npm --prefix Ability-CRM run dev -- --port 3100
```

Or from this directory: `npm ci`, then `npm run dev -- --port 3100`.
Open <http://localhost:3100>; `/` redirects to `/en` (or the browser's
preferred supported locale). `/ar` renders right-to-left. Ability Portal
(`../Ability-Portal`, port 3300) links here by default.

| Task | Command (from this directory) |
| --- | --- |
| Lint (ESLint) | `npm run lint` |
| Type check (`tsc --noEmit`) | `npm run typecheck` |
| Production build | `npm run build` |
| Production server | `npm run start -- --port 3100` |

## Environment

The placeholder needs no environment variables and no backend. It does not use
Amer CRM's API URL, cookies, or secrets. Add sanitized keys to `.env.example`
as features introduce them; keep real values in ignored `.env*` files.

## Structure

- `src/app/[locale]/` - root layout (`lang`/`dir`) and pages
- `src/proxy.ts`, `src/i18n/` - locale routing, navigation, request config
- `messages/en.json`, `messages/ar.json` - this app's translation catalogs
- Empty folders with `.gitkeep` mark the planned architecture (`(app)`,
  `(auth)`, `components/ui`, `hooks`, `services`, `lib`, `store`, `types`,
  `public`); they are not implemented modules.

Imports use the root-based alias `@/src/...` (`"@/*": ["./*"]`).

## Repository

This directory is its own local Git repository, with no remote and no commits
yet. It shares no history or remote with Amer CRM or the other apps.
