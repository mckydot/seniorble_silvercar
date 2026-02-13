const { verifyAccessToken } = require('../utils/jwt');

function getBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function authenticateToken(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  }
}

function optionalAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return next();
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };
    return next();
  } catch (_) {
    return next();
  }
}

function requireRole(roles) {
  const allow = new Set(roles);
  return (req, res, next) => {
    if (!req.user?.role || !allow.has(req.user.role)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    next();
  };
}

module.exports = { authenticateToken, optionalAuth, requireRole };
