/**
 * OVERLORD ELITE MODE - Phase 9
 * Predictive Behavior Engine
 * 
 * Lightweight prediction from recent job patterns
 * No ML, no external libs, no background workers
 */

// Keep only last 10 jobs in memory
const jobHistory = [];
const MAX_HISTORY = 10;

// Thresholds for pattern detection
const HEAVY_THRESHOLD_MS = 120000; // 2 minutes
const LIGHT_THRESHOLD_MS = 30000;  // 30 seconds

/**
 * Record a job completion
 * @param {Object} jobMetrics - Job metrics
 */
function recordJob(jobMetrics = {}) {
  const { duration = 0, size = 'medium', success = true } = jobMetrics;
  
  jobHistory.push({
    duration,
    size,
    success,
    timestamp: Date.now()
  });
  
  // Keep only last MAX_HISTORY jobs
  if (jobHistory.length > MAX_HISTORY) {
    jobHistory.shift();
  }
}

/**
 * Get prediction based on recent job patterns
 * @returns {string} "HEAVY_PATTERN" | "LIGHT_PATTERN" | "NORMAL"
 */
function getPrediction() {
  // Need at least 5 jobs to detect pattern
  if (jobHistory.length < 5) {
    return 'NORMAL';
  }
  
  // Get last 5 jobs
  const recentJobs = jobHistory.slice(-5);
  
  // Calculate average duration of last 5 jobs
  const totalDuration = recentJobs.reduce((sum, job) => sum + job.duration, 0);
  const avgDuration = totalDuration / recentJobs.length;
  
  if (avgDuration > HEAVY_THRESHOLD_MS) {
    return 'HEAVY_PATTERN';
  }
  
  if (avgDuration < LIGHT_THRESHOLD_MS) {
    return 'LIGHT_PATTERN';
  }
  
  return 'NORMAL';
}

/**
 * Get current job history
 * @returns {Array} Job history
 */
function getHistory() {
  return [...jobHistory];
}

/**
 * Clear history (for testing)
 */
function clearHistory() {
  jobHistory.length = 0;
}

module.exports = {
  recordJob,
  getPrediction,
  getHistory,
  clearHistory,
  MAX_HISTORY,
  HEAVY_THRESHOLD_MS,
  LIGHT_THRESHOLD_MS
};
