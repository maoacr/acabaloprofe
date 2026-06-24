# Tasks: acabalojuez-mvp

> Implementation plan. 7 chained PRs, ~50 work units total, stacked-to-main.

## Delivery strategy (locked)

- **Strategy**: `ask-on-risk` (default)
- **Chain strategy**: `stacked-to-main` (each PR merges directly to `main`, in order)
- **Forecast**: ~3500-4500 lines across ~50 files
- **Test budget**: 80% coverage, 100% on `src/domain/scoring.ts`

## Branch & PR plan

| PR | Branch | Title | Est. lines | Work units | Depends on |
|----|--------|-------|------------|------------|------------|
| PR1 | `chore/mvp-1-foundation` | Foundation: env, supabase clients, domain, vitest, types | ~400 | WU-1.1 to WU-1.8 | — |
| PR2 | `feat/mvp-2-auth` | Auth: register, login, recovery, middleware | ~600 | WU-2.1 to WU-2.7 | PR1 |
| PR3 | `feat/mvp-3-schema` | Schema, RLS, RPCs, demo seed | ~500 | WU-3.1 to WU-3.5 | PR1 |
| PR4 | `feat/mvp-4-groups` | Groups: create, invite, join, admin | ~700 | WU-4.1 to WU-4.8 | PR2, PR3 |
| PR5 | `feat/mvp-5-predictions` | Predictions: submit, lock cron, RLS tests | ~500 | WU-5.1 to WU-5.6 | PR3, PR4 |
| PR6 | `feat/mvp-6-scoring` | Scoring: result entry, calculate-points, leaderboard | ~600 | WU-6.1 to WU-6.7 | PR5 |
| PR7 | `feat/mvp-7-polish` | UI polish: landing CTAs, dashboard, mobile refinements | ~400 | WU-7.1 to WU-7.5 | PR6 |

## Dependency graph

```
PR1 (Foundation) ──┬──> PR2 (Auth) ──┐
                   │                  │
                   └──> PR3 (Schema) ─┴──> PR4 (Groups) ──> PR5 (Predictions) ──> PR6 (Scoring) ──> PR7 (Polish)
```

PR2 and PR3 can be developed in parallel after PR1. PR4 must wait for both. PR5/PR6/PR7 are strictly sequential.

## Work-unit naming

Each work unit is a single commit:

```
<type>(<scope>): <subject> [WU-X.Y]
```

Examples:
- `chore(deps): install vitest, RTL, playwright [WU-1.1]`
- `feat(domain): add scoring pure function [WU-1.5]`
- `feat(auth): registration server action [WU-2.3]`

Scope is the layer or feature area. The `[WU-X.Y]` tag links commits to the task list.

## Strict TDD order

For every code work unit, the order is:

1. **Write the failing test first** (if applicable)
2. Run the test, confirm it fails for the right reason
3. Write the minimum implementation
4. Run the test, confirm it passes
5. Refactor if needed
6. Commit as one work unit

Documentation-only work units (env.example, README updates) skip the test step.

## Conventions

- **No `Co-Authored-By`** trailers anywhere
- **Conventional commits** only
- **No `any`** in domain code (allowed in test fixtures with eslint-disable comment)
- **Path alias** `@/*` for all internal imports
- **Server Actions** for user mutations, **API Routes** for cron
- **Result type** `{ ok: true, data } | { ok: false, error, field? }` for all Server Action returns

## Testing strategy per PR

| PR | Unit tests | Integration tests | E2E tests | Total est. test files |
|----|------------|-------------------|-----------|----------------------|
| PR1 | env, scoring, short-code, lock, constants | — | — | 5 |
| PR2 | Zod schemas, password validation | auth flow (signup, login, recovery) | registration happy path | 5 |
| PR3 | (RLS policies are SQL, tested in PR5) | — | — | 0 |
| PR4 | Zod schemas, group helpers | group lifecycle (create, join, leave) | — | 4 |
| PR5 | Zod schemas | **prediction RLS (4 critical tests)**, lock flow | prediction submit + lock | 3 |
| PR6 | — | scoring integration, leaderboard query | full happy path | 3 |
| PR7 | — | — | mobile responsiveness | 2 |

## Risk check before each PR

Before opening each PR, run:

```bash
pnpm typecheck && pnpm lint && pnpm test --run
```

If `pnpm test` fails or coverage drops below 80%, fix before opening the PR. The orchestrator will run these checks after each `sdd-apply` batch.

## See also

- `tasks-detailed.md` — full work-unit breakdown with acceptance criteria per task
- `design.md` — architecture
- `specs/*.md` — requirements

## Next step

Execute `sdd-apply` PR1 (Foundation) → 8 work units. Each unit is a separate commit and will be reviewed as part of the PR.
