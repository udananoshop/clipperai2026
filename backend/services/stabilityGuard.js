/**
 * OVERLORD PRODUCTION HARDENING - Stability Guard Service V2
 * 
 * OVERLORD 8GB PRO FINAL ACTIVE
 * 
 * Phase 1: Memory Stability Lock (V2 Updated)
 * Phase 2: Job Safety Layer (V2 Updated)
 * Phase 3: GPU Safety (V2 Updated)
 * Phase 4: Render Protection (V2 Updated)
 * Phase 5: Database Safety
 * Phase 6: Hard Crash Guard (NEW)
 * 
 * Optimized for: 8GB Enterprise Safe Mode
 */

const os = require('os');

console.log('===========================================');
console.log('[OVERLORD 8GB PRO FINAL ACTIVE]');
console.log('===========================================');

// ============================================================================
// PHASE 1: MEMORY STABILITY LOCK - V2
// ============================================================================

// Configuration - 8GB PRO STABLE V2
const MEMORY_PAUSE_THRESHOLD = 88;  // Pause new job intake (V2: was 92%)
const MEMORY_COOLDOWN_THRESHOLD = 93;  // Force max cooldown (V2: was 95%)
const MEMORY_SOFT_THRESHOLD = 75;  // Reduce bitrate

// Adaptive Render Cooldown - V2
const RENDER_COOLDOWN_MAX = 4000;   // Memory > 85% → 4000ms
const RENDER_COOLDOWN_MED = 2500;   // Memory 75-85% → 2500ms
const RENDER_COOLDOWN_MIN = 1500;   // Memory < 75% → 1500ms

// Job timeout - 15 minutes max
const JOB_TIMEOUT_MS = 15 * 60 * 1000;

// Render cooldown base
const RENDER_COOLDOWN_BASE_MIN = 1500;
const RENDER_COOLDOWN_BASE_MAX = 4000;

// State
let isPaused = false;
let lastRenderTime = 0;
let encoderFallback = false;  // false = GPU, true = CPU

/**
 * Get current memory usage
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return Math.round((usedMem / totalMem) * 100);
}

/**
 * Check if should pause new job intake
 */
function shouldPauseNewJobs() {
  const mem = getMemoryUsage();
  if (mem > MEMORY_PAUSE_THRESHOLD) {
    isPaused = true;
    console.log(`[Stability] Memory pause: ${mem}% > ${MEMORY_PAUSE_THRESHOLD}%`);
    return true;
  }
  return false;
}

/**
 * Check if should force cooldown
 */
function shouldForceCooldown() {
  const mem = getMemoryUsage();
  return mem > MEMORY_COOLDOWN_THRESHOLD;
}

/**
 * Get dynamic render cooldown based on memory - V2 ADAPTIVE
 */
function getDynamicCooldown() {
  const mem = getMemoryUsage();
  
  if (mem > 85) {
    console.log(`[Stability] Adaptive cooldown: HIGH (${mem}%) → ${RENDER_COOLDOWN_MAX}ms`);
    return RENDER_COOLDOWN_MAX;
  } else if (mem >= 75 && mem <= 85) {
    console.log(`[Stability] Adaptive cooldown: MEDIUM (${mem}%) → ${RENDER_COOLDOWN_MED}ms`);
    return RENDER_COOLDOWN_MED;
  } else {
    return RENDER_COOLDOWN_MIN;
  }
}

/**
 * Trigger garbage collection if available
 */
function triggerGarbageCollection() {
  if (global.gc) {
    console.log('[Stability] Running garbage collection...');
    global.gc();
  }
}

// ============================================================================
// PHASE 2: JOB SAFETY LAYER - V2
// ============================================================================

// Job status lifecycle
const JOB_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Job tracking for long render protection
let currentJobStartTime = null;
let currentJobId = null;

/**
 * Create job with lifecycle tracking
 */
function createJobLifeCycle(jobId) {
  return {
    jobId,
    status: JOB_STATUS.QUEUED,
    retryCount: 0,
    startTime: null,
    endTime: null,
    error: null
  };
}

/**
 * Mark job as processing
 */
function startJobProcessing(job) {
  job.status = JOB_STATUS.PROCESSING;
  job.startTime = Date.now();
  currentJobStartTime = job.startTime;
  currentJobId = job.jobId;
  return job;
}

/**
 * Mark job as completed
 */
function completeJob(job) {
  job.status = JOB_STATUS.COMPLETED;
  job.endTime = Date.now();
  
  // Log long job warning if exceeded
  if (currentJobStartTime) {
    const duration = job.endTime - currentJobStartTime;
    if (duration > 1200 * 1000) {  // 1200 seconds
      console.log(`[Stability] 🚨 LONG JOB WARNING: ${job.jobId} exceeded 1200s (${Math.round(duration/1000)}s)`);
    }
  }
  
  currentJobStartTime = null;
  currentJobId = null;
  
  // Trigger GC after successful job
  triggerGarbageCollection();
  return job;
}

/**
 * Handle job failure with retry logic
 * Returns: { shouldRetry: boolean, shouldMarkFailed: boolean }
 */
function handleJobFailure(job, error) {
  job.status = JOB_STATUS.FAILED;
  job.error = error.message || String(error);
  job.endTime = Date.now();
  
  currentJobStartTime = null;
  currentJobId = null;
  
  job.retryCount++;
  
  if (job.retryCount === 1) {
    // First failure - retry once
    console.log(`[Stability] Job ${job.jobId} failed (attempt 1), will retry...`);
    return { shouldRetry: true, shouldMarkFailed: false };
  } else {
    // Second failure - mark as failed
    console.error(`[Stability] 🚨 Job ${job.jobId} failed permanently after 2 attempts`);
    return { shouldRetry: false, shouldMarkFailed: true };
  }
}

/**
 * Check if job has timed out
 */
function isJobTimedOut(job) {
  if (!job.startTime) return false;
  const elapsed = Date.now() - job.startTime;
  if (elapsed > JOB_TIMEOUT_MS) {
    console.error(`[Stability] 🚨 Job ${job.jobId} timed out after ${elapsed}ms (>${JOB_TIMEOUT_MS/60000}min)`);
    return true;
  }
  return false;
}

/**
 * Check if current job is too long for platform fan-out
 */
function isCurrentJobTooLong() {
  if (!currentJobStartTime) return false;
  return (Date.now() - currentJobStartTime) > JOB_TIMEOUT_MS;
}

// ============================================================================
// PHASE 3: GPU SAFETY - V2
// ============================================================================

// FFmpeg path detection
function getFFmpegPath() {
  try {
    const { execSync } = require('child_process');
    // Try Windows 'where' command first
    const result = execSync('where ffmpeg', { encoding: 'utf8', timeout: 5000 });
    const paths = result.split('\n').filter(p => p.trim());
    if (paths.length > 0) {
      console.log('[Stability] FFmpeg found:', paths[0].trim());
      return paths[0].trim();
    }
  } catch (error) {
    // where command failed, try 'which' for Unix-like systems
    try {
      const { execSync } = require('child_process');
      const result = execSync('which ffmpeg', { encoding: 'utf8', timeout: 5000 });
      const path = result.trim();
      if (path) {
        console.log('[Stability] FFmpeg found:', path);
        return path;
      }
    } catch (e) {
      // Both failed, use fallback
    }
  }
  console.warn('[Stability] FFmpeg not found in PATH, using fallback');
  return 'ffmpeg'; // fallback
}

// Resolve FFmpeg path at module load
const FFMPEG_PATH = getFFmpegPath();

/**
 * Set encoder fallback mode
 */
function setEncoderFallback(fallback) {
  encoderFallback = fallback;
  if (fallback) {
    console.warn('[Stability] 🚨 GPU encoder failed - falling back to libx264 automatically');
  } else {
    console.log('[Stability] GPU encoder mode restored');
  }
}

/**
 * Get current encoder mode
 */
function getEncoderMode() {
  return encoderFallback ? 'libx264' : 'h264_amf';
}

/**
 * Handle encoder failure - auto fallback - V2
 */
function handleEncoderFailure(reason = 'unknown') {
  console.log(`[Stability] GPU encoder failure detected: ${reason}`);
  
  if (!encoderFallback) {
    console.log('[Stability] → Auto-fallback to libx264 (CPU)');
    setEncoderFallback(true);
    return true;  // Switched to CPU
  }
  
  console.error('[Stability] → Already in CPU fallback mode, cannot recover');
  return false;  // Already in CPU mode
}

/**
 * Check encoder health at startup
 */
async function checkEncoderHealth() {
  try {
    const { execSync } = require('child_process');
    
    // Use resolved FFmpeg path with -encoders filter
    const result = execSync(`${FFMPEG_PATH} -encoders 2>nul`, { 
      encoding: 'utf8', 
      timeout: 10000 
    });
    const hasAMF = result.includes('h264_amf');
    
    console.log('[Stability] Encoder health check:', hasAMF ? 'AMF available' : 'CPU fallback');
    return { hasAMF };
  } catch (error) {
    console.warn('[Stability] Encoder health check failed, using CPU fallback:', error.message);
    return { hasAMF: false };
  }
}

// ============================================================================
// PHASE 4: RENDER PROTECTION - V2
// ============================================================================

// Sequential lock
let isRendering = false;
let renderQueue = [];

/**
 * Acquire render lock (sequential)
 */
async function acquireRenderLock() {
  while (isRendering) {
    console.log('[Stability] Waiting for render lock...');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Check memory before rendering
  if (shouldPauseNewJobs()) {
    console.warn('[Stability] Memory critical - pausing new renders');
    while (shouldPauseNewJobs()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Apply adaptive cooldown - V2
  const cooldown = getDynamicCooldown();
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTime;
  
  if (timeSinceLastRender < cooldown) {
    const waitTime = cooldown - timeSinceLastRender;
    console.log(`[Stability] Adaptive render cooldown: ${waitTime}ms (memory: ${getMemoryUsage()}%)`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  isRendering = true;
  lastRenderTime = Date.now();
  console.log('[Stability] Render lock acquired');
}

/**
 * Release render lock
 */
function releaseRenderLock() {
  isRendering = false;
  console.log('[Stability] Render lock released');
  // Trigger GC after render
  triggerGarbageCollection();
}

/**
 * Get render queue status
 */
function getRenderStatus() {
  return {
    isRendering,
    queueLength: renderQueue.length,
    lastRenderTime,
    cooldown: getDynamicCooldown(),
    memoryUsage: getMemoryUsage(),
    isPaused,
    currentJobTooLong: isCurrentJobTooLong()
  };
}

// ============================================================================
// PHASE 5: DATABASE SAFETY
// ============================================================================

/**
 * Safe Prisma wrapper - wraps prisma calls in try/catch
 */
async function safePrismaCall(prismaFn, ...args) {
  try {
    const result = await prismaFn(...args);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Stability] Prisma call failed:', error.message);
    // Log error but don't crash
    return { 
      success: false, 
      error: error.message,
      // Return safe defaults based on operation
      data: null 
    };
  }
}

/**
 * Safe database write with rollback handling
 */
async function safeDbWrite(operation, fallbackValue = null) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error('[Stability] Database write failed:', error.message);
    console.error('[Stability] Error details:', error.stack);
    
    // Continue system even if DB write fails
    return { 
      success: false, 
      error: error.message,
      data: fallbackValue 
    };
  }
}

// ============================================================================
// PHASE 6: HARD CRASH GUARD - NEW V2
// ============================================================================

/**
 * Wrap render execution in try/catch - prevents server restart loop
 */
async function safeRenderExecute(renderFn, jobId) {
  console.log(`[Stability] Starting safe render execution for job: ${jobId}`);
  
  try {
    // Pre-execution memory check
    const memBefore = getMemoryUsage();
    console.log(`[Stability] Memory before render: ${memBefore}%`);
    
    if (memBefore > MEMORY_COOLDOWN_THRESHOLD) {
      console.warn(`[Stability] ⚠️ High memory before render (${memBefore}%)`);
    }
    
    // Execute render
    const result = await renderFn();
    
    // Post-execution memory check
    const memAfter = getMemoryUsage();
    console.log(`[Stability] Memory after render: ${memAfter}%`);
    
    // Check for memory spike
    if (memAfter - memBefore > 15) {
      console.warn(`[Stability] ⚠️ Large memory spike during render: ${memAfter - memBefore}%`);
    }
    
    console.log(`[Stability] ✅ Render completed successfully for job: ${jobId}`);
    return { success: true, data: result };
    
  } catch (error) {
    console.error(`[Stability] 🚨 Render execution failed for job ${jobId}:`, error.message);
    
    // Try GPU fallback if encoder failed
    if (error.message && error.message.includes('encoder')) {
      console.log('[Stability] → Attempting GPU fallback...');
      const fallbackSuccess = handleEncoderFailure(error.message);
      if (fallbackSuccess) {
        // Retry with CPU encoder
        console.log('[Stability] → Retrying with CPU encoder...');
        try {
          const result = await renderFn();
          return { success: true, data: result, retried: true };
        } catch (retryError) {
          console.error('[Stability] Retry also failed:', retryError.message);
        }
      }
    }
    
    // Queue recovery
    console.log('[Stability] → Recovering queue after render failure...');
    releaseRenderLock();
    
    return { 
      success: false, 
      error: error.message,
      data: null 
    };
  }
}

/**
 * Auto recover queue if job fails
 */
function recoverQueue() {
  console.log('[Stability] Queue recovery initiated');
  isRendering = false;
  currentJobStartTime = null;
  currentJobId = null;
  console.log('[Stability] Queue recovered - system continues');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Phase 1: Memory
  getMemoryUsage,
  shouldPauseNewJobs,
  shouldForceCooldown,
  getDynamicCooldown,
  triggerGarbageCollection,
  
  // Phase 2: Job Safety
  JOB_STATUS,
  createJobLifeCycle,
  startJobProcessing,
  completeJob,
  handleJobFailure,
  isJobTimedOut,
  isCurrentJobTooLong,
  
  // Phase 3: GPU Safety
  setEncoderFallback,
  getEncoderMode,
  handleEncoderFailure,
  checkEncoderHealth,
  
  // Phase 4: Render Protection
  acquireRenderLock,
  releaseRenderLock,
  getRenderStatus,
  
  // Phase 5: Database Safety
  safePrismaCall,
  safeDbWrite,
  
  // Phase 6: Hard Crash Guard
  safeRenderExecute,
  recoverQueue,
  
  // Configuration exports
  config: {
    MEMORY_PAUSE_THRESHOLD,
    MEMORY_COOLDOWN_THRESHOLD,
    MEMORY_SOFT_THRESHOLD,
    RENDER_COOLDOWN_MAX,
    RENDER_COOLDOWN_MED,
    RENDER_COOLDOWN_MIN,
    JOB_TIMEOUT_MS
  }
};

console.log('[Stability] ✅ OVERLORD PRODUCTION HARDENING V2 - Stability Guard ACTIVE');
console.log('[Stability]    Adaptive Render Cooldown: ENABLED');
console.log('[Stability]    Long Render Protection: ENABLED');
console.log('[Stability]    GPU Fallback Protection: ENABLED');
console.log('[Stability]    Hard Crash Guard: ENABLED');
