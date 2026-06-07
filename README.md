# POD Agent OS

An agent-run print-on-demand operating system built **around** Shopify, Etsy, and Printify
— not a replacement for them. Claude Code builder subagents develop the codebase; deployed
production agents (Claude Agent SDK + Inngest) run the business loop.

## Monorepo layout

```
apps/
  storefront   Public POD site — Next.js, headless Shopify checkout        (port 3000)
  dashboard    Private command center (Run Research, Generate, Publish, …)  (port 3001)
  api          Webhooks + Inngest workflows + dashboard trigger endpoint    (port 3002)
packages/
  tools        Typed API clients (Shopify, Printify, Etsy, Pinterest, GA4,
               DataForSEO) + pure logic (niche scoring, winner detection, design engine)
  agents       Production runtime agent definitions (Claude Agent SDK)
  db           Supabase schema (schema.sql) + typed client + domain types
.claude/
  agents       Claude Code builder subagents (develop the codebase)
  hooks        SessionStart hook (loads the agent-skills plugin on the web)
```

## Tech stack

pnpm workspaces · Turborepo · TypeScript (strict) · Next.js App Router · React 19 ·
Supabase · Inngest · Vercel · Claude Agent SDK.

## The business loop

```
daily research → niche scoring → slogan generation → design generation
→ HUMAN APPROVAL → Printify product build → Shopify + Etsy publish
→ Pinterest pins → analytics pull → winner detection → variant generation → repeat
```

## Core invariants (enforced across the codebase)

- **Human trademark/compliance gate** — no code path publishes to Shopify, Etsy, or
  Printify without `approval_status === 'approved'`.
- **No fabricated analytics** — metrics a provider's API doesn't expose are marked
  `is_estimated`, never invented.
- **Server-only secrets** — only public-scoped tokens (Shopify Storefront, Supabase anon)
  reach the client. Admin/service tokens stay server-side.

## Getting started

```bash
pnpm install
cp .env.example .env          # fill in your tokens (never commit .env)
pnpm typecheck                # type-check every package
pnpm test                     # run unit tests (scoring + winner logic)
pnpm dev                      # run all apps via Turborepo
```

Apply the database schema with `packages/db/schema.sql` (Supabase SQL editor or
`supabase db push`).

## Status

This is the **skeleton** (Milestone 2): the full structure compiles, with the pure
business logic (niche scoring, winner detection, design engine) implemented and tested.
External API clients and agent loops are typed stubs marked `not implemented` / `TODO`,
ready to be filled in next. Account creation, OAuth, and live tokens are manual one-time
setup — see `.env.example`.
