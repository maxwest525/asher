/**
 * Typed, server-only environment access. Throws early if a required secret is
 * missing rather than failing deep inside an API call.
 *
 * Do NOT import this from client components — it reads secret tokens.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  shopify: {
    get storeDomain() {
      return required('SHOPIFY_STORE_DOMAIN');
    },
    get storefrontToken() {
      return required('SHOPIFY_STOREFRONT_TOKEN');
    },
    get adminToken() {
      return required('SHOPIFY_ADMIN_TOKEN');
    },
  },
  printify: {
    get token() {
      return required('PRINTIFY_TOKEN');
    },
    get shopifyShopId() {
      return required('PRINTIFY_SHOPIFY_SHOP_ID');
    },
    get etsyShopId() {
      return required('PRINTIFY_ETSY_SHOP_ID');
    },
  },
  etsy: {
    get clientId() {
      return required('ETSY_CLIENT_ID');
    },
    get refreshToken() {
      return required('ETSY_REFRESH_TOKEN');
    },
    get clientSecret() {
      return required('ETSY_CLIENT_SECRET');
    },
  },
  pinterest: {
    get accessToken() {
      return required('PINTEREST_ACCESS_TOKEN');
    },
  },
  ga4: {
    get propertyId() {
      return required('GA4_PROPERTY_ID');
    },
  },
  dataForSeo: {
    get login() {
      return required('DATAFORSEO_LOGIN');
    },
    get password() {
      return required('DATAFORSEO_PASSWORD');
    },
  },
  anthropic: {
    get apiKey() {
      return required('ANTHROPIC_API_KEY');
    },
  },
} as const;
