/**
 * Credit Service - Enterprise Credit System
 * Manages user credits, plans, and usage tracking
 */

const db = require('../database');
const logger = require('../utils/logger');

class CreditService {
  /**
   * Get user profile with plan details
   * @param {number} userId - User ID
   * @returns {Object} - User profile with plan
   */
  getUserProfile(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          up.*,
          p.name as plan_name,
          p.display_name as plan_display_name,
          p.credits_monthly,
          p.max_video_size,
          p.max_concurrent_jobs,
          p.features
        FROM user_profiles up
        LEFT JOIN plans p ON up.plan_id = p.id
        WHERE up.user_id = ?
      `;
      
      db.get(query, [userId], (err, row) => {
        if (err) {
          logger.error('[CreditService] Error getting user profile:', err);
          reject(err);
        } else if (!row) {
          // Create default profile if doesn't exist
          this.createUserProfile(userId)
            .then(profile => resolve(profile))
            .catch(reject);
        } else {
          // Parse features JSON
          if (row.features) {
            try {
              row.features = JSON.parse(row.features);
            } catch (e) {
              row.features = {};
            }
          }
          if (row.settings) {
            try {
              row.settings = JSON.parse(row.settings);
            } catch (e) {
              row.settings = {};
            }
          }
          resolve(row);
        }
      });
    });
  }

  /**
   * Create default user profile
   * @param {number} userId - User ID
   * @returns {Object} - Created profile
   */
  createUserProfile(userId) {
    return new Promise((resolve, reject) => {
      // Get free plan
      db.get('SELECT id FROM plans WHERE name = ?', ['free'], (err, plan) => {
        if (err || !plan) {
          // Use plan_id = 1 as fallback
          plan = { id: 1 };
        }

        const query = `
          INSERT INTO user_profiles (user_id, role, credits, credits_used, plan_id)
          VALUES (?, 'user', 10, 0, ?)
        `;
        
        db.run(query, [userId, plan.id], function(err) {
          if (err) {
            logger.error('[CreditService] Error creating profile:', err);
            reject(err);
          } else {
            // Get created profile
            this.getUserProfile(userId)
              .then(resolve)
              .catch(reject);
          }
        });
      });
    });
  }

  /**
   * Check if user has enough credits
   * @param {number} userId - User ID
   * @param {number} creditsNeeded - Credits needed
   * @returns {Object} - {allowed: boolean, credits: number, reason?: string}
   */
  async checkCredits(userId, creditsNeeded = 1) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        return { allowed: false, reason: 'User profile not found' };
      }

      // Admins have unlimited credits
      if (profile.role === 'admin') {
        return { allowed: true, credits: Infinity };
      }

      // Check if user has enough credits
      const availableCredits = profile.credits;
      
      if (availableCredits < creditsNeeded) {
        return { 
          allowed: false, 
          credits: availableCredits,
          reason: `Insufficient credits. Need ${creditsNeeded}, have ${availableCredits}` 
        };
      }

      return { allowed: true, credits: availableCredits };
    } catch (error) {
      logger.error('[CreditService] Error checking credits:', error);
      return { allowed: false, reason: error.message };
    }
  }

  /**
   * Deduct credits from user
   * @param {number} userId - User ID
   * @param {number} credits - Credits to deduct
   * @param {string} actionType - Action type
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Result
   */
  async deductCredits(userId, credits, actionType, metadata = {}) {
    try {
      // Check credits first
      const check = await this.checkCredits(userId, credits);
      if (!check.allowed) {
        return { success: false, reason: check.reason };
      }

      const profile = await this.getUserProfile(userId);

      // Don't deduct for admins
      if (profile.role === 'admin') {
        return { success: true, credits: Infinity, admin: true };
      }

      // Deduct credits
      const query = `
        UPDATE user_profiles 
        SET credits = credits - ?, credits_used = credits_used + ?, updated_at = datetime('now')
        WHERE user_id = ?
      `;
      
      await new Promise((resolve, reject) => {
        db.run(query, [credits, credits, userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Log usage
      await this.logUsage(userId, actionType, credits, metadata);

      return { success: true, credits: check.credits - credits };
    } catch (error) {
      logger.error('[CreditService] Error deducting credits:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Log usage to tracking table
   * @param {number} userId - User ID
   * @param {string} actionType - Action type
   * @param {number} credits - Credits spent
   * @param {Object} metadata - Additional data
   */
  logUsage(userId, actionType, credits, metadata = {}) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO usage_tracking (user_id, action_type, credits_spent, metadata, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [
        userId,
        actionType,
        credits,
        JSON.stringify(metadata),
        metadata.ip || null,
        metadata.userAgent || null
      ], function(err) {
        if (err) {
          logger.error('[CreditService] Error logging usage:', err);
          // Don't reject - usage logging shouldn't block operations
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Add credits to user (admin or top-up)
   * @param {number} userId - User ID
   * @param {number} credits - Credits to add
   * @param {string} reason - Reason for addition
   * @returns {Object} - Result
   */
  async addCredits(userId, credits, reason = 'manual') {
    try {
      const query = `
        UPDATE user_profiles 
        SET credits = credits + ?, updated_at = datetime('now')
        WHERE user_id = ?
      `;
      
      await new Promise((resolve, reject) => {
        db.run(query, [credits, userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Log the addition
      await this.logUsage(userId, `credit_added_${reason}`, -credits, { added: credits });

      return { success: true };
    } catch (error) {
      logger.error('[CreditService] Error adding credits:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Get user usage stats
   * @param {number} userId - User ID
   * @param {number} days - Days to look back
   * @returns {Object} - Usage stats
   */
  getUsageStats(userId, days = 30) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          action_type,
          SUM(credits_spent) as total_credits,
          COUNT(*) as action_count
        FROM usage_tracking
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
        GROUP BY action_type
        ORDER BY total_credits DESC
      `;
      
      db.all(query, [userId], (err, rows) => {
        if (err) {
          logger.error('[CreditService] Error getting usage stats:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get all available plans
   * @returns {Array} - Plans
   */
  getPlans() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          logger.error('[CreditService] Error getting plans:', err);
          reject(err);
        } else {
          // Parse features
          (rows || []).forEach(plan => {
            try {
              plan.features = JSON.parse(plan.features);
            } catch (e) {
              plan.features = {};
            }
          });
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Update user plan
   * @param {number} userId - User ID
   * @param {string} planName - Plan name
   * @returns {Object} - Result
   */
  async updatePlan(userId, planName) {
    try {
      const plans = await this.getPlans();
      const plan = plans.find(p => p.name === planName);
      
      if (!plan) {
        return { success: false, reason: 'Plan not found' };
      }

      const query = `
        UPDATE user_profiles 
        SET plan_id = ?, credits = credits + ?, updated_at = datetime('now')
        WHERE user_id = ?
      `;
      
      await new Promise((resolve, reject) => {
        db.run(query, [plan.id, plan.credits_monthly, userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      return { success: true, plan };
    } catch (error) {
      logger.error('[CreditService] Error updating plan:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Check if user can perform action based on plan features
   * @param {number} userId - User ID
   * @param {string} feature - Feature name
   * @returns {boolean} - Allowed
   */
  async hasFeature(userId, feature) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (profile.role === 'admin') {
        return true;
      }

      return profile.features?.[feature] === true;
    } catch (error) {
      logger.error('[CreditService] Error checking feature:', error);
      return false;
    }
  }
}

// Export singleton
module.exports = new CreditService();
