/**
 * Plan Guard Middleware
 * Protects routes based on user plan and credits
 */

const creditService = require('../services/creditService');
const logger = require('../utils/logger');

/**
 * Credit costs for different AI operations
 */
const CREDIT_COSTS = {
  // AI Analysis
  'ai:caption': 1,
  'ai:analyze': 2,
  'ai:predict': 2,
  'ai:hashtags': 1,
  'ai:trending': 1,
  
  // AI Processing
  'ai:generate': 5,
  'ai:render': 10,
  'ai:watermark': 3,
  'ai:subtitle': 3,
  'ai:clip': 5,
  'ai:export': 2,
  
  // Default
  'default': 1
};

/**
 * Create plan guard middleware
 * @param {Object} options - Options
 * @param {string} options.action - Action name (determines credit cost)
 * @param {string} options.feature - Required feature (optional)
 * @param {number} options.credits - Custom credit cost (optional)
 * @returns {Function} - Express middleware
 */
function planGuard(options = {}) {
  const { action, feature, credits: customCredits } = options;
  
  return async (req, res, next) => {
    try {
      // Get user ID from JWT
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get credit cost
      const creditCost = customCredits || CREDIT_COSTS[action] || CREDIT_COSTS.default;

      // Check if user has feature access (if specified)
      if (feature) {
        const hasFeature = await creditService.hasFeature(userId, feature);
        
        if (!hasFeature) {
          return res.status(403).json({
            success: false,
            error: `Feature '${feature}' not available in your plan`,
            upgradeRequired: true
          });
        }
      }

      // Check and deduct credits
      const result = await creditService.deductCredits(userId, creditCost, action, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });

      if (!result.success) {
        return res.status(402).json({
          success: false,
          error: result.reason,
          insufficientCredits: true,
          creditsNeeded: creditCost
        });
      }

      // Add credit info to request for later use
      req.creditInfo = {
        cost: creditCost,
        remaining: result.credits,
        admin: result.admin || false
      };

      // Log successful credit check
      logger.info(`[PlanGuard] User ${userId} approved for '${action}' - cost: ${creditCost}`);

      next();
    } catch (error) {
      logger.error('[PlanGuard] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Middleware to require specific role
 * @param {string[]} roles - Allowed roles
 * @returns {Function} - Express middleware
 */
function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const profile = await creditService.getUserProfile(userId);
      
      if (!profile || !roles.includes(profile.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('[requireRole] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

/**
 * Check credits only (non-blocking)
 * @param {number} userId - User ID
 * @param {string} action - Action name
 * @returns {Object} - Credit info
 */
async function checkCredits(userId, action) {
  const creditCost = CREDIT_COSTS[action] || CREDIT_COSTS.default;
  return await creditService.checkCredits(userId, creditCost);
}

module.exports = {
  planGuard,
  requireRole,
  checkCredits,
  CREDIT_COSTS
};
