const {
  createAttribute,
  getAttributes,
  createAttributeValue,
  getAttributeValues,
  deleteAttribute,
} = require('../../services/attributeService');
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

    // ======================
    // GET ATTRIBUTES
    // ======================
    if (event.httpMethod === 'GET') {
      const attributes = await getAttributes(storeId);

      return {
        statusCode: 200,
        body: JSON.stringify({ data: attributes }),
      };
    }

    // ======================
    // CREATE ATTRIBUTE
    // ======================
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      const attribute = await createAttribute(storeId, body);

      return {
        statusCode: 201,
        body: JSON.stringify({ data: attribute }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'attribute id required' }),
        };
      }

      const attribute = await deleteAttribute(storeId, body.id);

      return {
        statusCode: attribute ? 200 : 404,
        body: JSON.stringify(
          attribute ? { data: attribute } : { error: 'Attribute not found' },
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
