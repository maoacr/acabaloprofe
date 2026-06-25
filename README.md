# Acabalo Profe

Plataforma de predicciones futboleras — entretenimiento sin dinero real.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime-ready, Edge Functions, RLS)
- **UI**: shadcn-style components + lucide icons + Framer Motion
- **Forms**: React Hook Form + Zod
- **Fechas**: date-fns + date-fns-tz
- **Testing**: Vitest + React Testing Library + Playwright

## Funcionalidades (MVP)

- ✅ Registro / login / logout / recuperación de contraseña
- ✅ Torneos con fases (group_stage, knockout) y equipos
- ✅ Grupos (pollas) con código de invitación corto
- ✅ Sistema de pronósticos con auto-save (800ms debounce) y lock window
- ✅ Scoring: ×1 group stage, ×2 knockout
- ✅ Tabla de posiciones con podium top 3
- ✅ Admin puede ingresar resultados (system_admin role)
- ✅ RLS: predicciones de otros ocultas hasta que se bloqueen
- ✅ Mobile-first, PWA-ready metadata, dark mode por sistema
- ✅ Haptic feedback, auto-save, animaciones

## Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar Supabase
# - Crear proyecto en https://supabase.com
# - Copiar .env.example → .env.local y completar las keys
# - Generar access token en https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxx

# 3. Aplicar migrations
pnpm supabase link --project-ref <your-ref>   # opcional, db push detecta del .env.local
pnpm supabase db push

# 4. Correr
pnpm dev
# → http://localhost:3000
```

## Tests

```bash
pnpm test              # unit + integration
pnpm test:coverage     # con reporte de coverage
pnpm test:e2e          # Playwright (requiere pnpm exec playwright install)
pnpm typecheck         # tsc --noEmit
pnpm lint              # next lint
```

**Tests críticos (security gate):**

```bash
pnpm test --run tests/integration/prediction-rls.test.ts
```

Estos 4 tests validan la policy RLS de `predictions` contra la DB real.

## Estructura

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # /login /registro /recuperar
│   ├── (app)/              # /dashboard /grupos /perfil
│   ├── admin/              # /admin/resultados (system admin)
│   ├── api/cron/           # lock-predictions
│   ├── auth/               # callback + signout
│   └── unirse/             # /unirse/[code]
├── domain/                 # Pure TypeScript (no I/O)
│   ├── scoring.ts          # calculatePoints — single source of truth
│   ├── short-code.ts       # base32 generator
│   ├── lock.ts             # isMatchLocked helpers
│   └── types.ts            # 9 entity types
├── application/            # Use cases (Server Actions + queries)
│   ├── auth/               # register, login, logout, recover
│   ├── groups/             # create, join, leave, manage
│   ├── matches/            # get-group-matches, enter-result
│   ├── predictions/        # submit, get-my, get-group
│   ├── leaderboard/        # get-group-leaderboard
│   └── tournaments/
├── infrastructure/         # Supabase clients, env, time helpers
├── interface/              # React components, hooks
├── lib/                    # Shared utilities, constants, schemas
└── middleware.ts           # Protected route guard
```

## Arquitectura

- **Clean Architecture**: domain → application → infrastructure → interface
- **Server-first**: la mayoría de páginas son Server Components
- **RLS-first**: las validaciones críticas viven en SQL policies, no en código
- **Strict TDD**: cada WU tiene tests escritos antes de la implementación

## Decisiones locked

- **Scoring ×1/×2** según `is_knockout` en SQL (`recalculate_match_points`) y TS (`src/domain/scoring.ts`)
- **Lock window**: 10 minutos antes del partido, enforced por trigger BEFORE INSERT en la DB
- **Predictions visibility**: RLS policy gatea por `is_locked` + active group participant
- **Short codes**: 6 chars base32 sin caracteres confusos (0,O,1,I,L)
- **Group delete**: no permitido desde UI (soporte only)
- **Participants**: deactivate, no delete
- **Magic link / Turnstile / Resend**: diferidos a Fase 2

## Licencia

Privado. Todos los derechos reservados.
