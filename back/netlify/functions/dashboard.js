const {
  getPlatformStats,
  getStoreStats,
} = require('../../services/dashboardService');
const { requireAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    await requireAdmin(event);

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Method not allowed',
        }),
      };
    }

    const storeId = event.queryStringParameters?.storeId;

    const stats = storeId
      ? await getStoreStats(storeId)
      : await getPlatformStats();

    return {
      statusCode: 200,
      body: JSON.stringify(stats),
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
