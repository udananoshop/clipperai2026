/**
 * OVERLORD PRO MODE - Phase 3
 * Resource Monitor - Lightweight System Resource Tracking
 * 
 * Features:
 * - getMemoryUsage()
 * - getCPUUsage()
 * - isMemoryCritical()
 * - isCPUOverloaded()
 * - Uses process.memoryUsage()
 * - Uses os.loadavg()
 * - No external dependencies
 * 
 * Optimized for: Ryzen 3 (8GB RAM)
 */

const os = require('os');

// Configuration from environment - 8GB Enterprise Safe
const MEMORY_CRITICAL_THRESHOLD = parseInt(process.env.MEMORY_CRITICAL_THRESHOLD) || 85;
const CPU_CRITICAL_THRESHOLD = parseInt(process.env.CPU_CRITICAL_THRESHOLD) || 85;
const MEMORY_MODERATE_THRESHOLD = parseInt(process.env.MEMORY_MODERATE_THRESHOLD) || 70;
const CPU_MODERATE_THRESHOLD = parseInt(process.env.CPU_MODERATE_THRESHOLD) || 70;

// Production hardening thresholds (8GB Enterprise Safe) - Adjusted for 85% RAM safety
const MEMORY_PAUSE_THRESHOLD = 85;  // Pause new job intake at 85%
const MEMORY_COOLDOWN_THRESHOLD = 90;  // Force cooldown at 90%

/**
 * Get current memory usage percentage
 * @returns {number} Memory usage percentage (0-100)
 */
function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  const totalHeap = memUsage.heapTotal;
  const usedHeap = memUsage.heapUsed;
  
  if (totalHeap === 0) return 0;
  
  return Math.round((usedHeap / totalHeap) * 100);
}

/**
 * Get system memory usage (overall system, not just Node.js)
 * @returns {number} System memory usage percentage (0-100)
 */
function getSystemMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return Math.round((usedMem / totalMem) * 100);
}

/**
 * Get current CPU usage (1-minute load average)
 * @returns {number} CPU usage percentage (0-100, normalized to core count)
 */
function getCPUUsage() {
  const loadAvg = os.loadavg();
  const cpus = os.cpus().length;
  
  // Normalize load average to percentage
  // If load is 4 and we have 4 cores, that's 100%
  const normalizedLoad = (loadAvg[0] / cpus) * 100;
  
  return Math.min(100, Math.round(normalizedLoad));
}

/**
 * Check if memory is in critical state
 * @returns {boolean} True if memory usage >= threshold
 */
function isMemoryCritical() {
  const memUsage = getMemoryUsage();
  return memUsage >= MEMORY_CRITICAL_THRESHOLD;
}

/**
 * Check if CPU is overloaded
 * @returns {boolean} True if CPU usage >= threshold
 */
function isCPUOverloaded() {
  const cpuUsage = getCPUUsage();
  return cpuUsage >= CPU_CRITICAL_THRESHOLD;
}

/**
 * Check if memory is in moderate state
 * @returns {boolean} True if memory usage >= moderate threshold
 */
function isMemoryModerate() {
  const memUsage = getMemoryUsage();
  return memUsage >= MEMORY_MODERATE_THRESHOLD && memUsage < MEMORY_CRITICAL_THRESHOLD;
}

/**
 * Check if CPU is in moderate state
 * @returns {boolean} True if CPU usage >= moderate threshold
 */
function isCPUModerate() {
  const cpuUsage = getCPUUsage();
  return cpuUsage >= CPU_MODERATE_THRESHOLD && cpuUsage < CPU_CRITICAL_THRESHOLD;
}

/**
 * Get overall system health status
 * @returns {Object} Health status object
 */
function getSystemHealth() {
  const memUsage = getMemoryUsage();
  const cpuUsage = getCPUUsage();
  
  let mode = 'normal';
  
  if (isMemoryCritical() || isCPUOverloaded()) {
    mode = 'critical';
  } else if (isMemoryModerate() || isCPUModerate()) {
    mode = 'throttle';
  }
  
  return {
    memoryUsage: memUsage,
    cpuUsage: cpuUsage,
    mode,
    thresholds: {
      memoryCritical: MEMORY_CRITICAL_THRESHOLD,
      cpuCritical: CPU_CRITICAL_THRESHOLD,
      memoryModerate: MEMORY_MODERATE_THRESHOLD,
      cpuModerate: CPU_MODERATE_THRESHOLD
    },
    system: {
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      cpuCores: os.cpus().length,
      loadAverage: os.loadavg()
    }
  };
}

/**
 * Get detailed memory info
 * @returns {Object} Detailed memory information
 */
function getMemoryInfo() {
  const memUsage = process.memoryUsage();
  
  return {
    heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)) + 'MB',
    external: Math.round(memUsage.external / (1024 * 1024)) + 'MB',
    rss: Math.round(memUsage.rss / (1024 * 1024)) + 'MB',
    usagePercent: getMemoryUsage()
  };
}

/**
 * Resource Monitor API
 */
const resourceMonitor = {
  getMemoryUsage,
  getSystemMemoryUsage,
  getCPUUsage,
  isMemoryCritical,
  isCPUOverloaded,
  isMemoryModerate,
  isCPUModerate,
  getSystemHealth,
  getMemoryInfo,
  
  // Configuration accessors
  config: {
    MEMORY_CRITICAL_THRESHOLD,
    CPU_CRITICAL_THRESHOLD,
    MEMORY_MODERATE_THRESHOLD,
    CPU_MODERATE_THRESHOLD
  }
};

module.exports = resourceMonitor;
