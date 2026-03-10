/**
 * TITAN-C Phase 10 - Job Orchestrator Service
 * OVERLORD Phase 6 - Intelligent Load Controller Integration
 * OVERLORD PRO MODE - Phase 1 - Server-Based Architecture
 * 
 * Responsibilities:
 * - routeJobByPriority(job)
 * - limitConcurrentHighPriorityJobs(max = 3)
 * - queueLowPriorityJobs()
 * - trackExecutionTime(job)
 * - Dynamic concurrency based on system load (OVERLORD Phase 6)
 * - Auto-throttle based on memory (OVERLORD Phase 6 - Intelligent Safeguard)
 * - Integration with processManager (PRO Mode Phase 1)
 * - Safe backward compatibility
 */

const logger = require('../utils/logger');

// OVERLORD PRO MODE - Phase 1 - Core modules
let systemConfig = null;
let processManager = null;

try {
  systemConfig = require('../core/systemConfig');
} catch (err) {
  console.warn('[Orchestrator] systemConfig not available:', err.message);
}

try {
  processManager = require('../core/processManager');
} catch (err) {
  console.warn('[Orchestrator] processManager not available:', err.message);
}

// Check if PRO mode is enabled
const isProModeEnabled = () => {
  return systemConfig ? systemConfig.isProModeEnabled() : false;
};

// Log PRO mode status on startup
if (isProModeEnabled()) {
  console.log('[Orchestrator] PRO MODE enabled - using processManager');
  logger.info('PRO MODE enabled in job orchestrator');
} else {
  console.log('[Orchestrator] Legacy mode - backward compatible');
}

// OVERLORD PRO MODE - Phase 2 - Task Distributor
let taskDistributor = null;
let isDistributedModeEnabled = false;

if (process.env.ENABLE_DISTRIBUTED_MODE === 'true') {
  try {
    taskDistributor = require('../core/taskDistributor');
    isDistributedModeEnabled = true;
    console.log('[Orchestrator] DISTRIBUTED MODE enabled - using taskDistributor');
    logger.info('DISTRIBUTED MODE enabled in job orchestrator');
  } catch (err) {
    console.warn('[Orchestrator] taskDistributor not available:', err.message);
  }
}

// OVERLORD Phase 6 - Execution Governor
let executionGovernor = null;
try {
  executionGovernor = require('./executionGovernorService');
} catch (err) {
  // Service not available - use default behavior
}

// OVERLORD Phase 6 - System Health Service (for auto-throttle)
let systemHealthService = null;
try {
  systemHealthService = require('./systemHealthService');
} catch (err) {
  // Service not available - use default behavior
}

// In-memory scheduler (lightweight - no Redis yet)
const scheduler = {
  highPriorityQueue: [],
  mediumPriorityQueue: [],
  lowPriorityQueue: [],
  runningJobs: new Map(),
  executionTimes: new Map(),
  maxConcurrentHighPriority: 3
};

// Configuration
const CONFIG = {
  MAX_CONCURRENT_HIGH_PRIORITY: 3,
  MAX_CONCURRENT_MEDIUM_PRIORITY: 5,
  EXECUTION_TIMEOUT_MS: 300000, // 5 minutes
  QUEUE_CHECK_INTERVAL_MS: 5000,
  // OVERLORD Phase 6 - Memory thresholds
  MEMORY_THRESHOLD_PERCENT: 85,
  MEMORY_LOW_THRESHOLD_MB: 300,
  MEMORY_MEDIUM_THRESHOLD_MB: 600
};

/**
 * Get dynamic concurrency limits based on system load (OVERLORD Phase 6)
 * @returns {Object} - Dynamic concurrency limits
 */
function getDynamicConcurrencyLimits() {
  let maxHighPriority = CONFIG.MAX_CONCURRENT_HIGH_PRIORITY;
  let maxMediumPriority = CONFIG.MAX_CONCURRENT_MEDIUM_PRIORITY;
  
  // First check execution governor
  if (executionGovernor) {
    try {
      const loadState = executionGovernor.getSystemLoadState();
      const concurrency = loadState.config.concurrency;
      
      // Adjust based on load state
      if (concurrency <= 1) {
        maxHighPriority = concurrency;
        maxMediumPriority = 1;
      } else if (concurrency === 2) {
        maxHighPriority = Math.min(concurrency, CONFIG.MAX_CONCURRENT_HIGH_PRIORITY);
        maxMediumPriority = concurrency;
      }
      // NORMAL (3) keeps defaults
    } catch (err) {
      // Keep defaults on error
    }
  }
  
  // OVERLORD Phase 6 - Apply memory-based throttling
  if (systemHealthService) {
    try {
      const freeMemoryMB = systemHealthService.getFreeMemoryMB();
      const memoryPercent = systemHealthService.getMemoryUsagePercent();
      
      // Memory > 85% of heap → max 1 concurrent
      if (memoryPercent >= CONFIG.MEMORY_THRESHOLD_PERCENT) {
        maxHighPriority = 1;
        maxMediumPriority = 1;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Orchestrator] Memory throttling active: ${memoryPercent}% heap usage`);
        }
      }
      // Memory 300-600MB free → max 2 concurrent
      else if (freeMemoryMB < CONFIG.MEMORY_MEDIUM_THRESHOLD_MB && freeMemoryMB >= CONFIG.MEMORY_LOW_THRESHOLD_MB) {
        maxHighPriority = Math.min(2, maxHighPriority);
        maxMediumPriority = Math.min(2, maxMediumPriority);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Orchestrator] Memory moderate: ${freeMemoryMB}MB free`);
        }
      }
      // Otherwise use defaults or governor settings
    } catch (err) {
      // Keep current limits
    }
  }
  
  return { maxHighPriority, maxMediumPriority };
}

/**
 * Get delay between job starts (OVERLORD Phase 6)
 * @returns {number} - Delay in ms
 */
function getDynamicDelay() {
  if (executionGovernor) {
    try {
      return executionGovernor.getDelayBetweenJobs();
    } catch (err) {
      return 0;
    }
  }
  return 0;
}

/**
 * Check if system should accept new jobs (OVERLORD Phase 6)
 * @returns {Object} - Whether to accept and reason
 */
function shouldAcceptNewJob() {
  // Check execution governor first
  if (executionGovernor) {
    try {
      const shouldAccept = executionGovernor.shouldAcceptJobs();
      const waitTime = shouldAccept ? 0 : executionGovernor.getWaitTime();
      
      if (!shouldAccept) {
        return {
          accept: false,
          waitTime,
          reason: 'safe_mode_pause'
        };
      }
    } catch (err) {
      // Continue with other checks
    }
  }
  
  // OVERLORD Phase 6 - Check memory threshold
  if (systemHealthService) {
    try {
      const memoryPercent = systemHealthService.getMemoryUsagePercent();
      
      if (memoryPercent > CONFIG.MEMORY_THRESHOLD_PERCENT) {
        return {
          accept: false,
          waitTime: 5000,
          reason: 'memory_threshold_exceeded'
        };
      }
    } catch (err) {
      // Continue - don't block
    }
  }
  
  return { accept: true, waitTime: 0, reason: 'normal' };
}

/**
 * Check if should pause low priority jobs (OVERLORD Phase 6)
 * @returns {Object} - Pause status and reason
 */
function shouldPauseLowPriority() {
  if (systemHealthService) {
    try {
      const memoryPercent = systemHealthService.getMemoryUsagePercent();
      
      if (memoryPercent > CONFIG.MEMORY_THRESHOLD_PERCENT) {
        return {
          pause: true,
          reason: 'memory_threshold_exceeded',
          memoryPercent
        };
      }
    } catch (err) {
      // Don't pause on error
    }
  }
  return { pause: false };
}

/**
 * Route job to appropriate queue based on priority
 * @param {Object} job - Job object with priority
 * @returns {Object} - Routing result
 */
function routeJobByPriority(job) {
  const priority = job.priorityLevel || job.priority_level || 'medium';
  const jobId = job.id || job.jobId || 'unknown';
  
  // Check if we should accept new job (OVERLORD Phase 6)
  const acceptResult = shouldAcceptNewJob();
  if (!acceptResult.accept) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Orchestrator] Rejecting job ${jobId}: ${acceptResult.reason}`);
    }
    return {
      jobId,
      priority,
      queued: false,
      rejected: true,
      reason: acceptResult.reason,
      waitTime: acceptResult.waitTime
    };
  }
  
  // OVERLORD Phase 6 - Check if low priority should be paused
  if (priority === 'low') {
    const pauseResult = shouldPauseLowPriority();
    if (pauseResult.pause) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Orchestrator] Pausing low priority job ${jobId}: ${pauseResult.reason}`);
      }
      return {
        jobId,
        priority,
        queued: false,
        rejected: true,
        reason: 'low_priority_paused_due_to_memory',
        waitTime: 5000
      };
    }
  }
  
  let queue;
  switch (priority) {
    case 'high':
      queue = scheduler.highPriorityQueue;
      break;
    case 'medium':
      queue = scheduler.mediumPriorityQueue;
      break;
    case 'low':
    default:
      queue = scheduler.lowPriorityQueue;
      break;
  }
  
  // Add to queue
  const queueItem = {
    jobId,
    priority,
    queuedAt: Date.now(),
    job
  };
  
  queue.push(queueItem);
  
  // Register job start with governor (OVERLORD Phase 6)
  if (executionGovernor) {
    try {
      executionGovernor.registerJobStart(jobId);
    } catch (err) {
      // Non-blocking
    }
  }
  
  // DEV MODE ONLY: Log routing
  if (process.env.NODE_ENV !== 'production') {
    console.log('[TITAN-C Orchestrator] Job routed:', jobId);
    console.log('  Priority:', priority);
    console.log('  Queue size - high:', scheduler.highPriorityQueue.length, 'medium:', scheduler.mediumPriorityQueue.length, 'low:', scheduler.lowPriorityQueue.length);
  }
  
  return {
    jobId,
    priority,
    queued: true,
    queuePosition: queue.length - 1,
    currentQueueSize: queue.length
  };
}

/**
 * Check and limit concurrent high priority jobs (with dynamic limits)
 * @returns {Object} - Scheduler status
 */
function limitConcurrentHighPriorityJobs() {
  const limits = getDynamicConcurrencyLimits();
  const runningHighPriority = countRunningHighPriority();
  const canRunMore = runningHighPriority < limits.maxHighPriority;
  
  // DEV MODE ONLY
  if (process.env.NODE_ENV !== 'production') {
    console.log('[TITAN-C Orchestrator] High priority jobs:', runningHighPriority, '/', limits.maxHighPriority);
  }
  
  return {
    running: runningHighPriority,
    max: limits.maxHighPriority,
    canRunMore,
    nextAvailable: canRunMore ? null : estimateNextAvailable(),
    loadState: executionGovernor ? executionGovernor.getSystemLoadState() : null
  };
}

/**
 * Get next available job from queues (priority order, with dynamic limits)
 * @returns {Object|null} - Next job to process
 */
function getNextJob() {
  const limits = getDynamicConcurrencyLimits();
  const delay = getDynamicDelay();
  
  // Apply delay if needed (OVERLORD Phase 6)
  if (delay > 0) {
    // Return delay info - actual delay should be applied by caller
    const job = getNextJobInternal(limits);
    if (job) {
      return {
        ...job,
        delayRequired: delay
      };
    }
    return null;
  }
  
  return getNextJobInternal(limits);
}

/**
 * Internal function to get next job
 */
function getNextJobInternal(limits) {
  // Check high priority queue first
  if (scheduler.highPriorityQueue.length > 0) {
    const running = countRunningHighPriority();
    if (running < limits.maxHighPriority) {
      return scheduler.highPriorityQueue.shift();
    }
  }
  
  // Check medium priority queue
  if (scheduler.mediumPriorityQueue.length > 0) {
    const runningMedium = countRunningMediumPriority();
    if (runningMedium < limits.maxMediumPriority) {
      return scheduler.mediumPriorityQueue.shift();
    }
  }
  
  // Check low priority queue (only if memory is OK)
  const pauseResult = shouldPauseLowPriority();
  if (scheduler.lowPriorityQueue.length > 0 && !pauseResult.pause) {
    return scheduler.lowPriorityQueue.shift();
  }
  
  return null;
}

/**
 * Queue management - move jobs appropriately
 * @returns {Object} - Queue status
 */
function queueLowPriorityJobs() {
  // This would be called by a periodic job in production
  // For now, just return queue status
  const pauseResult = shouldPauseLowPriority();
  
  return {
    highPriorityPending: scheduler.highPriorityQueue.length,
    mediumPriorityPending: scheduler.mediumPriorityQueue.length,
    lowPriorityPending: scheduler.lowPriorityQueue.length,
    highPriorityRunning: countRunningHighPriority(),
    mediumPriorityRunning: countRunningMediumPriority(),
    lowPriorityPaused: pauseResult.pause
  };
}

/**
 * Track execution time for a job (with governor integration)
 * @param {string} jobId - Job ID
 * @param {string} status - Status: 'start' | 'end' | 'fail'
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Execution time result
 */
function trackExecutionTime(jobId, status, metadata = {}) {
  const now = Date.now();
  
  switch (status) {
    case 'start':
      scheduler.executionTimes.set(jobId, {
        startTime: now,
        status: 'running',
        metadata
      });
      scheduler.runningJobs.set(jobId, {
        startedAt: now,
        priority: metadata.priority || 'medium'
      });
      return { jobId, status: 'started', startTime: now };
      
    case 'end':
    case 'complete':
      const startData = scheduler.executionTimes.get(jobId);
      const executionTime = startData ? now - startData.startTime : 0;
      
      scheduler.executionTimes.set(jobId, {
        startTime: startData?.startTime || now,
        endTime: now,
        executionTimeMs: executionTime,
        status: 'completed',
        metadata
      });
      
      scheduler.runningJobs.delete(jobId);
      
      // Register job end with governor (OVERLORD Phase 6)
      if (executionGovernor) {
        try {
          executionGovernor.registerJobEnd(jobId, executionTime, true);
        } catch (err) {
          // Non-blocking
        }
      }
      
      // DEV MODE ONLY
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TITAN-C Orchestrator] Job completed:', jobId);
        console.log('  Execution time:', executionTime, 'ms');
      }
      
      return { jobId, status: 'completed', executionTimeMs: executionTime };
      
    case 'fail':
      const failStartData = scheduler.executionTimes.get(jobId);
      const failTime = failStartData ? now - failStartData.startTime : 0;
      
      scheduler.executionTimes.set(jobId, {
        startTime: failStartData?.startTime || now,
        endTime: now,
        executionTimeMs: failTime,
        status: 'failed',
        error: metadata.error || 'Unknown error'
      });
      
      scheduler.runningJobs.delete(jobId);
      
      // Register job end with governor (OVERLORD Phase 6)
      if (executionGovernor) {
        try {
          executionGovernor.registerJobEnd(jobId, failTime, false);
        } catch (err) {
          // Non-blocking
        }
      }
      
      return { jobId, status: 'failed', executionTimeMs: failTime, error: metadata.error };
      
    default:
      return { jobId, status: 'unknown' };
  }
}

/**
 * Get average execution time for recent jobs
 * @param {number} limit - Number of recent jobs to analyze
 * @returns {Object} - Execution time stats
 */
function getExecutionTimeStats(limit = 10) {
  const times = Array.from(scheduler.executionTimes.values())
    .filter(t => t.executionTimeMs)
    .slice(-limit);
  
  if (times.length === 0) {
    return { avgExecutionTimeMs: 0, min: 0, max: 0, count: 0 };
  }
  
  const executionTimes = times.map(t => t.executionTimeMs);
  const sum = executionTimes.reduce((a, b) => a + b, 0);
  
  return {
    avgExecutionTimeMs: Math.round(sum / executionTimes.length),
    min: Math.min(...executionTimes),
    max: Math.max(...executionTimes),
    count: executionTimes.length
  };
}

/**
 * Get scheduler status (with load state)
 * @returns {Object} - Full scheduler status
 */
function getSchedulerStatus() {
  const limits = getDynamicConcurrencyLimits();
  const pauseResult = shouldPauseLowPriority();
  
  return {
    queues: {
      highPriority: scheduler.highPriorityQueue.length,
      mediumPriority: scheduler.mediumPriorityQueue.length,
      lowPriority: scheduler.lowPriorityQueue.length
    },
    running: scheduler.runningJobs.size,
    executionStats: getExecutionTimeStats(),
    limits: {
      maxConcurrentHighPriority: limits.maxHighPriority,
      maxConcurrentMediumPriority: limits.maxMediumPriority
    },
    loadState: executionGovernor ? executionGovernor.getSystemLoadState() : null,
    throttling: {
      lowPriorityPaused: pauseResult.pause,
      pauseReason: pauseResult.reason || null,
      memoryThreshold: CONFIG.MEMORY_THRESHOLD_PERCENT
    },
    dynamicSettings: {
      delayBetweenJobs: getDynamicDelay(),
      shouldAcceptJobs: shouldAcceptNewJob()
    }
  };
}

// Helper functions
function countRunningHighPriority() {
  let count = 0;
  for (const [_, job] of scheduler.runningJobs) {
    if (job.priority === 'high') count++;
  }
  return count;
}

function countRunningMediumPriority() {
  let count = 0;
  for (const [_, job] of scheduler.runningJobs) {
    if (job.priority === 'medium') count++;
  }
  return count;
}

function estimateNextAvailable() {
  // Rough estimate based on average execution time
  const stats = getExecutionTimeStats();
  return stats.avgExecutionTimeMs || CONFIG.EXECUTION_TIMEOUT_MS;
}

module.exports = {
  routeJobByPriority,
  limitConcurrentHighPriorityJobs,
  getNextJob,
  queueLowPriorityJobs,
  trackExecutionTime,
  getExecutionTimeStats,
  getSchedulerStatus,
  getDynamicConcurrencyLimits,
  getDynamicDelay,
  shouldAcceptNewJob,
  shouldPauseLowPriority,
  CONFIG,
  scheduler
};
