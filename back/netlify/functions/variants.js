const {
  getVariants,
  createVariant,
  updateVariant,
} = require('../../services/variantService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);

    const storeId = event.queryStringParameters?.store_id;
    const productId = event.queryStringParameters?.product_id;

    if (!storeId || (!productId && event.httpMethod !== 'PUT')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'store_id and product_id required' }),
      };
    }

    // GET variants
    if (event.httpMethod === 'GET') {
      const variants = await getVariants(storeId, productId);

      return {
        statusCode: 200,
        body: JSON.stringify(variants),
      };
    }

    // CREATE variant
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      const variant = await createVariant(storeId, productId, body);

      return {
        statusCode: 201,
        body: JSON.stringify(variant),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'variant id required' }),
        };
      }

      const variant = await updateVariant(storeId, body.id, body);

      return {
        statusCode: variant ? 200 : 404,
        body: JSON.stringify(
          variant ? { data: variant } : { error: 'Variant not found' },
        ),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({ error: err.message || 'server error' }),
    };
  }
};
