# Spec Delta: acabalojuez-mvp (continued)

---

## Capability 4: Group Management

**Owner**: Group creation, joining, participant admin

### ADDED Requirements

#### REQ-GROUP-001: Create Group

- **GIVEN** an authenticated user on `/grupos/nuevo`
  **WHEN** they fill in:
  - `name` (string, required, 3-60 chars)
  - `description` (string, optional, max 500 chars)
  - `specialConditions` (string, optional, max 1000 chars, shown to all participants)
  - `tournamentId` (string, required, must reference an active tournament)
  - `startingPhase` (enum: `ALL` | `FROM_ROUND_OF_16` | `FROM_SEMIFINALS` | `FINAL_ONLY`, required)
  - `maxParticipants` (integer, default 100, max 100, min 2)
  **AND** submit the form
  **THEN** the system:
  1. Creates a new row in `groups` with the provided data.
  2. Sets `admin_user_id = current user`.
  3. Generates a unique `short_code` (6 chars, base32, collision-retry up to 5 times).
  4. Creates a `group_participants` row for the admin with `status = 'active'`, `joined_at = NOW()`.
  5. Redirects to `/grupos/[id]`.

- **GIVEN** a user attempting to create a group
  **WHEN** the tournament has `status = 'finished'`
  **THEN** the system rejects with "No se pueden crear grupos para torneos finalizados".

#### REQ-GROUP-002: Short Code Generation

- **GIVEN** a new group being created
  **WHEN** the system generates the `short_code`
  **THEN** the code is 6 characters from the base32 alphabet (excluding visually confusing chars: 0/O, 1/I, L), uppercase.

- **GIVEN** a generated `short_code` that collides with an existing one
  **WHEN** the INSERT raises a `unique_violation`
  **THEN** the system retries up to 5 times with a new random code.

- **GIVEN** 5 consecutive collisions
  **WHEN** all retries are exhausted
  **THEN** the system falls back to appending a UUID-suffix to the last attempted code and logs the collision rate.

- The collision rate MUST be < 0.01% in steady state (with 6-char base32 = ~1 billion combinations).

#### REQ-GROUP-003: Join Group via Invite

- **GIVEN** a visitor (authenticated or not) on `/unirse/[code]`
  **WHEN** the page loads
  **THEN** the system shows:
  - Group name
  - Tournament name and logo
  - Starting phase description (e.g., "Desde octavos de final")
  - Number of active participants (e.g., "12 de 100 participantes")
  - Description and special conditions (if any)
  - CTA "Unirme al grupo" (or "Iniciar sesión para unirme" if not authenticated)

- **GIVEN** an authenticated user on `/unirse/[code]` for a group they are NOT in
  **WHEN** they click "Unirme al grupo"
  **THEN** the system:
  1. Checks the group has not reached `max_participants` (count of active participants).
  2. Checks the group is `active`.
  3. Creates a `group_participants` row with `status = 'active'`, `joined_at = NOW()`.
  4. Redirects to `/grupos/[id]`.

- **GIVEN** a non-authenticated user on `/unirse/[code]`
  **WHEN** they click "Iniciar sesión para unirme"
  **THEN** the system redirects to `/login?redirect=/unirse/[code]`, and after successful login, back to the invite page.

- **GIVEN** a user attempting to join a group
  **WHEN** the group has reached `max_participants` active members
  **THEN** the system shows "Este grupo está completo" and the join button is disabled.

- **GIVEN** a user who is already an active participant of the group
  **WHEN** they visit the invite page
  **THEN** the system shows "Ya sos parte de este grupo" with a link to the group page.

- **GIVEN** a user who was previously `inactive` in the group
  **WHEN** they click "Volver a unirme"
  **THEN** the system sets their `status` back to `active` (preserving their original `joined_at` for tiebreaker fairness).

#### REQ-GROUP-004: Leave Group (soft)

- **GIVEN** an active participant of a group (who is NOT the admin)
  **WHEN** they click "Salir del grupo" and confirm
  **THEN** the system sets their `group_participants.status = 'inactive'`. Their predictions are preserved but they no longer appear in the leaderboard.

- **GIVEN** the admin of a group
  **WHEN** they attempt to leave
  **THEN** the system blocks the action with "El administrador no puede salir del grupo. Transferí la administración primero." (Transfer admin functionality is out of scope for MVP; for MVP, admin can only be changed via support).

#### REQ-GROUP-005: Admin Participant Management

- **GIVEN** a group admin on `/grupos/[id]/admin`
  **WHEN** they view the participants list
  **THEN** the system shows all participants (active and inactive) with their username, joined date, total points, and current position.

- **GIVEN** a group admin
  **WHEN** they toggle a participant from `active` to `inactive`
  **THEN** the system updates the row, and the participant immediately disappears from the public leaderboard.

- **GIVEN** a group admin
  **WHEN** they toggle a participant from `inactive` to `active`
  **THEN** the system reactivates them. Their `joined_at` is preserved. Their `total_points` is unchanged (no recalculation needed).

- **GIVEN** any non-admin user
  **WHEN** they attempt to call `deactivate_participant` or `activate_participant` for a group they don't admin
  **THEN** the RLS policy on `group_participants` blocks the update (only the group's admin can change participant status).

#### REQ-GROUP-006: Invite Link Sharing

- **GIVEN** a group admin on the admin page
  **WHEN** they click "Copiar enlace de invitación"
  **THEN** the system copies the full URL (`{APP_URL}/unirse/{short_code}`) to the clipboard and shows a toast "Enlace copiado".

- Web Share API integration is **out of scope for MVP** (Fase 2).

#### REQ-GROUP-007: No UI Delete

- The system MUST NOT provide any UI to delete a group.
- No `DELETE` API endpoint exists for groups.
- **GIVEN** an admin attempts to find a "delete group" option
  **WHEN** they look in the admin panel
  **THEN** no such option exists. To delete a group, contact support (out of scope).

---

## Capability 5: Predictions

**Owner**: Submitting and locking match predictions

### ADDED Requirements

#### REQ-PRED-001: Submit Prediction

- **GIVEN** an active participant of a group viewing `/grupos/[id]/partidos`
  **WHEN** they select an unstarted match (status `scheduled`, current time < `lock_at`)
  **AND** enter `home_goals_predicted` (0-20) and `away_goals_predicted` (0-20)
  **AND** submit
  **THEN** the system:
  1. Validates the user is an active participant of the group.
  2. Validates the match is in the group's `startingPhase` window.
  3. Validates the match is not yet locked.
  4. Creates or updates the `predictions` row (UPSERT on `user_id, match_id, group_id`).
  5. Sets `is_locked = false`, `submitted_at`, `updated_at`.
  6. Returns success and shows a haptic feedback + toast "¡Pronóstico guardado!".

- **GIVEN** a user attempting to submit a prediction
  **WHEN** the match `status` is `live` or `finished` or `cancelled`
  **THEN** the system rejects with "Este partido ya no acepta pronósticos".

- **GIVEN** a user attempting to submit a prediction
  **WHEN** current time is past `lock_at` (but match is still `scheduled` because the lock job hasn't run yet)
  **THEN** the server-side check rejects with "El plazo de pronóstico cerró. Intentá en el próximo partido." The UI should also disable the form.

#### REQ-PRED-002: Update Existing Prediction

- **GIVEN** a user with an existing prediction for an unlocked match
  **WHEN** they submit new values
  **THEN** the system updates the existing row (UPSERT), updates `updated_at`, and preserves the original `submitted_at`.

- **GIVEN** a user with an existing prediction for a LOCKED match (`is_locked = true`)
  **WHEN** they attempt to update
  **THEN** the system rejects with "El pronóstico está bloqueado. No se puede modificar." (This is enforced by RLS + a server-side check).

#### REQ-PRED-003: Auto-Lock Predictions (CRITICAL)

- **GIVEN** a match with `lock_at < NOW()` and `status = 'scheduled'`
  **WHEN** the scheduled cron job (Edge Function `lock-predictions`) runs
  **THEN** the system sets `is_locked = true` on ALL `predictions` rows for that match.

- The cron MUST run at least every 5 minutes during windows of active matches.
- **GIVEN** the cron job runs
  **WHEN** it processes a match that has just passed `lock_at`
  **THEN** the lock is applied within 5 minutes of `lock_at` (i.e., worst case: a user can submit a prediction up to 15 minutes before kickoff, since the lock window is 10 min + cron interval of up to 5 min).

- The `is_locked` column is the GATEKEEPER for the RLS policy on visibility of others' predictions. Once `is_locked = true`, the row is visible to all group participants (still subject to group membership checks).

- **Defense in depth**: even if the cron is delayed, the server-side `lock_at < NOW()` check on prediction submission provides a hard boundary.

#### REQ-PRED-004: Prediction Visibility (CRITICAL RLS)

The RLS policy on `predictions` is:

```sql
CREATE POLICY "predictions_select_policy"
ON predictions FOR SELECT
USING (
  is_locked = TRUE AND
  EXISTS (
    SELECT 1 FROM group_participants gp
    WHERE gp.group_id = predictions.group_id
      AND gp.user_id = auth.uid()
      AND gp.status = 'active'
  )
  OR user_id = auth.uid()
);
```

- **GIVEN** User A has submitted a prediction for Match M in Group G
  **AND** the prediction's `is_locked = false`
  **AND** User B is an active participant of Group G
  **WHEN** User B queries `predictions` for Match M in Group G
  **THEN** User B does NOT see User A's prediction.

- **GIVEN** the same scenario
  **WHEN** the cron job sets `is_locked = true`
  **AND** User B queries again
  **THEN** User B DOES see User A's prediction.

- **GIVEN** User A's own prediction (regardless of `is_locked`)
  **WHEN** User A queries their own predictions
  **THEN** they always see their own.

- **GIVEN** User C is NOT a participant of Group G
  **WHEN** they attempt to query predictions for Group G
  **THEN** they see zero rows (RLS blocks all).

- **GIVEN** any user (even admin)
  **WHEN** they attempt to UPDATE a prediction with `is_locked = true`
  **THEN** the RLS policy blocks it (no UPDATE policy for non-owners when locked).

#### REQ-PRED-005: Goal Range Validation

- `home_goals_predicted` MUST be an integer in [0, 20].
- `away_goals_predicted` MUST be an integer in [0, 20].
- Validation occurs:
  1. Client-side via Zod (instant feedback).
  2. Server-side via Zod in the Server Action.
  3. Database CHECK constraint as last line of defense.

- **GIVEN** a user enters a value outside [0, 20]
  **WHEN** they submit
  **THEN** the system rejects with "Los goles deben ser un número entre 0 y 20".

#### REQ-PRED-006: Auto-Save (UX)

- The prediction form MUST auto-save with a debounce of 800ms after the last change.
- **GIVEN** a user is editing their prediction
  **WHEN** they change a value and pause for 800ms
  **THEN** the system auto-submits the new value and shows a "Guardado" indicator (checkmark animation).

- Auto-save respects the lock state: if the form becomes locked while the user is editing, the in-flight save is rejected and a toast warns the user.

---
