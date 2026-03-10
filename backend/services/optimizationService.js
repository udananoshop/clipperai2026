/**
 * TITAN-C Phase 9 - Optimization Service
 * 
 * Responsibilities:
 * - detectLowPerformancePatterns()
 * - suggestOptimization(job)
 * - autoAdjustPriority(job)
 */

const logger = require('../utils/logger');

// Configuration
const CONFIG = {
  LOW_CONFIDENCE_THRESHOLD: 40,
  HIGH_VIRAL_THRESHOLD: 70,
  LOW_ENGAGEMENT_THRESHOLD: 40,
  MAX_RETRY_BEFORE_REVIEW: 3
};

/**
 * Detect low performance patterns in a job
 * @param {Object} job - Job object with scores
 * @returns {Object} - Detection results
 */
function detectLowPerformancePatterns(job) {
  const patterns = [];
  
  // Check confidence level
  if (job.confidence < CONFIG.LOW_CONFIDENCE_THRESHOLD) {
    patterns.push({
      type: 'low_confidence',
      severity: 'high',
      message: `Confidence ${job.confidence} below threshold ${CONFIG.LOW_CONFIDENCE_THRESHOLD}`
    });
  }
  
  // Check viral vs engagement mismatch
  const viralScore = job.viral_score ?? 0;
  const engagementScore = job.engagement_score ?? 0;
  
  if (viralScore > CONFIG.HIGH_VIRAL_THRESHOLD && engagementScore < CONFIG.LOW_ENGAGEMENT_THRESHOLD) {
    patterns.push({
      type: 'viral_engagement_mismatch',
      severity: 'medium',
      message: `High viral (${viralScore}) but low engagement (${engagementScore})`
    });
  }
  
  // Check repeated failures
  const retryCount = job.retry_count ?? job.retryCount ?? 0;
  if (retryCount >= CONFIG.MAX_RETRY_BEFORE_REVIEW) {
    patterns.push({
      type: 'repeated_failure',
      severity: 'high',
      message: `Job failed ${retryCount} times - marked for review`
    });
  }
  
  return {
    hasIssues: patterns.length > 0,
    patterns,
    jobId: job.id || job.jobId || 'unknown'
  };
}

/**
 * Suggest optimizations based on detected patterns
 * @param {Object} job - Job object
 * @returns {Object} - Optimization suggestions
 */
function suggestOptimization(job) {
  const detection = detectLowPerformancePatterns(job);
  const suggestions = [];
  
  if (!detection.hasIssues) {
    return {
      hasSuggestions: false,
      suggestions: [],
      jobId: detection.jobId
    };
  }
  
  for (const pattern of detection.patterns) {
    switch (pattern.type) {
      case 'low_confidence':
        suggestions.push({
          action: 'collect_more_data',
          priority: 'high',
          description: 'Gather more metrics to improve confidence'
        });
        break;
        
      case 'viral_engagement_mismatch':
        suggestions.push({
          action: 'optimize_title_hashtags',
          priority: 'medium',
          description: 'Improve title and hashtags to boost engagement'
        });
        suggestions.push({
          action: 'review_thumbnail',
          priority: 'medium',
          description: 'Consider better thumbnail for click-through rate'
        });
        break;
        
      case 'repeated_failure':
        suggestions.push({
          action: 'mark_for_review',
          priority: 'high',
          description: 'Manual review required - possible technical issue'
        });
        break;
    }
  }
  
  return {
    hasSuggestions: suggestions.length > 0,
    suggestions,
    jobId: detection.jobId
  };
}

/**
 * Auto-adjust priority based on performance patterns
 * @param {Object} job - Job object with current decision
 * @returns {Object} - Adjusted decision
 */
function autoAdjustPriority(job) {
  const detection = detectLowPerformancePatterns(job);
  let adjustedPriority = job.priorityLevel || job.priority_level || 'medium';
  let adjustmentReason = null;
  
  // Downgrade priority if confidence is very low
  if (job.confidence < CONFIG.LOW_CONFIDENCE_THRESHOLD) {
    if (adjustedPriority === 'high') {
      adjustedPriority = 'medium';
      adjustmentReason = 'Downgraded from high to medium due to low confidence';
    } else if (adjustedPriority === 'medium') {
      adjustedPriority = 'low';
      adjustmentReason = 'Downgraded from medium to low due to low confidence';
    }
  }
  
  // Mark for review if repeated failures
  const retryCount = job.retry_count ?? job.retryCount ?? 0;
  if (retryCount >= CONFIG.MAX_RETRY_BEFORE_REVIEW) {
    adjustmentReason = `Marked for review after ${retryCount} failures`;
  }
  
  // DEV MODE ONLY: Log optimization decisions
  if (process.env.NODE_ENV !== 'production') {
    if (adjustmentReason || detection.hasIssues) {
      console.log('[TITAN-C Optimization] Job:', job.id || job.jobId || 'unknown');
      console.log('  Original priority:', job.priorityLevel || job.priority_level);
      console.log('  Adjusted priority:', adjustedPriority);
      if (adjustmentReason) {
        console.log('  Reason:', adjustmentReason);
      }
    }
  }
  
  return {
    originalPriority: job.priorityLevel || job.priority_level || 'medium',
    adjustedPriority,
    adjusted: adjustedPriority !== (job.priorityLevel || job.priority_level || 'medium'),
    adjustmentReason,
    patterns: detection.patterns,
    jobId: job.id || job.jobId || 'unknown'
  };
}

module.exports = {
  detectLowPerformancePatterns,
  suggestOptimization,
  autoAdjustPriority,
  CONFIG
};
