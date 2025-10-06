# AdPilot

AdPilot is a lightweight, developer-friendly analytics & recommendations tool for paid ads (Meta, Google Ads, TikTok, etc.). It centralizes campaign snapshots, computes actionable recommendations, and lets you review/apply them safely.

> Built with **Next.js (App Router)**, **Node/TypeScript**, **Prisma**, **PostgreSQL (Supabase)**, **Vercel**, and **shadcn/ui**.

---

## ✨ Key Features

- **Unified Campaign View** — consistent snapshot of campaigns across channels (status, budget, pacing, learning/limitations flags).
- **Recommendations Inbox** — prioritized suggestions (raise/lower budget, pause, redistribute, fix policy issues), idempotent apply.
- **Safe Apply** — backend endpoints to apply once, with audit trail.
- **Seed & Auto-Tick** — simulation utilities to generate new campaigns and time-based changes for demos/tests.
- **Clean UI** — shadcn/ui + Tailwind for fast iteration and consistent design.
- **Prod-ready Plumbing** — Prisma migrations, E2E tests, CI-friendly scripts.

---

## 🧱 Tech Stack

- **Frontend:** Next.js 15 (App Router), React, Tailwind, shadcn/ui
- **Backend:** Next.js API routes, Node.js, TypeScript
- **Data:** Prisma ORM, PostgreSQL (Supabase)
- **Infra:** Vercel (builds & deploy), Supabase (DB)
- **Testing:** Vitest, Playwright (optional), Testing Library
- **Lint/Format:** ESLint, Prettier

---

## 🚀 Getting Started

### 1) Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/yarn  
- PostgreSQL database (Supabase recommended)
- Git + a Vercel account (for deployment)

### 2) Environment Variables

Create `.env` in the project root:

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"

# Optional: Shadow DB for Prisma (if using)
SHADOW_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_shadow?schema=public"

# App
NEXTAUTH_SECRET="generate_a_secure_random_value"
NEXTAUTH_URL="http://localhost:3000"

# Any provider keys (optional placeholders)
GOOGLE_ADS_API_KEY=""
META_ACCESS_TOKEN=""
```

> **Tip:** For Supabase, use the **pooler** host for Prisma. Limit connection count in Prisma if you hit free tier limits.

### 3) Install & Prepare DB

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
# (or) pnpm prisma db push  # if you don’t want migrations in dev
```

Seed (optional, if repo provides seeds):

```bash
pnpm db:seed
```

### 4) Run Dev

```bash
pnpm dev
# http://localhost:3000
```

### 5) Test & Lint

```bash
pnpm test
pnpm lint
pnpm typecheck
```

---

## 📦 Project Structure (high-level)

```
src/
  app/
    page.tsx                 # Landing / Home
    dashboard/               # App pages (campaigns, recommendations, etc.)
    api/
      campaigns/route.ts     # Campaigns API
      recommendations/       # Recommendations API (apply, list)
  components/                # UI components (shadcn/ui wrappers, widgets)
  server/
    campaigns/               # Domain services
    recommendations/         # Domain services
    import/                  # Seed/tick utilities
  lib/                       # utils, types, auth, prisma client
prisma/
  schema.prisma
  migrations/
tests/
  e2e/                       # idempotent apply, API flows
  unit/                      # pure logic tests
```

---

## 🧠 Domain Concepts (short)

- **Campaign:** unit of budget + objective per channel; we store core identity, status, budget metadata, flags, and sync info.
- **Recommendation:** actionable suggestion tied to client/campaign/entity; applied **once** (idempotent), with status and audit fields.

Example minimal campaign fields:
- `id`, `externalId`, `channel`, `accountId`, `clientId`, `name`, `objective`
- `status`, `budgetType`, `budgetAmount`, `currency`
- Flags: `isLearning`, `isLimitedByBudget`, `hasPolicyIssues`, …
- Timestamps: `startAt`, `endAt`, `timezone`, `lastSyncAt`, `createdAt`, `updatedAt`

---

## 🔌 API (examples)

> All routes are Next.js App Router handlers.

### List Recommendations (by client)

```
GET /api/recommendations?clientId={uuid}
```

Response (shape example):
```json
[
  {
    "id": "rec_123",
    "status": "new|applied|skipped",
    "priority": 10,
    "campaignId": "cmp_1",
    "entityType": "campaign|adset|ad",
    "actionType": "increase_budget|pause|redistribute|...",
    "reason": { "title": "Limited by budget", "details": "..." },
    "payload": { "delta": 20, "unit": "percent" },
    "createdAt": "..."
  }
]
```

### Apply Recommendation (idempotent)

```
POST /api/recommendations/apply
Content-Type: application/json

{ "id": "rec_123" }
```

Server must apply **once** and return the updated recommendation.

### List Campaigns (slice)

```
GET /api/campaigns?clientId={uuid}&limit=20&offset=0&status=active
```

---

## 🛠️ Useful Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest --run",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:seed": "ts-node ./prisma/seed.ts"
}
```

---

## ☁️ Deploy (Vercel + Supabase)

1. **Connect repo** to Vercel.
2. Set the same **environment variables** in Vercel → Project Settings → Environment Variables.
3. **Migrations in production:**
   - Option A (recommended): Add a post-build step in Vercel or a CI job to run:
     ```bash
     npx prisma migrate deploy
     ```
   - Option B (manual): Run `prisma migrate deploy` from your machine (or CI) against the production DB.
4. Re-deploy.

> **Supabase tip:** Free tier has connection limits. Prefer fewer Node server instances, enable Prisma connection pooling, and reuse a single PrismaClient per process.

---

## 🧩 UI Notes

- **shadcn/ui** components live in `@/components/ui/*`.  
- If you add new primitives (Card, Tabs, Accordion, etc.), ensure they’re exported from a consistent barrel and follow the style system (Tailwind).

---

## 🧪 Testing Strategy

- **Unit:** pure functions (recommendation scoring, mapping).
- **E2E/API:** idempotent apply, “returns same state on second call”, basic unhappy paths (invalid id, wrong client).
- **Fixtures:** lightweight seed to create client → campaigns → recommendations for repeatable runs.

Run:

```bash
pnpm test
```

---

## 🩺 Troubleshooting

- **`P1001: Can't reach database server`**  
  Check DB host/port/firewall/SSL and that `DATABASE_URL` uses the **pooler** host (Supabase).
  
- **`prepared statement "s3" already exists` (Postgres 42P05)**  
  Happens when many long-lived connections reuse same statement names. Ensure:
  - Single PrismaClient per process.
  - Don’t hot-reload server code in a way that spawns extra clients.
  - Consider disabling prepared statements:  
    `DATABASE_URL=...&pgbouncer=true&connection_limit=1` and set `PRISMA_CLIENT_ENGINE_TYPE=dataproxy` (or use Prisma’s recommended pooling flags for Supabase/PgBouncer).
  
- **App Router hydration errors / “event handlers cannot be passed to Client Component props”**  
  Make interactive pieces **Client Components** (`"use client"` at top). Server Components must not receive event handlers.

- **Build: missing paths / module resolution**  
  Use absolute imports with `tsconfig.json` `paths` and consistent `@/` aliases. Avoid fragile `../../` chains.

---

## 🔐 Security & Privacy

- Do not store provider secrets in client code.
- Use server routes to call ad APIs, never from the browser.
- Log sensitive payloads only in development.

---

## 🤝 Contributing

1. Fork & create a feature branch.
2. Keep PRs small and focused.
3. Include tests for new behavior.
4. Update README and types if you change API contracts.

---

## 📄 License

MIT — see `LICENSE` for details.

---

## 🗺️ Roadmap (short)

- More channels (LinkedIn, Pinterest)
- Smart pacing & budget reallocation
- Policy/creative quality detectors
- Webhooks & background sync jobs
- Fine-grained RBAC & audit logs

---

## 🙌 Acknowledgements

- Next.js, Prisma, Supabase, Vercel, shadcn/ui communities  
- Everyone sharing best practices for safe, idempotent API design

---

**Questions?** Open an issue or start a discussion. Happy shipping! 🚀
