# QueueLess Pulse

Smart bank queue management web app — customers reserve tokens, see live "Branch Pulse" (crowd levels), get Smart Slot suggestions, swap tokens with other customers, and walk in at the right moment thanks to a Leave-Now advisor. Bank staff get a live admin console with queue control and throughput stats.

## Stack

- **Monorepo**: pnpm workspace
- **Frontend**: React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind + framer-motion + recharts
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL + pino
- **API contract**: OpenAPI → orval → typed React hooks (`@workspace/api-client-react`) and Zod schemas (`@workspace/api-zod`)
- **Auth**: HMAC-signed cookie session (`SESSION_SECRET`), stored as `qless_sid`

## Artifacts

- `artifacts/queueless` — React web app (mounted at `/`)
- `artifacts/api-server` — Express API (mounted at `/api`)

## Routes

Customer: `/`, `/login`, `/register`, `/branches`, `/branches/:id`, `/book`, `/token/:bookingId`, `/swap`, `/profile`
Staff: `/admin`

## Demo accounts

- Customer: `demo@queueless.app` / `demo123`
- Staff:    `staff@queueless.app` / `staff123`

## Key backend files

- `lib/api-spec/openapi.yaml` — single source of truth for the API contract
- `lib/db/src/schema/index.ts` — Drizzle tables: users, branches, services, checklistItems, bookings, swapListings
- `artifacts/api-server/src/lib/auth.ts` — cookie session helpers + `requireUser` / `requireStaff` middleware
- `artifacts/api-server/src/lib/seed.ts` — seeds 3 users, 5 branches, 6 services, sample bookings on first boot
- `artifacts/api-server/src/lib/queue.ts` — branch pulse computation + smart-slot scoring
- `artifacts/api-server/src/routes/{session,branches,services,bookings,queue,swap,admin}.ts`

## Key frontend conventions

- All API hooks come from `@workspace/api-client-react`
- `QueryClient` is configured with `retry: false` and `refetchOnWindowFocus: false` to surface 401s immediately
- Live data uses `refetchInterval` (5s for token tracking, 3s for admin queue view)
- Color palette: deep teal primary in `artifacts/queueless/src/index.css`

## Common tasks

- After editing the OpenAPI spec: `pnpm --filter @workspace/api-spec run codegen`
- After editing the DB schema: `pnpm --filter @workspace/db run push`
