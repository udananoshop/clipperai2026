/**
 * OVERLORD Phase 3 - Async Handler Utility
 * Safe async wrapper to prevent unhandled promise rejections
 */

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Wrap async middleware to catch errors
 * @param {Function} fn - Async middleware function
 * @returns {Function} - Wrapped function
 */
function asyncMiddleware(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Wrap async functions with custom error handler
 * @param {Function} fn - Async function
 * @param {Function} errorHandler - Custom error handler
 * @returns {Function} - Wrapped function
 */
function withErrorHandler(fn, errorHandler) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(err => {
        if (errorHandler) {
          errorHandler(err, req, res, next);
        } else {
          next(err);
        }
      });
  };
}

module.exports = {
  asyncHandler,
  asyncMiddleware,
  withErrorHandler
};
