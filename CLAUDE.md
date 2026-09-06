## Commands
- Dev (all services): `npm run dev`
- Build: `npm run build`
- Start (prod): `npm start`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Seed demo data: `npm run seed`

## Rules
- Call `tsc`/`vite`/`tsx` directly in root scripts, not `npm run -w <workspace>` — a nested workspace `npm run` inside a script silently discards the rest of an `&&` chain (package.json `comments` field)
- Server TS relative imports use explicit `.js` extensions (e.g. `from './app.js'`) — server/src/index.ts, server/src/app.ts

## Read first
- README.md — architecture, ordering/echo design rationale, security notes
- server/src/app.ts — how the Express app, middleware, and prod static serving are wired
- shared/src/index.ts — the shared schema/types/events/position contract both sides depend on

Architecture: see ARCHITECTURE.md — read before structural changes
