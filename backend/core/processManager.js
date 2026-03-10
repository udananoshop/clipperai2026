/**
 * OVERLORD PRO MODE - Phase 1
 * Process Manager - Lightweight Job Tracking
 * 
 * Responsibilities:
 * - Track active jobs in memory
 * - Monitor CPU-safe concurrency limit
 * - Prevent overload on low-RAM systems
 * - Zero heavy dependencies (no Redis, no clustering)
 * 
 * Optimized for: Ryzen 3 (8GB RAM)
 */

const logger = require('../utils/logger');
const { config } = require('./systemConfig');

// OVERLORD PRO MODE - Final Phase - Adaptive Execution
// OVERLORD ELITE MODE - Phase 1 - Predictive Load Service
let resourceMonitor = null;
let predictiveLoadService = null;

try {
  resourceMonitor = require('./resourceMonitor');
} catch (err) {
  console.warn('[ProcessManager] resourceMonitor not available');
}

try {
  predictiveLoadService = require('../services/predictiveLoadService');
  console.log('[ProcessManager] Predictive Load Service loaded');
} catch (err) {
  console.warn('[ProcessManager] predictiveLoadService not available');
}

// OVERLORD ELITE MODE - Phase 2 - Autonomous Threshold Service
let autonomousThreshold = null;

try {
  autonomousThreshold = require('../services/autonomousThresholdService');
  console.log('[ProcessManager] Autonomous Threshold Service loaded');
} catch (err) {
  console.warn('[ProcessManager] Autonomous Threshold Service not available');
}

// OVERLORD ELITE MODE - Phase 3 - Job Weight Engine
let jobWeightEngine = null;

try {
  jobWeightEngine = require('../services/jobWeightEngine');
  console.log('[ProcessManager] Job Weight Engine loaded');
} catch (err) {
  console.warn('[ProcessManager] Job Weight Engine not available');
}

// OVERLORD ELITE MODE - Phase 4 - Soft Preemption Service
let softPreemptionService = null;

try {
  softPreemptionService = require('../services/softPreemptionService');
  console.log('[EliteMode] Soft Preemption ENABLED');
} catch (err) {
  console.warn('[ProcessManager] Soft Preemption Service not available');
}

// OVERLORD ELITE MODE - Phase 5 - Concurrency Memory Service
let concurrencyMemoryService = null;

try {
  concurrencyMemoryService = require('../services/concurrencyMemoryService');
  console.log('[EliteMode] Concurrency Memory ACTIVE');
} catch (err) {
  console.warn('[ProcessManager] Concurrency Memory Service not available');
}

// OVERLORD ELITE MODE - Phase 6 - Intelligent Telemetry Service
let intelligentTelemetryService = null;

try {
  intelligentTelemetryService = require('../services/intelligentTelemetryService');
  console.log('[EliteMode] Intelligent Telemetry ENABLED');
} catch (err) {
  console.warn('[ProcessManager] Intelligent Telemetry Service not available');
}

// OVERLORD ELITE MODE - Phase 7 - Autonomous Recovery Service
let autonomousRecoveryService = null;

try {
  autonomousRecoveryService = require('../services/autonomousRecoveryService');
  console.log('[EliteMode] Autonomous Recovery ACTIVE');
} catch (err) {
  console.warn('[ProcessManager] Autonomous Recovery Service not available');
}

// OVERLORD ELITE MODE - Phase 8 - Performance Guardian
let performanceGuardian = null;

try {
  performanceGuardian = require('./performanceGuardian');
  console.log('[EliteMode] Phase 8 Performance Guardian ENABLED');
} catch (err) {
  console.warn('[ProcessManager] Performance Guardian not available');
}

// OVERLORD ELITE MODE - Phase 9 - Predictive Behavior Engine
let predictiveBehaviorEngine = null;

try {
  predictiveBehaviorEngine = require('./predictiveBehaviorEngine');
  console.log('[EliteMode] Phase 9 Predictive Behavior Engine ENABLED');
} catch (err) {
  console.warn('[ProcessManager] Predictive Behavior Engine not available');
}

// ============================================================================
// OVERLORD 8GB OPTIMIZATION PATCH - Memory Stability Mode
// ============================================================================

// 8GB Memory Profile Configuration
const MEMORY_8GB_PROFILE = {
  // Changed from 85% → 92% for hard pause threshold
  HARD_PAUSE_THRESHOLD: 92,
  // New soft throttle threshold at 88%
  SOFT_THROTTLE_THRESHOLD: 88,
  // Resolution limits when memory > 88%
  RESOLUTION_LIMITS: {
    youtube: { maxHeight: 720 },   // Was: 1080 → Now: 720
    tiktok: { maxHeight: 540 },    // Was: 720 → Now: 540
    instagram: { maxHeight: 540 }, // Was: 720 → Now: 540
    facebook: { maxHeight: 540 }   // Was: 720 → Now: 540
  },
  // Cooldown between renders: 2s → 4s
  RENDER_COOLDOWN_MS: 4000,
  // Sequential render mode enabled
  SEQUENTIAL_RENDER: true
};

console.log('==============================');
console.log('OVERLORD OPTIMIZATION MODE');
console.log('8GB SAFE PROFILE ACTIVE');
console.log(`Memory Adaptive Guard: ON (Hard: ${MEMORY_8GB_PROFILE.HARD_PAUSE_THRESHOLD}%, Soft: ${MEMORY_8GB_PROFILE.SOFT_THROTTLE_THRESHOLD}%)`);
console.log(`Sequential Render: ${MEMORY_8GB_PROFILE.SEQUENTIAL_RENDER ? 'ON' : 'OFF'}`);
console.log(`Render Cooldown: ${MEMORY_8GB_PROFILE.RENDER_COOLDOWN_MS}ms`);
console.log('==============================');

// Current render cooldown state
let currentRenderCooldown = 2000; // Default 2s
let lastRenderTime = 0;
let isInSoftThrottle = false;
let isInHardPause = false;

// Sequential render lock
let sequentialRenderLock = false;
let renderQueue = [];
let currentPlatformRender = null;

// Get/Set functions for 8GB profile
function get8GBProfile() {
  return MEMORY_8GB_PROFILE;
}

function getCurrentRenderCooldown() {
  return currentRenderCooldown;
}

function setRenderCooldown(ms) {
  currentRenderCooldown = ms;
  console.log(`[Optimization] Render cooldown updated: ${ms}ms`);
}

function isSequentialRenderMode() {
  return MEMORY_8GB_PROFILE.SEQUENTIAL_RENDER;
}

// Render queue management for sequential rendering
function acquireRenderLock(platform) {
  return new Promise((resolve, reject) => {
    if (!MEMORY_8GB_PROFILE.SEQUENTIAL_RENDER) {
      resolve(true);
      return;
    }
    
    // Wait for any existing render to complete
    const checkLock = setInterval(() => {
      if (!sequentialRenderLock) {
        clearInterval(checkLock);
        sequentialRenderLock = true;
        currentPlatformRender = platform;
        console.log(`[Optimization] Render lock acquired for: ${platform}`);
        resolve(true);
      }
    }, 100);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkLock);
      reject(new Error('Render lock timeout'));
    }, 30000);
  });
}

function releaseRenderLock(platform) {
  if (MEMORY_8GB_PROFILE.SEQUENTIAL_RENDER) {
    sequentialRenderLock = false;
    currentPlatformRender = null;
    lastRenderTime = Date.now();
    console.log(`[Optimization] Render lock released for: ${platform}`);
  }
}

function getSequentialRenderStatus() {
  return {
    isLocked: sequentialRenderLock,
    currentPlatform: currentPlatformRender,
    queueLength: renderQueue.length
  };
}

// Export 8GB optimization functions
const eightGBOptimization = {
  getProfile: get8GBProfile,
  getRenderCooldown: getCurrentRenderCooldown,
  setRenderCooldown: setRenderCooldown,
  isSequentialMode: isSequentialRenderMode,
  acquireRenderLock,
  releaseRenderLock,
  getRenderStatus: getSequentialRenderStatus
};

// ============================================================================
// END OVERLORD 8GB OPTIMIZATION PATCH
// ============================================================================

// Evaluation interval for autonomous threshold (30 seconds)
let lastThresholdEvaluation = 0;
const THRESHOLD_EVAL_INTERVAL = 30000;

/**
 * Active job tracking Map
 * Key: jobId, Value: { startTime, priority, metadata }
 */
const activeJobs = new Map();

/**
 * Job history for metrics (last 100 jobs)
 */
const jobHistory = [];
const MAX_HISTORY = 100;

// Base concurrency from config
let baseConcurrency = config.MAX_CONCURRENT_JOBS || 3;
let currentConcurrency = baseConcurrency;
let currentMode = 'normal';
let lastModeUpdate = 0;

/**
 * Update concurrency based on system load
 * @returns {Object} Updated concurrency info
 */
function updateConcurrency() {
  const now = Date.now();
  
  // Only update every 5 seconds to avoid excessive calculations
  if (now - lastModeUpdate < 5000 && lastModeUpdate > 0) {
    return {
      concurrency: currentConcurrency,
      mode: currentMode,
      baseConcurrency
    };
  }
  
  lastModeUpdate = now;
  
  // Get system health if available
  let cpuLoad = 0;
  let memoryUsage = 0;
  
  if (resourceMonitor) {
    try {
      const health = resourceMonitor.getSystemHealth();
      cpuLoad = health.cpuUsage;
      memoryUsage = health.memoryUsage;
    } catch (err) {
      // Use defaults
    }
  }
  
  // Record metrics for predictive service
  if (predictiveLoadService) {
    try {
      predictiveLoadService.recordSystemMetrics(cpuLoad, memoryUsage);
      const forecast = predictiveLoadService.predictLoadState();
      const trends = predictiveLoadService.getLoadTrend();
      
      if (trends.overall !== 'stable') {
        console.log(`[Predictive] Trend: ${trends.overall}`);
      }
      if (forecast !== 'stable') {
        console.log(`[Predictive] Forecast: ${forecast}`);
      }
    } catch (err) {}
  }
  
  let newMode = 'normal';
  let newConcurrency = baseConcurrency;
  
  // Get predictive forecast
  let forecast = 'stable';
  if (predictiveLoadService) {
    try { forecast = predictiveLoadService.predictLoadState(); } 
    catch (err) { forecast = 'stable'; }
  }
  
  // Get thresholds from autonomous service if available
  let cpuThreshold = 70;
  let memoryThreshold = 85;
  
  if (autonomousThreshold) {
    try {
      const thresholds = autonomousThreshold.getCurrentThresholds();
      cpuThreshold = thresholds.cpuThreshold;
      memoryThreshold = thresholds.memoryThreshold;
    } catch (err) {
      // Use defaults
    }
  }
  
  // Apply predictive adjustments using dynamic thresholds
  if (forecast === 'critical-soon') {
    newMode = 'critical';
    newConcurrency = 1;
    
    // Record overload event
    if (autonomousThreshold) {
      try { autonomousThreshold.recordOverloadEvent(); } catch (err) {}
    }
  } else if (forecast === 'rising') {
    newMode = 'safe';
    newConcurrency = Math.max(1, Math.floor(baseConcurrency / 2));
  } else if (cpuLoad > cpuThreshold || memoryUsage >= memoryThreshold) {
    newMode = 'critical';
    newConcurrency = 1;
    
    // Record overload event
    if (autonomousThreshold) {
      try { autonomousThreshold.recordOverloadEvent(); } catch (err) {}
    }
  } else if (cpuLoad > 40 || memoryUsage >= 70) {
    newMode = 'safe';
    newConcurrency = Math.max(1, Math.floor(baseConcurrency / 2));
  } else if (cpuLoad < 40 && memoryUsage < 60) {
    newMode = 'boost';
    newConcurrency = Math.min(baseConcurrency + 1, 6);
    
    // Record stable cycle
    if (autonomousThreshold) {
      try { autonomousThreshold.recordStableCycle(); } catch (err) {}
    }
  } else {
    newMode = 'normal';
    newConcurrency = baseConcurrency;
    
    // Record stable cycle
    if (autonomousThreshold) {
      try { autonomousThreshold.recordStableCycle(); } catch (err) {}
    }
  }
  
  // OVERLORD ELITE MODE - Phase 4 - Apply Soft Preemption
  if (softPreemptionService) {
    try {
      const preemptionResult = softPreemptionService.evaluatePreemption(
        { cpuUsage: cpuLoad, memoryUsage: memoryUsage },
        newConcurrency
      );
      // Use preemption-adjusted concurrency (never below 1)
      newConcurrency = Math.max(1, preemptionResult.concurrency);
    } catch (err) {
      // Ignore preemption errors
    }
  }
  
  // Evaluate autonomous threshold adjustment every 30 seconds
  if (autonomousThreshold && now - lastThresholdEvaluation >= THRESHOLD_EVAL_INTERVAL) {
    lastThresholdEvaluation = now;
    try {
      autonomousThreshold.evaluateAdjustment();
    } catch (err) {
      // Ignore evaluation errors
    }
  }
  
  // Update if mode changed
  if (newMode !== currentMode) {
    currentMode = newMode;
    console.log(`[Execution Mode] ${currentMode.toUpperCase()} (cpu: ${cpuLoad}%, mem: ${memoryUsage}%, concurrency: ${newConcurrency})`);
    logger.info('Execution mode changed', { mode: newMode, cpuLoad, memoryUsage, concurrency: newConcurrency });
  }
  
  currentConcurrency = newConcurrency;
  
  return {
    concurrency: currentConcurrency,
    mode: currentMode,
    baseConcurrency,
    cpuLoad,
    memoryUsage
  };
}

/**
 * Get current execution mode
 * @returns {string} "boost" | "normal" | "safe" | "critical"
 */
function getExecutionMode() {
  updateConcurrency();
  return currentMode;
}

/**
 * Process Manager API
 */
const processManager = {
  /**
   * Register a new job
   * @param {string} jobId - Unique job identifier
   * @param {Object} metadata - Job metadata (priority, type, etc.)
   * @returns {Object} Registration result
   */
  registerJob(jobId, metadata = {}) {
    const now = Date.now();
    
    // Check concurrency limit
    const activeCount = activeJobs.size;
    const maxJobs = config.MAX_CONCURRENT_JOBS;
    
    if (activeCount >= maxJobs) {
      logger.warn('Job rejected: concurrency limit reached', {
        jobId,
        activeCount,
        maxJobs,
        limit: maxJobs
      });
      
      return {
        success: false,
        reason: 'concurrency_limit_reached',
        activeCount,
        maxJobs,
        waitTime: config.JOB_RETRY_DELAY
      };
    }
    
    // Register job
    activeJobs.set(jobId, {
      jobId,
      startTime: now,
      priority: metadata.priority || 'medium',
      type: metadata.type || 'unknown',
      metadata
    });
    
    // Log in development
    if (config.isDev) {
      console.log(`[ProcessManager] Job registered: ${jobId} (${activeCount + 1}/${maxJobs})`);
    }
    
    logger.info('Job registered', {
      jobId,
      activeCount: activeJobs.size,
      maxJobs,
      priority: metadata.priority
    });
    
    return {
      success: true,
      jobId,
      activeCount: activeJobs.size,
      maxJobs
    };
  },
  
  /**
   * Complete a job
   * @param {string} jobId - Job identifier
   * @param {Object} result - Job result data
   * @returns {Object} Completion result
   */
  completeJob(jobId, result = {}) {
    const job = activeJobs.get(jobId);
    
    if (!job) {
      logger.warn('Job not found for completion', { jobId });
      return {
        success: false,
        reason: 'job_not_found'
      };
    }
    
    const endTime = Date.now();
    const executionTime = endTime - job.startTime;
    
    // Remove from active jobs
    activeJobs.delete(jobId);
    
    // Add to history
    jobHistory.push({
      jobId,
      startTime: job.startTime,
      endTime,
      executionTime,
      priority: job.priority,
      type: job.type,
      status: 'completed',
      ...result
    });
    
    // Trim history if needed
    if (jobHistory.length > MAX_HISTORY) {
      jobHistory.shift();
    }
    
    if (config.isDev) {
      console.log(`[ProcessManager] Job completed: ${jobId} (${activeJobs.size}/${config.MAX_CONCURRENT_JOBS})`);
    }

    // OVERLORD ELITE MODE - Phase 8 - Performance Guardian
    if (performanceGuardian) {
      try {
        const cpuLoad = resourceMonitor ? resourceMonitor.getSystemHealth().cpuUsage : 0;
        const memoryUsage = resourceMonitor ? resourceMonitor.getSystemHealth().memoryUsage : 0;
        const pgResult = performanceGuardian.evaluateSystemPressure({
          cpuUsage: cpuLoad,
          memoryUsage: memoryUsage,
          currentConcurrency: currentConcurrency
        });
        if (pgResult.adjusted && pgResult.concurrency !== currentConcurrency) {
          console.log(`[Guardian] Adjusted concurrency: ${currentConcurrency} → ${pgResult.concurrency}`);
          currentConcurrency = pgResult.concurrency;
        }
      } catch (err) {}
    }

    // OVERLORD ELITE MODE - Phase 9 - Predictive Behavior Engine
    if (predictiveBehaviorEngine) {
      try {
        predictiveBehaviorEngine.recordJob({
          duration: executionTime,
          size: job.type || 'medium',
          success: true
        });
        const prediction = predictiveBehaviorEngine.getPrediction();
        if (prediction === 'HEAVY_PATTERN') {
          currentConcurrency = Math.max(1, currentConcurrency - 1);
          console.log('[Predictive] Pattern detected: HEAVY');
        } else if (prediction === 'LIGHT_PATTERN') {
          currentConcurrency = Math.min(config.MAX_CONCURRENT_JOBS, currentConcurrency + 1);
          console.log('[Predictive] Pattern detected: LIGHT');
        }
      } catch (err) {}
    }
    
    logger.info('Job completed', {
      jobId,
      executionTime,
      activeCount: activeJobs.size
    });
    
    return {
      success: true,
      jobId,
      executionTime,
      activeCount: activeJobs.size
    };
  },
  
  /**
   * Fail a job
   * @param {string} jobId - Job identifier
   * @param {Object} error - Error information
   * @returns {Object} Failure result
   */
  failJob(jobId, error = {}) {
    const job = activeJobs.get(jobId);
    
    if (!job) {
      logger.warn('Job not found for failure', { jobId });
      return {
        success: false,
        reason: 'job_not_found'
      };
    }
    
    const endTime = Date.now();
    const executionTime = endTime - job.startTime;
    
    // Remove from active jobs
    activeJobs.delete(jobId);
    
    // Add to history
    jobHistory.push({
      jobId,
      startTime: job.startTime,
      endTime,
      executionTime,
      priority: job.priority,
      type: job.type,
      status: 'failed',
      error: error.message || 'Unknown error'
    });
    
    // Trim history if needed
    if (jobHistory.length > MAX_HISTORY) {
      jobHistory.shift();
    }
    
    logger.error('Job failed', {
      jobId,
      executionTime,
      error: error.message
    });
    
    return {
      success: true,
      jobId,
      executionTime,
      activeCount: activeJobs.size
    };
  },
  
  /**
   * Get count of active jobs
   * @returns {number} Active job count
   */
  getActiveCount() {
    return activeJobs.size;
  },
  
  /**
   * Get max concurrent jobs limit
   * @returns {number} Max concurrent jobs
   */
  getMaxConcurrentJobs() {
    return config.MAX_CONCURRENT_JOBS;
  },
  
  /**
   * Check if can accept new job
   * @returns {Object} Accept status with details
   */
  canAcceptJob() {
    const activeCount = activeJobs.size;
    const maxJobs = config.MAX_CONCURRENT_JOBS;
    const canAccept = activeCount < maxJobs;
    
    return {
      canAccept,
      activeCount,
      maxJobs,
      availableSlots: Math.max(0, maxJobs - activeCount)
    };
  },
  
  /**
   * Get all active jobs
   * @returns {Array} Active jobs list
   */
  getActiveJobs() {
    return Array.from(activeJobs.values()).map(job => ({
      jobId: job.jobId,
      startTime: job.startTime,
      priority: job.priority,
      type: job.type,
      duration: Date.now() - job.startTime
    }));
  },
  
  /**
   * Get sorted jobs by execution score (using Job Weight Engine)
   * @param {Object} systemMetrics - Current system metrics
   * @returns {Array} Sorted jobs (highest score first)
   */
  getSortedJobs(systemMetrics = {}) {
    const jobs = Array.from(activeJobs.values()).map(job => ({
      jobId: job.jobId,
      startTime: job.startTime,
      priority: job.priority,
      type: job.type,
      aiFinalScore: job.metadata?.aiFinalScore,
      retryCount: job.metadata?.retryCount || 0,
      duration: Date.now() - job.startTime
    }));
    
    // Use Job Weight Engine if available, otherwise return as-is
    if (jobWeightEngine) {
      return jobWeightEngine.sortJobsByScore(jobs, systemMetrics);
    }
    
    // Fallback: sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return jobs.sort((a, b) => {
      const pa = priorityOrder[a.priority] || 2;
      const pb = priorityOrder[b.priority] || 2;
      return pb - pa;
    });
  },
  
  /**
   * Get job history (recent jobs)
   * @param {number} limit - Number of jobs to return
   * @returns {Array} Job history
   */
  getJobHistory(limit = 10) {
    return jobHistory.slice(-limit);
  },
  
  /**
   * Get process manager status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      activeCount: activeJobs.size,
      maxConcurrentJobs: config.MAX_CONCURRENT_JOBS,
      availableSlots: Math.max(0, config.MAX_CONCURRENT_JOBS - activeJobs.size),
      historyLength: jobHistory.length,
      proModeEnabled: config.ENABLE_PRO_MODE,
      safeModeEnabled: config.SAFE_MODE,
      canAcceptJob: activeJobs.size < config.MAX_CONCURRENT_JOBS
    };
  },
  
  /**
   * Clear all active jobs (for testing/emergency)
   * @returns {number} Number of jobs cleared
   */
  clearAllJobs() {
    const count = activeJobs.size;
    activeJobs.clear();
    logger.warn('All active jobs cleared', { count });
    return count;
  },
  
  /**
   * Get average execution time from history
   * @returns {number} Average execution time in ms
   */
  getAverageExecutionTime() {
    if (jobHistory.length === 0) return 0;
    
    const completedJobs = jobHistory.filter(j => j.status === 'completed');
    if (completedJobs.length === 0) return 0;
    
    const total = completedJobs.reduce((sum, job) => sum + job.executionTime, 0);
    return Math.round(total / completedJobs.length);
  }
};

// Export adaptive execution functions
processManager.updateConcurrency = updateConcurrency;
processManager.getExecutionMode = getExecutionMode;
processManager.getCurrentConcurrency = function() {
  return currentConcurrency;
};

// OVERLORD PRO MODE - Phase 10 - Edge Scaling
const SAFE_MIN_CONCURRENCY = 1;
const SAFE_MAX_CONCURRENCY = 4;

/**
 * Adjust base concurrency (for edge scaling)
 * @param {number} newValue - New concurrency value
 */
processManager.adjustBaseConcurrency = function(newValue) {
  const oldValue = baseConcurrency;
  baseConcurrency = Math.max(SAFE_MIN_CONCURRENCY, Math.min(SAFE_MAX_CONCURRENCY, newValue));
  
  if (baseConcurrency !== oldValue) {
    console.log(`[ProcessManager] Base concurrency adjusted: ${oldValue} → ${baseConcurrency}`);
  }
  
  return baseConcurrency;
};

/**
 * Get base concurrency
 * @returns {number} Base concurrency
 */
processManager.getBaseConcurrency = function() {
  return baseConcurrency;
};

// Export 8GB Optimization functions
processManager.eightGBOptimization = eightGBOptimization;

module.exports = processManager;
