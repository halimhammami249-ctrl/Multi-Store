const {
  getStoreByDomain,
  getPublicProducts,
  getPublicProductBySlug,
  getPublicCategories,
  getPublicBrands,
} = require('../../services/publicService');

// Every storefront website calling this is on a different domain we don't
// control ahead of time - that's the entire point of a centralized public
// API. So this stays wide open for reads, unlike the admin functions.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Catalog data doesn't need to be real-time for a storefront. A short CDN
// cache window means repeat requests from a busy storefront get served by
// Netlify's edge instead of hitting the DB every time - this is what
// actually protects every OTHER store's site from one store's traffic
// spike (shared connection pool).
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
};

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  // FIX: in production, a function reached via a rewrite redirect often
  // receives the ORIGINAL request path in event.path
  // (/api/public/test.com/products), not the rewritten target
  // (/.netlify/functions/public/test.com/products) that netlify dev
  // showed locally. Rather than guess which form we got, find the
  // literal 'public' segment (this function's own name, which appears
  // in both forms) and take everything after it - works regardless of
  // which path shape Netlify hands us.
  const allSegments = event.path.split('/').filter(Boolean);
  const publicIndex = allSegments.lastIndexOf('public');
  const parts = publicIndex >= 0 ? allSegments.slice(publicIndex + 1) : [];

  const [domain, resource, slug] = parts;

  if (!domain) {
    return json(400, {
      error: 'domain required, e.g. /api/public/{domain}/products',
    });
  }

  try {
    const store = await getStoreByDomain(domain);

    // Unknown domain and inactive/suspended store both 404 identically -
    // a de-listed store's public API should look like it doesn't exist,
    // not confirm it exists but is disabled.
    if (!store) {
      return json(404, { error: 'Store not found' });
    }

    if (!resource || resource === 'store') {
      return json(
        200,
        { id: store.id, name: store.name, domain: store.domain },
        CACHE_HEADERS,
      );
    }

    if (resource === 'products') {
      if (slug) {
        const product = await getPublicProductBySlug(store.id, slug);
        if (!product) return json(404, { error: 'Product not found' });
        return json(200, product, CACHE_HEADERS);
      }
      const products = await getPublicProducts(store.id);
      return json(200, products, CACHE_HEADERS);
    }

    if (resource === 'categories') {
      const categories = await getPublicCategories(store.id);
      return json(200, categories, CACHE_HEADERS);
    }

    if (resource === 'brands') {
      const brands = await getPublicBrands(store.id);
      return json(200, brands, CACHE_HEADERS);
    }

    return json(404, { error: `Unknown resource: ${resource}` });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Internal server error' });
  }
};
