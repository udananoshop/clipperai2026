/**
 * OVERLORD Phase 5 - Score Adaptation Service
 * Lightweight learning memory for adaptive scoring refinement
 * 
 * Features:
 * - trackScoreOutcome(jobId, predictedScore, actualPerformance)
 * - calculateAdjustmentFactor()
 * - getRefinedScore(originalScore)
 * 
 * Uses SQLite table: ai_learning_memory
 * No external dependencies.
 */

const db = require('../database');
const logger = require('../utils/logger');

// In-memory cache for adjustment factor
let adjustmentFactor = 0;
let lastCalculationTime = 0;
const RECALCULATION_INTERVAL_MS = 60000; // 1 minute

// Configuration
const CONFIG = {
  LEARNING_WINDOW_SIZE: 50,  // Number of recent outcomes to consider
  DEFAULT_ADJUSTMENT: 0,
  MAX_POSITIVE_ADJUSTMENT: 15,  // Max +15% adjustment
  MAX_NEGATIVE_ADJUSTMENT: -15, // Max -15% adjustment
  MIN_SAMPLES_FOR_ADAPTATION: 5 // Minimum samples before adapting
};

/**
 * Ensure the ai_learning_memory table exists
 * Creates table if not exists (call once at startup)
 */
function initializeTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_learning_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        predicted_score REAL NOT NULL,
        actual_performance REAL NOT NULL,
        adjustment_applied REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, function(err) {
      if (err) {
        logger.error('[ScoreAdaptation] Failed to create table:', err.message);
        reject(err);
      } else {
        logger.info('[ScoreAdaptation] Table initialized');
        resolve();
      }
    });
  });
}

/**
 * Track score outcome - record predicted vs actual performance
 * @param {string} jobId - Job ID
 * @param {number} predictedScore - Predicted AI score
 * @param {number} actualPerformance - Actual performance metric (0-100)
 * @returns {Promise<Object>} - Result
 */
async function trackScoreOutcome(jobId, predictedScore, actualPerformance) {
  return new Promise((resolve, reject) => {
    // Calculate adjustment for this specific record
    const error = actualPerformance - predictedScore;
    
    db.run(
      `INSERT INTO ai_learning_memory (job_id, predicted_score, actual_performance, adjustment_applied)
       VALUES (?, ?, ?, ?)`,
      [jobId, predictedScore, actualPerformance, error],
      function(err) {
        if (err) {
          logger.error('[ScoreAdaptation] Failed to track outcome:', err.message);
          resolve({ success: false, error: err.message });
        } else {
          logger.debug('[ScoreAdaptation] Outcome tracked', { jobId, predictedScore, actualPerformance });
          
          // Trigger recalculation if enough new data
          triggerRecalculationIfNeeded();
          
          resolve({ success: true, jobId, error });
        }
      }
    );
  });
}

/**
 * Calculate adjustment factor based on recent outcomes
 * Uses simple weighted rolling average
 * @returns {Promise<number>} - Adjustment factor (-15 to +15)
 */
async function calculateAdjustmentFactor() {
  const now = Date.now();
  
  // Use cached value if recent
  if (now - lastCalculationTime < RECALCULATION_INTERVAL_MS) {
    return adjustmentFactor;
  }
  
  return new Promise((resolve) => {
    db.all(
      `SELECT * FROM ai_learning_memory 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [CONFIG.LEARNING_WINDOW_SIZE],
      function(err, rows) {
        if (err || !rows || rows.length < CONFIG.MIN_SAMPLES_FOR_ADAPTATION) {
          logger.debug('[ScoreAdaptation] Not enough data for adaptation');
          resolve(CONFIG.DEFAULT_ADJUSTMENT);
          return;
        }
        
        // Calculate weighted average of errors
        // More recent entries have higher weight
        let totalWeightedError = 0;
        let totalWeight = 0;
        
        rows.forEach((row, index) => {
          const weight = index + 1; // More recent = higher weight
          const error = row.actual_performance - row.predicted_score;
          totalWeightedError += error * weight;
          totalWeight += weight;
        });
        
        const averageError = totalWeightedError / totalWeight;
        
        // Apply constraints
        adjustmentFactor = Math.max(
          CONFIG.MAX_NEGATIVE_ADJUSTMENT,
          Math.min(CONFIG.MAX_POSITIVE_ADJUSTMENT, averageError)
        );
        
        lastCalculationTime = now;
        
        logger.info('[ScoreAdaptation] Adjustment factor calculated', {
          factor: adjustmentFactor,
          samples: rows.length
        });
        
        resolve(adjustmentFactor);
      }
    );
  });
}

/**
 * Get refined score by applying adaptation factor
 * @param {number} originalScore - Original AI score
 * @returns {Promise<number>} - Refined score
 */
async function getRefinedScore(originalScore) {
  try {
    const factor = await calculateAdjustmentFactor();
    const refinedScore = originalScore + factor;
    
    // Clamp to valid range (0-100)
    return Math.max(0, Math.min(100, refinedScore));
  } catch (error) {
    logger.warn('[ScoreAdaptation] Failed to get refined score:', error.message);
    // Fallback to original score on error
    return originalScore;
  }
}

/**
 * Get current adjustment factor (synchronous, uses cache)
 * @returns {number} - Cached adjustment factor
 */
function getCachedAdjustmentFactor() {
  return adjustmentFactor;
}

/**
 * Reset learning memory (for testing)
 * @returns {Promise}
 */
async function resetMemory() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM ai_learning_memory', function(err) {
      if (err) {
        reject(err);
      } else {
        adjustmentFactor = 0;
        logger.info('[ScoreAdaptation] Memory reset');
        resolve();
      }
    });
  });
}

/**
 * Get learning statistics
 * @returns {Promise<Object>} - Stats
 */
async function getStats() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as total FROM ai_learning_memory', function(err, row) {
      if (err) {
        reject(err);
      } else {
        db.get(
          `SELECT AVG(actual_performance - predicted_score) as avg_error,
                  MIN(created_at) as oldest,
                  MAX(created_at) as newest
           FROM ai_learning_memory`,
          function(err2, stats) {
            resolve({
              totalSamples: row?.total || 0,
              adjustmentFactor,
              lastCalculation: new Date(lastCalculationTime).toISOString(),
              averageError: stats?.avg_error || 0,
              oldestSample: stats?.oldest,
              newestSample: stats?.newest,
                  minSamplesRequired: CONFIG.MIN_SAMPLES_FOR_ADAPTATION
            });
          }
        );
      }
    });
  });
}

/**
 * Trigger recalculation if enough new samples
 */
function triggerRecalculationIfNeeded() {
  db.get('SELECT COUNT(*) as count FROM ai_learning_memory', function(err, row) {
    if (row && row.count >= CONFIG.MIN_SAMPLES_FOR_ADAPTATION) {
      calculateAdjustmentFactor().catch(() => {});
    }
  });
}

// Initialize on module load
initializeTable().catch(err => {
  logger.warn('[ScoreAdaptation] Table initialization deferred:', err.message);
});

module.exports = {
  initializeTable,
  trackScoreOutcome,
  calculateAdjustmentFactor,
  getRefinedScore,
  getCachedAdjustmentFactor,
  resetMemory,
  getStats,
  CONFIG
};
