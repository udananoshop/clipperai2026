/**
 * TITAN-A Decision Engine Service
 * Phase 2: Apply weighted formula to produce final decision
 */

const logger = require('../utils/logger');
const { normalizeScore, safeGetScore, isValidScore } = require('./scoreNormalizer');

/**
 * Default weights for decision calculation
 */
const DEFAULT_WEIGHTS = {
  hookStrength: 0.25,
  emotionalIntensity: 0.20,
  retentionScore: 0.25,
  engagementScore: 0.20,
  trendAlignment: 0.10
};

/**
 * Confidence thresholds
 */
const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 60,
  LOW: 0
};

/**
 * Priority levels
 */
const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Apply weighted formula and produce decision
 * @param {Object} metrics - Input metrics object
 * @param {Object} customWeights - Optional custom weights
 * @returns {Object} - Decision result
 */
function calculateDecision(metrics, customWeights = {}) {
  try {
    // Merge weights
    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

    // Extract and normalize scores
    const hookStrength = normalizeScore(safeGetScore(metrics, 'hookStrength', 50), 0, 10);
    const emotionalIntensity = normalizeScore(safeGetScore(metrics, 'emotionalIntensity', 50), 0, 100);
    const retentionScore = normalizeScore(safeGetScore(metrics, 'retentionScore', 50), 0, 100);
    const engagementScore = normalizeScore(safeGetScore(metrics, 'engagementScore', 50), 0, 100);
    const trendAlignment = normalizeScore(safeGetScore(metrics, 'trendAlignment', 50), 0, 100);

    // Calculate weighted final score
    const finalScore = Math.round(
      (hookStrength * weights.hookStrength) +
      (emotionalIntensity * weights.emotionalIntensity) +
      (retentionScore * weights.retentionScore) +
      (engagementScore * weights.engagementScore) +
      (trendAlignment * weights.trendAlignment)
    );

    // Calculate confidence based on available metrics
    const confidence = calculateConfidence(metrics);

    // Determine priority level
    const priorityLevel = determinePriorityLevel(finalScore, confidence);

    // Calculate processing weight
    const processingWeight = calculateProcessingWeight(finalScore, priorityLevel);

    return {
      finalScore,
      confidence,
      priorityLevel,
      processingWeight,
      breakdown: {
        hookStrength: { raw: metrics.hookStrength, normalized: hookStrength, weight: weights.hookStrength },
        emotionalIntensity: { raw: metrics.emotionalIntensity, normalized: emotionalIntensity, weight: weights.emotionalIntensity },
        retentionScore: { raw: metrics.retentionScore, normalized: retentionScore, weight: weights.retentionScore },
        engagementScore: { raw: metrics.engagementScore, normalized: engagementScore, weight: weights.engagementScore },
        trendAlignment: { raw: metrics.trendAlignment, normalized: trendAlignment, weight: weights.trendAlignment }
      }
    };
  } catch (error) {
    logger.warn('[DecisionEngine] calculateDecision error:', error.message);
    // Return safe default
    return getDefaultDecision();
  }
}

/**
 * Calculate confidence based on available metrics
 * @param {Object} metrics - Input metrics
 * @returns {number} - Confidence score 0-100
 */
function calculateConfidence(metrics) {
  const requiredFields = ['hookStrength', 'emotionalIntensity', 'retentionScore', 'engagementScore', 'trendAlignment'];
  
  let presentCount = 0;
  let validCount = 0;

  for (const field of requiredFields) {
    const value = metrics[field];
    if (value !== undefined && value !== null) {
      presentCount++;
      if (isValidScore(field === 'hookStrength' ? value * 10 : value)) {
        validCount++;
      }
    }
  }

  // Base confidence on presence of metrics
  const baseConfidence = (presentCount / requiredFields.length) * 100;
  
  // Boost confidence if all metrics are valid numbers
  const validityBonus = presentCount === validCount ? 10 : 0;

  return Math.min(100, Math.round(baseConfidence + validityBonus));
}

/**
 * Determine priority level based on score and confidence
 * @param {number} finalScore - Final weighted score
 * @param {number} confidence - Confidence score
 * @returns {string} - Priority level
 */
function determinePriorityLevel(finalScore, confidence) {
  // High priority: high score OR high confidence with good score
  if (finalScore >= 75 || (confidence >= 80 && finalScore >= 60)) {
    return PRIORITY_LEVELS.HIGH;
  }
  
  // Medium priority: moderate score
  if (finalScore >= 50 || confidence >= 60) {
    return PRIORITY_LEVELS.MEDIUM;
  }
  
  // Low priority: low score
  return PRIORITY_LEVELS.LOW;
}

/**
 * Calculate processing weight (1-10 scale)
 * @param {number} finalScore - Final score
 * @param {string} priorityLevel - Priority level
 * @returns {number} - Processing weight
 */
function calculateProcessingWeight(finalScore, priorityLevel) {
  let weight = 5; // Default medium

  // Adjust based on priority
  switch (priorityLevel) {
    case PRIORITY_LEVELS.HIGH:
      weight = 9;
      break;
    case PRIORITY_LEVELS.MEDIUM:
      weight = 6;
      break;
    case PRIORITY_LEVELS.LOW:
      weight = 3;
      break;
  }

  // Fine-tune based on score
  if (finalScore >= 85) weight = Math.min(10, weight + 1);
  if (finalScore < 30) weight = Math.max(1, weight - 1);

  return weight;
}

/**
 * Get default decision for error cases
 * @returns {Object} - Default decision object
 */
function getDefaultDecision() {
  return {
    finalScore: 50,
    confidence: 30,
    priorityLevel: PRIORITY_LEVELS.MEDIUM,
    processingWeight: 5,
    breakdown: null,
    fallback: true
  };
}

/**
 * Get priority level from string
 * @param {string} level - Priority level string
 * @returns {number} - Numeric priority value
 */
function getPriorityNumeric(level) {
  switch (level) {
    case PRIORITY_LEVELS.HIGH:
      return 1;
    case PRIORITY_LEVELS.MEDIUM:
      return 2;
    case PRIORITY_LEVELS.LOW:
      return 3;
    default:
      return 2;
  }
}

module.exports = {
  calculateDecision,
  calculateConfidence,
  determinePriorityLevel,
  calculateProcessingWeight,
  getDefaultDecision,
  getPriorityNumeric,
  DEFAULT_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  PRIORITY_LEVELS
};
