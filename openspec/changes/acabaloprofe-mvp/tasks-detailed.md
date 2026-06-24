# Tasks Detailed: acabalojuez-mvp

> Full work-unit breakdown. Each WU = one commit, one PR, acceptance criteria listed.
> Strict TDD: write failing test first (where applicable), then implementation.

---

## PR1: Foundation (chore/mvp-1-foundation)

**Goal**: Project tooling, env validation, Supabase clients, domain types, scoring function, base tests.
**Est. lines**: ~400. **Work units**: 8.

### WU-1.1: Install dev dependencies

**Type**: chore  
**Files**: `package.json`, `pnpm-lock.yaml`

**Work**:
- Add to devDependencies: `vitest@^2.1.2`, `@vitest/coverage-v8@^2.1.2`, `@testing-library/react@^16.0.1`, `@testing-library/jest-dom@^6.5.0`, `@testing-library/user-event@^14.5.2`, `jsdom@^25.0.1`, `@playwright/test@^1.47.2`
- Add to dependencies: `react-hook-form@^7.53.0`, `@hookform/resolvers@^3.9.0` (already in package.json)
- Run `pnpm install` to materialize lockfile
- Verify install with `pnpm test --run` (should fail with "no tests" — that's expected)

**Acceptance**:
- `pnpm install` completes without errors
- `pnpm test --run` exits 1 with "no test files found" (not a real failure)
- `pnpm-lock.yaml` is committed

---

### WU-1.2: Configure vitest

**Type**: chore  
**Files**: `vitest.config.ts`, `vitest.setup.ts`, `package.json` (scripts update)

**Work**:
- Create `vitest.config.ts` with:
  - `test.environment: 'jsdom'`
  - `test.setupFiles: ['./vitest.setup.ts']`
  - `test.coverage.provider: 'v8'`
  - `test.coverage.thresholds.lines: 80, branches: 75, functions: 80, statements: 80`
  - `test.coverage.include: ['src/**/*.{ts,tsx}']`
  - `test.coverage.exclude: ['src/app/**/page.tsx', 'src/app/**/layout.tsx', 'src/lib/constants.ts', 'src/interface/components/ui/**']`
  - `resolve.alias: { '@': path.resolve(__dirname, './src') }`
- Create `vitest.setup.ts` with `import '@testing-library/jest-dom/vitest'`
- Add to `package.json` scripts: `"test:ui": "vitest --ui"` (optional, can skip)

**TDD**: No test for this WU (config only).

**Acceptance**:
- `pnpm test --run` still says "no test files found" but with proper jsdom env
- `pnpm test --coverage` reports coverage setup (will be 0%)

---

### WU-1.3: Configure Playwright

**Type**: chore  
**Files**: `playwright.config.ts`, `tests/e2e/.gitkeep`

**Work**:
- Create `playwright.config.ts`:
  - `testDir: './tests/e2e'`
  - `use.baseURL: 'http://localhost:3000'`
  - `use.trace: 'on-first-retry'`
  - `webServer: { command: 'pnpm dev', port: 3000, reuseExistingServer: !process.env.CI }`
  - `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`
- Add `tests/e2e/.gitkeep` so the dir exists
- Add to `package.json` scripts: keep existing `"test:e2e": "playwright test"`
- Note: `pnpm exec playwright install --with-deps chromium` should be run by the user (documented in README)

**TDD**: No test for this WU (config only).

**Acceptance**:
- `pnpm test:e2e` exits 1 with "no tests found" (expected)
- `playwright.config.ts` is valid TypeScript (typecheck passes)

---

### WU-1.4: Env validation (TDD)

**Type**: feat(test) + feat(infra)  
**Files**: `tests/unit/env.test.ts`, `src/infrastructure/env.ts`, `.env.example`

**TDD order**:
1. Write `tests/unit/env.test.ts` with cases:
   - Fails when `NEXT_PUBLIC_SUPABASE_URL` is missing
   - Fails when `NEXT_PUBLIC_SUPABASE_URL` is not a URL
   - Fails when `SUPABASE_SERVICE_ROLE_KEY` is missing
   - Fails when `NEXT_PUBLIC_APP_URL` is missing
   - Succeeds when all required vars are valid
   - Coerces `CRON_SECRET` to optional (no error if missing)
2. Run, confirm failures
3. Implement `src/infrastructure/env.ts` with Zod schema
4. Run, confirm pass

**Work**:
- Create `src/infrastructure/env.ts` exporting typed `env` object (see design §6.1)
- Create `.env.example` with placeholders (NEVER real values):
  ```
  # Supabase — get from https://supabase.com/dashboard/project/_/settings/api
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
  
  # App
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  
  # Optional: cron secret (generate with: openssl rand -hex 32)
  CRON_SECRET=
  ```

**Acceptance**:
- All 6 test cases pass
- `.env.example` has placeholders, no real values
- `tsc --noEmit` passes

---

### WU-1.5: Domain types

**Type**: feat  
**Files**: `src/domain/types.ts`

**Work**:
- Create `src/domain/types.ts` with all interfaces from design §3
- No tests (types are compile-time guarantees)

**Acceptance**:
- File compiles with `tsc --noEmit`
- All types from design are present
- No `any` anywhere

---

### WU-1.6: Scoring function (CRITICAL — TDD first)

**Type**: feat(test) + feat(domain)  
**Files**: `tests/unit/scoring.test.ts`, `src/domain/scoring.ts`

**TDD order**:
1. Write `tests/unit/scoring.test.ts` with 12+ cases (see REQ-SCORE-001 in spec):
   - Pleno group stage (1:0 vs 1:0, is_knockout=false → 10 pts: 5+2+2+1)
   - Pleno knockout (1:0 vs 1:0, is_knockout=true → 20 pts: 10+4+4+2)
   - Winner + diff only (2:0 vs 3:1, group → 6 pts: 5+0+0+1)
   - Winner only (2:1 vs 1:0, group → 5 pts: 5+0+0+0)
   - Draw correct (0:0 vs 2:2, group → 5 pts: 5+0+0+0)
   - All wrong (1:2 vs 2:1, group → 0 pts)
   - 0-0 pleno (0:0 vs 0:0, group → 10 pts)
   - Boundary 20-20 (20:20 vs 20:20, group → 10 pts)
   - Inverted winner (3:0 vs 0:3, group → 0 pts)
   - Knockout all wrong (1:0 vs 0:1, knockout → 0 pts)
   - Knockout draw pleno (2:2 vs 2:2, knockout → 20 pts: 10+4+4+2)
   - Goals only (1:0 vs 2:0, group: pred 1-0=1, actual 2-0=2, winner both home → 5+0+2+0 = 7 pts)
2. Run, confirm all fail
3. Implement `src/domain/scoring.ts` (see design §4)
4. Run, confirm all pass
5. Verify 100% coverage on this file

**Acceptance**:
- All 12+ test cases pass
- Coverage report shows 100% lines/branches/functions in `src/domain/scoring.ts`

---

### WU-1.7: Short code generator (TDD)

**Type**: feat(test) + feat(domain)  
**Files**: `tests/unit/short-code.test.ts`, `src/domain/short-code.ts`

**TDD order**:
1. Write tests:
   - Returns 6 chars
   - Uses only allowed alphabet (A-Z, 2-9, excluding 0/O/1/I/L)
   - Multiple calls return different values (statistical, 1000 calls → at least 950 unique)
2. Implement `generateShortCode()` that picks 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
3. Implement `generateShortCodeWithRetry(existingCodes: string[], maxAttempts = 5)` that retries on collision

**Acceptance**:
- All tests pass
- Statistical uniqueness test passes
- 100% coverage on `src/domain/short-code.ts`

---

### WU-1.8: Lock helper (TDD)

**Type**: feat(test) + feat(domain)  
**Files**: `tests/unit/lock.test.ts`, `src/domain/lock.ts`

**TDD order**:
1. Tests:
   - `isMatchLocked(lockAt)` returns true if lockAt is in the past
   - `isMatchLocked(lockAt)` returns false if lockAt is in the future
   - `timeUntilLock(lockAt)` returns positive ms for future, negative for past
2. Implement with simple `Date` comparison

**Acceptance**:
- All tests pass
- 100% coverage

---

## PR2: Auth (feat/mvp-2-auth)

**Goal**: Registration, login, password recovery, session middleware.
**Est. lines**: ~600. **Work units**: 7. **Depends on**: PR1.

### WU-2.1: Supabase server + client setup (TDD for factories)

**Type**: feat(infra)  
**Files**: `src/infrastructure/supabase/server.ts`, `src/infrastructure/supabase/client.ts`, `src/infrastructure/supabase/middleware.ts`

**Work**:
- `server.ts`: `createServerClient` using `next/headers` cookies (Next.js 14 App Router pattern from @supabase/ssr docs)
- `client.ts`: `createBrowserClient` for client components
- `middleware.ts`: `updateSession` helper that refreshes the session in middleware

**TDD**: Skip (these are thin wrappers around official SDK — covered by E2E tests in PR2)

**Acceptance**:
- All 3 files compile
- Follow `@supabase/ssr` Next.js 14 App Router pattern exactly
- No business logic

---

### WU-2.2: Registration Zod schema (TDD)

**Type**: feat(test) + feat(lib)  
**Files**: `tests/unit/schemas/auth.test.ts`, `src/lib/auth/zod-schemas.ts`

**TDD order**:
1. Tests:
   - Valid input passes
   - Rejects missing `firstName`
   - Rejects username with uppercase
   - Rejects username < 3 chars
   - Rejects email without @
   - Rejects password < 8 chars
   - Rejects password without letter
   - Rejects password without number
   - Rejects mismatched confirmPassword
   - Rejects country not in list
   - Rejects timezone not in list
   - Rejects acceptTerms = false
2. Implement `registerSchema` per design §7

**Acceptance**:
- All 12+ test cases pass
- Schema matches `RegisterInput` type
- 90%+ coverage

---

### WU-2.3: Register Server Action

**Type**: feat(auth)  
**Files**: `src/application/auth/register.ts`

**Work**:
- Validate input with `registerSchema`
- Call `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, username, country, city, timezone } } })`
- After auth success, INSERT into `public.users` table (with service role or via RLS policy)
- Return `ActionResult<{ userId: string }>`
- Errors: invalid input → field errors; email taken → field error; username taken → field error (handle via DB unique constraint)

**TDD**: Integration test in PR2 WU-2.7

**Acceptance**:
- Compiles, returns proper Result type
- Handles Supabase errors gracefully
- Maps DB unique violations to field errors

---

### WU-2.4: Login Zod + Server Action

**Type**: feat(auth)  
**Files**: `src/application/auth/login.ts`

**Work**:
- Login schema: `{ identifier: string (email or username), password: string }`
- If identifier is email format → `signInWithPassword({ email, password })`
- If username → first look up email via service_role (or via a Postgres function), then sign in
- Return generic error on failure to prevent enumeration

**TDD**: Integration test in WU-2.7

**Acceptance**:
- Compiles, returns proper Result type
- Generic error for invalid credentials

---

### WU-2.5: Logout + Recovery

**Type**: feat(auth)  
**Files**: `src/application/auth/logout.ts`, `src/application/auth/recover-password.ts`, `src/app/auth/signout/route.ts`, `src/app/auth/callback/route.ts`

**Work**:
- `logout.ts`: Server Action that calls `supabase.auth.signOut()` and clears cookies
- `recover-password.ts`: Server Action that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${APP_URL}/auth/callback?type=recovery' })` — always returns success
- `/auth/callback/route.ts`: Exchanges the auth code for a session, redirects to `/dashboard` (or `?redirect=` if present)
- `/auth/signout/route.ts`: POST handler that calls signOut and redirects to `/login`

**Acceptance**:
- All 4 files compile
- Callback handles both `signup` and `recovery` types

---

### WU-2.6: Middleware protected routes

**Type**: feat(middleware)  
**Files**: `src/middleware.ts`

**Work**:
- Apply `updateSession` from `infrastructure/supabase/middleware.ts` to all paths except: `/`, `/login`, `/registro`, `/recuperar`, `/unirse/*`, `/auth/*`, `/api/cron/*`, `/_next/*`, static assets
- If session is invalid AND route is protected → redirect to `/login?redirect=<path>`
- Use `matcher` export in `config` to limit middleware execution

**Acceptance**:
- `/dashboard` redirects to `/login` when not authenticated
- `/login` works without auth
- `/unirse/ABC123` works without auth
- `/api/cron/lock-predictions` does NOT redirect (cron is authed via header)

---

### WU-2.7: Auth pages + integration tests

**Type**: feat(ui) + test(integration)  
**Files**:
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/registro/page.tsx`
- `src/app/(auth)/recuperar/page.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/RecoveryForm.tsx`
- `src/components/ui/Button.tsx`, `Input.tsx`, `Label.tsx`
- `tests/integration/auth.test.ts`
- `tests/e2e/auth.spec.ts`

**Work**:
- Auth layout: centered card, no nav
- Login page: form with username/email + password, link to registro, link to recuperar
- Register page: full form with all 11 fields, country select, timezone select, terms checkbox
- Recovery page: just email field
- Forms: React Hook Form + Zod resolver, inline errors, submit button shows loading state, server errors as toasts
- Integration tests: register a user via Server Action, login, logout, recovery request (assert always-ok)
- E2E: full register → land on /dashboard, logout → /login

**Acceptance**:
- All pages render at 390px without horizontal scroll
- All form fields have aria-labels
- Server Action errors are displayed correctly
- Integration tests pass (use a test Supabase instance or mocked client)
- E2E happy path passes
- 80%+ coverage maintained

---

## PR3: Schema + Seed (feat/mvp-3-schema)

**Goal**: Apply DB schema, RLS, RPCs, demo seed. Verify with SQL tests.
**Est. lines**: ~500. **Work units**: 5. **Depends on**: PR1 (env).

### WU-3.1: Supabase config + link

**Type**: chore  
**Files**: `supabase/config.toml`, `supabase/.gitignore`

**Work**:
- Run `pnpm supabase init` (creates config.toml)
- Add `supabase/.gitignore` for `temp/`, `.branches/`, `.temp/`
- Document: user must run `pnpm supabase link --project-ref ytwayebdknclxmqkoftle` (using the project ref from .env.local, never paste the ref in chat)

**Acceptance**:
- `supabase/config.toml` exists
- User can run `pnpm supabase db push` to apply migrations

---

### WU-3.2: Initial schema migration

**Type**: feat(db)  
**Files**: `supabase/migrations/20260624120000_init_schema.sql`

**Work**:
- Copy the schema from design §2.1
- Includes tables, indexes, CHECK constraints, generated `lock_at` column, `updated_at` triggers, ENUM type

**TDD**: SQL tests live in PR5 (RLS tests need data first)

**Acceptance**:
- Migration applies cleanly via `pnpm supabase db push`
- All 8 tables exist with correct columns
- Indexes exist

---

### WU-3.3: RLS policies migration

**Type**: feat(db)  
**Files**: `supabase/migrations/20260624120100_rls_policies.sql`

**Work**:
- Copy policies from design §2.2
- Enable RLS on all 8 tables
- 8 SELECT policies, 4 INSERT policies, 4 UPDATE policies, 0 DELETE policies (except cascade via FK)

**Acceptance**:
- Migration applies cleanly
- `SELECT` on `users` as authenticated returns rows
- `SELECT` on `users` as anon returns 0 rows (if policy requires auth) OR returns public columns
- `DELETE` on `groups` returns 0 rows affected (no policy)

---

### WU-3.4: RPC functions migration

**Type**: feat(db)  
**Files**: `supabase/migrations/20260624120200_rpc_functions.sql`

**Work**:
- Copy 5 functions from design §2.3
- `lock_pending_predictions`, `recalculate_match_points`, `recalculate_group_leaderboard`, `generate_group_short_code`, `get_group_for_invite`
- `v_group_leaderboard` view
- GRANT EXECUTE to anon/authenticated as appropriate

**Acceptance**:
- Migration applies cleanly
- `SELECT generate_group_short_code()` returns 6-char string
- `SELECT lock_pending_predictions()` returns 0 when no matches need locking

---

### WU-3.5: Demo seed migration

**Type**: feat(db)  
**Files**: `supabase/migrations/20260624120300_seed_demo_tournament.sql`

**Work**:
- Mundial Demo 2026 tournament
- 6 phases
- 32 teams across 8 groups (full data, not abbreviated)
- 48 group stage matches (3 matchdays × 8 groups × 2 matches)
- 15 knockout matches (8 R16, 4 QF, 2 SF, 1 3rd, 1 F)
- All matches scheduled in the future, with mix of soon (for testing) and later

**Acceptance**:
- Migration applies cleanly
- `SELECT COUNT(*) FROM matches` = 63
- `SELECT COUNT(*) FROM teams` = 32

---

## PR4: Groups (feat/mvp-4-groups)

**Goal**: Create groups, join via invite, manage participants.
**Est. lines**: ~700. **Work units**: 8. **Depends on**: PR2, PR3.

### WU-4.1: Group Zod schemas (TDD)

**Type**: feat(test) + feat(lib)  
**Files**: `tests/unit/schemas/group.test.ts`, `src/lib/groups/zod-schemas.ts`

**Work**:
- `createGroupSchema`: name (3-60), description (optional, max 500), specialConditions (optional, max 1000), tournamentId (UUID), startingPhase (enum), maxParticipants (2-100, default 100)
- Tests: valid input, name too short, maxParticipants > 100, invalid startingPhase

**Acceptance**: All tests pass, 90%+ coverage

---

### WU-4.2: Create group Server Action

**Type**: feat(groups)  
**Files**: `src/application/groups/create-group.ts`

**Work**:
- Validate with `createGroupSchema`
- Verify tournament exists and is `active` or `upcoming`
- Call `generate_group_short_code()` RPC
- INSERT into `groups` with admin_user_id = current user
- INSERT into `group_participants` with status='active', joined_at=NOW()
- Return `ActionResult<{ groupId, shortCode }>`

**TDD**: Integration test in WU-4.8

---

### WU-4.3: Join group Server Action

**Type**: feat(groups)  
**Files**: `src/application/groups/join-group.ts`

**Work**:
- Look up group by shortCode
- If not found → "Código inválido"
- If `status !== 'active'` → "Este grupo no está activo"
- Check if user is already an active participant → "Ya sos parte de este grupo"
- Check if user was previously inactive → reactivate (preserve joined_at)
- Check if group is full → "Este grupo está completo"
- INSERT/UPDATE into `group_participants`
- Return `ActionResult<{ groupId }>`

---

### WU-4.4: Leave group + manage participants

**Type**: feat(groups)  
**Files**: `src/application/groups/leave-group.ts`, `src/application/groups/manage-participants.ts`

**Work**:
- `leave-group`: check user is not admin (block); set status='inactive'
- `manage-participants`: verify caller is group admin; toggle status; return updated row

---

### WU-4.5: Group queries (read)

**Type**: feat(groups)  
**Files**: `src/application/groups/list-user-groups.ts`, `src/application/groups/get-group.ts`

**Work**:
- `list-user-groups`: query groups where user is active participant, return with last 5 upcoming matches and current position
- `get-group`: query single group by id, return with participants list, leaderboard, next matches

---

### WU-4.6: Groups UI

**Type**: feat(ui)  
**Files**:
- `src/app/(app)/grupos/page.tsx`
- `src/app/(app)/grupos/nuevo/page.tsx`
- `src/app/(app)/grupos/[id]/page.tsx`
- `src/app/(app)/grupos/[id]/admin/page.tsx`
- `src/components/groups/GroupCard.tsx`
- `src/components/groups/CreateGroupForm.tsx`
- `src/components/groups/ParticipantList.tsx`
- `src/components/groups/InviteLinkBox.tsx`
- `src/app/unirse/[code]/page.tsx`

**Work**:
- `/grupos`: list user's groups with cards
- `/grupos/nuevo`: form with tournament select, phase select, etc.
- `/grupos/[id]`: group home (placeholder for now, leaderboard in PR6)
- `/grupos/[id]/admin`: participants list with toggles, invite link copy button
- `/unirse/[code]`: call `get_group_for_invite` RPC, show group info, "Unirme" button (or login redirect)

**Acceptance**:
- All pages render at 390px
- Forms have proper validation feedback
- Mobile-first layout

---

### WU-4.7: App layout + nav

**Type**: feat(ui)  
**Files**: `src/app/(app)/layout.tsx`, `src/components/layout/AppNav.tsx`, `src/components/layout/MobileMenu.tsx`

**Work**:
- Authenticated layout: top nav with logo + user menu + logout
- Mobile: hamburger menu
- Show current user's username and avatar

---

### WU-4.8: Group integration + E2E tests

**Type**: test  
**Files**: `tests/integration/group-lifecycle.test.ts`, `tests/e2e/group-create-join.spec.ts`

**Work**:
- Integration: create group, join, leave, reactivate, toggle by admin, full group rejection
- E2E: register user A → create group → copy invite → register user B → join via /unirse/CODE → both appear in group

**Acceptance**: All tests pass

---

## PR5: Predictions (feat/mvp-5-predictions)

**Goal**: Submit predictions, auto-lock via cron, RLS tests.
**Est. lines**: ~500. **Work units**: 6. **Depends on**: PR3, PR4.

### WU-5.1: Prediction Zod schema (TDD)

**Type**: feat(test) + feat(lib)  
**Files**: `tests/unit/schemas/prediction.test.ts`, `src/lib/predictions/zod-schemas.ts`

**Work**:
- `submitPredictionSchema`: matchId (UUID), groupId (UUID), homeGoals (0-20), awayGoals (0-20)
- Tests: valid, negative goal, goal > 20, missing matchId

**Acceptance**: All tests pass, 90%+ coverage

---

### WU-5.2: Submit prediction Server Action

**Type**: feat(predictions)  
**Files**: `src/application/predictions/submit-prediction.ts`

**Work**:
- Validate input
- Check user is active participant of group
- Check match is in group's startingPhase window (helper in domain)
- Check match is scheduled and not past lock_at (defense in depth — RLS also checks)
- UPSERT into predictions
- Return `ActionResult<{ predictionId }>`

---

### WU-5.3: Lock cron API route

**Type**: feat(api)  
**Files**: `src/app/api/cron/lock-predictions/route.ts`

**Work**:
- POST handler
- Verify `Authorization: Bearer ${CRON_SECRET}` header (or allow Vercel Cron's `x-vercel-cron` header in prod)
- Use service role client
- Call `lock_pending_predictions()` RPC
- Return `{ lockedCount: number }` JSON
- Log to console with structured fields

**TDD**: Integration test with mocked auth

---

### WU-5.4: Prediction queries

**Type**: feat(predictions)  
**Files**: `src/application/predictions/get-my-predictions.ts`, `src/application/predictions/get-group-predictions.ts`

**Work**:
- `get-my-predictions`: query predictions for current user in a group, return with match info
- `get-group-predictions`: query predictions in a group, RLS will filter (locked only, if not own)

---

### WU-5.5: Predictions UI

**Type**: feat(ui)  
**Files**:
- `src/app/(app)/grupos/[id]/partidos/page.tsx`
- `src/components/matches/MatchCard.tsx`
- `src/components/matches/MatchStatusBadge.tsx`
- `src/components/matches/CountdownTimer.tsx`
- `src/components/forms/GoalInput.tsx`
- `src/components/predictions/PredictionForm.tsx`

**Work**:
- Match list grouped by phase
- Each match is a card with teams, scheduled time (in user timezone), status badge, countdown if < 1h
- GoalInput: −/+ buttons, display "2 - 1", validation 0-20, debounce 800ms
- PredictionForm: integrates GoalInput, auto-save, haptic feedback on save
- Mobile-first: touch targets ≥ 48px, vertical stack

---

### WU-5.6: CRITICAL RLS integration tests

**Type**: test(critical)  
**Files**: `tests/integration/prediction-rls.test.ts`

**Work**: Implement the 4 critical tests from design §8.3 EXACTLY:
1. User B cannot read User A unlocked prediction
2. User B can read User A locked prediction
3. User C (non-member) cannot read any predictions
4. User cannot update locked prediction

Use a test Supabase schema (or a `supabase-test` client that points to a separate test database). Tests must run against real Postgres, not mocks.

**Acceptance**: ALL 4 tests pass. This is the security gate — PR cannot merge if these fail.

---

## PR6: Scoring + Leaderboard (feat/mvp-6-scoring)

**Goal**: Admin enters results, points calculated, leaderboard displayed.
**Est. lines**: ~600. **Work units**: 7. **Depends on**: PR5.

### WU-6.1: Enter match result Server Action

**Type**: feat(admin)  
**Files**: `src/application/matches/enter-match-result.ts`

**Work**:
- Verify `is_system_admin` flag on user
- Validate home_goals, away_goals in 0-20
- UPDATE matches SET status='finished', home_goals, away_goals
- Call `recalculate_match_points(matchId)` RPC
- Return `ActionResult<{ updatedPredictions: number }>`

---

### WU-6.2: Cancel match Server Action

**Type**: feat(admin)  
**Files**: `src/application/matches/cancel-match.ts`

**Work**:
- Admin only
- UPDATE matches SET status='cancelled'
- Call `recalculate_match_points` (which handles cancelled → zero out predictions)

---

### WU-6.3: Get group matches query

**Type**: feat(matches)  
**Files**: `src/application/matches/get-group-matches.ts`

**Work**:
- Query matches for a group's tournament
- Filter by group's startingPhase window (ALL / from R16 / from SF / final only)
- Group by phase for UI
- Compute `isLocked` client-side for display

---

### WU-6.4: Leaderboard query

**Type**: feat(leaderboard)  
**Files**: `src/application/leaderboard/get-group-leaderboard.ts`

**Work**:
- Query `v_group_leaderboard` view for a group
- Return `LeaderboardEntry[]` sorted by position

---

### WU-6.5: Admin result entry UI

**Type**: feat(admin-ui)  
**Files**:
- `src/app/admin/resultados/page.tsx`
- `src/components/admin/ResultEntryForm.tsx`

**Work**:
- List of matches with status
- Form to enter home_goals, away_goals
- Submit triggers `enterMatchResult`
- Show updated prediction count
- Cancel match button per match

---

### WU-6.6: Leaderboard UI

**Type**: feat(ui)  
**Files**:
- `src/components/leaderboard/LeaderboardTable.tsx`
- `src/components/leaderboard/LeaderboardRow.tsx`
- `src/components/leaderboard/Podium.tsx`
- Update `src/app/(app)/grupos/[id]/page.tsx` to include leaderboard section

**Work**:
- LeaderboardTable: table view, current user row highlighted and sticky
- LeaderboardRow: position, avatar, username, totalPoints, matchesPlayed, perfectScores
- Podium: top 3 with animated reveal (Framer Motion)
- Click row → opens modal with predictions (or navigates to /grupos/[id]/participante/[userId])
- Mobile: horizontal scroll if needed, sticky current user

---

### WU-6.7: Scoring integration + happy path E2E

**Type**: test  
**Files**: `tests/integration/scoring-integration.test.ts`, `tests/integration/leaderboard.test.ts`, `tests/e2e/happy-path.spec.ts`

**Work**:
- Integration scoring: enter result for a match, assert predictions updated correctly
- Integration leaderboard: 3 users with different scores, assert correct order
- E2E happy path: full flow register → create group → join → predict → admin enters result → leaderboard updates

**Acceptance**: All tests pass

---

## PR7: Polish (feat/mvp-7-polish)

**Goal**: Landing CTAs, dashboard, mobile refinements, error states.
**Est. lines**: ~400. **Work units**: 5. **Depends on**: PR6.

### WU-7.1: Landing page CTAs

**Type**: feat(ui)  
**Files**: `src/app/page.tsx`, `src/components/landing/Hero.tsx`, `src/components/landing/HowItWorks.tsx`

**Work**:
- Hero: "Acabalo Profe" title, "La polla futbolera de tu grupo" subtitle, two CTAs
- "Crear mi polla" → if not authed → /login?redirect=/grupos/nuevo; if authed → /grupos/nuevo
- "Tengo código de invitación" → /unirse (with input field for code)
- "Cómo funciona" section: 4 steps with icons

---

### WU-7.2: Dashboard

**Type**: feat(ui)  
**Files**: `src/app/(app)/dashboard/page.tsx`, `src/components/dashboard/GroupCard.tsx`, `src/components/dashboard/NextMatchWidget.tsx`

**Work**:
- List of user's groups with position and next match countdown
- Quick action: "Hacer mis pronósticos del día" → goes to /grupos/[id]/partidos for the group with the next match
- Empty state: "No estás en ningún grupo. ¡Creá uno o unite con un código!"

---

### WU-7.3: Read-only profile

**Type**: feat(ui)  
**Files**: `src/app/(app)/perfil/page.tsx`

**Work**:
- Display user info (no editing in MVP)
- Show group history (groups joined, total points, best position)
- "Cerrar sesión" button

---

### WU-7.4: Error states + loading

**Type**: feat(ui)  
**Files**: Various components, error boundaries, loading states

**Work**:
- Loading skeletons for group page, matches page, dashboard
- Error boundary in app layout
- Empty states for: no groups, no matches, no participants
- Toast system (Sonner or similar) for action feedback

---

### WU-7.5: Mobile responsiveness audit

**Type**: chore(test)  
**Files**: `tests/e2e/mobile.spec.ts`

**Work**:
- E2E test that navigates all key pages at 390px viewport
- Asserts no horizontal scroll, all buttons reachable, all forms usable
- Takes screenshots for review (Playwright trace)

**Acceptance**: All pages pass at 390px

---

## Summary

| PR | WU count | Est. lines | Test files | Risk |
|----|----------|------------|------------|------|
| PR1 | 8 | ~400 | 5 | Low |
| PR2 | 7 | ~600 | 5 | Medium (auth) |
| PR3 | 5 | ~500 | 0 | Low (DB only) |
| PR4 | 8 | ~700 | 4 | Medium (RLS interaction) |
| PR5 | 6 | ~500 | 3 | High (CRITICAL RLS) |
| PR6 | 7 | ~600 | 3 | Medium (scoring) |
| PR7 | 5 | ~400 | 2 | Low (polish) |
| **Total** | **46** | **~3700** | **22** | — |

---

## Execution order recommendation

Strictly sequential. Each PR depends on the previous. The orchestrator will execute them via `sdd-apply` with work-unit commits.

**Review workload guard**: This change is well over 400 lines if shipped as one PR. We are splitting into chained PRs as the user agreed in the proposal. No `size:exception` needed.
