// lib/shopify.ts
import { createStorefrontClient } from "@shopify/hydrogen-react";

export const shopifyClient = createStorefrontClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN!,
  storefrontApiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || "2025-01",
});

// Helper for server routes (do not expose admin tokens to frontend)
export async function fetchShopify(query: string, variables = {}) {
  const url = shopifyClient.getStorefrontApiUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: shopifyClient.getPublicTokenHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}
