/**
 * OVERLORD Phase 5 - System Metrics Service
 * Lightweight in-memory metrics tracking
 */

const logger = require('../utils/logger');

// In-memory metrics
const metrics = {
  totalJobsProcessed: 0,
  totalExecutionTime: 0,
  peakConcurrentJobs: 0,
  currentConcurrentJobs: 0,
  startTime: Date.now(),
  errorCount: 0,
  successCount: 0
};

/**
 * Record job start
 */
function recordJobStart() {
  metrics.currentConcurrentJobs++;
  
  // Update peak if needed
  if (metrics.currentConcurrentJobs > metrics.peakConcurrentJobs) {
    metrics.peakConcurrentJobs = metrics.currentConcurrentJobs;
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SystemMetrics] Job started, concurrent: ${metrics.currentConcurrentJobs}`);
  }
}

/**
 * Record job end
 * @param {number} executionTimeMs - Execution time in milliseconds
 * @param {boolean} success - Whether job succeeded
 */
function recordJobEnd(executionTimeMs, success = true) {
  metrics.currentConcurrentJobs = Math.max(0, metrics.currentConcurrentJobs - 1);
  metrics.totalJobsProcessed++;
  metrics.totalExecutionTime += executionTimeMs;
  
  if (success) {
    metrics.successCount++;
  } else {
    metrics.errorCount++;
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SystemMetrics] Job ended, execution: ${executionTimeMs}ms, concurrent: ${metrics.currentConcurrentJobs}`);
  }
}

/**
 * Get memory usage
 * @returns {Object} - Memory usage info
 */
function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rss: mem.rss,
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    heapUsagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100)
  };
}

/**
 * Get uptime in seconds
 * @returns {number} - Uptime in seconds
 */
function getUptime() {
  return Math.floor((Date.now() - metrics.startTime) / 1000);
}

/**
 * Get average execution time
 * @returns {number} - Average execution time in ms
 */
function getAvgExecutionTime() {
  if (metrics.totalJobsProcessed === 0) return 0;
  return Math.round(metrics.totalExecutionTime / metrics.totalJobsProcessed);
}

/**
 * Get error rate
 * @returns {number} - Error rate (0-1)
 */
function getErrorRate() {
  if (metrics.totalJobsProcessed === 0) return 0;
  return metrics.errorCount / metrics.totalJobsProcessed;
}

/**
 * Get all system metrics
 * @returns {Object} - Complete metrics object
 */
function getMetrics() {
  const mem = getMemoryUsage();
  
  return {
    uptime: formatUptime(getUptime()),
    memory: mem,
    totalJobsProcessed: metrics.totalJobsProcessed,
    avgExecutionTime: getAvgExecutionTime(),
    peakConcurrentJobs: metrics.peakConcurrentJobs,
    currentConcurrentJobs: metrics.currentConcurrentJobs,
    errorCount: metrics.errorCount,
    successCount: metrics.successCount,
    errorRate: getErrorRate()
  };
}

/**
 * Format uptime for display
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Reset metrics (for testing)
 */
function resetMetrics() {
  metrics.totalJobsProcessed = 0;
  metrics.totalExecutionTime = 0;
  metrics.peakConcurrentJobs = 0;
  metrics.currentConcurrentJobs = 0;
  metrics.startTime = Date.now();
  metrics.errorCount = 0;
  metrics.successCount = 0;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SystemMetrics] Metrics reset');
  }
}

/**
 * Get lightweight summary (for quick checks)
 * @returns {Object} - Summary metrics
 */
function getSummary() {
  const mem = getMemoryUsage();
  
  return {
    uptime: getUptime(),
    memoryMB: mem.heapUsedMB,
    totalJobsProcessed: metrics.totalJobsProcessed,
    avgExecutionTime: getAvgExecutionTime(),
    peakConcurrentJobs: metrics.peakConcurrentJobs
  };
}

module.exports = {
  recordJobStart,
  recordJobEnd,
  getMetrics,
  getSummary,
  getMemoryUsage,
  getUptime,
  getAvgExecutionTime,
  getErrorRate,
  resetMetrics
};
