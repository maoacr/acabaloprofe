# Proposal: acabalojuez-mvp

## Why

The product spec describes a multi-tenant football prediction platform. We need to ship the user-facing loop end-to-end (Fase 1): register, join a group via invite, predict match scores, see leaderboard updates. Without this loop working, there's nothing to wrap realtime, push, or external API integration around in later phases.

## What changes

A working MVP with these capabilities:

1. **Auth flow** — email + password registration, login, logout, password recovery via Supabase Auth built-in emails.
2. **Tournament catalog** — read-only for regular users. One demo tournament ("Mundial Demo 2026") seeded with 8 groups, 32 teams, group stage + knockout bracket. Admin can enter match results.
3. **Groups** — create a group for the active tournament, share a short invite link (`/unirse/[code]`), join via that link. Admin can activate/deactivate participants.
4. **Predictions** — submit predicted score (0-20 per side) for any match in a group the user belongs to. Predictions auto-lock 10 minutes before kickoff via scheduled Edge Function. After lock, predictions of others become visible (RLS).
5. **Scoring** — pure TypeScript domain function `calculatePoints(prediction, result, isKnockout)` is the single source of truth. Knockout = ×2 multiplier, group stage = ×1. Triggered when an admin marks a match as finished.
6. **Leaderboard** — per-group table sorted by totalPoints DESC, joinedAt ASC tiebreaker. Inactive participants hidden.

## Architecture decisions (locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Mutations entry point | **Server Actions** for user-facing flows, **API Routes** for cron + invite acceptance | Server Actions = best DX, type-safe. API Routes needed for non-user callers. |
| 2 | Form handling | **React Hook Form + Zod** via `@hookform/resolvers` | Type inference from Zod schema, RHF already in deps |
| 3 | Supabase client | **`@supabase/ssr`** with Next.js 14 cookies helpers | Official pattern, refresh token rotation, RSC compatible |
| 4 | Scoring location | **Pure TS domain function** at `src/domain/scoring.ts` | Testable, used by client (preview) and Edge Function. SQL wrapper deferred. |
| 5 | `is_locked` flip | **Scheduled Edge Function** updates `is_locked = true` for all predictions of a match when `lock_at` passes | Clean RLS, no race conditions, easy to backfill |
| 6 | Authentication | **Email + password only** for MVP. Magic link deferred to Fase 2. | Form is password-first, no token table needed |
| 7 | CAPTCHA | **Stub with TODO** in MVP. Real Turnstile in Fase 2. | Avoids env var dependency, ships faster |
| 8 | Email provider | **Supabase Auth built-in** for MVP. Resend in Fase 2 for branded templates. | Zero new config, works out of box |
| 9 | Tournament data | **Demo data** seeded via migration. One "Mundial Demo 2026" tournament. | Full control over scheduling for lock testing |
| 10 | Admin model | **`is_system_admin BOOLEAN` on `users` table**, set manually by maintainer via Supabase dashboard | Minimal UI, no admin panel needed for MVP |

## Out of scope (explicit)

These are Fase 2/3 and MUST NOT appear in MVP tasks:
- Supabase Realtime subscriptions (leaderboard updates, countdown)
- Web Push notifications (VAPID)
- Dark mode toggle UI (only system-preference CSS)
- PWA manifest + service worker
- Cloudflare Turnstile
- Resend transactional emails
- API-Football / football-data.org integration
- Vercel Cron / pg_cron for external result sync
- Auto-population of knockout bracket
- Personal statistics dashboard
- Web Share API for invitations
- Haptic feedback
- Personal profile editing UI (read-only in MVP)
- Group deletion from UI
- Tournament/team/match CRUD UI for admins (we seed via migration + DB-level result entry only)

## Impact

**New files:**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/registro/page.tsx`
- `src/app/(auth)/recuperar/page.tsx`
- `src/app/(auth)/layout.tsx` (auth layout, no nav)
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/grupos/page.tsx` (list user's groups)
- `src/app/(app)/grupos/nuevo/page.tsx` (create group)
- `src/app/(app)/grupos/[id]/page.tsx` (group home: leaderboard + next matches)
- `src/app/(app)/grupos/[id]/partidos/page.tsx` (matches with prediction form)
- `src/app/(app)/grupos/[id]/admin/page.tsx` (admin panel)
- `src/app/unirse/[code]/page.tsx` (invite acceptance)
- `src/app/api/cron/lock-predictions/route.ts` (Edge Function for auto-lock)
- `src/app/api/cron/calculate-points/route.ts` (Edge Function for scoring trigger)
- `src/app/api/auth/callback/route.ts` (Supabase auth callback)
- `src/middleware.ts` (protected route guard)
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`
- `src/lib/auth/session.ts` (session helpers)
- `src/lib/auth/zod-schemas.ts` (registration, login, password recovery schemas)
- `src/lib/groups/short-code.ts` (base32 short code generator)
- `src/lib/groups/queries.ts` (group CRUD via Supabase)
- `src/lib/predictions/queries.ts`
- `src/lib/leaderboard/queries.ts`
- `src/lib/matches/queries.ts`
- `src/lib/tournaments/queries.ts`
- `src/domain/scoring.ts` (pure scoring function — CRITICAL, must be tested first)
- `src/domain/types.ts` (shared domain types: Tournament, Match, Group, Prediction, etc.)
- `src/components/forms/GoalInput.tsx`
- `src/components/forms/PasswordField.tsx`
- `src/components/groups/GroupCard.tsx`
- `src/components/groups/InviteLinkBox.tsx`
- `src/components/groups/ParticipantList.tsx`
- `src/components/leaderboard/LeaderboardTable.tsx`
- `src/components/leaderboard/LeaderboardRow.tsx`
- `src/components/leaderboard/Podium.tsx`
- `src/components/matches/MatchCard.tsx`
- `src/components/matches/MatchStatusBadge.tsx`
- `src/components/matches/CountdownTimer.tsx`
- `src/components/ui/Button.tsx`, `Input.tsx`, `Label.tsx`, `Card.tsx`, `Toast.tsx`, `Spinner.tsx`
- `supabase/migrations/0001_init_schema.sql` (tables + RLS)
- `supabase/migrations/0002_seed_demo_tournament.sql` (demo data)
- `supabase/migrations/0003_rls_policies.sql` (RLS for predictions visibility)
- `supabase/seed.sql` (runnable via `supabase db reset`)
- `tests/unit/scoring.test.ts` (12+ test cases)
- `tests/unit/short-code.test.ts`
- `tests/unit/zod-schemas.test.ts`
- `tests/integration/auth.test.ts`
- `tests/integration/predictions.test.ts` (RLS test fixture)
- `tests/integration/leaderboard.test.ts`
- `tests/e2e/registration-and-login.spec.ts`
- `tests/e2e/group-create-join-predict.spec.ts`
- `vitest.config.ts`, `vitest.setup.ts`
- `playwright.config.ts`
- `src/app/manifest.json` (basic PWA manifest, no service worker yet)
- `src/app/icon-192.png`, `src/app/icon-512.png` (PWA icons, static)
- `.env.example`
- `supabase/config.toml` (local Supabase config)

**Modified files:**
- `package.json` — add vitest, RTL, jsdom, playwright, @vitest/coverage-v8, supabase CLI deps
- `tsconfig.json` — add test file types if needed
- `next.config.mjs` — add security headers, image patterns if needed

**No changes:**
- `tailwind.config.ts` (already set up)
- `src/app/layout.tsx` (root layout stays, nested layouts added)
- `src/app/page.tsx` (landing page updated with CTAs but no behavior)

## Spec structure (delta from baseline)

This change adds 7 new capabilities to the spec:

1. **Authentication** — register, login, logout, password recovery
2. **Tournament catalog** — read-only access to tournament + teams + matches + phases
3. **Match results entry** — admin-only result entry that triggers scoring
4. **Group management** — create, join via invite, leave, admin participant control
5. **Predictions** — submit, lock, view own and others' (after lock)
6. **Scoring** — automatic point calculation on match completion
7. **Leaderboard** — per-group ranking with tiebreaker

## Risks (carried from explore, locked)

| Risk | Severity | Mitigation in implementation |
|------|----------|------------------------------|
| RLS misconfiguration exposes predictions prematurely | CRITICAL | Migration 0003 with explicit policy + test fixture in `tests/integration/predictions.test.ts` |
| Scoring edge cases (0-0, walkover, 20-0, cancelled) | HIGH | 12+ unit tests in `tests/unit/scoring.test.ts` BEFORE implementation |
| Short code collisions | MEDIUM | Retry on `unique_violation`, log, max 5 attempts, fallback to UUID-suffix |
| Timezone bugs in match lock | HIGH | DB-level `TIMESTAMPTZ` + `lock_at` generated column, client uses `date-fns-tz` from `user.timezone` |
| No real E2E without live Supabase | HIGH | User will create free-tier Supabase project; migrations applied via `supabase db push` |
| Phase 1 scope creep | MEDIUM | This proposal's out-of-scope list is law. Any new feature = new change. |

## Dependencies & Prerequisites

User must do before `sdd-apply`:
1. Create free-tier Supabase project at supabase.com
2. Copy `.env.example` to `.env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Run `pnpm install` to materialize `node_modules`
4. Run `pnpm supabase link --project-ref <ref>` to link local migrations to remote
5. (Optional) Manually set `is_system_admin = true` for their own user via Supabase dashboard for testing admin flows

Implementation will:
- Install vitest, RTL, Playwright, Supabase CLI as devDependencies
- Run `pnpm supabase db push` to apply migrations
- Verify with `pnpm test` and `pnpm test:e2e`

## Review Workload Forecast

Estimated size: **~3500-4500 lines** across ~50 files (mostly components and tests).

**Recommendation**: split into chained PRs, NOT one mega-PR. Logical slices:

1. **PR 1: Foundation** (env, supabase client, middleware, types, scoring domain, tests) — ~400 lines
2. **PR 2: Auth** (registration, login, password recovery, auth pages, auth tests) — ~600 lines
3. **PR 3: Schema + seed** (migrations, RLS, demo data) — ~500 lines
4. **PR 4: Groups** (create, invite, join, admin participants) — ~700 lines
5. **PR 5: Predictions + lock cron** (submit, lock, cron route) — ~500 lines
6. **PR 6: Scoring + leaderboard** (admin result entry, calculate-points cron, leaderboard view) — ~600 lines
7. **PR 7: UI polish** (landing CTAs, dashboard, mobile-first refinements) — ~400 lines

Each PR is reviewable in isolation. Tests come with each PR.

**Delivery strategy**: ask-on-risk (default). Forecast is well over 400 lines per PR if we try to ship everything at once, so we split.

**Chain strategy**: stacked-to-main. Each PR lands in sequence. Simpler for a brand-new project with no team conventions yet.

## Next recommended step

**`sdd-spec acabalojuez-mvp`** — generate the 7 delta specs (auth, tournament catalog, match results, group management, predictions, scoring, leaderboard) with Given/When/Then scenarios.

The user will need to:
- Create the Supabase project (or confirm they want me to set up local Supabase via CLI instead)
- Confirm the chained PR strategy is acceptable
- Confirm the chain strategy (stacked-to-main vs feature-branch-chain) — I recommend stacked-to-main for a fresh project
