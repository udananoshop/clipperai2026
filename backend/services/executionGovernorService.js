/**
 * OVERLORD Phase 5 - Autonomous Execution Governor
 * Tracks system load and manages job execution states
 * 
 * Features:
 * - Execution time tracking (moving average last 20 jobs)
 * - Error rate calculation (last 20 jobs)
 * - Queue depth monitoring
 * - Consecutive error tracking
 * - Load state management: NORMAL, HIGH_LOAD, CRITICAL, SAFE_MODE
 */

const logger = require('../utils/logger');

// Load states
const LOAD_STATES = {
  NORMAL: 'NORMAL',
  HIGH_LOAD: 'HIGH_LOAD',
  CRITICAL: 'CRITICAL',
  SAFE_MODE: 'SAFE_MODE'
};

// Thresholds
const THRESHOLDS = {
  HIGH_LOAD_TIME: 4000,      // ms
  CRITICAL_TIME: 7000,       // ms
  ERROR_RATE_LIMIT: 0.30,    // 30%
  CONSECUTIVE_ERROR_LIMIT: 5,
  MOVING_AVERAGE_WINDOW: 20,
  STABILITY_COOLDOWN: 60000  // 60 seconds
};

// Configuration for each load state
const LOAD_CONFIG = {
  [LOAD_STATES.NORMAL]: {
    concurrency: 3,
    delayBetweenJobs: 0,
    description: 'Normal operation'
  },
  [LOAD_STATES.HIGH_LOAD]: {
    concurrency: 2,
    delayBetweenJobs: 1000,  // 1s
    description: 'High load - reducing concurrency'
  },
  [LOAD_STATES.CRITICAL]: {
    concurrency: 1,
    delayBetweenJobs: 3000,  // 3s
    description: 'Critical load - minimal processing'
  },
  [LOAD_STATES.SAFE_MODE]: {
    concurrency: 0,  // pause
    delayBetweenJobs: 5000,  // 5s
    description: 'Safe mode - system paused for recovery'
  }
};

// In-memory state
let executionTimes = [];
let jobResults = [];  // true/false for success
let queueDepth = 0;
let consecutiveErrors = 0;
let currentState = LOAD_STATES.NORMAL;
let lastStateChangeTime = Date.now();
let lastStableTime = Date.now();
let isStable = true;

/**
 * Register a job start
 * @param {string} jobId - Job identifier
 */
function registerJobStart(jobId) {
  queueDepth++;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ExecutionGovernor] Job started: ${jobId}, Queue depth: ${queueDepth}`);
  }
}

/**
 * Register a job end
 * @param {string} jobId - Job identifier
 * @param {number} executionTime - Execution time in ms
 * @param {boolean} success - Whether job succeeded
 */
function registerJobEnd(jobId, executionTime, success) {
  queueDepth = Math.max(0, queueDepth - 1);
  
  // Add to execution times (keep last 20)
  executionTimes.push(executionTime);
  if (executionTimes.length > THRESHOLDS.MOVING_AVERAGE_WINDOW) {
    executionTimes.shift();
  }
  
  // Add to job results (keep last 20)
  jobResults.push(success);
  if (jobResults.length > THRESHOLDS.MOVING_AVERAGE_WINDOW) {
    jobResults.shift();
  }
  
  // Track consecutive errors
  if (success) {
    consecutiveErrors = 0;
  } else {
    consecutiveErrors++;
  }
  
  // Update state based on metrics
  updateLoadState();
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ExecutionGovernor] Job ended: ${jobId}, Time: ${executionTime}ms, Success: ${success}`);
    console.log(`[ExecutionGovernor] Current state: ${currentState}, Avg time: ${getAverageExecutionTime()}ms`);
  }
}

/**
 * Calculate moving average of execution times
 * @returns {number} - Average execution time in ms
 */
function getAverageExecutionTime() {
  if (executionTimes.length === 0) return 0;
  const sum = executionTimes.reduce((a, b) => a + b, 0);
  return Math.round(sum / executionTimes.length);
}

/**
 * Calculate error rate from last 20 jobs
 * @returns {number} - Error rate (0-1)
 */
function getErrorRate() {
  if (jobResults.length === 0) return 0;
  const errors = jobResults.filter(r => !r).length;
  return errors / jobResults.length;
}

/**
 * Determine the current load state based on metrics
 * @returns {string} - Current load state
 */
function determineLoadState() {
  const avgTime = getAverageExecutionTime();
  const errorRate = getErrorRate();
  
  // Check for safe mode conditions first (highest priority)
  if (consecutiveErrors >= THRESHOLDS.CONSECUTIVE_ERROR_LIMIT) {
    return LOAD_STATES.SAFE_MODE;
  }
  
  if (errorRate > THRESHOLDS.ERROR_RATE_LIMIT) {
    return LOAD_STATES.SAFE_MODE;
  }
  
  // Check for critical load
  if (avgTime > THRESHOLDS.CRITICAL_TIME) {
    return LOAD_STATES.CRITICAL;
  }
  
  // Check for high load
  if (avgTime > THRESHOLDS.HIGH_LOAD_TIME) {
    return LOAD_STATES.HIGH_LOAD;
  }
  
  // Normal state
  return LOAD_STATES.NORMAL;
}

/**
 * Update the load state if it has changed
 */
function updateLoadState() {
  const newState = determineLoadState();
  
  if (newState !== currentState) {
    const oldState = currentState;
    currentState = newState;
    lastStateChangeTime = Date.now();
    
    // Check for stability (returning to NORMAL)
    if (newState === LOAD_STATES.NORMAL) {
      if (isStable) {
        lastStableTime = Date.now();
      } else {
        // Was unstable, now stable
        isStable = true;
        lastStableTime = Date.now();
      }
    } else {
      isStable = false;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ExecutionGovernor] State transition: ${oldState} -> ${newState}`);
      console.log(`[ExecutionGovernor] Avg time: ${getAverageExecutionTime()}ms, Error rate: ${(getErrorRate() * 100).toFixed(1)}%`);
    }
  }
  
  // Check for auto-recovery (stable for 60 seconds)
  if (currentState !== LOAD_STATES.NORMAL && isStable) {
    const timeSinceStable = Date.now() - lastStableTime;
    if (timeSinceStable >= THRESHOLDS.STABILITY_COOLDOWN) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ExecutionGovernor] System stable for 60s, returning to NORMAL');
      }
      currentState = LOAD_STATES.NORMAL;
      lastStateChangeTime = Date.now();
    }
  }
}

/**
 * Get the current system load state
 * @returns {Object} - Current load state and metrics
 */
function getSystemLoadState() {
  updateLoadState();  // Ensure state is current
  
  const avgTime = getAverageExecutionTime();
  const errorRate = getErrorRate();
  const config = LOAD_CONFIG[currentState];
  
  return {
    state: currentState,
    metrics: {
      avgExecutionTime: avgTime,
      errorRate: errorRate,
      queueDepth: queueDepth,
      consecutiveErrors: consecutiveErrors,
      jobsInWindow: jobResults.length
    },
    config: config,
    thresholds: {
      highLoadTime: THRESHOLDS.HIGH_LOAD_TIME,
      criticalTime: THRESHOLDS.CRITICAL_TIME,
      errorRateLimit: THRESHOLDS.ERROR_RATE_LIMIT,
      consecutiveErrorLimit: THRESHOLDS.CONSECUTIVE_ERROR_LIMIT
    }
  };
}

/**
 * Get current concurrency setting
 * @returns {number} - Number of concurrent jobs allowed
 */
function getConcurrency() {
  updateLoadState();
  return LOAD_CONFIG[currentState].concurrency;
}

/**
 * Get delay between jobs
 * @returns {number} - Delay in ms
 */
function getDelayBetweenJobs() {
  updateLoadState();
  return LOAD_CONFIG[currentState].delayBetweenJobs;
}

/**
 * Check if system should accept new jobs
 * @returns {boolean} - Whether new jobs can be accepted
 */
function shouldAcceptJobs() {
  updateLoadState();
  return currentState !== LOAD_STATES.SAFE_MODE || queueDepth === 0;
}

/**
 * Get wait time before next job (for SAFE_MODE)
 * @returns {number} - Wait time in ms
 */
function getWaitTime() {
  if (currentState === LOAD_STATES.SAFE_MODE) {
    return THRESHOLDS.STABILITY_COOLDOWN;  // Wait 60s in safe mode
  }
  return getDelayBetweenJobs();
}

/**
 * Reset all metrics (for testing)
 */
function resetMetrics() {
  executionTimes = [];
  jobResults = [];
  queueDepth = 0;
  consecutiveErrors = 0;
  currentState = LOAD_STATES.NORMAL;
  lastStateChangeTime = Date.now();
  lastStableTime = Date.now();
  isStable = true;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ExecutionGovernor] Metrics reset');
  }
}

/**
 * Get configuration for a specific state
 * @param {string} state - Load state
 * @returns {Object} - State configuration
 */
function getConfigForState(state) {
  return LOAD_CONFIG[state] || LOAD_CONFIG[LOAD_STATES.NORMAL];
}

module.exports = {
  registerJobStart,
  registerJobEnd,
  getSystemLoadState,
  getConcurrency,
  getDelayBetweenJobs,
  shouldAcceptJobs,
  getWaitTime,
  getAverageExecutionTime,
  getErrorRate,
  resetMetrics,
  getConfigForState,
  LOAD_STATES,
  LOAD_CONFIG,
  THRESHOLDS
};
