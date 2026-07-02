const { getProducts, createProduct } = require('../../services/productService');

exports.handler = async (event) => {
  try {
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
      const products = await getProducts(storeId);

      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      const product = await createProduct(storeId, body);

      return {
        statusCode: 201,
        body: JSON.stringify(product),
      };
    }
    if (event.httpMethod === 'DELETE') {
      const productId = event.queryStringParameters?.id;

      if (!productId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'id required',
          }),
        };
      }

      const { deleteProduct } = require('../../services/productService');
      const product = await deleteProduct(storeId, productId);

      return {
        statusCode: product ? 200 : 404,
        body: JSON.stringify({
          data: product,
        }),
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
