# Municipal Zoning Information System

A full-stack zoning management web application for LGU (Local Government Unit) Planning Divisions. Manages land use zoning records, GIS mapping, KoboToolbox integration, approval workflows, audit trails, and notifications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/zoning-app run dev` — run the frontend (port 19033)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite 7, Tailwind CSS v4, shadcn/ui, wouter, TanStack Query, recharts, Leaflet + react-leaflet, next-themes
- API: Express 5, OpenAPI spec → Orval codegen
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM table schemas (users, zoning_records, zoning_boundaries, kobo_submissions, approvals, audit_logs, notifications)
- `artifacts/api-server/src/routes/` — Express route handlers (dashboard, users, zoning, boundaries, kobo, approvals, audit, notifications)
- `artifacts/zoning-app/src/pages/` — React page components (dashboard, zoning-records, map, kobo, approvals, users, audit-logs, notifications, settings, login)
- `artifacts/zoning-app/src/components/layout.tsx` — Sidebar + header layout

## Architecture decisions

- Contract-first OpenAPI: spec lives in `lib/api-spec`, codegen produces hooks and Zod schemas used by both client and server.
- All routes mounted under `/api` in Express, proxied through the shared Replit reverse proxy at path `/api`.
- GIS mapping uses Leaflet with dynamic import (avoids SSR issues) and CDN marker images.
- Zone type colors: residential=#3B82F6, commercial=#F59E0B, industrial=#6B7280, agricultural=#10B981, institutional=#8B5CF6, protected_area=#06B6D4, mixed_use=#92400E.
- Drizzle ORM with PostgreSQL; `pnpm --filter @workspace/db run push` for schema changes.

## Product

- **Dashboard** — KPI cards (total, approved, pending, rejected records), zone distribution bar chart, KoboToolbox sync stats, recent audit activity feed.
- **Zoning Records** — Searchable/filterable table with create, view, delete. Color-coded zone type chips and status badges.
- **Record Detail** — Full record view with GPS link, approval history, change history.
- **GIS Map** — Leaflet map with all records plotted as color-coded markers (zone = fill, status = border). Zone-type and status filters. Legend panel.
- **Approvals** — Tabbed workflow (Pending / Under Review / Approved / Rejected / All). One-click approve/review/reject with optional comment dialog.
- **KoboToolbox** — Configuration (API URL, token, form ID, interval), manual sync trigger, sync log history, submissions table.
- **Users** — User management with role-color badges (Administrator, Planning Officer, Validator, Encoder, Viewer), active toggle, create/delete.
- **Audit Logs** — Full audit trail with action color chips, entity filter, pagination.
- **Notifications** — Notification feed with type icons, unread indicators, mark-read per-item or all.
- **Settings** — Theme switcher (Light/Dark/System), KoboToolbox integration shortcut, app info.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Leaflet must be imported dynamically (`await import('leaflet')`) and marker icons patched via CDN URLs; static import breaks due to missing webpack loader for CSS assets in Vite.
- `pnpm --filter @workspace/db run push` must be run after schema changes before the API server will work.
- All API mutations using generated Orval hooks pass `{ data: {...} }` (not the body object directly).
- Never use `console.log` in server code — use `req.log` in route handlers and the singleton `logger` elsewhere.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
