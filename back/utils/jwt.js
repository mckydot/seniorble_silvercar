const jwt = require('jsonwebtoken');

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

function generateAccessToken(payload) {
  const secret = mustGetEnv('JWT_SECRET');
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  // Keep payload minimal (avoid PII). `sub` is standard.
  return jwt.sign(
    {
      sub: payload.userId,
      role: payload.role,
      email: payload.email,
    },
    secret,
    { expiresIn, issuer: 'seniorble' }
  );
}

function generateRefreshToken(payload) {
  const secret = mustGetEnv('JWT_REFRESH_SECRET');
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  return jwt.sign(
    {
      sub: payload.userId,
      // refresh token should contain as little as possible
      typ: 'refresh',
    },
    secret,
    { expiresIn, issuer: 'seniorble' }
  );
}

function verifyAccessToken(token) {
  const secret = mustGetEnv('JWT_SECRET');
  return jwt.verify(token, secret, { issuer: 'seniorble' });
}

function verifyRefreshToken(token) {
  const secret = mustGetEnv('JWT_REFRESH_SECRET');
  return jwt.verify(token, secret, { issuer: 'seniorble' });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
