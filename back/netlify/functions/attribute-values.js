const {
  createAttributeValue,
  getAttributeValues,
  updateAttributeValue,
} = require('../../services/attributeService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);
    const storeId = event.queryStringParameters?.store_id;

    if (!storeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'store_id required' }),
      };
    }

    // ======================
    // POST (CREATE VALUE)
    // ======================
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      const { attribute_id, value } = body;

      if (!attribute_id || !value) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'attribute_id and value are required',
          }),
        };
      }

      const valueRow = await createAttributeValue(storeId, attribute_id, value);

      return {
        statusCode: 201,
        body: JSON.stringify({ data: valueRow }),
      };
    }

    // ======================
    // GET (LIST VALUES)
    // ======================
    if (event.httpMethod === 'GET') {
      const attributeId = event.queryStringParameters?.attribute_id;

      if (!attributeId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'attribute_id required',
          }),
        };
      }

      const values = await getAttributeValues(storeId, attributeId);

      return {
        statusCode: 200,
        body: JSON.stringify({ data: values }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id || !body.value) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'id and value are required' }),
        };
      }

      const valueRow = await updateAttributeValue(storeId, body.id, body.value);

      return {
        statusCode: valueRow ? 200 : 404,
        body: JSON.stringify(
          valueRow
            ? { data: valueRow }
            : { error: 'Attribute value not found' },
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
