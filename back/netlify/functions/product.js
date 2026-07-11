const {
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../../services/productService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);

    const storeId = event.queryStringParameters?.store_id;
    const productId = event.queryStringParameters?.id;

    if (!storeId || !productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'store_id and id are required',
        }),
      };
    }

    // =========================
    // GET PRODUCT
    // =========================
    if (event.httpMethod === 'GET') {
      const product = await getProductById(storeId, productId);

      if (!product) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: 'Product not found',
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(product),
      };
    }

    // =========================
    // UPDATE PRODUCT
    // =========================
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body);

      const product = await updateProduct(storeId, productId, body);

      if (!product) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: 'Product not found',
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(product),
      };
    }

    // =========================
    // DELETE PRODUCT
    // =========================
    if (event.httpMethod === 'DELETE') {
      const product = await deleteProduct(storeId, productId);

      if (!product) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: 'Product not found',
          }),
        };
      }

      return {
        statusCode: 204,
        body: '',
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
        error: err.message || 'server error',
      }),
    };
  }
};
