// app/api/shopify/portfolio/route.ts
import { NextResponse } from "next/server";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN; // ✅ FIXED: Added "ACCESS"
const apiVersion = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2024-01";

// GraphQL query to fetch portfolio products
const query = `
  query PortfolioProjects {
    products(first: 10, query: "product_type:Portfolio Project") {
      edges {
        node {
          id
          title
          handle
          description
          featuredImage {
            url
            altText
          }
          metafields(identifiers: [
            {namespace: "custom", key: "client_name"},
            {namespace: "custom", key: "project_url"},
            {namespace: "custom", key: "technologies"}
          ]) {
            key
            value
          }
        }
      }
    }
  }
`;

export async function GET() {
  try {
    // Validate environment variables again in runtime
    if (!domain || !token) {
      console.error("Missing env vars - Domain:", domain, "Token:", !!token);
      return NextResponse.json(
        { error: "Missing Shopify environment variables" },
        { status: 500 }
      );
    }

    const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Shopify API Error:", text);
      return NextResponse.json(
        { error: "Shopify API request failed", details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Check for GraphQL errors
    if (data.errors) {
      console.error("❌ GraphQL Errors:", data.errors);
      return NextResponse.json(
        { error: "GraphQL query failed", details: data.errors },
        { status: 500 }
      );
    }

    const products = data?.data?.products?.edges?.map((edge: any) => {
      const metafields = (edge.node.metafields || []).reduce(
        (acc: any, field: any) => ({
          ...acc,
          [field.key]: field.value,
        }),
        {}
      );

      return {
        id: edge.node.id,
        title: edge.node.title,
        description: edge.node.description,
        image: edge.node.featuredImage?.url,
        client: metafields.client_name,
        websiteUrl: metafields.project_url,
        technologies: metafields.technologies,
      };
    });

    console.log(`✅ Successfully fetched ${products?.length || 0} portfolio items`);
    return NextResponse.json(products || []);
  } catch (error) {
    console.error("🔥 Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Server error", message: String(error) },
      { status: 500 }
    );
  }
}