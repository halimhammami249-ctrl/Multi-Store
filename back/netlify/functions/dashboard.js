const {
  getPlatformStats,
  getStoreStats,
} = require('../../services/dashboardService');
const {
  requireStoreAccess,
  requireSuperAdmin,
} = require('../../services/authService');

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

    if (storeId) {
      await requireStoreAccess(event, storeId, 'read');
    } else {
      // Platform-wide stats span every store - only a super admin should see them.
      await requireSuperAdmin(event);
    }

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
