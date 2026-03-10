/**
 * TITAN-B Phase 8 - Performance History Service
 * Performance Tracking System
 * 
 * Responsibilities:
 * - logPerformance(job) - Log metrics after job completion
 * - getPerformanceStats(range) - Get stats by time range
 */

const logger = require('../utils/logger');
const db = require('../database');

/**
 * Log performance data for a completed job
 * 
 * @param {Object} job - Job object containing performance metrics
 * @returns {Promise<number>} - Inserted row ID
 */
async function logPerformance(job) {
  return new Promise((resolve, reject) => {
    const { jobId, finalScore, confidence, priorityLevel, processingTimeMs } = job;
    
    // Use values from job or defaults
    const final_score = finalScore ?? job.final_score ?? job.decision?.finalScore ?? 50;
    const confidence_score = confidence ?? job.confidence ?? job.decision?.confidence ?? 30;
    const priority = priorityLevel ?? job.priority_level ?? job.decision?.priorityLevel ?? 'medium';
    const processing_time = processingTimeMs ?? job.execution_time_ms ?? job.processingTimeMs ?? 0;

    db.run(
      `INSERT INTO performance_history (job_id, final_score, confidence, priority_level, processing_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [jobId, final_score, confidence_score, priority, processing_time],
      function(err) {
        if (err) {
          logger.error('[PerformanceHistory] Failed to log performance:', err);
          reject(err);
        } else {
          logger.info(`[PerformanceHistory] Performance logged for job ${jobId}`);
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Get performance statistics by time range
 * 
 * @param {string} range - Time range: 'today', 'week', 'month', 'all'
 * @returns {Promise<Object>} - Performance statistics
 */
async function getPerformanceStats(range = 'week') {
  return new Promise((resolve, reject) => {
    let dateFilter = '';
    const now = new Date();
    
    switch (range) {
      case 'today':
        dateFilter = "AND created_at >= date('now', 'start of day')";
        break;
      case 'week':
        dateFilter = "AND created_at >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND created_at >= date('now', '-30 days')";
        break;
      case 'all':
      default:
        dateFilter = '';
        break;
    }

    const query = `
      SELECT 
        COUNT(*) as total_jobs,
        AVG(final_score) as avg_final_score,
        AVG(confidence) as avg_confidence,
        AVG(processing_time_ms) as avg_processing_time,
        MIN(processing_time_ms) as min_processing_time,
        MAX(processing_time_ms) as max_processing_time,
        SUM(processing_time_ms) as total_processing_time,
        COUNT(CASE WHEN priority_level = 'high' THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN priority_level = 'medium' THEN 1 END) as medium_priority_count,
        COUNT(CASE WHEN priority_level = 'low' THEN 1 END) as low_priority_count,
        AVG(final_score) as avg_score
      FROM performance_history
      WHERE 1=1 ${dateFilter}
    `;

    db.get(query, [], function(err, row) {
      if (err) {
        logger.error('[PerformanceHistory] Failed to get performance stats:', err);
        reject(err);
      } else {
        // Handle null values (when table is empty)
        const stats = {
          total_jobs: row?.total_jobs || 0,
          avg_final_score: Math.round(row?.avg_final_score || 0),
          avg_confidence: Math.round(row?.avg_confidence || 0),
          avg_processing_time: Math.round(row?.avg_processing_time || 0),
          min_processing_time: row?.min_processing_time || 0,
          max_processing_time: row?.max_processing_time || 0,
          total_processing_time: row?.total_processing_time || 0,
          high_priority_count: row?.high_priority_count || 0,
          medium_priority_count: row?.medium_priority_count || 0,
          low_priority_count: row?.low_priority_count || 0,
          range: range,
          calculatedAt: new Date().toISOString()
        };
        
        resolve(stats);
      }
    });
  });
}

/**
 * Get performance history for a specific job
 * 
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} - Performance record or null
 */
async function getPerformanceByJobId(jobId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM performance_history WHERE job_id = ?`,
      [jobId],
      function(err, row) {
        if (err) {
          logger.error('[PerformanceHistory] Failed to get performance by job ID:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

/**
 * Get recent performance records
 * 
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<Array>} - Array of performance records
 */
async function getRecentPerformance(limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM performance_history ORDER BY created_at DESC LIMIT ?`,
      [limit],
      function(err, rows) {
        if (err) {
          logger.error('[PerformanceHistory] Failed to get recent performance:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Get performance summary for API response
 * Returns the key metrics needed for the /performance/summary endpoint
 * 
 * @param {string} range - Time range
 * @returns {Promise<Object>} - Summary object
 */
async function getPerformanceSummary(range = 'week') {
  const stats = await getPerformanceStats(range);
  
  return {
    avg_final_score: stats.avg_final_score,
    avg_processing_time: stats.avg_processing_time,
    total_jobs: stats.total_jobs,
    high_priority_count: stats.high_priority_count,
    range: range,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  logPerformance,
  getPerformanceStats,
  getPerformanceByJobId,
  getRecentPerformance,
  getPerformanceSummary
};
