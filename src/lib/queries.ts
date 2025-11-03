// src/lib/queries.ts
export const PORTFOLIO_PRODUCTS_QUERY = `#graphql
  query PortfolioProducts($first: Int!) {
    products(first: $first, query: "product_type:Portfolio_Project") {
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
          productType
          tags
          metafields(identifiers: [
            {namespace: "custom", key: "client_name"},
            {namespace: "custom", key: "project_url"},
            {namespace: "custom", key: "technologies"},
            {namespace: "custom", key: "project_date"},
            {namespace: "custom", key: "featured"}
          ]) {
            key
            value
          }
        }
      }
    }
  }
`;