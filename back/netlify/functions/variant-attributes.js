const {
  linkVariantAttribute,
  getVariantAttributes,
} = require('../../services/variantAttributeService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);
    const storeId = event.queryStringParameters?.store_id;
    const variantId = event.queryStringParameters?.variant_id;

    if (!storeId || !variantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'store_id and variant_id required' }),
      };
    }

    // ======================
    // GET
    // ======================
    if (event.httpMethod === 'GET') {
      const data = await getVariantAttributes(storeId, variantId);

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    // ======================
    // POST (LINK)
    // ======================
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      const link = await linkVariantAttribute(
        storeId,
        variantId,
        body.attribute_value_id,
      );

      return {
        statusCode: 201,
        body: JSON.stringify(link),
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
