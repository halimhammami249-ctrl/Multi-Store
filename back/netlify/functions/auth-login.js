const { login } = require('../../services/authService');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { user, cookie } = await login(body.email, body.password, Boolean(body.remember));

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: user }),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({ error: err.message || 'Login failed' }),
    };
  }
};
