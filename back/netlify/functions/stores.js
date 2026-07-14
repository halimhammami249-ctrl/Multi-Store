const {
  getStores,
  createStore,
  deleteStore,
} = require('../../services/storeService');
const {
  requireAdmin,
  requireSuperAdmin,
  getAccessibleStoreIds,
} = require('../../services/authService');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const user = await requireAdmin(event);
      const stores = await getStores();

      const visibleStores =
        user.role === 'SUPER_ADMIN'
          ? stores
          : await (async () => {
              const accessibleIds = new Set(
                await getAccessibleStoreIds(user.id),
              );
              return stores.filter((s) => accessibleIds.has(s.id));
            })();

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: visibleStores,
        }),
      };
    }

    // Creating and deleting stores is a platform-level action - only a
    // super admin can do it, regardless of what stores someone manages.
    await requireSuperAdmin(event);

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
