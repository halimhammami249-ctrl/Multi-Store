const { currentUser } = require('../../services/authService');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const user = await currentUser(event.headers.cookie || event.headers.Cookie || '');

  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not authenticated' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ data: user }),
  };
};
