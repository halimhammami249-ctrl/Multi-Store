const {
  getStores,
  createStore,
  deleteStore,
} = require('../../services/storeService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);

    if (event.httpMethod === 'GET') {
      const stores = await getStores();

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: stores,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (!body.name || !body.domain) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'name and domain required' }),
        };
      }

      const store = await createStore(body);

      return {
        statusCode: 201,
        body: JSON.stringify({ data: store }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'store id required' }),
        };
      }

      const store = await deleteStore(body.id);

      return {
        statusCode: store ? 200 : 404,
        body: JSON.stringify(
          store ? { data: store } : { error: 'Store not found' },
        ),
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
