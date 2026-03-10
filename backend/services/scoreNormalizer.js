/**
 * TITAN-A Score Normalizer Service
 * Phase 1: Normalize scores to 0-100 scale
 */

const logger = require('../utils/logger');

/**
 * Normalize a raw score value to 0-100 scale
 * @param {number} rawValue - Raw value to normalize
 * @param {number} min - Minimum possible value (default 0)
 * @param {number} max - Maximum possible value (default 100)
 * @returns {number} - Normalized score 0-100
 */
function normalizeScore(rawValue, min = 0, max = 100) {
  try {
    // Handle undefined or null
    if (rawValue === undefined || rawValue === null) {
      return 50; // Return neutral score
    }

    // Handle non-numeric
    if (typeof rawValue !== 'number' || isNaN(rawValue)) {
      return 50;
    }

    // Clamp to safe range
    const clampedValue = Math.max(min, Math.min(max, rawValue));

    // Normalize to 0-100 scale
    const normalized = ((clampedValue - min) / (max - min)) * 100;

    // Ensure integer and within bounds
    return Math.max(0, Math.min(100, Math.round(normalized)));
  } catch (error) {
    logger.warn('[ScoreNormalizer] normalizeScore error:', error.message);
    return 50;
  }
}

/**
 * Normalize scores for an object with multiple score fields
 * @param {Object} scoreObject - Object containing score fields
 * @param {Object} fieldConfigs - Configuration for each field { fieldName: {min, max}, ... }
 * @returns {Object} - Object with normalized scores
 */
function normalizeObjectScores(scoreObject, fieldConfigs = {}) {
  try {
    if (!scoreObject || typeof scoreObject !== 'object') {
      return {};
    }

    const normalized = {};

    for (const [key, value] of Object.entries(scoreObject)) {
      const config = fieldConfigs[key];
      
      if (config && typeof config === 'object') {
        // Use provided min/max
        normalized[key] = normalizeScore(value, config.min, config.max);
      } else if (typeof value === 'number' && !isNaN(value)) {
        // Assume 0-100 scale if not specified
        normalized[key] = normalizeScore(value, 0, 100);
      } else {
        // Keep non-numeric values as-is
        normalized[key] = value;
      }
    }

    return normalized;
  } catch (error) {
    logger.warn('[ScoreNormalizer] normalizeObjectScores error:', error.message);
    return scoreObject;
  }
}

/**
 * Safe accessor for nested score values
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-notation path (e.g., 'predictions.retention')
 * @param {number} defaultValue - Default value if not found
 * @returns {number} - Score value or default
 */
function safeGetScore(obj, path, defaultValue = 50) {
  try {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[key];
    }

    if (typeof current !== 'number' || isNaN(current)) {
      return defaultValue;
    }

    return current;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Validate if score is within acceptable range
 * @param {number} score - Score to validate
 * @returns {boolean} - True if valid
 */
function isValidScore(score) {
  return typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 100;
}

module.exports = {
  normalizeScore,
  normalizeObjectScores,
  safeGetScore,
  isValidScore
};
