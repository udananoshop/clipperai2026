/**
 * OVERLORD Phase 8 - Performance Guardian Service
 * Lightweight system monitoring & overload protection
 * 
 * Functions:
 * - getSystemLoad()
 * - detectOverload()
 * - throttleIfNeeded(job)
 * - getHealthMetrics()
 * 
 * Rules:
 * - Use Node.js built-in os module
 * - Monitor CPU load and Memory usage
 * - If overload: temporarily downgrade job priority
 * - Do NOT crash system
 * - No external packages
 */

const os = require('os');
const logger = require('../utils/logger');

// Load intelligence telemetry for logging
let telemetryService = null;
try {
  telemetryService = require('./intelligenceTelemetryService');
} catch (err) {
  // Service not available
}

// Configuration
const CONFIG = {
  // CPU thresholds
  CPU_HIGH_THRESHOLD: 0.85,      // 85% CPU usage
  CPU_MEDIUM_THRESHOLD: 0.70,    // 70% CPU usage
  
  // Memory thresholds
  MEMORY_HIGH_THRESHOLD: 0.90,  // 90% memory usage
  MEMORY_MEDIUM_THRESHOLD: 0.75, // 75% memory usage
  
  // Load average thresholds (1 min)
  LOAD_HIGH: 3.0,
  LOAD_MEDIUM: 2.0,
  
  // Overload duration tracking
  OVERLOAD_COOLDOWN_MS: 30000,  // 30 seconds cooldown
  CHECK_INTERVAL_MS: 5000       // Check every 5 seconds
};

// In-memory state
let isOverloaded = false;
let overloadStartTime = null;
let lastCheckTime = Date.now();
let consecutiveHighChecks = 0;

/**
 * Get current system load metrics
 * @returns {Object} - System load metrics
 */
function getSystemLoad() {
  try {
    const cpuLoad = os.loadavg();
    const cpuCount = os.cpus().length;
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = usedMemory / totalMemory;
    
    // Calculate CPU usage percentage (average across cores)
    const cpuPercent = cpuLoad[0] / cpuCount;
    
    return {
      cpu: {
        load1Min: cpuLoad[0],
        load5Min: cpuLoad[1],
        load15Min: cpuLoad[2],
        cpuCount,
        usagePercent: cpuPercent,
        status: getCpuStatus(cpuPercent)
      },
      memory: {
        totalMB: Math.round(totalMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        usagePercent: memoryPercent,
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        status: getMemoryStatus(memoryPercent)
      },
      process: {
        uptimeSeconds: process.uptime(),
        pid: process.pid,
        platform: os.platform()
      },
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      error: err.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Get CPU status based on usage
 * @param {number} cpuPercent - CPU usage percentage
 * @returns {string} - Status: 'low', 'medium', 'high', 'critical'
 */
function getCpuStatus(cpuPercent) {
  if (cpuPercent >= CONFIG.CPU_HIGH_THRESHOLD) return 'critical';
  if (cpuPercent >= CONFIG.CPU_MEDIUM_THRESHOLD) return 'high';
  return 'low';
}

/**
 * Get memory status based on usage
 * @param {number} memPercent - Memory usage percentage
 * @returns {string} - Status: 'low', 'medium', 'high', 'critical'
 */
function getMemoryStatus(memPercent) {
  if (memPercent >= CONFIG.MEMORY_HIGH_THRESHOLD) return 'critical';
  if (memPercent >= CONFIG.MEMORY_MEDIUM_THRESHOLD) return 'high';
  return 'low';
}

/**
 * Detect if system is overloaded
 * @returns {Object} - Overload detection result
 */
function detectOverload() {
  try {
    const load = getSystemLoad();
    
    // Check CPU overload
    const cpuOverloaded = load.cpu?.usagePercent >= CONFIG.CPU_HIGH_THRESHOLD;
    
    // Check memory overload
    const memOverloaded = load.memory?.usagePercent >= CONFIG.MEMORY_HIGH_THRESHOLD;
    
    // Check load average
    const loadOverloaded = load.cpu?.load1Min >= CONFIG.LOAD_HIGH;
    
    const overloaded = cpuOverloaded || memOverloaded || loadOverloaded;
    
    // Track consecutive high checks
    if (overloaded) {
      consecutiveHighChecks++;
      if (consecutiveHighChecks >= 3) {
        isOverloaded = true;
        overloadStartTime = Date.now();
      }
    } else {
      consecutiveHighChecks = 0;
      isOverloaded = false;
      overloadStartTime = null;
    }
    
    // Check cooldown
    if (isOverloaded && overloadStartTime) {
      const overloadDuration = Date.now() - overloadStartTime;
      if (overloadDuration >= CONFIG.OVERLOAD_COOLDOWN_MS) {
        isOverloaded = false;
        overloadStartTime = null;
        consecutiveHighChecks = 0;
      }
    }
    
    lastCheckTime = Date.now();
    
    return {
      overloaded,
      isOverloaded,
      cpuOverloaded,
      memOverloaded,
      loadOverloaded,
      load,
      overloadDuration: overloadStartTime ? Date.now() - overloadStartTime : 0,
      consecutiveChecks: consecutiveHighChecks
    };
  } catch (err) {
    return {
      overloaded: false,
      error: err.message
    };
  }
}

/**
 * Throttle job if system is overloaded
 * @param {Object} job - Job object
 * @returns {Object} - Throttle decision
 */
function throttleIfNeeded(job) {
  try {
    const overload = detectOverload();
    
    if (!overload.overloaded) {
      return {
        shouldThrottle: false,
        reason: 'system_normal',
        originalPriority: job.priorityLevel || job.priority_level || 'medium',
        recommendedPriority: null
      };
    }
    
    // Determine priority downgrade
    const originalPriority = job.priorityLevel || job.priority_level || 'medium';
    let recommendedPriority = originalPriority;
    
    // Downgrade high to medium, medium to low
    if (originalPriority === 'high') {
      recommendedPriority = 'medium';
    } else if (originalPriority === 'medium') {
      recommendedPriority = 'low';
    }
    
    // Log telemetry if available
    if (telemetryService) {
      try {
        telemetryService.logSystemTelemetry('job_throttled', {
          jobId: job.id || job.jobId,
          originalPriority,
          recommendedPriority,
          overload: overload.load
        });
      } catch (teleErr) {
        // Non-blocking
      }
    }
    
    logger.warn('[PerformanceGuardian] Job throttled due to overload', {
      jobId: job.id || job.jobId,
      originalPriority,
      recommendedPriority,
      cpuLoad: overload.load?.cpu?.usagePercent,
      memLoad: overload.load?.memory?.usagePercent
    });
    
    return {
      shouldThrottle: true,
      reason: 'system_overloaded',
      originalPriority,
      recommendedPriority,
      overloadDetails: {
        cpuPercent: overload.load?.cpu?.usagePercent,
        memPercent: overload.load?.memory?.usagePercent,
        load1Min: overload.load?.cpu?.load1Min,
        overloadDuration: overload.overloadDuration
      }
    };
  } catch (err) {
    return {
      shouldThrottle: false,
      reason: 'error_checking',
      error: err.message
    };
  }
}

/**
 * Get health metrics summary
 * @returns {Object} - Health metrics
 */
function getHealthMetrics() {
  try {
    const load = getSystemLoad();
    const overload = detectOverload();
    
    // Determine overall health status
    let status = 'healthy';
    if (overload.overloaded) {
      status = 'degraded';
    }
    if (load.cpu?.status === 'critical' || load.memory?.status === 'critical') {
      status = 'critical';
    }
    
    return {
      status,
      isOverloaded: overload.overloaded,
      system: load,
      thresholds: {
        cpuHigh: CONFIG.CPU_HIGH_THRESHOLD,
        cpuMedium: CONFIG.CPU_MEDIUM_THRESHOLD,
        memHigh: CONFIG.MEMORY_HIGH_THRESHOLD,
        memMedium: CONFIG.MEMORY_MEDIUM_THRESHOLD,
        loadHigh: CONFIG.LOAD_HIGH
      },
      lastCheck: lastCheckTime,
      uptime: os.uptime(),
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'unknown',
      error: err.message
    };
  }
}

/**
 * Get configuration
 * @returns {Object} - Current config
 */
function getConfig() {
  return { ...CONFIG };
}

module.exports = {
  getSystemLoad,
  detectOverload,
  throttleIfNeeded,
  getHealthMetrics,
  getConfig,
  CONFIG
};
