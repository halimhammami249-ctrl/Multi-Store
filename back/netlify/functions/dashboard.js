const {
  getPlatformStats,
  getStoreStats,
} = require('../../services/dashboardService');

exports.handler = async (event) => {
  try {
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
      statusCode: 500,
      body: JSON.stringify({
        error: 'server error',
      }),
    };
  }
};
