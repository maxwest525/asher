-- POD Agent OS — Supabase schema
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)
--
-- Mirrors the domain types in src/types.ts. Row-level security is enabled with
-- restrictive defaults; service-role (server) bypasses RLS, the anon client does not.

create extension if not exists "pgcrypto";

-- Scored demand opportunities from the research pipeline.
create table if not exists niches (
  id                uuid primary key default gen_random_uuid(),
  niche             text not null,
  keyword           text not null,
  buyer_intent      int  not null default 0,
  trend_score       int  not null default 0,
  competition_score int  not null default 0,
  seasonality       text,
  product_angle     text,
  opportunity_score int  not null default 0,
  created_at        timestamptz not null default now()
);

-- Competitor listing snapshots ("what's working" DB).
create table if not exists competitor_listings (
  id              uuid primary key default gen_random_uuid(),
  niche_id        uuid references niches(id) on delete set null,
  title           text not null,
  price           numeric,
  thumbnail_url   text,
  tags            text[],
  shop_name       text,
  listing_age_days int,
  search_position int,
  review_count    int,
  style_pattern   text,
  is_estimated    boolean not null default false,
  captured_at     timestamptz not null default now()
);

-- SEO/keyword maps for approved niches.
create table if not exists keyword_maps (
  id                 uuid primary key default gen_random_uuid(),
  niche_id           uuid not null references niches(id) on delete cascade,
  primary_keyword    text not null,
  secondary_keywords text[] not null default '{}',
  etsy_tags          text[] not null default '{}',
  shopify_seo_title  text not null,
  pinterest_keywords text[] not null default '{}',
  collection_name    text not null,
  url_slug           text not null,
  created_at         timestamptz not null default now()
);

-- Generated designs (typography/vector first). Gated by human approval.
create table if not exists designs (
  id              uuid primary key default gen_random_uuid(),
  niche_id        uuid references niches(id) on delete set null,
  slogan          text not null,
  svg_url         text,
  png_url         text,
  print_file_url  text,
  metadata        jsonb not null default '{}'::jsonb,
  approval_status text not null default 'pending'
                    check (approval_status in ('pending','approved','rejected')),
  risk_flags      text[] not null default '{}',
  created_at      timestamptz not null default now()
);

-- Products built in Printify and published to channels. Gated by human approval.
create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  design_id           uuid not null references designs(id) on delete cascade,
  printify_product_id text,
  shopify_product_id  text,
  etsy_listing_id     text,
  blank               text not null default 'bella-canvas-3001',
  title               text not null,
  price               numeric not null,
  approval_status     text not null default 'pending'
                        check (approval_status in ('pending','approved','rejected')),
  created_at          timestamptz not null default now()
);

-- Daily per-product metrics for the analytics loop.
create table if not exists daily_metrics (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id) on delete cascade,
  date             date not null,
  channel          text not null check (channel in ('shopify','etsy')),
  sales            int not null default 0,
  revenue          numeric not null default 0,
  fulfillment_cost numeric not null default 0,
  sessions         int not null default 0,
  conversions      int not null default 0,
  clicks           int not null default 0,
  is_estimated     boolean not null default false,
  unique (product_id, date, channel)
);

-- Products flagged as winners by the analytics agent.
create table if not exists winners (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  winner_score   numeric not null,
  triggered_rule text not null,
  detected_at    timestamptz not null default now(),
  scaled         boolean not null default false
);

-- Token store for OAuth credentials that rotate at runtime (e.g. Etsy refresh token).
-- The Etsy client upserts the rotated refresh_token here after every token exchange.
create table if not exists etsy_tokens (
  key   text primary key,
  value text not null
);

-- Enable RLS everywhere. Server uses the service-role key (bypasses RLS);
-- the anon client gets no access until you add explicit policies.
alter table niches              enable row level security;
alter table competitor_listings enable row level security;
alter table keyword_maps        enable row level security;
alter table designs             enable row level security;
alter table products            enable row level security;
alter table daily_metrics       enable row level security;
alter table winners             enable row level security;
alter table etsy_tokens         enable row level security;
