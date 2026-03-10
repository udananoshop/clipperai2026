/**
 * OVERLORD ELITE MODE - Phase 8
 * Performance Guardian Layer
 * 
 * Pure function for evaluating system pressure
 * No timers, no internal state
 */

const { config } = require('./systemConfig');

/**
 * Evaluate system pressure and adjust concurrency
 * @param {Object} systemMetrics - Current system metrics
 * @returns {Object} Adjusted concurrency and reason
 */
function evaluateSystemPressure(systemMetrics = {}) {
  const { cpuUsage = 0, memoryUsage = 0, currentConcurrency = 1 } = systemMetrics;
  
  let newConcurrency = currentConcurrency;
  let reason = 'unchanged';
  
  const maxConcurrency = config.MAX_CONCURRENT_JOBS || 3;
  const minConcurrency = 1;
  
  // High memory pressure - reduce concurrency
  if (memoryUsage > 80) {
    newConcurrency = Math.max(minConcurrency, currentConcurrency - 1);
    reason = 'memory_high';
  }
  // High CPU pressure - reduce concurrency
  else if (cpuUsage > 85) {
    newConcurrency = Math.max(minConcurrency, currentConcurrency - 1);
    reason = 'cpu_high';
  }
  // Low pressure - can increase concurrency
  else if (memoryUsage < 60 && cpuUsage < 50) {
    newConcurrency = Math.min(maxConcurrency, currentConcurrency + 1);
    reason = 'low_pressure';
  }
  
  return {
    concurrency: newConcurrency,
    reason,
    previousConcurrency: currentConcurrency,
    adjusted: newConcurrency !== currentConcurrency
  };
}

module.exports = {
  evaluateSystemPressure
};
