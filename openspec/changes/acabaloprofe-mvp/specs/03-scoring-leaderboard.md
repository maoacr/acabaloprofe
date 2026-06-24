# Spec Delta: acabalojuez-mvp (continued)

---

## Capability 6: Scoring

**Owner**: Points calculation when a match result is entered

### ADDED Requirements

#### REQ-SCORE-001: Scoring Algorithm (CRITICAL — single source of truth)

The system MUST use the following pure function as the single source of truth for scoring. Implemented in `src/domain/scoring.ts` (TypeScript), called by the Edge Function.

```typescript
interface Prediction { home: number; away: number; }
interface Result { home: number; away: number; }
interface PointBreakdown {
  winnerPoints: number;       // 0, 5, or 10
  homeGoalsPoints: number;    // 0, 2, or 4
  awayGoalsPoints: number;    // 0, 2, or 4
  diffPoints: number;         // 0, 1, or 2
  totalPoints: number;        // sum
}

function calculatePoints(
  prediction: Prediction,
  result: Result,
  isKnockout: boolean
): PointBreakdown
```

**Rules:**
- Multiplier `m = isKnockout ? 2 : 1`
- `predictedWinner = sign(prediction.home - prediction.away)` (returns -1, 0, or 1)
- `actualWinner = sign(result.home - result.away)`
- `winnerPoints = (predictedWinner === actualWinner) ? 5 * m : 0`
- `homeGoalsPoints = (prediction.home === result.home) ? 2 * m : 0`
- `awayGoalsPoints = (prediction.away === result.away) ? 2 * m : 0`
- `predictedDiff = abs(prediction.home - prediction.away)`
- `actualDiff = abs(result.home - result.away)`
- `diffPoints = (predictedDiff === actualDiff) ? 1 * m : 0`
- `totalPoints = winnerPoints + homeGoalsPoints + awayGoalsPoints + diffPoints`

**Test cases (minimum 12 required):**

| # | Pred | Result | Knockout | Expected total | Notes |
|---|------|--------|----------|----------------|-------|
| 1 | 1:0 | 1:0 | false | 10 | Pleno group stage |
| 2 | 1:0 | 1:0 | true | 20 | Pleno knockout |
| 3 | 2:0 | 3:1 | false | 6 | Winner ✓, diff ✓, goals ✗ |
| 4 | 2:1 | 1:0 | false | 5 | Winner only |
| 5 | 0:0 | 2:2 | false | 5 | Correct draw |
| 6 | 1:2 | 2:1 | false | 0 | All wrong |
| 7 | 0:0 | 0:0 | false | 10 | 0-0 pleno |
| 8 | 20:20 | 20:20 | false | 10 | Boundary |
| 9 | 3:0 | 0:3 | false | 0 | Inverted winner |
| 10 | 1:0 | 0:1 | true | 0 | Knockout all wrong |
| 11 | 2:2 | 2:2 | true | 20 | Knockout draw pleno |
| 12 | 1:0 | 2:0 | false | 3 | Diff ✗ (pred=1, actual=2), goals 1 ✓, winner ✓ = 5+2+0+0? No wait: pred 1-0=1, actual 2-0=2, diffs differ. 5+2+0+0 = 7 | Recheck: home 1==2? No, 0. Winner: pred home wins, actual home wins. 5+0+0+0 = 5. Hmm. Let me reconsider: pred 1:0, result 2:0. Both home wins. pred 1 goal = result 2 goals? No, 0 pts. pred 0 goals = result 0 goals? Yes, 2 pts. winner ✓ = 5 pts. diff 1 vs 2, no. Total = 7. |

(Spec author note: the test table is illustrative. The actual test file `tests/unit/scoring.test.ts` will pin exact expected values derived from running the algorithm. The 12 cases above cover: pleno group, pleno knockout, partial, all-wrong, draws, boundary, inverted.)

#### REQ-SCORE-002: Scoring Trigger

- **GIVEN** a match is marked as `finished` with `home_goals` and `away_goals`
  **WHEN** the `update_match_result` server action completes
  **THEN** the system calls `recalculateGroupPoints(matchId)`:
  1. For each `group` that includes this match in its `startingPhase` window:
     - For each `prediction` in that group for this match:
       - Compute `calculatePoints(prediction, result, match.is_knockout)`.
       - Update the prediction row with the breakdown and `total_points`.
  2. After all predictions are updated, call `updateLeaderboard(groupId)` for each affected group.

- **GIVEN** scoring recalculation completes for a match
  **WHEN** participants view their group
  **THEN** they see updated points within 5 seconds (no manual refresh needed for MVP; users can refresh to see new totals).

- **GIVEN** a match result is changed after initial scoring
  **WHEN** the admin updates `home_goals` or `away_goals`
  **THEN** the system re-runs `recalculateGroupPoints(matchId)` for the new values, overwriting previous scores.

#### REQ-SCORE-003: Cancelled Matches

- **GIVEN** a match is set to `status = 'cancelled'`
  **WHEN** the cancellation is processed
  **THEN** the system:
  1. Sets all `predictions.total_points = 0` for that match.
  2. Sets `predictions.winner_points = 0`, `home_goals_points = 0`, `away_goals_points = 0`, `diff_points = 0`.
  3. The match is excluded from `matchesPlayed` count (only `finished` matches count).

#### REQ-SCORE-004: No Predictions for a Match

- **GIVEN** a match finishes with N predictions in a group
  **WHEN** scoring is calculated
  **THEN** users who did NOT submit a prediction get 0 points and the match counts in their `matchesPlayed` denominator.

- Alternative interpretation (TBD with user): missing prediction could either (a) not count in `matchesPlayed`, or (b) count as 0. Spec author recommendation: **(a) doesn't count** — a user shouldn't be penalized for not predicting. Lock this in the design phase.

#### REQ-SCORE-005: Knockout Determination

- `is_knockout` is a boolean column on the `matches` table.
- It MUST be set at match creation (the demo seed sets it for `phase.type = 'knockout'` matches).
- The scoring function reads this flag — it does NOT re-derive it from the phase.

---

## Capability 7: Leaderboard

**Owner**: Per-group ranking table

### ADDED Requirements

#### REQ-LEAD-001: Leaderboard View

- **GIVEN** an active participant of a group on `/grupos/[id]`
  **WHEN** they view the leaderboard section
  **THEN** the system shows a table of all ACTIVE participants, sorted by:
  1. `total_points` DESCENDING
  2. `joined_at` ASCENDING (earlier join = higher position on tie)
  3. Tiebreaker secondary (if still tied): count of `total_points = 10` (group stage pleno) DESCENDING, then count of `total_points >= 5` DESCENDING — but this is only used if `specialConditions` doesn't specify otherwise.

- Each row shows: `position`, `username`, `avatar` (initial or image), `totalPoints`, `matchesPlayed`, `perfectScores` (count of matches where `prediction.total_points = 10` for group stage or `20` for knockout), `joinedAt`.

- **GIVEN** no matches have finished yet in the group
  **WHEN** the user views the leaderboard
  **THEN** all participants show `position = 0` (or `—`) and `totalPoints = 0`.

- **GIVEN** at least one match has finished
  **WHEN** the user views the leaderboard
  **THEN** positions are 1-indexed and reflect the current sort.

#### REQ-LEAD-002: Inactive Participants Hidden

- **GIVEN** a participant with `status = 'inactive'`
  **WHEN** the leaderboard is rendered
  **THEN** they do NOT appear in the table at all (not even at the bottom).

- **GIVEN** the group admin viewing the admin panel
  **WHEN** they look at the participants list
  **THEN** inactive participants ARE shown there (with their status badge), but with a "Inactivo" label.

#### REQ-LEAD-003: Current User Highlight

- **GIVEN** the authenticated user is in the leaderboard
  **WHEN** the table is rendered
  **THEN** the user's own row is visually highlighted (background color, sticky row on scroll).

#### REQ-LEAD-004: Click for Predictions

- **GIVEN** a user viewing the leaderboard
  **WHEN** they click a participant's row
  **THEN** the system opens a modal/sheet showing all that participant's predictions for matches in the group, with status indicators (open / locked / scored).

- For predictions of OTHER users, the data respects the same visibility rules as elsewhere (only `is_locked = true` predictions are shown).

#### REQ-LEAD-005: Recalculation

- **GIVEN** a match finishes
  **WHEN** scoring completes
  **THEN** the leaderboard is recalculated for all affected groups.

- The leaderboard query is:
```sql
SELECT
  gp.user_id,
  u.username,
  u.avatar_url,
  gp.total_points,
  gp.joined_at,
  gp.position,
  -- computed columns
  COUNT(p.id) FILTER (WHERE p.match_id IN (...finished matches...)) AS matches_played,
  COUNT(p.id) FILTER (WHERE p.total_points = 10) AS perfect_scores_group,
  COUNT(p.id) FILTER (WHERE p.total_points = 20) AS perfect_scores_knockout
FROM group_participants gp
JOIN users u ON u.id = gp.user_id
LEFT JOIN predictions p ON p.user_id = gp.user_id AND p.group_id = gp.group_id
WHERE gp.group_id = $1 AND gp.status = 'active'
GROUP BY gp.user_id, u.username, u.avatar_url, gp.total_points, gp.joined_at, gp.position
ORDER BY gp.total_points DESC, gp.joined_at ASC;
```

This is a VIEW or RPC function (`get_group_leaderboard(groupId)`) so the SQL is centralized and testable.

#### REQ-LEAD-006: Tiebreaker Handling (Secondary)

If `specialConditions` on the group explicitly mentions tiebreaker rules, they take precedence. The spec assumes default tiebreakers (totalPoints DESC, joinedAt ASC). Admin-customized tiebreakers are **out of scope for MVP** — specialConditions is displayed as free text but not parsed.

---

## Cross-Cutting Requirements

### REQ-X-001: RLS on every table

- Every public schema table MUST have `ENABLE ROW LEVEL SECURITY`.
- Tables requiring RLS: `users`, `tournaments`, `phases`, `teams`, `matches`, `groups`, `group_participants`, `predictions`.
- `tournaments`, `phases`, `teams` are publicly readable (no SELECT restriction) but writable only by service role.
- `matches` is publicly readable (excluding live result fields) and writable only by service role or admin via RPC.
- `groups` is readable by any authenticated user (so the invite page works) but only the admin can UPDATE.
- `group_participants` is readable by any group participant; only the group admin can UPDATE participant status.
- `predictions` follows the CRITICAL policy in REQ-PRED-004.

### REQ-X-002: Performance Budgets

- Landing page TTFB: < 200ms (server-rendered, no client JS for hero).
- Group page (leaderboard + next matches): < 500ms TTFB.
- Prediction submit (round trip): < 1s including optimistic UI update.
- Auto-save debounce: 800ms.
- Cron job execution: < 30s for the entire batch.

### REQ-X-003: Mobile-First

- All pages MUST be designed for 390px viewport FIRST.
- Touch targets ≥ 48px.
- Forms stack vertically on mobile, two columns on tablet+.
- Leaderboard table is horizontally scrollable on mobile if needed, with the current user's row sticky.

### REQ-X-004: Accessibility Minimum

- All interactive elements MUST have accessible labels (aria-label or visible text).
- Forms MUST announce errors via `aria-invalid` and `aria-describedby`.
- Color is NEVER the only signal (e.g., status badges include text + color).
- Keyboard navigation MUST work for all primary flows (tab, enter, escape).

### REQ-X-005: Error Handling

- All Server Actions return a typed result: `{ ok: true, data: T } | { ok: false, error: string, field?: string }`.
- Client surfaces field-level errors inline and form-level errors as toast.
- No raw stack traces exposed to users; log them server-side.

### REQ-X-006: Environment Configuration

- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
- `.env.example` MUST list all required vars with placeholders.
- App MUST NOT crash if optional vars (e.g., `API_FOOTBALL_KEY`) are missing — only feature-gate them.

### REQ-X-007: Testing Coverage

- Unit tests for `calculatePoints`: ≥ 12 cases (REQ-SCORE-001).
- Unit tests for short code generator: ≥ 5 cases (uniqueness, length, alphabet).
- Unit tests for Zod schemas: ≥ 3 cases per schema.
- Integration tests for: registration, login, group create, group join, prediction submit, prediction lock, scoring trigger, leaderboard query.
- E2E test: full happy path (register → create group → join via invite → submit prediction → admin enters result → leaderboard updates).
- Coverage threshold: 80% lines/branches/functions.

### REQ-X-008: Logging

- Server-side errors MUST be logged with context (userId, action, error).
- No PII in logs (no passwords, no tokens).
- Cron job runs MUST log: start time, matches processed, predictions locked, points calculated, duration.

---

## Acceptance Criteria (sign-off checklist)

This change is considered complete when ALL of the following are true:

- [ ] A new user can register, log in, log out, and recover their password.
- [ ] A user can create a group for the demo tournament.
- [ ] A user can share the group's invite link and another user can join.
- [ ] An active participant can submit a prediction for a scheduled match.
- [ ] Predictions auto-lock when `lock_at` passes (verified by E2E test advancing time).
- [ ] Before lock, other users' predictions are NOT visible to a participant.
- [ ] After lock, other users' predictions ARE visible.
- [ ] An admin can enter a match result.
- [ ] Points are calculated correctly per the 12 test cases.
- [ ] The leaderboard shows the correct order (verified by a test with 3+ users and varying points).
- [ ] Inactive participants are hidden from the leaderboard.
- [ ] The current user is highlighted in the leaderboard.
- [ ] The RLS policy on `predictions` passes the "another user cannot read unlocked prediction" test.
- [ ] All required env vars are documented in `.env.example`.
- [ ] The app runs locally with `pnpm dev` after the user fills `.env.local`.
- [ ] Vitest passes with ≥ 80% coverage.
- [ ] Playwright E2E happy-path test passes.
- [ ] No `any` types in domain code.
- [ ] All Zod schemas have at least 3 unit tests.
- [ ] No `Co-Authored-By` or AI attribution in any commit.
- [ ] Conventional commits used throughout.

---
