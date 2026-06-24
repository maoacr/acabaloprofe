# Acabalo Juez

Plataforma de predicciones futboleras — entretenimiento sin dinero real.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions, RLS)
- **Estado/UI**: TanStack Query, Framer Motion, React Hook Form + Zod
- **Fechas**: date-fns + date-fns-tz
- **Emails**: Resend
- **Resultados**: API-Football o football-data.org
- **PWA**: next-pwa + Web Push
- **Testing**: Vitest + React Testing Library + Playwright (próximamente)

## Desarrollo

```bash
pnpm install        # Instalar dependencias
pnpm dev            # Servidor de desarrollo en http://localhost:3000
pnpm typecheck      # Verificar tipos
pnpm lint           # Linter
pnpm test           # Tests unitarios
pnpm test:e2e       # Tests E2E
```

## Estructura

```
src/
├── app/              # Next.js App Router (rutas, layouts, páginas)
├── components/       # Componentes UI reutilizables
├── lib/              # Utilidades y helpers
└── ...
```

## Estado del proyecto

🚧 **Fase 0 — Bootstrap completo.** Estructura Next.js + Tailwind + TypeScript lista. Pendiente: SDD workflow (proposal → spec → design → tasks → apply) para implementar features.

## Licencia

Privado. Todos los derechos reservados.
