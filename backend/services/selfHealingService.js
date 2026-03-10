/**
 * OVERLORD Phase 10 - Self-Healing Service
 * System recovers automatically from partial failures
 * 
 * Functions:
 * - detectStalledJobs()
 * - retryStalledJobs()
 * - recoverFromSoftFailure(job)
 * - cleanZombieProcesses()
 * - getHealingReport()
 * 
 * Rules:
 * - Detect jobs stuck > configurable timeout
 * - Auto-retry max 2 times
 * - Log recovery via intelligenceTelemetryService
 * - Never create infinite retry loop
 * - Never delete valid job data
 * - Must degrade gracefully
 * - Run periodically, non-blocking
 */

const logger = require('../utils/logger');
const db = require('../database');

// Load dependencies
let telemetryService = null;
let resilienceService = null;
try {
  telemetryService = require('./intelligenceTelemetryService');
} catch (err) { /* service not available */ }

try {
  resilienceService = require('./resilienceService');
} catch (err) { /* service not available */ }

// Configuration
const CONFIG = {
  STALLED_JOB_TIMEOUT_MS: 300000, // 5 minutes = stalled
  HEALING_INTERVAL_MS: 60000, // Check every 1 minute
  MAX_AUTO_RETRY: 2,
  MAX_STALLED_JOBS_PER_RUN: 10,
  ZOMBIE_CLEANUP_ENABLED: true
};

// In-memory state
let healingHistory = [];
let isHealingEnabled = true;
let lastHealingRun = null;

/**
 * Detect stalled jobs in the system
 * @returns {Promise<Array>} - Array of stalled jobs
 */
function detectStalledJobs() {
  return new Promise((resolve) => {
    try {
      const timeoutMs = CONFIG.STALLED_JOB_TIMEOUT_MS;
      
      const query = `
        SELECT * FROM ai_jobs 
        WHERE status IN ('running', 'processing')
        AND updated_at < datetime('now', '-' || ? || ' seconds')
        AND retry_count < ?
        LIMIT ?
      `;
      
      db.all(query, [Math.floor(timeoutMs / 1000), CONFIG.MAX_AUTO_RETRY, CONFIG.MAX_STALLED_JOBS_PER_RUN], 
        function(err, rows) {
          if (err) {
            logger.error('[SelfHealing] detectStalledJobs error:', err.message);
            resolve([]);
          } else {
            resolve(rows || []);
          }
        }
      );
    } catch (err) {
      logger.error('[SelfHealing] detectStalledJobs exception:', err.message);
      resolve([]);
    }
  });
}

/**
 * Retry stalled jobs
 * @returns {Object} - Retry result
 */
async function retryStalledJobs() {
  if (!isHealingEnabled) {
    return { success: false, reason: 'healing_disabled' };
  }

  try {
    const stalledJobs = await detectStalledJobs();
    
    if (stalledJobs.length === 0) {
      return {
        success: true,
        jobsProcessed: 0,
        message: 'No stalled jobs detected'
      };
    }

    let successCount = 0;
    let failCount = 0;

    for (const job of stalledJobs) {
      try {
        // Check if we should retry (via resilience service if available)
        let shouldRetry = true;
        if (resilienceService && typeof resilienceService.shouldRetry === 'function') {
          const retryDecision = resilienceService.shouldRetry({
            id: job.id,
            retry_count: job.retry_count || 0
          });
          shouldRetry = retryDecision.shouldRetry;
        }

        if (!shouldRetry) {
          failCount++;
          continue;
        }

        // Mark job for retry
        const newRetryCount = (job.retry_count || 0) + 1;
        
        await new Promise((resolve) => {
          db.run(
            `UPDATE ai_jobs SET status = 'pending', retry_count = ?, updated_at = datetime('now') WHERE id = ?`,
            [newRetryCount, job.id],
            function(err) {
              if (err) {
                logger.error('[SelfHealing] Failed to update job:', err.message);
              }
              resolve();
            }
          );
        });

        // Log retry via telemetry
        if (telemetryService) {
          try {
            telemetryService.logRetryTrace(job.id, newRetryCount, 'stalled_job_recovery');
          } catch (e) { /* non-blocking */ }
        }

        successCount++;
        
        logger.info('[SelfHealing] Recovered stalled job', {
          jobId: job.id,
          retryCount: newRetryCount
        });

      } catch (jobErr) {
        logger.error('[SelfHealing] Job recovery error:', jobErr.message);
        failCount++;
      }
    }

    // Update healing history
    healingHistory.push({
      type: 'retry_stalled_jobs',
      jobsProcessed: stalledJobs.length,
      successCount,
      failCount,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 entries
    if (healingHistory.length > 100) {
      healingHistory = healingHistory.slice(-100);
    }

    lastHealingRun = new Date().toISOString();

    return {
      success: true,
      jobsProcessed: stalledJobs.length,
      successCount,
      failCount,
      timestamp: lastHealingRun
    };

  } catch (err) {
    logger.error('[SelfHealing] retryStalledJobs error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Recover from soft failure
 * @param {Object} job - Job object
 * @returns {Object} - Recovery result
 */
function recoverFromSoftFailure(job) {
  return new Promise((resolve) => {
    try {
      if (!job || !job.id) {
        resolve({ success: false, reason: 'invalid_job' });
        return;
      }

      // Soft failure types we can recover from
      const recoveryActions = [];

      // Check if job is in failed state but recoverable
      if (job.status === 'failed') {
        // Reset to pending for retry
        recoveryActions.push('reset_to_pending');
      }

      // Check if job has error message but no actual failure
      if (job.error_message && !job.error_message.includes('hard_failure')) {
        // Clear error message
        recoveryActions.push('clear_error');
      }

      if (recoveryActions.length === 0) {
        resolve({ success: false, reason: 'no_recovery_action' });
        return;
      }

      // Apply recovery
      const newRetryCount = (job.retry_count || 0) + 1;
      
      db.run(
        `UPDATE ai_jobs SET status = 'pending', error_message = NULL, retry_count = ?, updated_at = datetime('now') WHERE id = ?`,
        [newRetryCount, job.id],
        function(err) {
          if (err) {
            logger.error('[SelfHealing] recoverFromSoftFailure error:', err.message);
            resolve({ success: false, error: err.message });
          } else {
            // Log recovery
            if (telemetryService) {
              try {
                telemetryService.logSystemTelemetry('soft_failure_recovered', {
                  jobId: job.id,
                  actions: recoveryActions,
                  retryCount: newRetryCount
                });
              } catch (e) { /* non-blocking */ }
            }

            logger.info('[SelfHealing] Recovered from soft failure', {
              jobId: job.id,
              actions: recoveryActions
            });

            resolve({
              success: true,
              jobId: job.id,
              actions: recoveryActions,
              retryCount: newRetryCount
            });
          }
        }
      );

    } catch (err) {
      logger.error('[SelfHealing] recoverFromSoftFailure exception:', err.message);
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Clean zombie processes/records
 * @returns {Object} - Cleanup result
 */
function cleanZombieProcesses() {
  if (!CONFIG.ZOMBIE_CLEANUP_ENABLED) {
    return { success: false, reason: 'zombie_cleanup_disabled' };
  }

  try {
    // Find jobs that have been in pending state for too long without progress
    const stalePendingQuery = `
      SELECT COUNT(*) as count FROM ai_jobs 
      WHERE status = 'pending' 
      AND created_at < datetime('now', '-1 hours')
    `;

    // Find orphaned jobs (no video reference)
    const orphanedQuery = `
      SELECT COUNT(*) as count FROM ai_jobs 
      WHERE video_id IS NULL 
      AND status = 'pending'
      AND created_at < datetime('now', '-2 hours')
    `;

    let stalePending = 0;
    let orphaned = 0;

    db.get(stalePendingQuery, [], (err, row) => {
      if (!err && row) stalePending = row.count || 0;
    });

    db.get(orphanedQuery, [], (err, row) => {
      if (!err && row) orphaned = row.count || 0;
    });

    // Log cleanup action
    if (telemetryService && (stalePending > 0 || orphaned > 0)) {
      try {
        telemetryService.logSystemTelemetry('zombie_cleanup', {
          stalePending,
          orphaned,
          cleanedAt: new Date().toISOString()
        });
      } catch (e) { /* non-blocking */ }
    }

    return {
      success: true,
      stalePending,
      orphaned,
      message: stalePending + orphaned + ' potential zombies found (not deleted - review only)',
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    logger.error('[SelfHealing] cleanZombieProcesses error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get healing report
 * @returns {Object} - Full healing report
 */
function getHealingReport() {
  return {
    isEnabled: isHealingEnabled,
    lastHealingRun,
    config: { ...CONFIG },
    recentHealing: healingHistory.slice(-10),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Enable/disable healing
 * @param {boolean} enabled - Enable or disable
 */
function setHealingEnabled(enabled) {
  isHealingEnabled = !!enabled;
  logger.info('[SelfHealing] Healing enabled:', isHealingEnabled);
}

/**
 * Run full healing cycle
 * @returns {Object} - Full healing result
 */
async function runHealingCycle() {
  if (!isHealingEnabled) {
    return { success: false, reason: 'healing_disabled' };
  }

  const results = {
    stalledJobs: null,
    softFailures: null,
    zombieCleanup: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Step 1: Retry stalled jobs
    results.stalledJobs = await retryStalledJobs();

    // Step 2: Clean zombies
    results.zombieCleanup = cleanZombieProcesses();

    // Update last run
    lastHealingRun = results.timestamp;

    return {
      success: true,
      ...results
    };

  } catch (err) {
    logger.error('[SelfHealing] runHealingCycle error:', err.message);
    return {
      success: false,
      error: err.message,
      ...results
    };
  }
}

/**
 * Get configuration
 * @returns {Object} - Config
 */
function getConfig() {
  return { ...CONFIG };
}

module.exports = {
  detectStalledJobs,
  retryStalledJobs,
  recoverFromSoftFailure,
  cleanZombieProcesses,
  getHealingReport,
  setHealingEnabled,
  runHealingCycle,
  getConfig,
  CONFIG
};
