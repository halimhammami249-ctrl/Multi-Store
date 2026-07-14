const {
  getMedia,
  createMedia,
  deleteMedia,
} = require('../../services/mediaService');
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
      const media = await getMedia(storeId);

      return {
        statusCode: 200,
        body: JSON.stringify({ data: media }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (!body.url || (!body.sku && !body.variantId)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'url and sku or variantId required' }),
        };
      }

      const media = await createMedia(storeId, body);

      return {
        statusCode: media ? 201 : 404,
        body: JSON.stringify(
          media ? { data: media } : { error: 'Variant not found' },
        ),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'media id required' }),
        };
      }

      const media = await deleteMedia(storeId, body.id);

      return {
        statusCode: media ? 200 : 404,
        body: JSON.stringify(
          media ? { data: media } : { error: 'Image not found' },
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
