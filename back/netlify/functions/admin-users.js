const {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminPassword,
  deleteAdminUser,
} = require('../../services/adminUserService');
const { requireSuperAdmin } = require('../../services/authService');

exports.handler = async (event) => {
  try {
    const currentUser = await requireSuperAdmin(event);

    if (event.httpMethod === 'GET') {
      const users = await listAdminUsers();
      return { statusCode: 200, body: JSON.stringify({ data: users }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // A dedicated sub-action for resetting a password, so the frontend
      // doesn't need a separate endpoint for it.
      if (body.action === 'reset_password') {
        if (!body.id || !body.password) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'id and password required' }),
          };
        }
        const user = await resetAdminPassword(body.id, body.password);
        return {
          statusCode: user ? 200 : 404,
          body: JSON.stringify(
            user ? { data: user } : { error: 'User not found' },
          ),
        };
      }

      const user = await createAdminUser({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        role: body.role,
        storeIds: body.storeIds,
      });

      return { statusCode: 201, body: JSON.stringify({ data: user }) };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'id required' }),
        };
      }

      const user = await updateAdminUser(body.id, {
        fullName: body.fullName,
        role: body.role,
        isActive: body.isActive,
        storeIds: body.storeIds,
      });

      return {
        statusCode: user ? 200 : 404,
        body: JSON.stringify(
          user ? { data: user } : { error: 'User not found' },
        ),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'id required' }),
        };
      }

      const user = await deleteAdminUser(body.id, currentUser.id);

      return {
        statusCode: user ? 200 : 404,
        body: JSON.stringify(
          user ? { data: user } : { error: 'User not found' },
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
      body: JSON.stringify({ error: err.message || 'Server error' }),
    };
  }
};
