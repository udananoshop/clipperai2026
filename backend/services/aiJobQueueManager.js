/**
 * ClipperAi2026 Enterprise - AI Job Queue Manager Service
 * Queue system for rendering with max 3 concurrent jobs and priority system
 * ENHANCED: Lock system, timeout, retry limits, memory safety
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Job priorities
 * TITAN-A: Map from decision engine priority levels
 */
const PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4
};

// TITAN-A: Map decision engine priority to queue priority
const DECISION_PRIORITY_MAP = {
  high: 'HIGH',
  medium: 'NORMAL',
  low: 'LOW'
};

/**
 * Job statuses
 */
const JOB_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  TIMEOUT: 'timeout'
};

/**
 * AIJobQueueManager Service
 */
class AIJobQueueManager {
  constructor(options = {}) {
    this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
    this.queue = [];
    this.activeJobs = new Map();
    this.completedJobs = new Map();
    this.processingCount = 0;
    this.eventListeners = new Map();
    
    // PATCH: Lock system to prevent duplicate job processing
    this.processingLocks = new Set();
    
    // PATCH: Job timeout (5 minutes default)
    this.jobTimeoutMs = options.jobTimeoutMs || 5 * 60 * 1000;
    this.jobTimeouts = new Map();
    
    // PATCH: Max retries (reduce to 2)
    this.maxRetries = options.maxRetries || 2;
    
    // Start the job processor
    this._startProcessor();
    
    // PATCH: Start timeout checker
    this._startTimeoutChecker();
  }

/**
   * Add a job to the queue
   * @param {Object} jobData - Job data
   * @returns {Object} - Job info
   */
  enqueue(jobData) {
    const {
      type,
      priority = 'NORMAL',
      userId,
      videoId,
      inputData,
      processor, // Function to process the job
      // TITAN-A: Decision engine fields
      priorityLevel,
      finalScore,
      confidence
    } = jobData;

    // PATCH: Check for duplicate job by videoId + type
    const duplicateJob = this._findDuplicateJob(type, videoId);
    if (duplicateJob) {
      logger.warn(`[AIJobQueueManager] Duplicate job detected: ${type} for video ${videoId}`);
      return {
        jobId: duplicateJob.id,
        status: duplicateJob.status,
        position: this._getQueuePosition(duplicateJob.id),
        priority: priority,
        duplicate: true
      };
    }

    const jobId = uuidv4();
    
    // TITAN-A: Determine priority - use decision engine priority if available
    let effectivePriority = priority;
    if (priorityLevel && DECISION_PRIORITY_MAP[priorityLevel]) {
      effectivePriority = DECISION_PRIORITY_MAP[priorityLevel];
    }
    
    const priorityValue = PRIORITIES[effectivePriority] || PRIORITIES.NORMAL;

    const job = {
      id: jobId,
      type,
      priority: priorityValue,
      priorityLabel: effectivePriority,
      // TITAN-A: Store decision engine metrics
      finalScore: finalScore || null,
      confidence: confidence || null,
      decisionPriorityLevel: priorityLevel || null,
      status: JOB_STATUS.QUEUED,
      userId,
      videoId,
      inputData,
      processor,
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      retries: 0,
      maxRetries: this.maxRetries
    };

    // Add to queue based on priority
    this._addToQueue(job);
    
    // Emit event
    this._emit('job:queued', job);

    logger.info(`[AIJobQueueManager] Job ${jobId} enqueued with priority ${priority}`);
    
    // Try to process
    this._processNext();

    return {
      jobId,
      status: JOB_STATUS.QUEUED,
      position: this._getQueuePosition(jobId),
      priority: priority
    };
  }

  /**
   * PATCH: Find duplicate job by type and videoId
   * @param {string} type - Job type
   * @param {string} videoId - Video ID
   * @returns {Object|null} - Duplicate job or null
   */
  _findDuplicateJob(type, videoId) {
    // Check active jobs
    for (const job of this.activeJobs.values()) {
      if (job.type === type && job.videoId === videoId && 
          (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED)) {
        return job;
      }
    }
    // Check queue
    for (const job of this.queue) {
      if (job.type === type && job.videoId === videoId && job.status === JOB_STATUS.QUEUED) {
        return job;
      }
    }
    return null;
  }

  /**
   * Add job to queue based on priority
   * @param {Object} job - Job object
   * @private
   */
  _addToQueue(job) {
    // Find insertion point based on priority
    let insertIndex = this.queue.findIndex(j => j.priority > job.priority);
    if (insertIndex === -1) {
      insertIndex = this.queue.length;
    }
    this.queue.splice(insertIndex, 0, job);
  }

  /**
   * Get queue position for a job
   * @param {string} jobId - Job ID
   * @returns {number} - Position in queue
   */
  _getQueuePosition(jobId) {
    const index = this.queue.findIndex(j => j.id === jobId);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Start the job processor
   * @private
   */
  _startProcessor() {
    this.processorInterval = setInterval(() => {
      this._processNext();
    }, 1000); // Check every second
  }

  /**
   * Process next job in queue
   * @private
   */
  async _processNext() {
    // Check if we can process more jobs
    if (this.processingCount >= this.maxConcurrentJobs) {
      return;
    }

    // Find next queued job
    const nextJob = this.queue.find(j => j.status === JOB_STATUS.QUEUED);
    
    if (!nextJob) {
      return;
    }

    // Start processing
    await this._processJob(nextJob);
  }

/**
   * PATCH: Start timeout checker
   * @private
   */
  _startTimeoutChecker() {
    this.timeoutCheckerInterval = setInterval(() => {
      this._checkJobTimeouts();
    }, 10000); // Check every 10 seconds
  }

  /**
   * PATCH: Check for timed out jobs
   * @private
   */
  _checkJobTimeouts() {
    const now = Date.now();
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.status === JOB_STATUS.PROCESSING && job.startedAt) {
        const elapsed = now - new Date(job.startedAt).getTime();
        
        if (elapsed > this.jobTimeoutMs) {
          logger.error(`[AIJobQueueManager] Job ${jobId} timed out after ${elapsed}ms`);
          
          job.status = JOB_STATUS.TIMEOUT;
          job.error = `Job timed out after ${Math.round(elapsed / 60000)} minutes`;
          job.completedAt = new Date().toISOString();
          
          this._emit('job:timeout', job);
          
          // Clean up
          this.processingCount--;
          this.activeJobs.delete(jobId);
          this.processingLocks.delete(jobId);
          
          // Clear timeout
          if (this.jobTimeouts.has(jobId)) {
            clearTimeout(this.jobTimeouts.get(jobId));
            this.jobTimeouts.delete(jobId);
          }
          
          // Try to process next
          this._processNext();
        }
      }
    }
  }

  /**
   * Process a single job
   * @param {Object} job - Job to process
   * @private
   */
  async _processJob(job) {
    const jobId = job.id;
    
    // PATCH: Lock system - prevent duplicate processing
    if (this.processingLocks.has(jobId)) {
      logger.warn(`[AIJobQueueManager] Job ${jobId} is already being processed`);
      return;
    }
    this.processingLocks.add(jobId);
    
    // Update status
    job.status = JOB_STATUS.PROCESSING;
    job.startedAt = new Date().toISOString();
    this.processingCount++;
    this.activeJobs.set(jobId, job);

    // Remove from queue
    this.queue = this.queue.filter(j => j.id !== jobId);

    // Emit event
    this._emit('job:started', job);

    logger.info(`[AIJobQueueManager] Processing job ${jobId}`);

    // PATCH: Set job timeout
    const timeoutId = setTimeout(() => {
      logger.error(`[AIJobQueueManager] Job ${jobId} exceeded timeout of ${this.jobTimeoutMs}ms`);
      this._handleJobTimeout(job);
    }, this.jobTimeoutMs);
    this.jobTimeouts.set(jobId, timeoutId);

    try {
      // Execute the processor function
      if (typeof job.processor === 'function') {
        // Create progress callback - PATCH: memory safe - don't store large data
        const updateProgress = (progress, status) => {
          job.progress = progress;
          if (status) job.status = status;
          this.activeJobs.set(jobId, job);
          this._emit('job:progress', { jobId, progress, status });
        };

        // Execute processor
        const result = await job.processor(job.inputData, updateProgress);
        
        // PATCH: Clear timeout on success
        if (this.jobTimeouts.has(jobId)) {
          clearTimeout(this.jobTimeouts.get(jobId));
          this.jobTimeouts.delete(jobId);
        }
        
        job.result = result;
        job.status = JOB_STATUS.COMPLETED;
        job.progress = 100;
        job.completedAt = new Date().toISOString();
      } else {
        throw new Error('No processor function provided');
      }

      this.activeJobs.set(jobId, job);
      this.completedJobs.set(jobId, job);
      
      // Emit completion event
      this._emit('job:completed', job);
      
      logger.info(`[AIJobQueueManager] Job ${jobId} completed`);
    } catch (error) {
      logger.error(`[AIJobQueueManager] Job ${jobId} failed:`, error);
      
      // PATCH: Clear timeout on error
      if (this.jobTimeouts.has(jobId)) {
        clearTimeout(this.jobTimeouts.get(jobId));
        this.jobTimeouts.delete(jobId);
      }
      
      job.error = error.message;
      
      // Retry if under max retries
      if (job.retries < job.maxRetries) {
        job.retries++;
        job.status = JOB_STATUS.QUEUED;
        this._addToQueue(job);
        this._emit('job:retry', job);
        logger.info(`[AIJobQueueManager] Job ${jobId} will retry (${job.retries}/${job.maxRetries})`);
      } else {
        job.status = JOB_STATUS.FAILED;
        this._emit('job:failed', job);
      }
    } finally {
      this.processingCount--;
      this.activeJobs.delete(jobId);
      this.processingLocks.delete(jobId);
    }

    // Process next job
    this._processNext();
  }

  /**
   * PATCH: Handle job timeout
   * @param {Object} job - Job that timed out
   */
  _handleJobTimeout(job) {
    if (job.status === JOB_STATUS.PROCESSING) {
      job.status = JOB_STATUS.TIMEOUT;
      job.error = `Job timed out after ${Math.round(this.jobTimeoutMs / 60000)} minutes`;
      job.completedAt = new Date().toISOString();
      
      this._emit('job:timeout', job);
      
      // Clean up
      this.processingCount--;
      this.activeJobs.delete(job.id);
      this.processingLocks.delete(job.id);
      
      // Process next
      this._processNext();
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} - Job status
   */
  getJobStatus(jobId) {
    // Check active jobs
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      return this._formatJobStatus(activeJob);
    }

    // Check completed jobs
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) {
      return this._formatJobStatus(completedJob);
    }

    // Check queue
    const queuedJob = this.queue.find(j => j.id === jobId);
    if (queuedJob) {
      return this._formatJobStatus(queuedJob);
    }

    return null;
  }

  /**
   * Format job status for response
   * @param {Object} job - Job object
   * @returns {Object} - Formatted status
   */
  _formatJobStatus(job) {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      priority: job.priorityLabel,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error,
      retries: job.retries,
      position: this._getQueuePosition(job.id)
    };
  }

  /**
   * Get all jobs for a user
   * @param {number} userId - User ID
   * @returns {Array} - User's jobs
   */
  getUserJobs(userId) {
    const allJobs = [
      ...Array.from(this.queue),
      ...Array.from(this.activeJobs.values()),
      ...Array.from(this.completedJobs.values())
    ];

    return allJobs
      .filter(j => j.userId === userId)
      .map(j => this._formatJobStatus(j));
  }

  /**
   * Get queue status
   * @returns {Object} - Queue status
   */
  getQueueStatus() {
    return {
      maxConcurrent: this.maxConcurrentJobs,
      currentlyProcessing: this.processingCount,
      queued: this.queue.length,
      active: this.activeJobs.size,
      completed: this.completedJobs.size,
      total: this.queue.length + this.activeJobs.size + this.completedJobs.size,
      nextJob: this.queue[0] ? this._formatJobStatus(this.queue[0]) : null
    };
  }

  /**
   * Get all queued jobs
   * @returns {Array} - Queued jobs
   */
  getQueuedJobs() {
    return this.queue.map(j => this._formatJobStatus(j));
  }

  /**
   * Get all active jobs
   * @returns {Array} - Active jobs
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.values()).map(j => this._formatJobStatus(j));
  }

  /**
   * Get recent completed jobs
   * @param {number} limit - Max number to return
   * @returns {Array} - Completed jobs
   */
  getCompletedJobs(limit = 50) {
    return Array.from(this.completedJobs.values())
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, limit)
      .map(j => this._formatJobStatus(j));
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @returns {boolean} - Success
   */
  cancelJob(jobId) {
    // Check queue
    const queueIndex = this.queue.findIndex(j => j.id === jobId);
    if (queueIndex >= 0) {
      this.queue[queueIndex].status = JOB_STATUS.CANCELLED;
      this.queue.splice(queueIndex, 1);
      this._emit('job:cancelled', { jobId });
      return true;
    }

    // Check active jobs
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob && activeJob.status === JOB_STATUS.PROCESSING) {
      activeJob.status = JOB_STATUS.CANCELLED;
      this._emit('job:cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Pause a job
   * @param {string} jobId - Job ID
   * @returns {boolean} - Success
   */
  pauseJob(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob && activeJob.status === JOB_STATUS.PROCESSING) {
      activeJob.status = JOB_STATUS.PAUSED;
      this.activeJobs.set(jobId, activeJob);
      this._emit('job:paused', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Resume a paused job
   * @param {string} jobId - Job ID
   * @returns {boolean} - Success
   */
  resumeJob(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob && activeJob.status === JOB_STATUS.PAUSED) {
      activeJob.status = JOB_STATUS.QUEUED;
      this._addToQueue(activeJob);
      this.activeJobs.delete(jobId);
      this.processingCount--;
      this._emit('job:resumed', { jobId });
      this._processNext();
      return true;
    }
    return false;
  }

  /**
   * Reorder job priority
   * @param {string} jobId - Job ID
   * @param {string} newPriority - New priority level
   * @returns {boolean} - Success
   */
  reorderJob(jobId, newPriority) {
    const job = this.queue.find(j => j.id === jobId);
    if (!job) return false;

    const newPriorityLevel = PRIORITIES[newPriority];
    if (!newPriorityLevel) return false;

    job.priority = newPriorityLevel;
    job.priorityLabel = newPriority;

    // Re-add to queue based on new priority
    this.queue = this.queue.filter(j => j.id !== jobId);
    this._addToQueue(job);

    this._emit('job:priorityChanged', { jobId, priority: newPriority });
    return true;
  }

  /**
   * Clear completed jobs
   * @param {number} olderThanHours - Clear jobs older than this many hours
   */
  clearCompletedJobs(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleared = 0;

    this.completedJobs.forEach((job, jobId) => {
      if (new Date(job.completedAt) < cutoff) {
        this.completedJobs.delete(jobId);
        cleared++;
      }
    });

    logger.info(`[AIJobQueueManager] Cleared ${cleared} completed jobs`);
    return cleared;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const callbacks = this.eventListeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`[AIJobQueueManager] Event listener error:`, error);
        }
      });
    }
  }

/**
   * PATCH: Shutdown the queue manager
   */
  shutdown() {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
    }
    if (this.timeoutCheckerInterval) {
      clearInterval(this.timeoutCheckerInterval);
    }
    // Clear all timeouts
    for (const timeoutId of this.jobTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.jobTimeouts.clear();
    
    logger.info('[AIJobQueueManager] Queue manager shutdown');
  }
}

// Export singleton instance
module.exports = new AIJobQueueManager({
  maxConcurrentJobs: 3
});
