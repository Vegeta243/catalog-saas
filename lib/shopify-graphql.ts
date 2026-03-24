/**
 * Shopify GraphQL Admin API helper
 * All Shopify REST calls have been migrated to GraphQL 2024-01
 */

export const SHOPIFY_GRAPHQL_VERSION = '2024-01';

/** Extract numeric Shopify ID from a global GID string */
export function gidToId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

/** Build a Shopify global ID from type + numeric id */
export function toGid(type: string, id: string | number): string {
  return `gid://shopify/${type}/${id}`;
}

export class ShopifyTokenExpiredError extends Error {
  code = 'SHOPIFY_TOKEN_EXPIRED';
  constructor() {
    super('Votre connexion Shopify a expiré. Veuillez reconnecter votre boutique.');
    this.name = 'ShopifyTokenExpiredError';
  }
}

/** Execute a Shopify Admin GraphQL query or mutation */
export async function shopifyQuery<T = Record<string, unknown>>(
  shop_domain: string,
  access_token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(
    `https://${shop_domain}/admin/api/${SHOPIFY_GRAPHQL_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': access_token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new ShopifyTokenExpiredError();
    }
    const text = await res.text();
    throw new Error(`Shopify GraphQL HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new Error(`Shopify GraphQL error: ${msg}`);
  }

  return json.data as T;
}

/* ─── Queries ─────────────────────────────────────────────────────────────── */

export const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          descriptionHtml
          vendor
          productType
          tags
          status
          createdAt
          updatedAt
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                price
                sku
                inventoryManagement
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_QUERY = `
  query Product($id: ID!) {
    product(id: $id) {
      id
      title
      descriptionHtml
      vendor
      productType
      tags
      status
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
          }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            price
            sku
            inventoryManagement
          }
        }
      }
    }
  }
`;

export const PRODUCTS_WITH_IMAGES_QUERY = `
  query ProductsWithImages($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

/* ─── Mutations ───────────────────────────────────────────────────────────── */

export const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_METAFIELD_MUTATION = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_VARIANTS_BULK_UPDATE = `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const APP_SUBSCRIPTION_CREATE = `
  mutation AppSubscriptionCreate(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: String!
    $test: Boolean
  ) {
    appSubscriptionCreate(
      name: $name
      lineItems: $lineItems
      returnUrl: $returnUrl
      test: $test
    ) {
      appSubscription {
        id
        status
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

export const APP_SUBSCRIPTION_QUERY = `
  query AppSubscription($id: ID!) {
    node(id: $id) {
      ... on AppSubscription {
        id
        name
        status
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

/* ─── REST helper for image upload (Shopify Files API is GraphQL but complex) */
export async function shopifyRestRequest(
  shop_domain: string,
  access_token: string,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://${shop_domain}/admin/api/2024-01${path}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': access_token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new ShopifyTokenExpiredError();
    const text = await res.text();
    throw new Error(`Shopify REST ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}
