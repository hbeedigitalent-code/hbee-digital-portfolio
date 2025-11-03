// src/lib/shopify.ts
import { createStorefrontClient } from '@shopify/hydrogen-react';

export const shopifyClient = createStorefrontClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN!,
  storefrontApiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-01',
});

export const getStorefrontApiUrl = shopifyClient.getStorefrontApiUrl;
export const getPublicTokenHeaders = shopifyClient.getPublicTokenHeaders;