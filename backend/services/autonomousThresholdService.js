/**
 * OVERLORD ELITE MODE - Phase 2
 * Autonomous Threshold Self-Tuning Service
 * 
 * Automatically adjusts CPU and memory thresholds based on runtime stability
 * No external dependencies - lightweight in-memory implementation
 */

const logger = require('../utils/logger');

// Default thresholds
const DEFAULT_CPU_THRESHOLD = 70; // 70%
const DEFAULT_MEMORY_THRESHOLD = 85; // 85%
const MAX_THRESHOLD = 90; // Cap at 90%

// Internal metrics (memory only - no DB)
const state = {
  cpuThreshold: DEFAULT_CPU_THRESHOLD,
  memoryThreshold: DEFAULT_MEMORY_THRESHOLD,
  overloadEvents: [], // Timestamps of overload events
  stableCycles: 0,
  lastAdjustmentTime: 0,
  adjustmentCooldown: 2 * 60 * 1000, // 2 minutes
  lastOverloadCheck: 0
};

// Constants
const OVERLOAD_WINDOW = 5 * 60 * 1000; // 5 minutes
const STABILITY_WINDOW = 10 * 60 * 1000; // 10 minutes
const STABLE_CYCLES_THRESHOLD = 20;
const OVERLOAD_EVENTS_THRESHOLD = 3;
const EVALUATION_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Clean old overload events outside the window
 */
function cleanOldOverloadEvents() {
  const now = Date.now();
  state.overloadEvents = state.overloadEvents.filter(
    timestamp => now - timestamp < OVERLOAD_WINDOW
  );
}

/**
 * Record an overload event
 * Called when system detects high CPU/memory usage
 */
function recordOverloadEvent() {
  const now = Date.now();
  state.overloadEvents.push(now);
  cleanOldOverloadEvents();
  
  logger.warn('Overload event recorded', {
    overloadEventsCount: state.overloadEvents.length,
    cpuThreshold: state.cpuThreshold,
    memoryThreshold: state.memoryThreshold
  });
  
  return {
    overloadEventsCount: state.overloadEvents.length,
    cpuThreshold: state.cpuThreshold,
    memoryThreshold: state.memoryThreshold
  };
}

/**
 * Record a stable cycle
 * Called when system runs without overload
 */
function recordStableCycle() {
  state.stableCycles++;
  
  return {
    stableCyclesCount: state.stableCycles,
    cpuThreshold: state.cpuThreshold,
    memoryThreshold: state.memoryThreshold
  };
}

/**
 * Get current thresholds
 */
function getCurrentThresholds() {
  return {
    cpuThreshold: state.cpuThreshold,
    memoryThreshold: state.memoryThreshold,
    overloadEventsCount: state.overloadEvents.length,
    stableCyclesCount: state.stableCycles,
    maxThreshold: MAX_THRESHOLD
  };
}

/**
 * Check if system has been stable for required window
 */
function hasStableHistory() {
  const now = Date.now();
  cleanOldOverloadEvents();
  
  // Check if no overload in last 10 minutes
  if (state.overloadEvents.length === 0) {
    const timeSinceLastAdjustment = now - state.lastAdjustmentTime;
    return timeSinceLastAdjustment >= STABILITY_WINDOW;
  }
  
  return false;
}

/**
 * Evaluate and adjust thresholds
 * Should be called every 30 seconds
 */
function evaluateAdjustment() {
  const now = Date.now();
  
  // Check cooldown
  if (now - state.lastAdjustmentTime < state.adjustmentCooldown) {
    return {
      adjusted: false,
      reason: 'cooldown',
      cpuThreshold: state.cpuThreshold,
      memoryThreshold: state.memoryThreshold
    };
  }
  
  cleanOldOverloadEvents();
  
  // Check for overload condition: >= 3 events in last 5 minutes
  if (state.overloadEvents.length >= OVERLOAD_EVENTS_THRESHOLD) {
    // Decrease thresholds by 5%
    state.cpuThreshold = Math.max(50, state.cpuThreshold - 5);
    state.memoryThreshold = Math.max(60, state.memoryThreshold - 5);
    state.overloadEvents = []; // Reset after adjustment
    state.stableCycles = 0; // Reset stable cycles
    state.lastAdjustmentTime = now;
    
    console.log(`[Autonomous] Threshold decreased to protect system: CPU ${state.cpuThreshold}%, Memory ${state.memoryThreshold}%`);
    logger.info('Autonomous threshold decreased', {
      cpuThreshold: state.cpuThreshold,
      memoryThreshold: state.memoryThreshold,
      reason: 'overload_protection'
    });
    
    return {
      adjusted: true,
      direction: 'decreased',
      reason: 'overload_protection',
      cpuThreshold: state.cpuThreshold,
      memoryThreshold: state.memoryThreshold
    };
  }
  
  // Check for stability: >= 20 stable cycles AND no overload in 10 minutes
  if (state.stableCycles >= STABLE_CYCLES_THRESHOLD && hasStableHistory()) {
    // Increase thresholds by 3%, capped at MAX_THRESHOLD
    const newCpuThreshold = Math.min(MAX_THRESHOLD, state.cpuThreshold + 3);
    const newMemoryThreshold = Math.min(MAX_THRESHOLD, state.memoryThreshold + 3);
    
    // Only adjust if actually changed
    if (newCpuThreshold > state.cpuThreshold || newMemoryThreshold > state.memoryThreshold) {
      state.cpuThreshold = newCpuThreshold;
      state.memoryThreshold = newMemoryThreshold;
      state.lastAdjustmentTime = now;
      
      console.log(`[Autonomous] Threshold increased due to stability: CPU ${state.cpuThreshold}%, Memory ${state.memoryThreshold}%`);
      logger.info('Autonomous threshold increased', {
        cpuThreshold: state.cpuThreshold,
        memoryThreshold: state.memoryThreshold,
        reason: 'stability'
      });
      
      return {
        adjusted: true,
        direction: 'increased',
        reason: 'stability',
        cpuThreshold: state.cpuThreshold,
        memoryThreshold: state.memoryThreshold
      };
    }
  }
  
  return {
    adjusted: false,
    reason: 'no_change_needed',
    cpuThreshold: state.cpuThreshold,
    memoryThreshold: state.memoryThreshold,
    overloadEventsCount: state.overloadEvents.length,
    stableCyclesCount: state.stableCycles
  };
}

/**
 * Get current CPU threshold (for external use)
 */
function getCpuThreshold() {
  return state.cpuThreshold;
}

/**
 * Get current memory threshold (for external use)
 */
function getMemoryThreshold() {
  return state.memoryThreshold;
}

/**
 * Reset state (for testing/emergency)
 */
function reset() {
  state.cpuThreshold = DEFAULT_CPU_THRESHOLD;
  state.memoryThreshold = DEFAULT_MEMORY_THRESHOLD;
  state.overloadEvents = [];
  state.stableCycles = 0;
  state.lastAdjustmentTime = 0;
  
  logger.warn('Autonomous threshold service reset');
}

module.exports = {
  recordOverloadEvent,
  recordStableCycle,
  getCurrentThresholds,
  evaluateAdjustment,
  getCpuThreshold,
  getMemoryThreshold,
  reset,
  DEFAULT_CPU_THRESHOLD,
  DEFAULT_MEMORY_THRESHOLD,
  MAX_THRESHOLD
};
