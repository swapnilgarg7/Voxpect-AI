# Voxpect AI

An AI-powered outbound SDR (Sales Development Representative) platform that autonomously places phone calls, transcribes conversations, and qualifies leads using GPT-4 — built for construction materials suppliers.

## What it does

The platform closes the loop between outbound calling and CRM intelligence:

1. **Outbound calls** — Enqueue a lead's phone number and the system dispatches an AI voice agent (VAPI) to make the call
2. **Webhook ingestion** — When the call ends, VAPI fires an `end-of-call-report` webhook that is verified, parsed, and persisted
3. **AI qualification** — GPT-4.1-mini analyzes the transcript for construction-specific buying signals: active projects, decision-maker status, quote requests, purchase timeline, current supplier, and more
4. **Lead scoring** — A deterministic scoring model (0–100) classifies leads as Hot / Warm / Cold and recommends the next action (Send Quote, Schedule Sales Call, Add To Nurture Campaign)
5. **Dashboard** — Real-time analytics with KPI cards, call volume charts, lead temperature distribution, conversion funnel, and per-lead drill-down; responsive layout with sidebar hidden on mobile and loading skeleton states throughout
6. **Bulk upload** — Import up to 500 leads at once from a CSV or Excel file; each imported lead is automatically queued for an outbound call

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 6 |
| Voice AI | VAPI |
| LLM | OpenAI GPT-4.1-mini |
| Auth | Auth.js v5 (Credentials provider, bcrypt, JWT sessions) |
| UI | Tailwind CSS v4, Recharts, Lucide |
| Validation | Zod v4 |
| Excel parsing | SheetJS (xlsx) |

---

## Architecture

```
Lead created
     │
     ▼
CallQueue (DB) ──► callQueueWorker ──► VAPI REST API
                                              │
                                        outbound call
                                              │
                                    end-of-call-report
                                              │
                                    POST /api/vapi/webhook
                                              │
                              ┌───────────────┴──────────────┐
                              │                              │
                         persists Call                 after() hook
                         & Lead record            runLeadQualification()
                                                          │
                                                  GPT-4.1-mini
                                                          │
                                                  LeadAnalysis record
                                                  Lead.latestScore updated
```

### Key design decisions

- **`next/server` `after()`** — AI qualification runs after the webhook 200 response is sent, so VAPI never times out waiting for GPT
- **Token authentication** — VAPI webhooks are verified via a `?token=` query param (VAPI doesn't sign payloads); the secret is a 32-byte hex string in env
- **Idempotency** — Webhook handler checks for an existing `Call` by `vapiCallId` before writing; `runLeadQualification` checks for an existing `LeadAnalysis` by `callId` before calling OpenAI
- **Supabase dual-URL pattern** — `DATABASE_URL` uses the transaction pooler (port 6543) for serverless runtime; `DIRECT_URL` uses the direct connection (port 5432) for `prisma migrate`
- **Construction-specific scoring** — The lead score is computed deterministically from signals extracted by the LLM: decision-maker (+15), active projects (+25), purchase timeline ≤60 days (+25), open to alternatives (+10), requested quote (+15), follow-up requested (+10)
- **Allowlist auth** — Dashboard access requires a row in `authorized_users`; `bcryptjs` hashes passwords at cost 12; Auth.js JWT sessions avoid a DB hit per request in the serverless runtime

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Auth.js route handler
│   │   ├── vapi/webhook/        # Inbound VAPI webhook
│   │   └── dashboard/           # REST endpoints for dashboard UI
│   ├── sign-in/                 # Login page
│   └── dashboard/               # Next.js pages (overview, leads, lead detail)
│       ├── loading.tsx           # Skeleton for dashboard overview
│       └── leads/
│           ├── loading.tsx       # Skeleton for leads list
│           └── [id]/loading.tsx  # Skeleton for lead detail
├── auth.ts                      # Auth.js config (Credentials provider, bcrypt verify)
├── middleware.ts                 # Protects all routes; redirects unauthenticated users to /sign-in
├── components/
│   ├── dashboard/               # KPI cards, charts, leads table, bulk-upload modal, audio player
│   │   └── shell.tsx            # DashboardShell — sidebar + main content layout wrapper
│   ├── providers.tsx            # SessionProvider wrapper for Auth.js client hooks
│   └── ui/                      # Headless primitives (button, badge, card…)
└── lib/
    ├── ai/leadQualification.ts  # GPT prompt, scoring, temperature logic
    ├── db/                      # Prisma query helpers
    ├── services/
    │   ├── vapi.service.ts      # Webhook parsing & persistence
    │   ├── vapiCalling.service.ts # Outbound call creation via VAPI REST
    │   ├── leadAnalysis.service.ts # Orchestrates AI qualification
    │   └── callQueueWorker.ts   # DB-backed call queue processor
    └── dashboard/queries.ts     # Aggregation queries for dashboard metrics
prisma/
├── schema.prisma                # Lead, Call, LeadAnalysis, CallQueue, AuthorizedUser models
└── seed.ts                      # Sample data for local development
scripts/
└── add-user.ts                  # CLI to create/update authorized dashboard users
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project (PostgreSQL)
- A VAPI account with an assistant and provisioned phone number
- An OpenAI API key
- `AUTH_SECRET` — a random secret for signing JWT sessions (`openssl rand -hex 32`)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

```env
# Supabase — transaction pooler (runtime)
DATABASE_URL="postgresql://postgres.YOUR_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase — direct connection (migrations only)
DIRECT_URL="postgresql://postgres.YOUR_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

# VAPI
VAPI_WEBHOOK_SECRET="<openssl rand -hex 32>"
VAPI_API_KEY="..."
VAPI_ASSISTANT_ID="..."
VAPI_PHONE_NUMBER_ID="..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Auth.js — JWT signing secret
AUTH_SECRET="<openssl rand -hex 32>"
```

### 3. Run migrations

```bash
npx prisma migrate deploy
```

### 4. Add the first authorized user

The dashboard is protected by a login page. Access is restricted to rows in the `authorized_users` table — there is no self-registration. Add at least one user before trying to open the app:

```bash
npx tsx scripts/add-user.ts alice@example.com s3cur3pass "Alice Smith"
```

See [Managing authorized users](#managing-authorized-users) for the full reference.

### 5. (Optional) Seed sample data

```bash
npx prisma db seed
```

Populates the database with sample leads, calls, and analyses for local development.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated requests redirect to `/sign-in` automatically.

### 7. Configure the VAPI webhook

In the VAPI dashboard, set the webhook URL for your assistant to:

```
https://your-domain.com/api/vapi/webhook?token=YOUR_VAPI_WEBHOOK_SECRET
```

---

## Leads table

The leads table shows all captured lead data and is searchable by name, company, or phone number:

| Column | Description |
|---|---|
| Contact | Lead name (falls back to phone number if name is unavailable) |
| Company | Company name if provided |
| Industry | Industry if provided |
| Score | AI lead score 0–100, color-coded by temperature |
| Intent | High / Medium / Low intent extracted by GPT |
| Status | Hot / Warm / Cold temperature classification |
| Follow Up | Whether the AI flagged a required follow-up |
| Last Activity | Date of most recent call analysis |

### Bulk upload

Click **Bulk Upload** on the Leads page to import a CSV or Excel file. Flexible headers are accepted (`phone`, `mobile`, `tel`, `company`, `organization`, etc.). The file is parsed client-side and a preview is shown before submitting. Each valid row is created as a lead and immediately queued for an outbound call. Duplicate phone numbers are skipped without aborting the rest of the import.

**Required columns:** `name`, `phoneNumber` (E.164 format, e.g. `+14155552671`)  
**Optional columns:** `company`, `industry`  
**Limit:** 500 rows per upload

---

## Managing authorized users

Access is controlled by an allowlist table (`authorized_users`). There is no self-registration or invite flow — users must be added by someone with database access.

### Add a user

```bash
npx tsx scripts/add-user.ts <email> <password> [name]
```

```bash
# Examples
npx tsx scripts/add-user.ts alice@example.com s3cur3pass "Alice Smith"
npx tsx scripts/add-user.ts bob@acme.com hunter2
```

Running the command again with the same email **updates** the password and name (upsert) — safe to re-run.

### Change a user's password

Re-run the add command with the new password:

```bash
npx tsx scripts/add-user.ts alice@example.com newpassword "Alice Smith"
```

### Remove a user

Use Prisma Studio or run a raw query:

```bash
# Via Prisma Studio (GUI)
npx prisma studio
# Navigate to AuthorizedUser table → delete the row

# Via psql / Supabase SQL editor
DELETE FROM authorized_users WHERE email = 'alice@example.com';
```

### List current users

```bash
npx prisma studio
# Or via SQL:
# SELECT id, email, name, created_at FROM authorized_users;
```

---

## Authentication

All routes except `/api/auth/*` and `/api/vapi/webhook` are protected by `src/middleware.ts`. Unauthenticated requests are redirected to `/sign-in`. After a successful login, a JWT session cookie is issued (Auth.js v5, `strategy: "jwt"`).

**Design decisions:**

- **No database sessions** — JWT sessions avoid an extra DB round-trip on every request in a serverless environment
- **Allowlist model** — only rows in `authorized_users` can log in; no public registration
- **VAPI webhook bypass** — the middleware explicitly skips `/api/vapi/*` so the webhook can be called without a session cookie
- **`AUTH_SECRET`** — must be set in production; Auth.js uses it to sign and verify session JWTs

---

## Lead scoring reference

| Signal | Points |
|---|---|
| Decision maker | +15 |
| Active projects | +25 |
| Purchase timeline ≤ 60 days | +25 |
| Open to alternatives | +10 |
| Requested quote | +15 |
| Follow-up requested | +10 |
| **Max score** | **100** |

**Temperature thresholds:**
- Hot: score ≥ 70, _or_ active projects + timeline ≤ 60d + requested quote (override)
- Warm: score 40–69
- Cold: score < 40

**Next actions:** Hot + quote requested → Send Quote · Hot → Schedule Sales Call · Warm → Schedule Sales Call · Cold → Add To Nurture Campaign

---

## API reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/vapi/webhook?token=...` | Receives VAPI `end-of-call-report` events |
| `GET` | `/api/dashboard/metrics` | KPI and chart data for the dashboard |
| `GET` | `/api/dashboard/leads` | Paginated lead list with filters |
| `GET` | `/api/dashboard/leads/[id]` | Single lead with full call + analysis history |
| `POST` | `/api/dashboard/leads/[id]/retry` | Re-enqueue a lead for an outbound call |
| `POST` | `/api/dashboard/leads/bulk` | Bulk-create up to 500 leads and queue calls for each |
