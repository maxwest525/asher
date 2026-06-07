# POD Agent OS — Builder Subagents

These are **Claude Code builder subagents** — specialized agents that build and maintain
the codebase. They are NOT the live commerce workers (those are the production agents in
`packages/agents`, run via the Claude Agent SDK + Inngest in the deployed app).

Claude Code delegates to a subagent automatically based on its `description`, or you can
invoke one explicitly (e.g. "use the printify-api-agent to ...").

## Target architecture (what these agents build toward)

Monorepo: **pnpm workspaces + Turborepo + TypeScript**

```
apps/
  dashboard    private command center (Run Research, Generate Shirts, Approve, Publish, Winners, Scale)
  storefront   public POD site — Next.js, headless Shopify checkout
  api          routes/webhooks for Shopify, Printify, Etsy, Pinterest, GA4, Inngest
packages/
  agents       production runtime agents (Claude Agent SDK)
  tools        shared typed API clients (the builder agents maintain these)
  db           Supabase schema + typed client
.claude/agents these builder subagents
```

Backend services: Shopify (headless checkout/orders), Printify (creation + fulfillment),
Etsy (marketplace, via Printify + own API layer — **not** Marketplace Connect),
Pinterest (traffic), DataForSEO (research), GA4 + store data (analytics loop),
Supabase (DB/storage), Vercel (hosting), Inngest (durable/scheduled workflows).

## The subagents

| Agent | Owns | Builds |
|-------|------|--------|
| `frontend-storefront-agent` | `apps/storefront`, `apps/dashboard` | pages, dashboard buttons, A/B layouts |
| `shopify-api-agent` | `packages/tools/shopify`, Shopify webhooks | Storefront + Admin clients (headless) |
| `etsy-api-agent` | `packages/tools/etsy`, Etsy OAuth/webhooks | OAuth, listings, taxonomy, stats |
| `printify-api-agent` | `packages/tools/printify`, Printify webhooks | product create, mockups, publish, order sync |
| `research-agent` | `packages/tools/research`, `packages/agents/research` | DataForSEO, niche/competitor/keyword scoring |
| `design-system-agent` | `packages/tools/design` | SVG typography engine, presets, 300 DPI exports |
| `analytics-agent` | `packages/tools/analytics`, `packages/agents/analytics` | data pulls, winner formula, scaling triggers |
| `qa-security-agent` | (read-only) | quality gates, secret/webhook/invariant audit |
| `deployment-agent` | `turbo.json`, Vercel/Inngest/CI config, env schema | deploy plumbing, PRs |

## Invariants every agent honors

- **Human trademark/compliance approval gate** — no agent path auto-publishes to Shopify,
  Etsy, or Printify without human approval.
- **No fabricated analytics** — API-unavailable metrics are marked estimated/null.
- **Secrets are server-only** — only public-scoped tokens (Shopify Storefront) reach the client.
- **Scope discipline** — each agent touches only the area it owns; cross-agent data flows
  through Supabase, not by editing another agent's clients.
