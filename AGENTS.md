# F1 League — Agent Instructions

## Ponytail principles
- Prefer deletion over abstraction.
- Prefer built-in platform features over dependencies.
- Do not add frameworks, wrappers, caches, queues, or config unless clearly necessary.
- Before writing code, look for a smaller change or no-code solution.
- When reviewing, call out over-engineering and list what can be removed.

## Before Any Task

1. **Read** `/home/scott/second-brain/projects/f1-league/Vault-Index.md` for PocketBase schema, scraping pipeline, and business rules.
2. **Check Status** at `/home/scott/second-brain/projects/f1-league/Status.md` for status tags — only work on items with clear scope.

## After Any Task — update the vault
When work changes behavior, schema, structure, status, or known issues, update the matching vault note before declaring the task done:

- When a vault-tracked task is completed, update the vault and commit the repo before starting another task.

- `Status.md` — flip status tags (✅/⏳/TODO), record items finished/added, note new open issues.
- Subsystem notes linked from `Vault-Index.md` — structural/behavioral changes (new/renamed files, changed PocketBase collections/fields, scraping/scoring logic, business rules).

Skip vault edits for pure typos, formatting, or refactors with no behavior change.

## Quick Commands

```bash
bun run dev        # Vite dev server (SvelteKit SSR)
bun run build      # Production build
npm test           # Vitest unit tests
```

## Important Files

| File | Purpose |
|------|---------|
| `src/routes/+layout.svelte` | Root layout, PB client init, auth guard |
| `src/lib/pocketbase.ts` | PocketBase SDK instance (external at pb-f1-league.hades.ws) |
| `src/hooks.server.ts` | Server hooks — cron scraping triggers + auth session handling |
| `$lib/server/drivers.ts` | Data drivers for f1.com / pitwall.app Puppeteer scrapers |
| `$lib/server/odds.ts` | Odds conversion formula: `(odds - 0.01) * 2`, capped to nearest 10 if >10 |
| `$lib/domain/predictions.ts` | Validation logic for prediction submissions |
| `$lib/notifications.ts` | Push notification dispatch (VAPID via PocketBase) |

## Architecture Essentials

- **External DB**: PocketBase at `pb-f1-league.hades.ws` — not local. Collections: players, predictions, races, odds, notifications, wallets, withdrawals.
- **Server cron**: Hourly race data scraping (f1.com + pitwall.app), Wise API deposit polling every 10s via fetch loop.
- **Scoring**: `getPlayerStats()` runs at query time across predictions/races/odds — no cache. Risk if player count scales.
- **Odds → Points**: `Math.round((odds - 0.01) * 2)`, capped to nearest 10 above 10. Exact-match top-3 predictions score ×3 multiplier.

## Vault Reference

- Architecture, data flow, business rules → `/home/scott/second-brain/projects/f1-league/Vault-Index.md`
- Status, debugging workflow, known issues → `/home/scott/second-brain/projects/f1-league/Status.md`
