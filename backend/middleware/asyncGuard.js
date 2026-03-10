/**
 * Async Guard Middleware
 * Wraps async route handlers to prevent server crashes from unhandled errors
 * Ensures all async errors are caught and handled properly
 */

/**
 * Wrapper function that catches async errors and passes them to next()
 * Prevents server crashes from unhandled promise rejections
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function with error handling
 */
const asyncGuard = (fn) => {
  return (req, res, next) => {
    // Ensure fn is a function
    if (typeof fn !== 'function') {
      console.warn('[asyncGuard] Warning: Handler is not a function');
      return next();
    }

    // Call the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log the error for debugging
      console.error('[asyncGuard] Async error caught:', error.message);
      console.error('[asyncGuard] Stack:', error.stack);
      
      // Don't crash the server - send error response if response not sent
      if (!res.headersSent) {
        // Check if response is still writable
        if (!res.writableEnded) {
          return res.status(500).json({
            success: false,
            error: 'An error occurred while processing your request'
          });
        }
      }
      
      // Error logged but don't call next(error) to prevent double-handling
    });
  };
};

/**
 * Wrapper for async middleware functions
 * Similar to asyncGuard but specifically for middleware
 * 
 * @param {Function} fn - Async middleware function
 * @returns {Function} - Wrapped function with error handling
 */
const asyncMiddlewareGuard = (fn) => {
  return (req, res, next) => {
    if (typeof fn !== 'function') {
      console.warn('[asyncGuard] Warning: Middleware is not a function');
      return next();
    }

    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('[asyncGuard] Middleware async error caught:', error.message);
      
      // Only call next if not already handled
      if (!res.headersSent) {
        next(error);
      }
    });
  };
};

module.exports = {
  asyncGuard,
  asyncMiddlewareGuard
};
