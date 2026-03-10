/**
 * Central Error Handler - Production Grade
 * Standardizes error responses across the application
 */

const logger = require('../utils/logger');

// Error codes
const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // AI errors
  AI_PROCESSING_ERROR: 'AI_PROCESSING_ERROR',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_PREDICTION_ERROR: 'AI_PREDICTION_ERROR',
  
  // Job errors
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_FAILED: 'JOB_FAILED',
  JOB_TIMEOUT: 'JOB_TIMEOUT',
  
  // Credit errors
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  CREDIT_DEDUCTION_FAILED: 'CREDIT_DEDUCTION_FAILED',
  
  // Resource errors
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Severity levels
const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Create standardized error response
 */
function createErrorResponse(code, message, severity = SEVERITY.MEDIUM, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      severity,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  };
}

/**
 * Central error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Generate request ID for tracking
  const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log error with full context
  logger.error({
    message: err.message,
    code: err.code || 'UNKNOWN_ERROR',
    severity: err.severity || SEVERITY.MEDIUM,
    requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    stack: err.stack
  });

  // Default values
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let severity = err.severity || SEVERITY.MEDIUM;

  // Handle specific error types
  if (err.name === 'ValidationError' || err.isValidationError) {
    statusCode = 400;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    severity = SEVERITY.LOW;
  }

  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    statusCode = 401;
    errorCode = ERROR_CODES.UNAUTHORIZED;
    message = 'Authentication required';
    severity = SEVERITY.MEDIUM;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Token has expired';
    severity = SEVERITY.LOW;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = ERROR_CODES.INVALID_TOKEN;
    message = 'Invalid token';
    severity = SEVERITY.LOW;
  }

  if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 413;
    errorCode = ERROR_CODES.FILE_TOO_LARGE;
    message = err.message || 'File too large';
    severity = SEVERITY.LOW;
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    errorCode = ERROR_CODES.SERVICE_UNAVAILABLE;
    message = 'External service unavailable';
    severity = SEVERITY.HIGH;
  }

  if (err.message && err.message.includes('timeout')) {
    statusCode = 504;
    errorCode = ERROR_CODES.AI_TIMEOUT;
    message = 'Request timeout - please try again';
    severity = SEVERITY.MEDIUM;
  }

  // Build response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      severity,
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
    response.error.details = err.details || null;
  }

  // Send response
  res.status(statusCode).json(response);
};

/**
 * Async wrapper for route handlers
 * Catches async errors and passes to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler (404)
 */
const notFoundHandler = (req, res) => {
  logger.warn({
    message: 'Route not found',
    method: req.method,
    path: req.path,
    requestId: req.requestId
  });

  res.status(404).json(createErrorResponse(
    'ROUTE_NOT_FOUND',
    `Endpoint ${req.method} ${req.path} not found`,
    SEVERITY.LOW
  ));
};

/**
 * Custom error class with standardized format
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, severity = SEVERITY.MEDIUM) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.severity = severity;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, SEVERITY.LOW);
    this.isValidationError = true;
    this.details = details;
  }
}

/**
 * Authentication error class
 */
class AuthError extends AppError {
  constructor(message, statusCode = 401, code = ERROR_CODES.UNAUTHORIZED) {
    super(message, statusCode, code, SEVERITY.MEDIUM);
  }
}

/**
 * Credit error class
 */
class CreditError extends AppError {
  constructor(message, creditsNeeded = 0, creditsAvailable = 0) {
    super(message, 402, ERROR_CODES.INSUFFICIENT_CREDITS, SEVERITY.MEDIUM);
    this.creditsNeeded = creditsNeeded;
    this.creditsAvailable = creditsAvailable;
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthError,
  CreditError,
  ERROR_CODES,
  SEVERITY,
  createErrorResponse
};
