class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }

  static businessRule(message, code = 'BUSINESS_RULE_VIOLATION') {
    return new AppError(422, code, message);
  }

  static paymentDeclined(message, code = 'PAYMENT_DECLINED') {
    return new AppError(402, code, message);
  }
}

module.exports = AppError;
