# Spec Delta: acabalojuez-mvp

> Seven new capabilities added by this change. Each spec follows the
> Given/When/Then format and is independently testable.

---

## Capability 1: Authentication

**Owner**: Auth flow (registration, login, logout, password recovery)

### ADDED Requirements

#### REQ-AUTH-001: User Registration

The system MUST allow a new user to create an account with the following fields:

- `firstName` (string, required, 1-50 chars)
- `lastName` (string, required, 1-50 chars)
- `username` (string, required, 3-30 chars, unique, lowercase alphanumeric + underscore, no spaces)
- `password` (string, required, min 8 chars, must contain at least one letter and one number)
- `confirmPassword` (string, required, must match `password`)
- `email` (string, required, valid email format, unique)
- `country` (string, required, must be in the supported list of 22 countries)
- `city` (string, required, 1-100 chars)
- `timezone` (string, required, must be a valid IANA timezone in GMT-12 to GMT+12)
- `acceptTerms` (boolean, required, must be `true`)

**Scenarios:**

- **GIVEN** a visitor on the registration page who has not yet submitted the form
  **WHEN** they fill in all required fields with valid values and submit
  **THEN** the system creates a new user in `auth.users` and a corresponding row in `public.users` with `is_system_admin = false`, the user is automatically logged in, and is redirected to `/dashboard`.

- **GIVEN** a visitor submitting the registration form
  **WHEN** `password` and `confirmPassword` do not match
  **THEN** the system shows a field-level error on `confirmPassword` ("Las contraseñas no coinciden") and does NOT create the user.

- **GIVEN** a visitor submitting the registration form
  **WHEN** `username` is already taken
  **THEN** the system shows a field-level error on `username` ("Este nombre de usuario ya está en uso") and does NOT create the user.

- **GIVEN** a visitor submitting the registration form
  **WHEN** `email` is already registered
  **THEN** the system shows a field-level error on `email` ("Este email ya está registrado") and does NOT create the user.

- **GIVEN** a visitor submitting the registration form
  **WHEN** `acceptTerms` is `false`
  **THEN** the system shows an error ("Debes aceptar los términos y condiciones") and does NOT create the user.

- **GIVEN** a visitor submitting the registration form
  **WHEN** `password` is less than 8 characters
  **THEN** the system shows a field-level error ("La contraseña debe tener al menos 8 caracteres").

- **GIVEN** a visitor submitting the registration form
  **WHEN** `password` does not contain a letter or a number
  **THEN** the system shows a field-level error ("La contraseña debe tener al menos una letra y un número").

- **GIVEN** a visitor submitting the registration form
  **WHEN** `country` is not in the supported list
  **THEN** the system rejects the submission with a validation error.

- **GIVEN** a visitor submitting the registration form
  **WHEN** the registration succeeds
  **THEN** a `public.users` row is created with the provided data, the session is established via httpOnly cookies, and the user lands on `/dashboard` within 2 seconds.

#### REQ-AUTH-002: User Login

The system MUST allow a registered user to log in with either their `username` or `email` plus their `password`.

**Scenarios:**

- **GIVEN** a registered user on the login page
  **WHEN** they enter a valid `username` (or `email`) and the correct `password` and submit
  **THEN** the system creates a session via httpOnly cookies and redirects to `/dashboard`.

- **GIVEN** a visitor on the login page
  **WHEN** they enter a non-existent username/email
  **THEN** the system shows a generic error ("Credenciales inválidas") without revealing whether the account exists.

- **GIVEN** a visitor on the login page
  **WHEN** they enter a valid username/email but incorrect password
  **THEN** the system shows the same generic error ("Credenciales inválidas") to prevent enumeration.

- **GIVEN** a user with an expired session
  **WHEN** they visit any protected route
  **THEN** the middleware redirects them to `/login?redirect=<original_path>`.

#### REQ-AUTH-003: Password Recovery

The system MUST allow a user who forgot their password to request a recovery link sent to their email.

**Scenarios:**

- **GIVEN** a visitor on the recovery page
  **WHEN** they enter their registered email and submit
  **THEN** the system always shows the same confirmation message ("Si el email existe, te enviamos un enlace de recuperación") within 1 second, regardless of whether the email is registered (prevents enumeration).

- **GIVEN** a user who has just clicked a password recovery link from their email
  **WHEN** the link is valid and the token has not expired (1-hour window)
  **THEN** the system shows a "set new password" form.

- **GIVEN** a user on the "set new password" form
  **WHEN** they enter a new password meeting the same complexity rules as registration and submit
  **THEN** the system updates the password in `auth.users`, invalidates the recovery token, and shows a success message with a link to `/login`.

- **GIVEN** a user who clicked a recovery link
  **WHEN** the token is expired (more than 1 hour old)
  **THEN** the system shows an error ("El enlace de recuperación ha expirado. Solicita uno nuevo.") with a link back to the recovery page.

#### REQ-AUTH-004: Logout

- **GIVEN** an authenticated user clicks the "Cerrar sesión" button
  **WHEN** they confirm
  **THEN** the system destroys the session (clears httpOnly cookies) and redirects to `/login`.

#### REQ-AUTH-005: Session Persistence

- The session MUST be stored in httpOnly cookies (NOT localStorage).
- Access tokens MUST be short-lived (Supabase default: 1 hour).
- Refresh tokens MUST rotate on use.
- The session MUST survive page reloads.
- **GIVEN** an authenticated user with a valid session
  **WHEN** they close and reopen the browser
  **THEN** they remain logged in.

#### REQ-AUTH-006: Middleware-Protected Routes

The following routes MUST require an active session and redirect to `/login` otherwise:

- `/dashboard`
- `/grupos/*` (all sub-routes)
- Any nested `(app)` route

Public routes (no auth required):
- `/`
- `/login`
- `/registro`
- `/recuperar`
- `/unirse/[code]` (joining page can be public, but the "Unirme" action requires auth)
- `/auth/callback`

---

## Capability 2: Tournament Catalog (read-only)

**Owner**: Tournament data display for users

### ADDED Requirements

#### REQ-TOUR-001: List Active Tournaments

- **GIVEN** any visitor
  **WHEN** they visit `/` (landing) or `/dashboard`
  **THEN** the system shows all tournaments with `status = 'active'` or `status = 'upcoming'`, sorted by `start_date` ASC.

- **GIVEN** an authenticated user on the landing page
  **WHEN** there is at least one active tournament
  **THEN** the landing page shows the tournament name, logo, start date, and a CTA "Crear polla" + "Tengo código de invitación".

#### REQ-TOUR-002: Tournament Detail View

- **GIVEN** an authenticated user on a group page (`/grupos/[id]`)
  **WHEN** the group belongs to a tournament
  **THEN** the system shows the tournament name, phases, and the next 5 upcoming matches within the group's `startingPhase` window.

- **GIVEN** an authenticated user
  **WHEN** they view a tournament's phases
  **THEN** the phases are listed in `order_index` ASC order, with the type (`group_stage` or `knockout`) indicated visually.

#### REQ-TOUR-003: Teams and Groups

- **GIVEN** a user viewing a tournament's group stage
  **WHEN** they browse the group of teams
  **THEN** the system shows team `name`, `shortName` (3 letters), and `flag` (emoji or image URL).

- **GIVEN** a user
  **WHEN** they view a team's details
  **THEN** only public information is shown (name, flag, group_name). No admin-only data is exposed.

#### REQ-TOUR-004: Matches in a Tournament

- **GIVEN** an authenticated user viewing a group's matches
  **WHEN** they browse matches
  **THEN** matches are grouped by phase, sorted by `scheduled_at` ASC within each phase.

- **GIVEN** a match has not yet been locked
  **WHEN** the user views it
  **THEN** the match is shown with a green "Abierto" status badge, a countdown to `lock_at`, and a prediction form (if the user is a participant of the group).

- **GIVEN** a match is locked but not finished
  **WHEN** the user views it
  **THEN** the match is shown with a red "Cerrado" status badge, no prediction form, and only the user's own prediction (others' are hidden until the match finishes).

- **GIVEN** a match is finished
  **WHEN** the user views it
  **THEN** the match shows the final result, the user's own prediction, and (because of RLS now allowing it) all other participants' predictions.

---

## Capability 3: Match Results Entry (admin)

**Owner**: System admin entering match results

### ADDED Requirements

#### REQ-MATCH-001: Admin Authorization

- **GIVEN** a user with `is_system_admin = true` in `public.users`
  **WHEN** they visit `/admin/resultados` (or the admin result entry route)
  **THEN** they see a list of matches in the active tournament.

- **GIVEN** a user with `is_system_admin = false`
  **WHEN** they attempt to access the admin result entry route
  **THEN** the system returns 403 Forbidden and shows "No tenés permisos para esta acción".

- **GIVEN** any user (even non-admin)
  **WHEN** they attempt to call the `update_match_result` server action or RPC
  **THEN** the RLS policy on `matches` blocks the update (only service role or admin can write).

#### REQ-MATCH-002: Enter Result

- **GIVEN** a system admin on the result entry page
  **WHEN** they select a `scheduled` match and enter `home_goals` (0-20) and `away_goals` (0-20) and submit
  **THEN** the system:
  1. Updates the match: `status = 'finished'`, `home_goals`, `away_goals`.
  2. Triggers scoring for ALL groups the tournament belongs to (calls `recalculateGroupPoints(matchId)`).
  3. Updates the leaderboard for each affected group.

- **GIVEN** an admin attempting to enter a result
  **WHEN** `home_goals` or `away_goals` is outside 0-20
  **THEN** the system rejects the submission with a validation error.

- **GIVEN** an admin attempting to enter a result for a match with `status = 'cancelled'`
  **WHEN** they submit
  **THEN** the system rejects with "No se puede ingresar resultado a un partido cancelado".

- **GIVEN** a match's result is entered
  **WHEN** the result update succeeds
  **THEN** within 5 seconds, all group participants' `total_points` are updated and leaderboard positions are recalculated.

#### REQ-MATCH-003: Result Edits

- **GIVEN** a finished match with an existing result
  **WHEN** the system admin edits the `home_goals` or `away_goals`
  **THEN** the system re-runs scoring for all affected groups and recalculates leaderboards.

- **GIVEN** a finished match
  **WHEN** the admin sets `status = 'cancelled'`
  **THEN** all predictions for that match are marked as `total_points = 0` and the match does not count toward leaderboard totals (excluded from `matchesPlayed`).

#### REQ-MATCH-004: Result Visibility Rules (CRITICAL)

The result of a match is visible to users ONLY when:
- `status = 'finished'` OR `status = 'cancelled'`

For matches in `scheduled` or `live` status, the `home_goals` and `away_goals` columns MUST be hidden from non-admin API responses (RLS or server-side filtering).

- **GIVEN** a non-admin user
  **WHEN** they query matches with `status IN ('scheduled', 'live')`
  **THEN** the response does NOT include `home_goals` or `away_goals` (set to NULL or omitted).

- **GIVEN** a system admin
  **WHEN** they query any match
  **THEN** all fields are returned (admin can see live scores for entry purposes).

---
