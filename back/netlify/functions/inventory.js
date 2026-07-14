const {
  getInventory,
  updateInventory,
} = require('../../services/inventoryService');
const { requireStoreAccess } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    const storeId = event.queryStringParameters?.store_id;

    if (!storeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'store_id required' }),
      };
    }

    const action = event.httpMethod === 'GET' ? 'read' : 'write';
    await requireStoreAccess(event, storeId, action);

    if (event.httpMethod === 'GET') {
      const inventory = await getInventory(storeId);

      return {
        statusCode: 200,
        body: JSON.stringify({ data: inventory }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.variantId || typeof body.stock !== 'number') {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'variantId and numeric stock required',
          }),
        };
      }

      const variant = await updateInventory(
        storeId,
        body.variantId,
        body.stock,
      );

      return {
        statusCode: variant ? 200 : 404,
        body: JSON.stringify(
          variant
            ? { data: variant }
            : { error: 'Variant not found in this store' },
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
