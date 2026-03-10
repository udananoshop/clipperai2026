/**
 * OVERLORD PRO MODE - Phase 10
 * Edge Scaling Service
 * 
 * Lightweight edge-scaling logic for Ryzen 3 (8GB RAM)
 * No Redis, no clustering, no workers
 */

const os = require('os');

let edgeInterval = null;
let lastJobTime = Date.now();
let baseConcurrency = 2;
let isSafeLockActive = false;

// Get dependencies if available
let processManager = null;
let systemConfig = null;

try {
  processManager = require('./processManager');
} catch (err) {}

try {
  systemConfig = require('./systemConfig');
} catch (err) {}

// Thresholds
const MEMORY_HIGH_THRESHOLD = 80;
const MEMORY_LOW_THRESHOLD = 60;
const MEMORY_CRITICAL_THRESHOLD = 85;
const CPU_CRITICAL_THRESHOLD = 85;
const IDLE_TIMEOUT_MS = 120000; // 2 minutes
const SCALE_INTERVAL_MS = 10000; // 10 seconds

/**
 * Get current memory usage percentage
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return Math.round((usedMem / totalMem) * 100);
}

/**
 * Get CPU usage (simple approximation)
 */
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle / total);
  
  return Math.round(usage);
}

/**
 * Check and perform idle cleanup
 */
function performIdleCleanup() {
  const now = Date.now();
  const idleTime = now - lastJobTime;
  
  if (idleTime > IDLE_TIMEOUT_MS) {
    console.log('[EdgeMode] Idle cleanup triggered');
    
    // Clear predictive buffers if available
    try {
      const predictiveEngine = require('./predictiveBehaviorEngine');
      if (predictiveEngine && predictiveEngine.clearHistory) {
        predictiveEngine.clearHistory();
        console.log('[EdgeScaling] Predictive buffers cleared');
      }
    } catch (err) {}
    
    // Clear telemetry cache if available
    try {
      const telemetry = require('../services/intelligentTelemetryService');
      if (telemetry && telemetry.clearCache) {
        telemetry.clearCache();
        console.log('[EdgeScaling] Telemetry cache cleared');
      }
    } catch (err) {}
    
    // Force garbage hint if available
    if (global.gc) {
      global.gc();
      console.log('[EdgeScaling] GC hint executed');
    }
  }
}

/**
 * Main edge scaling evaluation
 */
function evaluateEdgeScaling() {
  const memoryUsage = getMemoryUsage();
  const cpuUsage = getCpuUsage();
  
  // Check for SAFE LOCK emergency
  if (memoryUsage > MEMORY_CRITICAL_THRESHOLD && cpuUsage > CPU_CRITICAL_THRESHOLD) {
    if (!isSafeLockActive) {
      isSafeLockActive = true;
      console.log('[EdgeGuardian] Emergency Safe Lock Activated');
      console.log(`[EdgeGuardian] Memory: ${memoryUsage}%, CPU: ${cpuUsage}%`);
    }
    
    // Force concurrency to 1
    if (processManager && processManager.adjustBaseConcurrency) {
      processManager.adjustBaseConcurrency(1);
    }
    baseConcurrency = 1;
    
    return;
  }
  
  // Release safe lock if conditions improve
  if (isSafeLockActive && memoryUsage < 70 && cpuUsage < 70) {
    isSafeLockActive = false;
    console.log('[EdgeGuardian] Emergency Safe Lock Released');
  }
  
  // High memory - reduce concurrency
  if (memoryUsage > MEMORY_HIGH_THRESHOLD) {
    const newConcurrency = Math.max(1, baseConcurrency - 1);
    if (newConcurrency !== baseConcurrency) {
      console.log(`[EdgeScaling] High memory (${memoryUsage}%) - reducing concurrency: ${baseConcurrency} → ${newConcurrency}`);
      baseConcurrency = newConcurrency;
      if (processManager && processManager.adjustBaseConcurrency) {
        processManager.adjustBaseConcurrency(baseConcurrency);
      }
    }
  }
  
  // Low memory - gradually restore concurrency
  if (memoryUsage < MEMORY_LOW_THRESHOLD && !isSafeLockActive) {
    const maxSafe = 4; // Ryzen safe ceiling
    const newConcurrency = Math.min(maxSafe, baseConcurrency + 1);
    if (newConcurrency !== baseConcurrency) {
      console.log(`[EdgeScaling] Low memory (${memoryUsage}%) - restoring concurrency: ${baseConcurrency} → ${newConcurrency}`);
      baseConcurrency = newConcurrency;
      if (processManager && processManager.adjustBaseConcurrency) {
        processManager.adjustBaseConcurrency(baseConcurrency);
      }
    }
  }
  
  // Update last job time from processManager
  if (processManager && processManager.getActiveCount) {
    const activeCount = processManager.getActiveCount();
    if (activeCount > 0) {
      lastJobTime = Date.now();
    }
  }
}

/**
 * Start edge scaling service
 */
function start() {
  if (edgeInterval) {
    console.log('[EdgeMode] Already running');
    return;
  }
  
  // Initialize base concurrency from config
  if (systemConfig && systemConfig.config) {
    baseConcurrency = systemConfig.config.MAX_CONCURRENT_JOBS || 2;
  }
  
  console.log('OVERLORD PHASE 10 EDGE MODE ENABLED');
  console.log(`[EdgeMode] Base concurrency: ${baseConcurrency}`);
  console.log(`[EdgeMode] Memory threshold: ${MEMORY_HIGH_THRESHOLD}%`);
  console.log(`[EdgeMode] Scale interval: ${SCALE_INTERVAL_MS}ms`);
  
  edgeInterval = setInterval(() => {
    try {
      evaluateEdgeScaling();
      performIdleCleanup();
    } catch (err) {
      console.warn('[EdgeMode] Evaluation error:', err.message);
    }
  }, SCALE_INTERVAL_MS);
  
  console.log('[EdgeMode] Edge scaling service started');
}

/**
 * Stop edge scaling service
 */
function stop() {
  if (edgeInterval) {
    clearInterval(edgeInterval);
    edgeInterval = null;
    console.log('[EdgeMode] Edge scaling service stopped');
  }
}

/**
 * Get edge status
 */
function getStatus() {
  return {
    running: edgeInterval !== null,
    baseConcurrency,
    memoryUsage: getMemoryUsage(),
    cpuUsage: getCpuUsage(),
    isSafeLockActive,
    lastJobTime,
    idleTime: Date.now() - lastJobTime
  };
}

module.exports = {
  start,
  stop,
  getStatus,
  evaluateEdgeScaling,
  getMemoryUsage,
  getCpuUsage
};
