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

  // netlify.toml redirects /api/public/* to this function with the rest
  // of the path appended, so event.path looks like:
  //   /.netlify/functions/public/test.com/products
  //   /.netlify/functions/public/test.com/products/sample-product
  const parts = event.path
    .replace(/^\/\.netlify\/functions\/public\/?/, '')
    .split('/')
    .filter(Boolean);

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
