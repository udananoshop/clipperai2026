/**
 * OVERLORD ELITE MODE - Phase 7
 * Autonomous Recovery Brain
 * 
 * Automatic recovery stabilization
 * Triggers cooldown on system stress
 */

const logger = require('../utils/logger');

// Configuration
const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 120000; // 2 minutes
const MEMORY_CRITICAL_THRESHOLD = 92;
const CPU_CRITICAL_THRESHOLD = 90;
const COOLDOWN_DURATION_MS = 60000; // 60 seconds

// Recovery state
const recoveryState = {
  isInCooldown: false,
  cooldownStartTime: 0,
  previousConcurrency: 3,
  failureTimestamps: []
};

/**
 * Record a job failure
 */
function recordFailure() {
  const now = Date.now();
  
  // Add failure timestamp
  recoveryState.failureTimestamps.push(now);
  
  // Clean old failures outside window
  recoveryState.failureTimestamps = recoveryState.failureTimestamps.filter(
    ts => now - ts < FAILURE_WINDOW_MS
  );
}

/**
 * Check if should enter cooldown
 * @param {Object} systemMetrics - CPU and memory usage
 * @returns {boolean}
 */
function shouldEnterCooldown(systemMetrics = {}) {
  // Already in cooldown
  if (recoveryState.isInCooldown) {
    return false;
  }
  
  const now = Date.now();
  
  // Check failure count
  const recentFailures = recoveryState.failureTimestamps.filter(
    ts => now - ts < FAILURE_WINDOW_MS
  ).length;
  
  if (recentFailures >= FAILURE_THRESHOLD) {
    return true;
  }
  
  // Check memory
  if ((systemMetrics.memoryUsage || 0) > MEMORY_CRITICAL_THRESHOLD) {
    return true;
  }
  
  // Check CPU
  if ((systemMetrics.cpuUsage || 0) > CPU_CRITICAL_THRESHOLD) {
    return true;
  }
  
  return false;
}

/**
 * Enter cooldown mode
 * @param {number} currentConcurrency - Current concurrency level
 */
function enterCooldown(currentConcurrency) {
  recoveryState.isInCooldown = true;
  recoveryState.cooldownStartTime = Date.now();
  recoveryState.previousConcurrency = currentConcurrency;
  
  console.log('[Recovery] COOL_DOWN activated');
  logger.warn('Autonomous recovery - cooldown activated', {
    previousConcurrency: currentConcurrency,
    failuresInWindow: recoveryState.failureTimestamps.length
  });
}

/**
 * Check cooldown status and potentially exit
 * @returns {Object} Cooldown status
 */
function checkCooldown() {
  if (!recoveryState.isInCooldown) {
    return {
      isInCooldown: false,
      canAcceptJob: true,
      reason: 'normal'
    };
  }
  
  const elapsed = Date.now() - recoveryState.cooldownStartTime;
  
  if (elapsed >= COOLDOWN_DURATION_MS) {
    // Exit cooldown
    const previous = recoveryState.previousConcurrency;
    recoveryState.isInCooldown = false;
    recoveryState.failureTimestamps = [];
    
    console.log('[Recovery] System stabilized');
    logger.info('Autonomous recovery - system stabilized', {
      restoredConcurrency: previous
    });
    
    return {
      isInCooldown: false,
      canAcceptJob: true,
      reason: 'stabilized',
      restoredConcurrency: previous
    };
  }
  
  // Still in cooldown - only allow HIGH priority
  return {
    isInCooldown: true,
    remainingCooldown: COOLDOWN_DURATION_MS - elapsed,
    canAcceptJob: false,
    reason: 'cooldown'
  };
}

/**
 * Check if job can be accepted during cooldown
 * @param {string} priority - Job priority
 * @returns {boolean}
 */
function canAcceptJobDuringCooldown(priority) {
  if (!recoveryState.isInCooldown) {
    return true;
  }
  
  // Only HIGH priority jobs during cooldown
  return priority === 'high';
}

/**
 * Get recovery state
 */
function getState() {
  return {
    isInCooldown: recoveryState.isInCooldown,
    cooldownStartTime: recoveryState.cooldownStartTime,
    previousConcurrency: recoveryState.previousConcurrency,
    recentFailures: recoveryState.failureTimestamps.length
  };
}

/**
 * Reset recovery state (for testing)
 */
function reset() {
  recoveryState.isInCooldown = false;
  recoveryState.cooldownStartTime = 0;
  recoveryState.previousConcurrency = 3;
  recoveryState.failureTimestamps = [];
}

module.exports = {
  recordFailure,
  shouldEnterCooldown,
  enterCooldown,
  checkCooldown,
  canAcceptJobDuringCooldown,
  getState,
  reset,
  FAILURE_THRESHOLD,
  FAILURE_WINDOW_MS,
  MEMORY_CRITICAL_THRESHOLD,
  CPU_CRITICAL_THRESHOLD,
  COOLDOWN_DURATION_MS
};
