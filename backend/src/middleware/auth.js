const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../errors/AppError');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized();
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub), role: payload.role, email: payload.email };
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden();
    }
    next();
  };
}

module.exports = { authenticate, authorize };
