/**
 * OVERLORD ELITE MODE - Phase 1
 * Predictive Load Forecast Service
 * 
 * Responsibilities:
 * - Maintain CPU/memory readings history
 * - Calculate load trend
 * - Predict future load state
 * - Lightweight statistical analysis
 * 
 * Optimized for: Ryzen 3 (8GB RAM)
 */

const MAX_HISTORY = 20;

// CPU and memory history arrays
const cpuHistory = [];
const memoryHistory = [];

/**
 * Record current system metrics
 * @param {number} cpu - CPU usage percentage (0-100)
 * @param {number} memory - Memory usage percentage (0-100)
 */
function recordSystemMetrics(cpu, memory) {
  // Add to history
  cpuHistory.push(cpu);
  memoryHistory.push(memory);
  
  // Trim to max history
  if (cpuHistory.length > MAX_HISTORY) {
    cpuHistory.shift();
  }
  if (memoryHistory.length > MAX_HISTORY) {
    memoryHistory.shift();
  }
}

/**
 * Calculate trend from history using simple linear regression
 * @param {Array} history - Array of percentage values
 * @returns {string} "increasing", "stable", or "decreasing"
 */
function calculateTrend(history) {
  if (history.length < 3) {
    return 'stable';
  }
  
  // Get last N readings for trend analysis
  const recent = history.slice(-5);
  if (recent.length < 3) {
    return 'stable';
  }
  
  // Simple slope calculation
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = recent.length;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Threshold for trend detection
  if (slope > 2) {
    return 'increasing';
  } else if (slope < -2) {
    return 'decreasing';
  }
  return 'stable';
}

/**
 * Get current load trend
 * @returns {Object} Trend information for CPU and memory
 */
function getLoadTrend() {
  const cpuTrend = calculateTrend(cpuHistory);
  const memoryTrend = calculateTrend(memoryHistory);
  
  // Determine overall trend
  let overallTrend = 'stable';
  if (cpuTrend === 'increasing' || memoryTrend === 'increasing') {
    overallTrend = 'increasing';
  } else if (cpuTrend === 'decreasing' && memoryTrend === 'decreasing') {
    overallTrend = 'decreasing';
  }
  
  return {
    cpu: cpuTrend,
    memory: memoryTrend,
    overall: overallTrend,
    cpuHistory: cpuHistory.slice(-5),
    memoryHistory: memoryHistory.slice(-5)
  };
}

/**
 * Predict next load state
 * @returns {string} "stable", "rising", or "critical-soon"
 */
function predictLoadState() {
  // Need enough history
  if (cpuHistory.length < 5 || memoryHistory.length < 5) {
    return 'stable';
  }
  
  const trends = getLoadTrend();
  const currentCpu = cpuHistory[cpuHistory.length - 1];
  const currentMemory = memoryHistory[memoryHistory.length - 1];
  
  // Get average of recent readings
  const recentCpu = cpuHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const recentMemory = memoryHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  // Predict next values based on trend
  let predictedCpu = recentCpu;
  let predictedMemory = recentMemory;
  
  if (trends.cpu === 'increasing') {
    predictedCpu += 10;
  } else if (trends.cpu === 'decreasing') {
    predictedCpu -= 5;
  }
  
  if (trends.memory === 'increasing') {
    predictedMemory += 10;
  } else if (trends.memory === 'decreasing') {
    predictedMemory -= 5;
  }
  
  // Clamp values
  predictedCpu = Math.max(0, Math.min(100, predictedCpu));
  predictedMemory = Math.max(0, Math.min(100, predictedMemory));
  
  // Determine forecast
  let forecast = 'stable';
  
  // Critical soon if either metric is high or rising fast
  if (predictedCpu >= 85 || predictedMemory >= 85) {
    forecast = 'critical-soon';
  } else if (trends.overall === 'increasing' && (currentCpu > 60 || currentMemory > 60)) {
    forecast = 'rising';
  } else if (trends.overall === 'increasing') {
    forecast = 'rising';
  }
  
  return forecast;
}

/**
 * Get predictive status
 * @returns {Object} Full predictive status
 */
function getPredictiveStatus() {
  const trends = getLoadTrend();
  const forecast = predictLoadState();
  
  return {
    forecast,
    trend: trends.overall,
    cpu: {
      current: cpuHistory.length > 0 ? cpuHistory[cpuHistory.length - 1] : 0,
      trend: trends.cpu,
      history: trends.cpuHistory
    },
    memory: {
      current: memoryHistory.length > 0 ? memoryHistory[memoryHistory.length - 1] : 0,
      trend: trends.memory,
      history: trends.memoryHistory
    },
    historyLength: cpuHistory.length
  };
}

/**
 * Clear history (for testing)
 */
function clearHistory() {
  cpuHistory.length = 0;
  memoryHistory.length = 0;
}

module.exports = {
  recordSystemMetrics,
  getLoadTrend,
  predictLoadState,
  getPredictiveStatus,
  clearHistory
};
