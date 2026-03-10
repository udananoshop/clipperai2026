/**
 * Autonomous Mode Service
 * AI automatically optimizes content and selects best platforms
 */

const db = require('../database');
const logger = require('../utils/logger');
const predictionService = require('./predictionService');
const viralHookDetector = require('./viralHookDetector');
const multiPlatformFormatter = require('./multiPlatformFormatter');

class AutonomousModeService {
  /**
   * Get user autonomous settings
   * @param {number} userId - User ID
   * @returns {Object} - Settings
   */
  getSettings(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM autonomous_settings WHERE user_id = ?`;
      
      db.get(query, [userId], (err, row) => {
        if (err) {
          logger.error('[AutonomousMode] Error getting settings:', err);
          reject(err);
        } else if (!row) {
          // Create default settings
          this.createSettings(userId).then(resolve).catch(reject);
        } else {
          // Parse JSON fields
          if (row.preferred_platforms) {
            try {
              row.preferred_platforms = JSON.parse(row.preferred_platforms);
            } catch (e) {
              row.preferred_platforms = ['instagram', 'tiktok', 'youtube'];
            }
          }
          resolve(row);
        }
      });
    });
  }

  /**
   * Create default settings
   * @param {number} userId - User ID
   * @returns {Object} - Settings
   */
  createSettings(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO autonomous_settings (user_id, auto_optimize, auto_title, auto_hashtags, auto_platform_selection, auto_clip_suggestions, preferred_platforms, auto_export)
        VALUES (?, 0, 1, 1, 1, 1, ?, 0)
      `;
      
      const platforms = JSON.stringify(['instagram', 'tiktok', 'youtube']);
      
      db.run(query, [userId, platforms], function(err) {
        if (err) {
          logger.error('[AutonomousMode] Error creating settings:', err);
          reject(err);
        } else {
          resolve({
            user_id: userId,
            auto_optimize: 0,
            auto_title: 1,
            auto_hashtags: 1,
            auto_platform_selection: 1,
            auto_clip_suggestions: 1,
            preferred_platforms: ['instagram', 'tiktok', 'youtube'],
            auto_export: 0
          });
        }
      });
    });
  }

  /**
   * Update settings
   * @param {number} userId - User ID
   * @param {Object} updates - Settings to update
   * @returns {Object} - Result
   */
  async updateSettings(userId, updates) {
    const allowedFields = [
      'auto_optimize', 'auto_title', 'auto_hashtags',
      'auto_platform_selection', 'auto_clip_suggestions', 
      'preferred_platforms', 'auto_export'
    ];
    
    const setters = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'preferred_platforms' && Array.isArray(value)) {
          setters.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          setters.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          setters.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    
    if (setters.length === 0) {
      return { success: false, reason: 'No valid fields to update' };
    }
    
    setters.push("updated_at = datetime('now')");
    values.push(userId);
    
    return new Promise((resolve, reject) => {
      const query = `UPDATE autonomous_settings SET ${setters.join(', ')} WHERE user_id = ?`;
      
      db.run(query, values, function(err) {
        if (err) {
          logger.error('[AutonomousMode] Error updating settings:', err);
          reject(err);
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Run autonomous optimization on video analysis result
   * @param {number} userId - User ID
   * @param {Object} analysisResult - AI analysis result
   * @returns {Object} - Optimized result
   */
  async optimizeContent(userId, analysisResult) {
    try {
      const settings = await this.getSettings(userId);
      const result = { ...analysisResult };
      
      // Auto-generate title if enabled
      if (settings.auto_title && !result.title) {
        result.title = await this.generateOptimalTitle(analysisResult);
      }
      
      // Auto-generate hashtags if enabled
      if (settings.auto_hashtags && (!result.hashtags || result.hashtags.length === 0)) {
        result.hashtags = await this.generateOptimalHashtags(analysisResult);
      }
      
      // Auto-select best platform if enabled
      if (settings.auto_platform_selection && !result.recommendedPlatform) {
        result.recommendedPlatform = await this.selectBestPlatform(analysisResult);
      }
      
      // Auto-generate clip suggestions if enabled
      if (settings.auto_clip_suggestions && (!result.clipSuggestions || result.clipSuggestions.length === 0)) {
        result.clipSuggestions = await this.generateClipSuggestions(analysisResult);
      }
      
      return result;
    } catch (error) {
      logger.error('[AutonomousMode] Error optimizing content:', error);
      return analysisResult; // Return original if error
    }
  }

  /**
   * Generate optimal title based on analysis
   * @param {Object} analysis - Analysis result
   * @returns {string} - Generated title
   */
  async generateOptimalTitle(analysis) {
    try {
      // Use viral hook detector for title generation
      const hookAnalysis = await viralHookDetector.detect(analysis.transcript || '');
      
      // Generate title based on best hook
      if (hookAnalysis.bestHook) {
        return hookAnalysis.bestHook.text.substring(0, 100);
      }
      
      // Fallback: generate from metadata
      const topics = analysis.metadata?.topics || [];
      if (topics.length > 0) {
        return `🔥 ${topics[0].charAt(0).toUpperCase() + topics[0].slice(1)} - Must Watch!`;
      }
      
      return '🎬 Amazing Content - Check It Out!';
    } catch (error) {
      logger.error('[AutonomousMode] Error generating title:', error);
      return 'Check out this video!';
    }
  }

  /**
   * Generate optimal hashtags
   * @param {Object} analysis - Analysis result
   * @returns {Array} - Hashtags
   */
  async generateOptimalHashtags(analysis) {
    try {
      const hashtags = [];
      
      // Get trending hashtags from analysis
      if (analysis.trendingHashtags) {
        hashtags.push(...analysis.trendingHashtags.slice(0, 5));
      }
      
      // Add topic-based hashtags
      const topics = analysis.metadata?.topics || [];
      topics.forEach(topic => {
        hashtags.push(`#${topic.replace(/\s+/g, '')}`);
      });
      
      // Add viral hashtags
      hashtags.push('#viral', '#trending', '#fyp');
      
      // Limit to 20 hashtags (platform limit)
      return [...new Set(hashtags)].slice(0, 20);
    } catch (error) {
      logger.error('[AutonomousMode] Error generating hashtags:', error);
      return ['#viral', '#trending'];
    }
  }

  /**
   * Select best platform based on analysis
   * @param {Object} analysis - Analysis result
   * @returns {string} - Best platform
   */
  async selectBestPlatform(analysis) {
    try {
      // Get platform recommendations from multi-platform formatter
      const recommendations = await multiPlatformFormatter.getRecommendations(analysis);
      
      // Find highest scoring platform
      let bestPlatform = 'instagram';
      let highestScore = 0;
      
      for (const [platform, data] of Object.entries(recommendations || {})) {
        const score = (data.score || 0);
        if (score > highestScore) {
          highestScore = score;
          bestPlatform = platform;
        }
      }
      
      return bestPlatform;
    } catch (error) {
      logger.error('[AutonomousMode] Error selecting platform:', error);
      return 'instagram';
    }
  }

  /**
   * Generate clip suggestions
   * @param {Object} analysis - Analysis result
   * @returns {Array} - Clip suggestions
   */
  async generateClipSuggestions(analysis) {
    try {
      const suggestions = [];
      
      // Get viral moments from prediction service
      const predictions = await predictionService.predictViralMoments(analysis);
      
      if (predictions && predictions.moments) {
        for (const moment of predictions.moments.slice(0, 5)) {
          suggestions.push({
            startTime: moment.timestamp,
            endTime: moment.timestamp + 30,
            reason: moment.reason || 'High engagement predicted',
            score: moment.score || 80
          });
        }
      }
      
      return suggestions;
    } catch (error) {
      logger.error('[AutonomousMode] Error generating clip suggestions:', error);
      return [];
    }
  }
}

// Export singleton
module.exports = new AutonomousModeService();
