@AGENTS.md

# Agentic Voice Intelligence Platform — Codebase Guide

## What this project is

An AI-powered outbound SDR platform for construction materials suppliers. VAPI places AI voice calls, the webhook handler persists transcripts, and GPT-4.1-mini qualifies leads automatically. The Next.js dashboard surfaces KPIs, charts, and per-lead drill-downs.

## Stack

- **Next.js 16** (App Router, `src/` layout) — read `node_modules/next/dist/docs/` before writing any Next.js code
- **Prisma 6 + PostgreSQL (Supabase)**
- **OpenAI SDK** (gpt-4.1-mini for transcript analysis)
- **VAPI REST API** for outbound calls and inbound webhook
- **Tailwind CSS v4**, Recharts, Lucide React, Zod v4

## Important conventions

### Webhook flow
The VAPI webhook (`POST /api/vapi/webhook?token=...`) must respond fast. AI qualification is deferred via `next/server` `after()` — never call OpenAI in the request path.

### Idempotency
- `processVapiWebhook` in `vapi.service.ts` — upserts `Call` by `vapiCallId`; returns `created: false` if already processed
- `runLeadQualification` in `leadAnalysis.service.ts` — exits early if `LeadAnalysis` already exists for the `callId`

### Database connections
- `DATABASE_URL` → transaction pooler port 6543 (runtime, pgBouncer)
- `DIRECT_URL` → direct connection port 5432 (`prisma migrate` only)
- Never use `DIRECT_URL` in application code

### Lead scoring
`computeLeadScore` in `src/lib/ai/leadQualification.ts` is deterministic (no LLM). The LLM extracts signals; scoring runs in TypeScript. Do not add LLM calls to the scoring path.

### Environment variables
All required vars are documented in `.env.example`. `VAPI_WEBHOOK_SECRET` is a 32-byte hex token passed as `?token=` on the webhook URL (VAPI does not sign payloads).

## Key file map

| File | Purpose |
|---|---|
| `src/app/api/vapi/webhook/route.ts` | Thin webhook route — auth, parse, delegate, schedule AI |
| `src/lib/services/vapi.service.ts` | Webhook business logic, `Call` + `Lead` persistence |
| `src/lib/services/leadAnalysis.service.ts` | Orchestrates AI qualification, updates `Lead.latestScore` |
| `src/lib/ai/leadQualification.ts` | GPT prompt, schema, scoring model, temperature logic |
| `src/lib/services/vapiCalling.service.ts` | Outbound call creation + status via VAPI REST |
| `src/lib/services/callQueueWorker.ts` | DB-backed queue processor (PENDING → CALLING → CALLED/FAILED) |
| `src/lib/dashboard/queries.ts` | Prisma aggregation queries for all dashboard metrics |
| `prisma/schema.prisma` | Lead, Call, LeadAnalysis, CallQueue models |

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run lint         # eslint
npx prisma migrate deploy   # apply migrations (uses DIRECT_URL)
npx prisma generate         # regenerate client after schema changes
npx prisma studio           # GUI to inspect the DB
```

## What NOT to do

- Do not add `console.log` debug statements that log PII (transcripts, phone numbers) to production paths — the webhook already logs the full payload; remove that log once phone number extraction is confirmed
- Do not call `processPendingJobs` (callQueueWorker) on the hot path — it's designed for `after()` or a background job
- Do not use `Math.random()` or `Date.now()` inside workflow scripts (breaks resume)
