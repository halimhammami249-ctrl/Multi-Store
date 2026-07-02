const { clearAuthCookie } = require('../../services/authService');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': clearAuthCookie(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ success: true }),
  };
};
