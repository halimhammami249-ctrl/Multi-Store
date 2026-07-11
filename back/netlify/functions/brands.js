const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../../services/brandService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);

    const storeId = event.queryStringParameters?.store_id;

    if (!storeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'store_id required',
        }),
      };
    }

    if (event.httpMethod === 'GET') {
      const brands = await getBrands(storeId);

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: brands,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      const brand = await createBrand(storeId, body);

      return {
        statusCode: 201,
        body: JSON.stringify({
          data: brand,
        }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id || !body.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'brand id and name required' }),
        };
      }

      const brand = await updateBrand(storeId, body.id, body);

      return {
        statusCode: brand ? 200 : 404,
        body: JSON.stringify(
          brand ? { data: brand } : { error: 'Brand not found' },
        ),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'brand id required' }),
        };
      }

      const brand = await deleteBrand(storeId, body.id);

      return {
        statusCode: 200,
        body: JSON.stringify({ data: brand }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method not allowed',
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({
        error: err.message || 'Server error',
      }),
    };
  }
};
