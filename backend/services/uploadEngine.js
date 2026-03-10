/**
 * OVERLORD 8GB SAFE UPLOAD ENGINE STABILIZER
 * ==========================================
 * Sequential-only upload queue with memory safety
 * ISOLATED - tidak memodifikasi sistem lain
 * 
 * Rules:
 * - Strictly sequential (for-loop + await)
 * - No Promise.all
 * - No background worker
 * - Memory safe check (>700MB = delay)
 * - Retry max 2x on failure
 * - Don't crash other systems
 */

const uploadService = require('./uploadService');

// ============================================
// INTERNAL STATE (ISOLATED)
// ============================================
const internalQueue = [];
let isUploading = false;

// ============================================
// MEMORY SAFETY CHECK
// ============================================
const checkMemorySafety = async () => {
  const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
  
  if (memoryMB > 700) {
    console.log(`[UPLOAD] ⚠️ Memory high (${memoryMB.toFixed(1)}MB), waiting...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return false;
  }
  return true;
};

// ============================================
// LOGGING UTILITIES
// ============================================
const log = {
  queued: (job) => console.log(`[UPLOAD] 📋 Job queued: ${job.platform} - ${job.clipId}`),
  started: (job) => console.log(`[UPLOAD] ⬆️ Started: ${job.platform} - ${job.clipId}`),
  completed: (job) => console.log(`[UPLOAD] ✅ Completed: ${job.platform} - ${job.clipId}`),
  failed: (job, error) => console.log(`[UPLOAD] ❌ Failed: ${job.platform} - ${job.clipId} - ${error}`),
  retry: (job, attempt) => console.log(`[UPLOAD] 🔄 Retrying: ${job.platform} - ${job.clipId} (attempt ${attempt})`),
  memory: (mb) => console.log(`[UPLOAD] 💾 Memory: ${mb.toFixed(1)}MB`),
};

// ============================================
// PROCESS SINGLE UPLOAD
// ============================================
const processUploadJob = async (job, retryCount = 0) => {
  const MAX_RETRIES = 2;
  
  try {
    // Memory safety check
    const isSafe = await checkMemorySafety();
    if (!isSafe) {
      // Delay and retry memory check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    log.started(job);
    
    // Perform the actual upload
    const result = await uploadService.uploadToPlatform(
      job.platform,
      job.videoPath,
      job.metadata
    );
    
    if (result.success) {
      log.completed(job);
      return { success: true, result };
    } else {
      // Upload returned failure
      throw new Error(result.error || 'Upload failed');
    }
    
  } catch (error) {
    log.failed(job, error.message);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      log.retry(job, retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return processUploadJob(job, retryCount + 1);
    }
    
    // Max retries reached
    return { success: false, error: error.message };
  }
};

// ============================================
// QUEUE PROCESSOR (SEQUENTIAL)
// ============================================
const processQueue = async () => {
  // If already uploading or queue empty, skip
  if (isUploading || internalQueue.length === 0) {
    return;
  }
  
  isUploading = true;
  console.log(`[UPLOAD] 🔄 Processing queue, jobs pending: ${internalQueue.length}`);
  
  // STRICTLY SEQUENTIAL - for-loop + await
  while (internalQueue.length > 0) {
    const job = internalQueue[0]; // Peek at first job
    
    try {
      // Memory check before each job
      const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
      log.memory(memoryMB);
      
      if (memoryMB > 700) {
        console.log(`[UPLOAD] ⏳ Waiting for memory to stabilize...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue; // Skip this iteration, check again
      }
      
      // Process the job
      const result = await processUploadJob(job, 0);
      
      // Remove job from queue after processing
      internalQueue.shift();
      
      // Resolve the job's promise
      if (job.resolve) {
        job.resolve(result);
      }
      
    } catch (error) {
      // Error handling - don't crash, just mark job as failed
      console.error(`[UPLOAD] ❌ Job error: ${error.message}`);
      
      // Remove failed job
      internalQueue.shift();
      
      // Reject the job's promise
      if (job.reject) {
        job.reject(error);
      }
    }
  }
  
  isUploading = false;
  console.log(`[UPLOAD] ✅ Queue empty, processor idle`);
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Add job to upload queue
 * @param {Object} job 
 * @param {string} job.platform - Platform (youtube, facebook, instagram, tiktok)
 * @param {string} job.videoPath - Path to video file
 * @param {Object} job.metadata - Upload metadata
 * @param {string} job.clipId - Clip ID for tracking
 * @returns {Promise} - Resolves when upload completes
 */
const addToQueue = (job) => {
  return new Promise((resolve, reject) => {
    const queueJob = {
      ...job,
      resolve,
      reject,
      addedAt: Date.now()
    };
    
    internalQueue.push(queueJob);
    log.queued(job);
    
    // Trigger queue processing
    processQueue();
  });
};

/**
 * Get queue status
 */
const getQueueStatus = () => {
  return {
    queueLength: internalQueue.length,
    isUploading,
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  };
};

/**
 * Clear queue (emergency use only)
 */
const clearQueue = () => {
  const cleared = internalQueue.length;
  internalQueue.length = 0;
  console.log(`[UPLOAD] 🗑️ Queue cleared, ${cleared} jobs removed`);
  return cleared;
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  addToQueue,
  getQueueStatus,
  clearQueue,
  // Expose for testing
  _internalQueue: internalQueue,
  _isUploading: () => isUploading
};

console.log(`[UPLOAD] 🚀 Upload Engine initialized (sequential mode)`);
