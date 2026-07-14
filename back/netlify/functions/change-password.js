const {
  requireAdmin,
  changeOwnPassword,
} = require('../../services/authService');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const user = await requireAdmin(event);
    const body = JSON.parse(event.body || '{}');

    await changeOwnPassword(user.id, body.currentPassword, body.newPassword);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({ error: err.message || 'Server error' }),
    };
  }
};
