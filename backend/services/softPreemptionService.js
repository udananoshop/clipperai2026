/**
 * OVERLORD ELITE MODE - Phase 4
 * Soft Preemption Engine
 * 
 * Adaptive concurrency reduction during system stress
 * Never kills running jobs - only affects next scheduling cycle
 * Lightweight - no setInterval spam
 */

const logger = require('../utils/logger');

// Configuration
const CPU_HIGH_THRESHOLD = 85;
const MEMORY_HIGH_THRESHOLD = 88;
const CPU_LOW_THRESHOLD = 60;
const MEMORY_LOW_THRESHOLD = 70;
const STABILITY_WINDOW_MS = 30000; // 30 seconds

// State
let lastCheckTime = 0;
let stableStartTime = 0;
let isStable = false;

// Default preemption state
const preemptionState = {
  currentConcurrency: 3, // Will be overridden by base
  isReduced: false
};

/**
 * Evaluate system conditions and adjust concurrency
 * @param {Object} systemMetrics - CPU and memory usage
 * @param {number} baseConcurrency - Maximum base concurrency
 * @returns {Object} Updated concurrency state
 */
function evaluatePreemption(systemMetrics = {}, baseConcurrency = 3) {
  const now = Date.now();
  
  // Only evaluate every 5 seconds to avoid spam
  if (now - lastCheckTime < 5000 && lastCheckTime > 0) {
    return {
      concurrency: preemptionState.currentConcurrency,
      isReduced: preemptionState.isReduced,
      reason: 'throttled'
    };
  }
  
  lastCheckTime = now;
  
  const cpuUsage = systemMetrics.cpuUsage || 0;
  const memoryUsage = systemMetrics.memoryUsage || 0;
  
  let newConcurrency = preemptionState.currentConcurrency;
  let reason = 'unchanged';
  
  // Check for high stress - reduce concurrency
  if (cpuUsage > CPU_HIGH_THRESHOLD || memoryUsage > MEMORY_HIGH_THRESHOLD) {
    if (newConcurrency > 1) {
      newConcurrency--;
      preemptionState.isReduced = true;
      stableStartTime = 0;
      isStable = false;
      reason = 'high_stress';
      
      console.log(`[Preemption] Reducing concurrency to ${newConcurrency} (CPU: ${cpuUsage}%, Mem: ${memoryUsage}%)`);
      logger.warn('Soft preemption triggered - reducing concurrency', {
        cpuUsage,
        memoryUsage,
        newConcurrency,
        baseConcurrency
      });
    }
  }
  // Check for stable low usage - restore concurrency
  else if (cpuUsage < CPU_LOW_THRESHOLD && memoryUsage < MEMORY_LOW_THRESHOLD) {
    if (!isStable) {
      stableStartTime = now;
      isStable = true;
    }
    
    // Check if stable for 30 seconds
    if (now - stableStartTime >= STABILITY_WINDOW_MS) {
      if (newConcurrency < baseConcurrency) {
        newConcurrency++;
        preemptionState.isReduced = newConcurrency < baseConcurrency;
        reason = 'stable_low';
        
        console.log(`[Preemption] Restoring concurrency to ${newConcurrency}`);
        logger.info('Soft preemption - restoring concurrency', {
          newConcurrency,
          baseConcurrency,
          stableDuration: now - stableStartTime
        });
      }
      
      // Reset stability tracking
      stableStartTime = now;
    }
  } else {
    // Not in either extreme - reset stability
    isStable = false;
    stableStartTime = 0;
  }
  
  preemptionState.currentConcurrency = newConcurrency;
  
  return {
    concurrency: newConcurrency,
    isReduced: preemptionState.isReduced,
    reason,
    cpuUsage,
    memoryUsage,
    stableDuration: isStable ? now - stableStartTime : 0
  };
}

/**
 * Get current preemption state
 * @returns {Object} Current state
 */
function getState() {
  return {
    currentConcurrency: preemptionState.currentConcurrency,
    isReduced: preemptionState.isReduced,
    isStable,
    stableDuration: isStable ? Date.now() - stableStartTime : 0
  };
}

/**
 * Reset state (for testing)
 */
function reset() {
  preemptionState.currentConcurrency = 3;
  preemptionState.isReduced = false;
  lastCheckTime = 0;
  stableStartTime = 0;
  isStable = false;
}

module.exports = {
  evaluatePreemption,
  getState,
  reset,
  CPU_HIGH_THRESHOLD,
  MEMORY_HIGH_THRESHOLD,
  CPU_LOW_THRESHOLD,
  MEMORY_LOW_THRESHOLD
};
