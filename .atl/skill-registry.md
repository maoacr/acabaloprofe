# Skill Registry — acabaloprofe

> Auto-resolved compact rules for sub-agents working on this project.
> This file is the source of truth for project standards. Sub-agents receive
> matching rules via the orchestrator before any task-specific instructions.

## Project Standards

- **Stack**: Next.js 14 (App Router) + TypeScript strict + Tailwind CSS + Supabase
- **Architecture**: Clean Architecture (domain / application / infrastructure / interface layers)
- **Testing**: Strict TDD — vitest + React Testing Library + Playwright (NOT YET installed)
- **Code style**: Prettier (single quotes, semi, trailing commas all, 100 cols)
- **i18n**: Spanish (es-AR) for user-facing strings, English for code/identifiers
- **Path alias**: `@/*` → `./src/*`
- **Branch strategy**: feature branches, conventional commits (NO Co-Authored-By, NO AI attribution)
- **PR strategy**: chained when >400 lines changed, otherwise single PR
- **Atomic commits**: one logical change per commit (see work-unit-commits skill)

## Compact Rules (injected into sub-agents)

### TypeScript / TSX (`*.ts`, `*.tsx`)
- `strict: true` is non-negotiable
- Avoid `any`; use `unknown` + narrowing when type is uncertain
- Prefer `interface` for public/exported types, `type` for unions/intersections
- Use `@/` path alias for all internal imports
- Exports: named exports preferred, default only for Next.js pages/layouts
- Never commit with `--no-verify` unless user explicitly asks

### React Components (`src/components/**`, `src/app/**`)
- **Server Components by default**. Add `'use client'` ONLY when needed (forms, animations, browser APIs, hooks like useState)
- Props types: `export interface ComponentNameProps`
- Use `cn()` from `@/lib/utils` for class merging
- Touch targets ≥ 48px for mobile-first (CRITICAL for this PWA)
- Dark mode: use `dark:` Tailwind variants, never hardcode colors
- Animations: respect `prefers-reduced-motion` (already in globals.css)

### Database / Supabase (`supabase/migrations/**`, RLS)
- **All tables MUST have RLS enabled** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- **CRITICAL RLS policy**: `predictions` of others are HIDDEN until `is_locked = true`
  - Policy: `USING (is_locked = TRUE OR user_id = auth.uid())`
- Primary keys: `UUID` with `DEFAULT gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ` (never plain `TIMESTAMP`)
- Foreign keys: explicit `REFERENCES` with appropriate `ON DELETE` behavior
- Migrations: one per logical change, filename `YYYYMMDDHHMMSS_description.sql`

### Business Logic (scoring, predictions, matches)
- `calculatePoints(prediction, result, isKnockout)` is the SINGLE source of truth for scoring
- Knockout multiplier: ×2 (winner 10, goals 4, diff 2, max 20)
- Group stage multiplier: ×1 (winner 5, goals 2, diff 1, max 10)
- `lockAt = scheduledAt - INTERVAL '10 minutes'` (use generated column)
- Goal range: 0-20 (validate both in Zod schema and DB CHECK constraint)
- Tiebreaker for leaderboard: `joined_at` ASC (earlier join wins)

### Forms / Validation (`src/app/**/page.tsx`, server actions)
- Use React Hook Form + Zod resolver
- Zod schema is the source of truth — derive TypeScript type with `z.infer<typeof schema>`
- Show field-level errors inline, form-level errors as toast
- CAPTCHA: Cloudflare Turnstile (NOT reCAPTCHA — accessibility matters)

### Auth / Sessions
- Supabase Auth with email + password
- Session via `@supabase/ssr` with httpOnly cookies
- Access token short-lived, refresh token rotation
- Protected routes: middleware (`src/middleware.ts`) + server component checks

### PWA / Mobile
- All new pages: design at 390px FIRST, then scale up
- Use `safe-area-inset-*` for iOS notch/home indicator
- Haptic feedback: `navigator.vibrate()` on key actions (submit, lock)
- Web Share API for invitations, fallback to copy-to-clipboard

## User Skills (trigger table)

| Skill | Trigger context |
|-------|-----------------|
| `sdd-*` | Any SDD phase work (explore, propose, spec, design, tasks, apply, verify, archive) |
| `work-unit-commits` | Implementation tasks — split commits as reviewable units |
| `chained-pr` | When forecast exceeds 400 changed lines or `sdd-tasks` flags risk |
| `branch-pr` | Creating or opening pull requests |
| `comment-writer` | PR feedback, review comments, issue replies |
| `cognitive-doc-design` | Writing specs, RFCs, architecture docs, onboarding |
| `issue-creation` | Creating GitHub issues (bug reports, feature requests) |
| `judgment-day` | Cross-AI dual review (when explicitly requested) |
| `customize-opencode` | **NEVER** — this is not an opencode config project |
| `go-testing` | **NEVER** — not a Go project |

## Testing Capabilities

```yaml
strict_tdd: true
test_runner: vitest           # planned, not yet installed
e2e_runner: playwright        # planned, not yet installed
coverage_threshold: 80        # percent
install_in_phase: first-sdd-apply
```

**Strict TDD mandate**: when `strict_tdd: true`, sub-agents MUST write the failing
test BEFORE the implementation. No exceptions. See `strict-tdd.md` reference.

## Environment Variables (planned)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CAPTCHA
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Results API (choose one)
API_FOOTBALL_KEY=
# or FOOTBALL_DATA_API_KEY=

# Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## Conventions

- **Commits**: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)
- **Branch names**: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`
- **PR titles**: same as commit convention
- **No AI attribution**: never add `Co-Authored-By: ...` or similar trailers
- **No build before commit**: orchestrator runs `pnpm typecheck` and `pnpm lint` after work units

## References

- `.atl/skill-registry.md` (this file) — project standards
- `supabase/migrations/` — DB schema evolution
- `src/app/` — Next.js routes (UI layer)
- `src/lib/` — shared utilities
- `src/components/` — reusable UI components

---

*Last updated: 2026-06-24 by sdd-init*
