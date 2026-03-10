/**
 * OVERLORD Phase 7 - Intelligence Telemetry Service
 * Deep system insight tracking without affecting performance
 * 
 * Functions:
 * - logDecisionTrace(jobId, stages)
 * - logScoreEvolution(jobId, originalScore, refinedScore, adaptiveScore)
 * - logRetryTrace(jobId, retryCount, reason)
 * - getTelemetrySummary(range)
 * 
 * Rules:
 * - Non-blocking
 * - Wrapped in try/catch
 * - Never crash pipeline
 * - Auto-create table if not exists
 */

const logger = require('../utils/logger');
const db = require('../database');

// Event types
const EVENT_TYPES = {
  DECISION_TRACE: 'decision_trace',
  SCORE_EVOLUTION: 'score_evolution',
  RETRY_TRACE: 'retry_trace',
  TELEMETRY_SUMMARY: 'telemetry_summary',
  ADAPTIVE_LEARNING: 'adaptive_learning',
  SYSTEM_TELEMETRY: 'system_telemetry'
};

/**
 * Ensure telemetry table exists
 */
function ensureTable() {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        event_type TEXT NOT NULL,
        payload_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_job_id 
      ON ai_telemetry_logs(job_id)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_event_type 
      ON ai_telemetry_logs(event_type)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_created 
      ON ai_telemetry_logs(created_at)
    `);
  } catch (err) {
    // Non-blocking - table creation failure
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Telemetry] Table creation warning:', err.message);
    }
  }
}

// Initialize table on module load
ensureTable();

/**
 * Log decision trace
 * @param {string} jobId - Job ID
 * @param {Array} stages - Decision stages
 */
function logDecisionTrace(jobId, stages) {
  try {
    const payload = JSON.stringify({
      jobId,
      stages,
      timestamp: Date.now()
    });
    
    db.run(
      `INSERT INTO ai_telemetry_logs (job_id, event_type, payload_json) VALUES (?, ?, ?)`,
      [jobId, EVENT_TYPES.DECISION_TRACE, payload],
      function(err) {
        if (err && process.env.NODE_ENV !== 'production') {
          console.log('[Telemetry] logDecisionTrace error:', err.message);
        }
      }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Log score evolution
 * @param {string} jobId - Job ID
 * @param {number} originalScore - Original score
 * @param {number} refinedScore - Refined score
 * @param {number} adaptiveScore - Adaptive score
 */
function logScoreEvolution(jobId, originalScore, refinedScore, adaptiveScore) {
  try {
    const payload = JSON.stringify({
      jobId,
      scores: {
        original: originalScore,
        refined: refinedScore,
        adaptive: adaptiveScore
      },
      timestamp: Date.now()
    });
    
    db.run(
      `INSERT INTO ai_telemetry_logs (job_id, event_type, payload_json) VALUES (?, ?, ?)`,
      [jobId, EVENT_TYPES.SCORE_EVOLUTION, payload],
      function(err) {
        if (err && process.env.NODE_ENV !== 'production') {
          console.log('[Telemetry] logScoreEvolution error:', err.message);
        }
      }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Log retry trace
 * @param {string} jobId - Job ID
 * @param {number} retryCount - Retry count
 * @param {string} reason - Retry reason
 */
function logRetryTrace(jobId, retryCount, reason) {
  try {
    const payload = JSON.stringify({
      jobId,
      retryCount,
      reason,
      timestamp: Date.now()
    });
    
    db.run(
      `INSERT INTO ai_telemetry_logs (job_id, event_type, payload_json) VALUES (?, ?, ?)`,
      [jobId, EVENT_TYPES.RETRY_TRACE, payload],
      function(err) {
        if (err && process.env.NODE_ENV !== 'production') {
          console.log('[Telemetry] logRetryTrace error:', err.message);
        }
      }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Log adaptive learning event
 * @param {string} jobId - Job ID
 * @param {Object} learningData - Learning data
 */
function logAdaptiveLearning(jobId, learningData) {
  try {
    const payload = JSON.stringify({
      jobId,
      ...learningData,
      timestamp: Date.now()
    });
    
    db.run(
      `INSERT INTO ai_telemetry_logs (job_id, event_type, payload_json) VALUES (?, ?, ?)`,
      [jobId, EVENT_TYPES.ADAPTIVE_LEARNING, payload],
      function(err) {
        if (err && process.env.NODE_ENV !== 'production') {
          console.log('[Telemetry] logAdaptiveLearning error:', err.message);
        }
      }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Log system telemetry
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
function logSystemTelemetry(eventType, data) {
  try {
    const payload = JSON.stringify({
      eventType,
      ...data,
      timestamp: Date.now()
    });
    
    db.run(
      `INSERT INTO ai_telemetry_logs (job_id, event_type, payload_json) VALUES (?, ?, ?)`,
      [null, EVENT_TYPES.SYSTEM_TELEMETRY, payload],
      function(err) {
        if (err && process.env.NODE_ENV !== 'production') {
          console.log('[Telemetry] logSystemTelemetry error:', err.message);
        }
      }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Get telemetry summary
 * @param {string} range - Time range: 'hour', 'day', 'week'
 * @returns {Promise<Object>} - Telemetry summary
 */
function getTelemetrySummary(range = 'day') {
  return new Promise((resolve) => {
    try {
      let timeFilter;
      const now = Date.now();
      
      switch (range) {
        case 'hour':
          timeFilter = now - 3600000;
          break;
        case 'day':
          timeFilter = now - 86400000;
          break;
        case 'week':
          timeFilter = now - 604800000;
          break;
        default:
          timeFilter = now - 86400000;
      }
      
      const query = `
        SELECT 
          event_type,
          COUNT(*) as count,
          MIN(created_at) as first_event,
          MAX(created_at) as last_event
        FROM ai_telemetry_logs
        WHERE created_at >= datetime(?)
        GROUP BY event_type
      `;
      
      db.all(query, [new Date(timeFilter).toISOString()], function(err, rows) {
        if (err) {
          resolve({ error: err.message, events: [] });
        } else {
          // Get total count
          db.get(
            `SELECT COUNT(*) as total FROM ai_telemetry_logs WHERE created_at >= datetime(?)`,
            [new Date(timeFilter).toISOString()],
            function(err2, totalRow) {
              if (err2) {
                resolve({ error: err2.message, events: rows || [] });
              } else {
                resolve({
                  range,
                  total: totalRow?.total || 0,
                  events: rows || [],
                  generatedAt: new Date().toISOString()
                });
              }
            }
          );
        }
      });
    } catch (err) {
      resolve({ error: err.message, events: [] });
    }
  });
}

/**
 * Get telemetry for specific job
 * @param {string} jobId - Job ID
 * @returns {Promise<Array>} - Telemetry events
 */
function getJobTelemetry(jobId) {
  return new Promise((resolve) => {
    try {
      db.all(
        `SELECT * FROM ai_telemetry_logs WHERE job_id = ? ORDER BY created_at DESC LIMIT 100`,
        [jobId],
        function(err, rows) {
          if (err) {
            resolve([]);
          } else {
            resolve(rows || []);
          }
        }
      );
    } catch (err) {
      resolve([]);
    }
  });
}

/**
 * Get event types enum
 * @returns {Object} - Event types
 */
function getEventTypes() {
  return { ...EVENT_TYPES };
}

module.exports = {
  logDecisionTrace,
  logScoreEvolution,
  logRetryTrace,
  logAdaptiveLearning,
  logSystemTelemetry,
  getTelemetrySummary,
  getJobTelemetry,
  getEventTypes,
  EVENT_TYPES
};
