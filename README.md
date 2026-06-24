# Acabalo Profe

Plataforma de predicciones futboleras — entretenimiento sin dinero real.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions, RLS)
- **Estado/UI**: TanStack Query, Framer Motion, React Hook Form + Zod
- **Fechas**: date-fns + date-fns-tz
- **Emails**: Resend
- **Resultados**: API-Football o football-data.org
- **PWA**: next-pwa + Web Push
- **Testing**: Vitest + React Testing Library + Playwright

## Desarrollo

```bash
pnpm install        # Instalar dependencias
pnpm dev            # Servidor de desarrollo en http://localhost:3000
pnpm typecheck      # Verificar tipos
pnpm lint           # Linter
pnpm test           # Tests unitarios
pnpm test:e2e       # Tests E2E
```

## Setup local

1. Crear proyecto en [supabase.com](https://supabase.com) (free tier)
2. Copiar `.env.example` → `.env.local` y completar las 3 keys de Supabase
3. `pnpm install`
4. `pnpm supabase link --project-ref <tu-ref>`
5. `pnpm supabase db push` (aplica migrations + seed)
6. `pnpm dev`

⚠️ **Nunca** commitees `.env.local` ni pegues keys en chats o PRs.

## Estructura

```
src/
├── app/              # Next.js App Router (rutas, layouts, páginas)
├── domain/           # Lógica de negocio pura (scoring, types, lock)
├── application/      # Use cases y Server Actions
├── infrastructure/   # Clientes Supabase, env, helpers de tiempo
├── interface/        # Componentes React, hooks, providers
└── lib/              # Utilidades compartidas
```

## Estado del proyecto

🚧 **MVP en construcción.** PR1 (Foundation) completado: tooling + domain + scoring.
Ver `openspec/changes/acabaloprofe-mvp/` para el plan completo.

## Licencia

Privado. Todos los derechos reservados.
