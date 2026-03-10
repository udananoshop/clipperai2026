/**
 * OVERLORD Phase 3 - Global Error Handler
 * Catches unhandled errors and prevents server crashes
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function globalErrorHandler(err, req, res, next) {
  // Log the error
  logger.error('[GlobalErrorHandler]', err.message, err.stack);

  // Determine if this is a dev environment
  const isDev = process.env.NODE_ENV !== 'production';

  // Standard error response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal server error'
  };

  // Include stack trace only in development
  if (isDev && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Set appropriate status code
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(errorResponse);
}

/**
 * Handle uncaught exceptions
 * @param {Error} err - Uncaught exception
 */
function handleUncaughtException(err) {
  logger.error('[UncaughtException]', err.message, err.stack);
  
  // Don't exit in development - allows debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

/**
 * Handle unhandled promise rejections
 * @param {Error} reason - Rejection reason
 */
function handleUnhandledRejection(reason) {
  logger.error('[UnhandledRejection]', reason);
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[GlobalErrorHandler] Error handlers initialized');
  }
}

module.exports = {
  globalErrorHandler,
  setupGlobalErrorHandlers,
  handleUncaughtException,
  handleUnhandledRejection
};
