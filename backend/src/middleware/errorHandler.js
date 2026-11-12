const { ZodError } = require('zod');
const AppError = require('../errors/AppError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details } });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Resource with these values already exists' } });
  }

  if (err.code === '23503') {
    return res.status(409).json({
      error: { code: 'RELATION_CONFLICT', message: 'Operation violates a relation with other data' }
    });
  }

  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
}

module.exports = { notFoundHandler, errorHandler };
