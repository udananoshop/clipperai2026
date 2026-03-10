/**
 * OVERLORD SMART QUEUE LIMITER - 8GB Safe Mode
 * 
 * Intelligent queue limiting layer
 * - Max concurrent heavy render jobs: 1
 * - Memory threshold pause: 85%
 * - Memory resume threshold: 75%
 * - Queue check interval: 2000ms
 * - Graceful pause/resume (no job cancel)
 * 
 * CONTROL LAYER ONLY - No changes to render/AI/DB/GPU logic
 */

const os = require('os');

// Configuration
const MAX_CONCURRENT_HEAVY_JOBS = 1;
const MEMORY_PAUSE_THRESHOLD = 85;
const MEMORY_RESUME_THRESHOLD = 75;
const CHECK_INTERVAL_MS = 2000;
const MAX_DELAY_MS = 60000; // Max 60 seconds wait

// State
let activeJobs = 0;
let isPaused = false;
let checkInterval = null;

/**
 * Get current memory usage
 */
function getMemoryUsage() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return Math.round((usedMem / totalMem) * 100);
  } catch (e) {
    return 0;
  }
}

/**
 * Wait for slot to be available
 * @param {string} jobId - Job identifier for logging
 * @returns {Promise<boolean>} - True if slot granted
 */
async function waitForSlot(jobId = 'unknown') {
  const memUsage = getMemoryUsage();
  
  console.log(`[QueueLimiter] Job ${jobId} checking memory: ${memUsage}%`);
  
  // Check if memory is too high
  if (memUsage > MEMORY_PAUSE_THRESHOLD) {
    console.log(`[QueueLimiter] Memory high (${memUsage}%), delaying job ${jobId}...`);
    isPaused = true;
    
    // Wait for memory to come down
    let waited = 0;
    while (memUsage > MEMORY_RESUME_THRESHOLD && waited < MAX_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
      waited += CHECK_INTERVAL_MS;
      
      const currentMem = getMemoryUsage();
      console.log(`[QueueLimiter] Waiting... memory: ${currentMem}%`);
      
      if (currentMem <= MEMORY_RESUME_THRESHOLD) {
        break;
      }
    }
    
    if (waited >= MAX_DELAY_MS) {
      console.log(`[QueueLimiter] Max wait time reached, allowing job ${jobId}`);
    }
  }
  
  // Check concurrent job limit
  while (activeJobs >= MAX_CONCURRENT_HEAVY_JOBS) {
    console.log(`[QueueLimiter] Concurrent job limit reached, waiting...`);
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
  }
  
  // Grant slot
  activeJobs++;
  console.log(`[QueueLimiter] Slot granted to job ${jobId}. Active: ${activeJobs}`);
  
  return true;
}

/**
 * Release slot after job completes
 * @param {string} jobId - Job identifier for logging
 */
function releaseSlot(jobId = 'unknown') {
  activeJobs = Math.max(0, activeJobs - 1);
  console.log(`[QueueLimiter] Job ${jobId} released. Active: ${activeJobs}`);
  
  // Resume if memory is safe
  const memUsage = getMemoryUsage();
  if (memUsage < MEMORY_RESUME_THRESHOLD && isPaused) {
    isPaused = false;
    console.log(`[QueueLimiter] Memory safe (${memPhysics}%), queue resumed`);
  }
}

/**
 * Check if can accept new job
 */
function canAcceptJob() {
  const memUsage = getMemoryUsage();
  
  if (memUsage > MEMORY_PAUSE_THRESHOLD) {
    return false;
  }
  
  if (activeJobs >= MAX_CONCURRENT_HEAVY_JOBS) {
    return false;
  }
  
  return true;
}

/**
 * Get current status
 */
function getStatus() {
  return {
    activeJobs,
    maxConcurrent: MAX_CONCURRENT_HEAVY_JOBS,
    memoryUsage: getMemoryUsage(),
    memoryPauseThreshold: MEMORY_PAUSE_THRESHOLD,
    memoryResumeThreshold: MEMORY_RESUME_THRESHOLD,
    isPaused
  };
}

/**
 * Start monitoring (optional)
 */
function start() {
  if (checkInterval) {
    console.log('[QueueLimiter] Already running');
    return;
  }
  
  console.log('[QueueLimiter] ACTIVE - 8GB SAFE PROFILE');
  console.log(`[QueueLimiter] Max concurrent: ${MAX_CONCURRENT_HEAVY_JOBS}`);
  console.log(`[QueueLimiter] Memory pause: ${MEMORY_PAUSE_THRESHOLD}%`);
  console.log(`[QueueLimiter] Memory resume: ${MEMORY_RESUME_THRESHOLD}%`);
  
  checkInterval = setInterval(() => {
    const mem = getMemoryUsage();
    if (mem > MEMORY_PAUSE_THRESHOLD && !isPaused) {
      isPaused = true;
      console.log(`[QueueLimiter] Memory high (${mem}%), pausing new jobs`);
    } else if (mem < MEMORY_RESUME_THRESHOLD && isPaused) {
      isPaused = false;
      console.log(`[QueueLimiter] Memory safe (${mem}%), resuming`);
    }
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop monitoring
 */
function stop() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('[QueueLimiter] Stopped');
  }
}

module.exports = {
  waitForSlot,
  releaseSlot,
  canAcceptJob,
  getStatus,
  start,
  stop,
  config: {
    MAX_CONCURRENT_HEAVY_JOBS,
    MEMORY_PAUSE_THRESHOLD,
    MEMORY_RESUME_THRESHOLD,
    CHECK_INTERVAL_MS,
    MAX_DELAY_MS
  }
};

console.log('[QueueLimiter] Smart Queue Limiter module loaded');
