# Explore: acabalojuez-mvp

## Context Recap

Greenfield football prediction platform. The MVP (Fase 1) ships the user-facing loop end-to-end: register → join a group via invite → predict match scores → see leaderboard update. Out of scope: realtime, PWA push, dark mode polish, external results API integration, and admin tools beyond the basics. Those land in Fase 2/3 changes.

## Current State

**Foundation (committed):**
- Next.js 14 App Router + TypeScript strict + Tailwind + Supabase deps declared
- Skill registry at `.atl/skill-registry.md` defines project standards and compact rules
- Engram has `sdd-init/acabalojuez.com` (testing capabilities, project was originally called acabalojuez.com before being renamed to acabaloprofe) and `architecture/acabalojuez-overview` (business rules)
- Branch: `main`, 1 commit, working dir clean
- Path alias `@/*` → `./src/*` configured
- PWA-ready metadata, safe areas, reduced-motion CSS already wired
- No `node_modules` installed yet
- No Supabase project created (cloud-side, not local)
- No tests installed (vitest + Playwright planned for first sdd-apply)

**Architecture intent (from registry):**
- Clean Architecture: domain → application → infrastructure → interface
- Server Components by default, `'use client'` only when justified
- RLS on every Supabase table; predictions of others gated by `is_locked`
- Scoring algorithm in domain layer, used by Edge Functions and frontend

## Open Questions

These must be answered in `sdd-propose` (or by the user now) — they shape the spec.

1. **Supabase project strategy**: Do we create a real Supabase project during the MVP, or mock the client behind an interface and ship the schema as migrations only?
   - *Why it matters*: Without a real project, we can't E2E test auth, RLS, or scoring flows. But creating one locks us to a specific instance.

2. **Test data for tournaments**: Real tournaments (FIFA WC 2026, Copa América 2024) or a fictional "Demo Tournament 2026" for the MVP?
   - *Why it matters*: Real data requires either manual seeding or an external API. Demo data is faster to ship and gives us full control over match scheduling for testing the lock logic.

3. **Multi-tenancy of "admin"**: Who creates tournaments and seeds matches in the MVP? The prompt's schema implies a system admin role, but doesn't specify auth.
   - *Why it matters*: We need either (a) a `system_admin` role with RLS bypass for tournament CRUD, or (b) a seed script run by the maintainer outside the app.

4. **Short code generation for groups**: `golp.cc/abc123` is the spec. Is that subdomain in scope, or do we use the app's own `/unirse/[code]` route for the MVP?
   - *Why it matters*: Owning `golp.cc` is out of scope. We just need the shortCode column + the route, and the spec already accepts `golp.cc/XXXXX` as a URL pattern example.

5. **Cloudflare Turnstile in MVP or Fase 2?**: The spec lists it for registration. Without keys, we either stub it or use a dev-mode bypass.
   - *Why it matters*: Adds 1-2h of integration work plus env var setup. We can ship without and add it as a v1.1 commit.

6. **Email provider for password recovery**: Resend is in the stack. Without API keys, we use Supabase's built-in auth emails as the MVP path.
   - *Why it matters*: Supabase Auth ships with email templates out of the box. Resend customization is a Fase 2 polish.

7. **Auth: email+password only, or magic link too?**: Spec says "magic link + email/password" in the stack blurb but the UserRegistration form is password-based. Decide.
   - *Why it matters*: Magic link adds complexity (token table, callback routes) and the form is password-first. Recommendation: password only for MVP, magic link in Fase 2 if requested.

## Architectural Decisions Needed

### Decision 1: Server Actions vs API Routes for mutations

| Option | Pros | Cons |
|--------|------|------|
| **Server Actions** | Less boilerplate, type-safe end-to-end, no fetch needed, integrates with forms | Couples to Next.js, harder to call from external clients (e.g., cron job) |
| **API Routes** (`/api/...`) | Reusable from cron jobs and external scripts, REST-style | More boilerplate, manual types, double parsing |

**Recommendation**: Server Actions for user-facing mutations (create group, submit prediction, register). API Routes for: (a) cron-triggered result updates, (b) the invite acceptance endpoint, (c) anything the cron job needs to call.

### Decision 2: Form handling approach

| Option | Pros | Cons |
|--------|------|------|
| **React Hook Form + Zod** | Best DX, type inference, minimal re-renders | `'use client'` required, larger bundle |
| **Server Actions + native formData + Zod** | Server-first, less JS shipped | Worse UX (full page submit), no client-side validation |

**Recommendation**: React Hook Form + Zod for registration, login, prediction submission, group creation. Server Actions as the submit handler. Native `formData` only for the simplest cases (e.g., newsletter signup) — none expected in MVP.

### Decision 3: Supabase client setup

| Option | Pros | Cons |
|--------|------|------|
| **`@supabase/ssr` with Next.js 14 cookies** | Official pattern, refresh tokens rotate correctly, works in RSC + Route Handlers + Server Actions | Slightly more setup than `@supabase/supabase-js` plain |
| **Plain `@supabase/supabase-js` with localStorage** | Simpler | NOT recommended — token in localStorage is XSS-prone, breaks RSC |

**Recommendation**: `@supabase/ssr` exclusively. Already in package.json.

### Decision 4: Scoring implementation location

| Option | Pros | Cons |
|--------|------|------|
| **Domain function in TypeScript** (`src/domain/scoring.ts`) | Single source of truth, testable, used by both client (preview) and Edge Functions | Code duplication if Edge Function needs different runtime |
| **SQL function in Postgres** | Atomic, no round-trip, source of truth in DB | Harder to unit test, Edge Function still needs TS wrapper for validation |
| **Both**: TS domain for logic, SQL wrapper for atomicity | Best of both | Most work, risk of drift |

**Recommendation**: **TS domain function** for the MVP. SQL function in a later phase if we need atomic batch recalculation. We can test the TS function in isolation and the Edge Function can call it as a pure module.

### Decision 5: RLS strategy for `predictions`

The spec is clear: `is_locked = TRUE OR user_id = auth.uid()`. But there's a wrinkle — when does `is_locked` flip to true?

| Option | Pros | Cons |
|--------|------|------|
| **Trigger on `matches` table** when `lock_at` is reached (via pg_cron) | Authoritative, DB-level | Requires pg_cron extension + scheduled job |
| **Computed column or view** with `lock_at <= now()` | No job needed | Can't index a computed boolean easily for RLS |
| **Application-level: set on read** | Simple | Race conditions, bypass risk |

**Recommendation**: **Application + Edge Function**: a cron job (pg_cron on Supabase, or Vercel Cron calling an Edge Function) flips `is_locked = true` on all predictions for a match when `lock_at` passes. Document the cron schedule. RLS stays clean: `is_locked BOOLEAN` column, indexed, set by the scheduled job.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **RLS misconfiguration exposes predictions prematurely** | CRITICAL | Write RLS test fixtures in `sdd-verify` that try to read another user's unlocked prediction and expect 0 rows |
| **Scoring edge cases** (0-0, walkover, cancelled match) | High | Unit test the `calculatePoints` function with at least 12 cases: exact match, winner only, goals only, diff only, all wrong, knockout vs group, 0-0, 20-0 boundary |
| **Short code collisions** in groups | Medium | Generate 6-char base32 codes, retry on insert with `unique_violation` catch, log collisions |
| **Timezone bugs** in match lock calculation | High | All `TIMESTAMPTZ` in DB, all UI displays convert via `date-fns-tz` from user's `timezone` field, never trust browser local time for lock checks |
| **No real Supabase project = no real testing** | High | Create a free-tier Supabase project during `sdd-apply` or stub with a `supabase-mock` package for local dev |
| **Phase 1 scope creep** (adding realtime, push, dark mode polish) | Medium | Explicit out-of-scope list enforced in proposal. Each new feature = new change |
| **TDD installs bumping the dep tree** | Low | Pin vitest + RTL versions, run `pnpm install` once, commit lockfile |

## Out of Scope (Fase 1)

These belong to Fase 2/3 and MUST NOT appear in MVP tasks:

- ❌ Supabase Realtime subscriptions on leaderboard
- ❌ Web Push notifications (VAPID)
- ❌ Dark mode toggle UI (only system-preference CSS already in place)
- ❌ PWA manifest + service worker (next-pwa) — F2
- ❌ Cloudflare Turnstile — F2 (stub with TODO for now)
- ❌ Resend transactional emails — use Supabase Auth built-ins
- ❌ API-Football / football-data.org integration — F3
- ❌ Cron job for external result sync — F3
- ❌ Auto-population of knockout bracket — F3
- ❌ Personal statistics dashboard (streaks, averages) — F2
- ❌ Web Share API for invitations — F2 (use copy-to-clipboard for MVP)
- ❌ Haptic feedback — F2
- ❌ Personal profile editing (name, city, country, timezone) — F2 (account exists but is read-only)

**In scope for Fase 1:**
- ✅ Registration, login, logout
- ✅ Password recovery via Supabase Auth (built-in email)
- ✅ Tournament + teams + matches + phases schema and admin seed
- ✅ Group creation (auto shortCode, admin = creator)
- ✅ Group join via invite link (`/unirse/[code]`)
- ✅ Prediction submission (0-20 goals, Zod-validated, with `is_locked` flag)
- ✅ Auto-lock predictions 10 min before match (via scheduled Edge Function)
- ✅ Match result entry (admin only) triggers `calculatePoints` for ALL groups
- ✅ Leaderboard view per group (sorted: totalPoints DESC, joinedAt ASC)
- ✅ Participant activation/deactivation by group admin
- ✅ RLS policies for all tables
- ✅ Vitest + RTL + Playwright installed and configured
- ✅ Basic landing page with "Crear polla" and "Tengo código" CTAs

## Dependencies & Prerequisites

**Critical-path (blocks MVP):**
- [ ] Real Supabase project (free tier) OR local Supabase via `supabase` CLI
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `pnpm install` to materialize `node_modules` (currently empty)

**Nice-to-have (can stub for MVP):**
- [ ] Cloudflare Turnstile keys (stub with TODO)
- [ ] Resend API key (use Supabase Auth email templates)
- [ ] API-Football key (admin enters results manually for MVP)

**Tooling (install in first sdd-apply batch):**
- [ ] `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- [ ] `@playwright/test` + browsers
- [ ] `supabase` CLI for local migrations
- [ ] Optional: `msw` for mocking Supabase in unit tests

## Open Questions Summary

7 questions surfaced. Of those, **3 can be answered with a recommendation** (server actions, scoring location, RLS strategy) and **4 need user input**:
1. Real Supabase project or mock for MVP?
2. Real tournament data or demo data?
3. System admin role — built into the app or external seed?
4. Magic link in MVP or Fase 2?

## Recommended Next Step

**`sdd-propose acabalojuez-mvp`** with the following user inputs collected first:
- Real Supabase project (recommended) or mock for MVP
- Real tournament data (FIFA WC 2026 / Copa América 2024) or demo data
- Magic link in MVP (recommended: no) or Fase 2
- Admin role handling (recommended: `system_admin` flag in users table, seeded manually)

The proposal will lock the 4 architecture decisions above and produce a one-paragraph change summary that feeds directly into `sdd-spec`.
