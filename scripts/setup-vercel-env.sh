#!/usr/bin/env bash
# POD Agent OS — Vercel environment variable setup
# Run this once locally after the 3 Vercel projects are created.
#
# Usage:
#   chmod +x scripts/setup-vercel-env.sh
#   VERCEL_TOKEN=vcp_xxx SUPABASE_SERVICE_ROLE_KEY=eyJ... ANTHROPIC_API_KEY=sk-ant-... bash scripts/setup-vercel-env.sh

set -euo pipefail

VERCEL_TOKEN="${VERCEL_TOKEN:?Set VERCEL_TOKEN}"
TEAM_ID="team_j0wxCRFSMA98H4tI1webRhoD"
TARGETS='["production","preview","development"]'

# ---------------------------------------------------------------------------
# Known values (pre-filled)
# ---------------------------------------------------------------------------
SUPABASE_URL="https://nwiastkxijjlnbkqqzix.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53aWFzdGt4aWpqbG5ia3Fxeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjQ1MTYsImV4cCI6MjA5NjQ0MDUxNn0.2yxKBRY5y4OmaY5V8OAIUc2vBZtShm0Ty1gTeZ3akwQ"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY}"

# Derived from deployed project names
API_URL="https://asher-api-tau.vercel.app"

# Project IDs
API_PROJECT="prj_r1GqsoJ5Uljn4TFsDuYSkflpgIh5"
DASH_PROJECT="prj_BKN2ky2YnunoIcRAmeJ9TzlIXhOG"
SF_PROJECT="prj_xxIjApDlnAp202Noxi8nBdoF0wco"

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
add_env() {
  local project=$1 key=$2 value=$3 type=${4:-encrypted}
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://api.vercel.com/v10/projects/${project}/env?teamId=${TEAM_ID}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"${key}\",\"value\":$(echo -n "${value}" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))"),\"type\":\"${type}\",\"target\":${TARGETS}}")
  if [[ "$status" == "200" || "$status" == "201" ]]; then
    echo "  ✓ ${key}"
  else
    echo "  ✗ ${key} (HTTP ${status})"
  fi
}

# ---------------------------------------------------------------------------
# asher-api — all backend vars
# ---------------------------------------------------------------------------
echo ""
echo "=== asher-api ==="
add_env "$API_PROJECT" SUPABASE_URL            "$SUPABASE_URL"            plain
add_env "$API_PROJECT" SUPABASE_ANON_KEY        "$SUPABASE_ANON_KEY"       encrypted
add_env "$API_PROJECT" SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" encrypted
add_env "$API_PROJECT" ANTHROPIC_API_KEY        "$ANTHROPIC_API_KEY"       encrypted

# Shopify (set when you have credentials)
[[ -n "${SHOPIFY_STORE_DOMAIN:-}" ]]      && add_env "$API_PROJECT" SHOPIFY_STORE_DOMAIN      "$SHOPIFY_STORE_DOMAIN"      plain
[[ -n "${SHOPIFY_STOREFRONT_TOKEN:-}" ]]  && add_env "$API_PROJECT" SHOPIFY_STOREFRONT_TOKEN  "$SHOPIFY_STOREFRONT_TOKEN"  encrypted
[[ -n "${SHOPIFY_ADMIN_TOKEN:-}" ]]       && add_env "$API_PROJECT" SHOPIFY_ADMIN_TOKEN        "$SHOPIFY_ADMIN_TOKEN"       encrypted
[[ -n "${SHOPIFY_WEBHOOK_SECRET:-}" ]]    && add_env "$API_PROJECT" SHOPIFY_WEBHOOK_SECRET     "$SHOPIFY_WEBHOOK_SECRET"    encrypted
[[ -n "${PRINTIFY_TOKEN:-}" ]]            && add_env "$API_PROJECT" PRINTIFY_TOKEN             "$PRINTIFY_TOKEN"            encrypted
[[ -n "${PRINTIFY_SHOPIFY_SHOP_ID:-}" ]]  && add_env "$API_PROJECT" PRINTIFY_SHOPIFY_SHOP_ID  "$PRINTIFY_SHOPIFY_SHOP_ID"  plain
[[ -n "${PRINTIFY_ETSY_SHOP_ID:-}" ]]     && add_env "$API_PROJECT" PRINTIFY_ETSY_SHOP_ID     "$PRINTIFY_ETSY_SHOP_ID"     plain
[[ -n "${PRINTIFY_WEBHOOK_SECRET:-}" ]]   && add_env "$API_PROJECT" PRINTIFY_WEBHOOK_SECRET    "$PRINTIFY_WEBHOOK_SECRET"   encrypted
[[ -n "${ETSY_CLIENT_ID:-}" ]]            && add_env "$API_PROJECT" ETSY_CLIENT_ID             "$ETSY_CLIENT_ID"            encrypted
[[ -n "${ETSY_REFRESH_TOKEN:-}" ]]        && add_env "$API_PROJECT" ETSY_REFRESH_TOKEN         "$ETSY_REFRESH_TOKEN"        encrypted
[[ -n "${ETSY_SHOP_ID:-}" ]]              && add_env "$API_PROJECT" ETSY_SHOP_ID               "$ETSY_SHOP_ID"              plain
[[ -n "${ETSY_SHIPPING_PROFILE_ID:-}" ]]  && add_env "$API_PROJECT" ETSY_SHIPPING_PROFILE_ID  "$ETSY_SHIPPING_PROFILE_ID"  plain
[[ -n "${PINTEREST_ACCESS_TOKEN:-}" ]]    && add_env "$API_PROJECT" PINTEREST_ACCESS_TOKEN     "$PINTEREST_ACCESS_TOKEN"    encrypted
[[ -n "${PINTEREST_BOARD_ID:-}" ]]        && add_env "$API_PROJECT" PINTEREST_BOARD_ID         "$PINTEREST_BOARD_ID"        plain
[[ -n "${GA4_PROPERTY_ID:-}" ]]           && add_env "$API_PROJECT" GA4_PROPERTY_ID            "$GA4_PROPERTY_ID"           plain
[[ -n "${DATAFORSEO_LOGIN:-}" ]]          && add_env "$API_PROJECT" DATAFORSEO_LOGIN            "$DATAFORSEO_LOGIN"          encrypted
[[ -n "${DATAFORSEO_PASSWORD:-}" ]]       && add_env "$API_PROJECT" DATAFORSEO_PASSWORD         "$DATAFORSEO_PASSWORD"       encrypted
[[ -n "${INNGEST_EVENT_KEY:-}" ]]         && add_env "$API_PROJECT" INNGEST_EVENT_KEY           "$INNGEST_EVENT_KEY"         encrypted
[[ -n "${INNGEST_SIGNING_KEY:-}" ]]       && add_env "$API_PROJECT" INNGEST_SIGNING_KEY         "$INNGEST_SIGNING_KEY"       encrypted

# ---------------------------------------------------------------------------
# asher-dadhboard — Supabase + API base URL
# ---------------------------------------------------------------------------
echo ""
echo "=== asher-dadhboard ==="
add_env "$DASH_PROJECT" SUPABASE_URL            "$SUPABASE_URL"            plain
add_env "$DASH_PROJECT" SUPABASE_ANON_KEY        "$SUPABASE_ANON_KEY"       encrypted
add_env "$DASH_PROJECT" SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" encrypted
add_env "$DASH_PROJECT" NEXT_PUBLIC_API_BASE     "$API_URL"                 plain

# ---------------------------------------------------------------------------
# asher-storefront — Shopify only (set when you have credentials)
# ---------------------------------------------------------------------------
echo ""
echo "=== asher-storefront ==="
if [[ -n "${SHOPIFY_STORE_DOMAIN:-}" ]]; then
  add_env "$SF_PROJECT" SHOPIFY_STORE_DOMAIN     "$SHOPIFY_STORE_DOMAIN"    plain
  add_env "$SF_PROJECT" SHOPIFY_STOREFRONT_TOKEN "$SHOPIFY_STOREFRONT_TOKEN" encrypted
else
  echo "  (skipped — set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN to enable)"
fi

echo ""
echo "Done. Trigger a redeploy in the Vercel dashboard to pick up the new vars."
