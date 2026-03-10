/**
 * SMART MEMORY LIMITER V2 - 8GB PRO STABLE
 * 
 * OVERLORD 8GB PRO FINAL - Production Hardening
 * 
 * Monitors RAM every 2 seconds
 * Controls job intake based on memory thresholds
 * NEVER kills active renders
 * 
 * V2 Changes:
 * - Pause at 88%, Hard stop at 93%, Resume at 72%
 * - Adaptive render cooldown
 * - Long render protection
 */

const os = require('os');

// ============================================================================
// OVERLORD 8GB PRO FINAL ACTIVE
// ============================================================================

// Configuration - V2 Updated
const CHECK_INTERVAL_MS = 2000;  // 2 seconds
const MEMORY_HIGH_THRESHOLD = 88;  // Pause new job intake (was 85%)
const MEMORY_CRITICAL_THRESHOLD = 93;  // Hard safety stop (was 92%)
const MEMORY_SAFE_THRESHOLD = 72;  // Resume normal (was 75%)

// Adaptive Render Cooldown
const COOLDOWN_HIGH = 4000;   // Memory > 85%
const COOLDOWN_MED = 2500;    // Memory 75-85%
const COOLDOWN_LOW = 1500;    // Memory < 75%

// Long Render Protection
const LONG_JOB_THRESHOLD_MS = 15 * 60 * 1000;  // 15 minutes
const LONG_JOB_WARNING_MS = 1200 * 1000;  // 20 minutes (1200s)

// State
let isIntakePaused = false;
let isRunning = false;
let checkInterval = null;
let currentJobStartTime = null;

// ============================================================================
// MEMORY FUNCTIONS
// ============================================================================

// Get system memory usage
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return Math.round((usedMem / totalMem) * 100);
}

// Get adaptive cooldown based on memory
function getAdaptiveCooldown() {
  const mem = getMemoryUsage();
  
  if (mem > 85) {
    console.log(`[Limiter] Adaptive cooldown: HIGH (${mem}%) → ${COOLDOWN_HIGH}ms`);
    return COOLDOWN_HIGH;
  } else if (mem >= 75 && mem <= 85) {
    console.log(`[Limiter] Adaptive cooldown: MEDIUM (${mem}%) → ${COOLDOWN_MED}ms`);
    return COOLDOWN_MED;
  } else {
    return COOLDOWN_LOW;
  }
}

/**
 * Main memory check function
 */
function checkMemory() {
  const mem = getMemoryUsage();
  
  // Memory > 93% - Critical: HARD SAFETY STOP
  if (mem > MEMORY_CRITICAL_THRESHOLD) {
    if (!isIntakePaused) {
      console.log(`[Limiter] 🚨 MEMORY CRITICAL: ${mem}% - HARD SAFETY STOP`);
      console.log(`[Limiter]   → Stopping all new job intake`);
      console.log(`[Limiter]   → Waiting for memory to drop below ${MEMORY_SAFE_THRESHOLD}%`);
    }
    isIntakePaused = true;
    return { 
      status: 'critical', 
      delay: COOLDOWN_HIGH, 
      paused: true,
      memory: mem
    };
  }
  
  // Memory > 88% - High: pause new job intake
  if (mem > MEMORY_HIGH_THRESHOLD) {
    if (!isIntakePaused) {
      console.log(`[Limiter] ⚠️ Memory HIGH (${mem}%) – Job Intake Paused`);
      console.log(`[Limiter]   → Will resume at ${MEMORY_SAFE_THRESHOLD}%`);
      isIntakePaused = true;
    }
    return { status: 'high', delay: COOLDOWN_MED, paused: true, memory: mem };
  }
  
  // Memory < 72% - Safe: resume normal
  if (mem < MEMORY_SAFE_THRESHOLD && isIntakePaused) {
    console.log(`[Limiter] ✅ Memory SAFE (${mem}%) – Intake Resumed`);
    console.log(`[Limiter]   → Normal operations resumed`);
    isIntakePaused = false;
    return { status: 'safe', delay: 0, paused: false, memory: mem };
  }
  
  // Normal range
  return { status: 'normal', delay: 0, paused: isIntakePaused, memory: mem };
}

// ============================================================================
// JOB TRACKING
// ============================================================================

/**
 * Start tracking a new job
 */
function startJob(jobId) {
  currentJobStartTime = Date.now();
  const mem = getMemoryUsage();
  console.log(`[Limiter] Job started: ${jobId}`);
  console.log(`[Limiter]   Memory: ${mem}%, Cooldown: ${getAdaptiveCooldown()}ms`);
  
  if (currentJobStartTime > LONG_JOB_THRESHOLD_MS) {
    console.log(`[Limiter] ⚠️ Long job detected: ${jobId}`);
  }
}

/**
 * End tracking current job
 */
function endJob(jobId) {
  if (currentJobStartTime) {
    const duration = Date.now() - currentJobStartTime;
    
    if (duration > LONG_JOB_WARNING_MS) {
      console.log(`[Limiter] 🚨 LONG JOB WARNING: ${jobId} exceeded 1200s (${Math.round(duration/1000)}s)`);
    }
    
    console.log(`[Limiter] ✅ Job completed: ${jobId} (${Math.round(duration/1000)}s)`);
    currentJobStartTime = null;
    
    // Trigger memory check after job
    checkMemory();
  }
}

/**
 * Check if current job is too long (for platform fan-out)
 */
function isJobTooLong() {
  if (!currentJobStartTime) return false;
  
  const duration = Date.now() - currentJobStartTime;
  return duration > LONG_JOB_THRESHOLD_MS;
}

/**
 * Should new job be accepted?
 */
function shouldAcceptJob() {
  if (isIntakePaused) {
    return false;
  }
  return true;
}

/**
 * Should render be delayed?
 */
function getRenderDelay() {
  const mem = getMemoryUsage();
  if (mem > MEMORY_CRITICAL_THRESHOLD) {
    return COOLDOWN_HIGH;
  }
  return getAdaptiveCooldown();
}

// ============================================================================
// LIFECYCLE
// ============================================================================

/**
 * Start the memory monitor
 */
function start() {
  if (isRunning) {
    console.log('[Limiter] Already running');
    return;
  }
  
  isRunning = true;
  console.log('===========================================');
  console.log('[OVERLORD 8GB PRO FINAL ACTIVE]');
  console.log('===========================================');
  console.log('[Limiter] ✅ SMART MEMORY LIMITER V2 ACTIVE');
  console.log(`[Limiter]   Pause threshold: ${MEMORY_HIGH_THRESHOLD}%`);
  console.log(`[Limiter]   Critical stop: ${MEMORY_CRITICAL_THRESHOLD}%`);
  console.log(`[Limiter]   Resume threshold: ${MEMORY_SAFE_THRESHOLD}%`);
  console.log(`[Limiter]   Check interval: ${CHECK_INTERVAL_MS}ms`);
  console.log(`[Limiter]   Long job threshold: ${LONG_JOB_THRESHOLD_MS/60000}min`);
  console.log('===========================================');
  
  // Initial check
  checkMemory();
  
  // Start interval
  checkInterval = setInterval(() => {
    checkMemory();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the memory monitor
 */
function stop() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  isRunning = false;
  isIntakePaused = false;
  console.log('[Limiter] Stopped');
}

/**
 * Get current status
 */
function getStatus() {
  return {
    running: isRunning,
    memoryUsage: getMemoryUsage(),
    intakePaused: isIntakePaused,
    currentJobDuration: currentJobStartTime ? Date.now() - currentJobStartTime : 0,
    isJobTooLong: isJobTooLong(),
    adaptiveCooldown: getAdaptiveCooldown(),
    thresholds: {
      high: MEMORY_HIGH_THRESHOLD,
      critical: MEMORY_CRITICAL_THRESHOLD,
      safe: MEMORY_SAFE_THRESHOLD
    },
    cooldown: {
      high: COOLDOWN_HIGH,
      med: COOLDOWN_MED,
      low: COOLDOWN_LOW
    }
  };
}

module.exports = {
  start,
  stop,
  checkMemory,
  shouldAcceptJob,
  getRenderDelay,
  getAdaptiveCooldown,
  startJob,
  endJob,
  isJobTooLong,
  getStatus,
  config: {
    CHECK_INTERVAL_MS,
    MEMORY_HIGH_THRESHOLD,
    MEMORY_CRITICAL_THRESHOLD,
    MEMORY_SAFE_THRESHOLD,
    COOLDOWN_HIGH,
    COOLDOWN_MED,
    COOLDOWN_LOW,
    LONG_JOB_THRESHOLD_MS,
    LONG_JOB_WARNING_MS
  }
};
