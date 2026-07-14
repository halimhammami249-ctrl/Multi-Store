const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../../services/categoryService');
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

    const action =
      event.httpMethod === 'GET'
        ? 'read'
        : event.httpMethod === 'DELETE'
          ? 'delete'
          : 'write';
    await requireStoreAccess(event, storeId, action);

    if (event.httpMethod === 'GET') {
      const categories = await getCategories(storeId);

      return {
        statusCode: 200,
        body: JSON.stringify({ data: categories }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const category = await createCategory(storeId, body);

      return {
        statusCode: 201,
        body: JSON.stringify({ data: category }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id || !body.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'category id and name required' }),
        };
      }

      const category = await updateCategory(storeId, body.id, body);

      return {
        statusCode: category ? 200 : 404,
        body: JSON.stringify(
          category ? { data: category } : { error: 'Category not found' },
        ),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'category id required' }),
        };
      }

      const category = await deleteCategory(storeId, body.id);

      return {
        statusCode: category ? 200 : 404,
        body: JSON.stringify(
          category ? { data: category } : { error: 'Category not found' },
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
