/**
 * ClipperAi2026 - Smart Execution Controller
 * OVERLORD Phase 4: Dynamic execution strategy decision
 * 
 * Purpose:
 * Decide execution strategy dynamically before job runs.
 * 
 * Features:
 * - Execution mode decision (fast-track, normal, delayed)
 * - Dynamic delay calculation
 * - Throttling logic
 * - Combined execution strategy
 * 
 * No external dependencies - pure logic only.
 * No DB modification.
 */

const logger = require('../utils/logger');

// Constants for execution modes
const EXECUTION_MODES = {
  FAST_TRACK: 'fast-track',
  NORMAL: 'normal',
  DELAYED: 'delayed'
};

// Priority levels
const PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Throttle limits
const MAX_ACTIVE_HIGH_JOBS = 3;

/**
 * Decide execution mode based on job priority and confidence
 * @param {Object} job - Job object with priority and confidence
 * @returns {string} - Execution mode: 'fast-track', 'normal', or 'delayed'
 */
function decideExecutionMode(job) {
  if (!job) {
    return EXECUTION_MODES.NORMAL;
  }

  const priority = (job.priority || job.priorityLevel || PRIORITY.MEDIUM).toLowerCase();
  const confidence = job.confidence || job.ai_confidence || 50;

  // Fast-track: high priority AND confidence > 80
  if (priority === PRIORITY.HIGH && confidence > 80) {
    logger.info('[Smart Execution] Mode: FAST-TRACK', {
      jobId: job.id,
      priority,
      confidence
    });
    return EXECUTION_MODES.FAST_TRACK;
  }

  // Delayed: risk score > 60
  const riskScore = job.riskScore || 0;
  if (riskScore > 60) {
    logger.info('[Smart Execution] Mode: DELAYED (high risk)', {
      jobId: job.id,
      riskScore
    });
    return EXECUTION_MODES.DELAYED;
  }

  // Default: normal
  logger.info('[Smart Execution] Mode: NORMAL', {
    jobId: job.id,
    priority,
    confidence
  });
  return EXECUTION_MODES.NORMAL;
}

/**
 * Calculate dynamic delay in milliseconds based on priority
 * @param {Object} job - Job object with priority
 * @returns {number} - Delay in milliseconds
 */
function calculateDynamicDelay(job) {
  if (!job) {
    return 500; // Default medium delay
  }

  const priority = (job.priority || job.priorityLevel || PRIORITY.MEDIUM).toLowerCase();

  switch (priority) {
    case PRIORITY.HIGH:
      return 0; // No delay for high priority
    
    case PRIORITY.LOW:
      return 1500; // 1.5s delay for low priority
    
    case PRIORITY.MEDIUM:
    default:
      return 500; // 500ms delay for medium priority
  }
}

/**
 * Determine if job should be throttled based on active high-priority jobs
 * @param {Object} job - Job object to check
 * @param {number} currentActiveHighJobs - Number of currently active high-priority jobs
 * @returns {boolean} - True if should throttle
 */
function shouldThrottle(job, currentActiveHighJobs) {
  // If no job provided, don't throttle
  if (!job) {
    return false;
  }

  const priority = (job.priority || job.priorityLevel || PRIORITY.MEDIUM).toLowerCase();

  // Only throttle high priority jobs
  if (priority !== PRIORITY.HIGH) {
    return false;
  }

  const shouldThrottle = currentActiveHighJobs >= MAX_ACTIVE_HIGH_JOBS;

  if (shouldThrottle) {
    logger.warn('[Smart Execution] Throttling high-priority job', {
      jobId: job.id,
      currentActiveHighJobs,
      limit: MAX_ACTIVE_HIGH_JOBS
    });
  }

  return shouldThrottle;
}

/**
 * Get the complete execution strategy for a job
 * @param {Object} job - Job object
 * @param {number} activeHighCount - Number of currently active high-priority jobs
 * @returns {Object} - Execution strategy object
 */
function executionStrategy(job, activeHighCount = 0) {
  if (!job) {
    // Default strategy for null job
    return {
      mode: EXECUTION_MODES.NORMAL,
      delay: 500,
      throttle: false,
      reason: 'No job provided, using default strategy'
    };
  }

  // Determine execution mode
  const mode = decideExecutionMode(job);

  // Calculate delay
  let delay = calculateDynamicDelay(job);

  // Check throttle status
  const throttle = shouldThrottle(job, activeHighCount);

  // Build reason string
  const reasons = [];
  const priority = (job.priority || job.priorityLevel || PRIORITY.MEDIUM).toLowerCase();
  const confidence = job.confidence || job.ai_confidence || 50;
  const riskScore = job.riskScore || 0;

  if (mode === EXECUTION_MODES.FAST_TRACK) {
    reasons.push(`High priority (${priority}) with high confidence (${confidence} > 80)`);
  } else if (mode === EXECUTION_MODES.DELAYED) {
    reasons.push(`Risk score too high (${riskScore} > 60)`);
  } else {
    reasons.push(`Normal priority (${priority})`);
  }

  if (throttle) {
    reasons.push(`Throttled due to high load (${activeHighCount} >= ${MAX_ACTIVE_HIGH_JOBS})`);
    // Add additional delay when throttled
    delay += 1000;
  }

  const strategy = {
    mode,
    delay,
    throttle,
    priority,
    confidence,
    riskScore,
    reason: reasons.join('; ')
  };

  logger.info('[Smart Execution] Strategy computed', {
    jobId: job.id,
    ...strategy
  });

  return strategy;
}

/**
 * Calculate estimated wait time for a job
 * @param {Object} job - Job object
 * @param {number} activeHighCount - Number of currently active high-priority jobs
 * @returns {number} - Estimated wait time in milliseconds
 */
function estimateWaitTime(job, activeHighCount = 0) {
  const strategy = executionStrategy(job, activeHighCount);
  
  let waitTime = strategy.delay;

  // Add throttle delay
  if (strategy.throttle) {
    // Estimate: each throttled job adds ~2 seconds
    waitTime += (activeHighCount - MAX_ACTIVE_HIGH_JOBS + 1) * 2000;
  }

  return waitTime;
}

/**
 * Check if job should be processed immediately (no wait)
 * @param {Object} job - Job object
 * @param {number} activeHighCount - Number of currently active high-priority jobs
 * @returns {boolean} - True if should process immediately
 */
function shouldProcessImmediately(job, activeHighCount = 0) {
  if (!job) return false;
  
  const strategy = executionStrategy(job, activeHighCount);
  
  return strategy.mode === EXECUTION_MODES.FAST_TRACK && 
         !strategy.throttle && 
         strategy.delay === 0;
}

/**
 * Get configuration constants
 * @returns {Object} - Configuration object
 */
function getConfig() {
  return {
    maxActiveHighJobs: MAX_ACTIVE_HIGH_JOBS,
    delays: {
      high: 0,
      medium: 500,
      low: 1500
    },
    thresholds: {
      fastTrackConfidence: 80,
      delayedRiskScore: 60,
      throttleThreshold: MAX_ACTIVE_HIGH_JOBS
    },
    modes: { ...EXECUTION_MODES },
    priorities: { ...PRIORITY }
  };
}

/**
 * Validate job priority value
 * @param {string} priority - Priority value to validate
 * @returns {boolean} - True if valid priority
 */
function isValidPriority(priority) {
  if (!priority || typeof priority !== 'string') {
    return false;
  }
  return Object.values(PRIORITY).includes(priority.toLowerCase());
}

module.exports = {
  // Constants
  EXECUTION_MODES,
  PRIORITY,
  MAX_ACTIVE_HIGH_JOBS,

  // Main functions
  decideExecutionMode,
  calculateDynamicDelay,
  shouldThrottle,
  executionStrategy,

  // Utility functions
  estimateWaitTime,
  shouldProcessImmediately,
  getConfig,
  isValidPriority
};
