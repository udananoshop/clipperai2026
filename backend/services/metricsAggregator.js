/**
 * Metrics Aggregator Service
 * Tracks AI performance, success rates, and system health
 */

const db = require('../database');
const logger = require('../utils/logger');

class MetricsAggregator {
  constructor() {
    // Metrics cache
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Record a metric event
   */
  recordMetric(metricName, value, metadata = {}) {
    return new Promise((resolve) => {
      const query = `
        INSERT INTO system_metrics (metric_name, metric_value, metadata, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `;
      
      db.run(query, [metricName, value, JSON.stringify(metadata)], (err) => {
        if (err) {
          logger.error('[Metrics] Failed to record metric:', err);
        }
        resolve();
      });
    });
  }

  /**
   * Track AI processing time
   */
  trackAIProcessingTime(jobType, durationMs, success = true) {
    return this.recordMetric('ai_processing_time', durationMs, {
      jobType,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Track job completion
   */
  trackJobCompletion(jobType, durationMs, success = true) {
    return this.recordMetric('job_completion_time', durationMs, {
      jobType,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Track prediction accuracy
   */
  trackPredictionAccuracy(predictedValue, actualValue, predictionType) {
    const delta = Math.abs(predictedValue - actualValue);
    const accuracy = delta <= 10 ? 1 : delta <= 20 ? 0.8 : delta <= 30 ? 0.5 : 0;
    
    return this.recordMetric('prediction_accuracy', accuracy * 100, {
      predictedValue,
      actualValue,
      delta,
      predictionType,
      timestamp: Date.now()
    });
  }

  /**
   * Track API request
   */
  trackAPIRequest(endpoint, method, statusCode, latencyMs) {
    return this.recordMetric('api_request', latencyMs, {
      endpoint,
      method,
      statusCode,
      timestamp: Date.now()
    });
  }

  /**
   * Track credit usage
   */
  trackCreditUsage(userId, credits, action) {
    return this.recordMetric('credit_usage', credits, {
      userId,
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Track failure
   */
  trackFailure(type, errorMessage, metadata = {}) {
    return this.recordMetric('failure_count', 1, {
      type,
      errorMessage,
      ...metadata,
      timestamp: Date.now()
    });
  }

  /**
   * Get AI performance summary
   */
  getAIPerformanceSummary(hours = 24) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          metric_name,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as count
        FROM system_metrics
        WHERE metric_name IN ('ai_processing_time', 'job_completion_time', 'prediction_accuracy')
          AND created_at >= datetime('now', '-${hours} hours')
        GROUP BY metric_name
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          logger.error('[Metrics] Failed to get AI performance:', err);
          reject(err);
        } else {
          // Calculate derived metrics
          const summary = {
            avgAITime: 0,
            avgJobCompletionTime: 0,
            avgPredictionAccuracy: 0,
            totalJobs: 0,
            failureRate: 0
          };
          
          rows.forEach(row => {
            if (row.metric_name === 'ai_processing_time') {
              summary.avgAITime = Math.round(row.avg_value || 0);
            } else if (row.metric_name === 'job_completion_time') {
              summary.avgJobCompletionTime = Math.round(row.avg_value || 0);
            } else if (row.metric_name === 'prediction_accuracy') {
              summary.avgPredictionAccuracy = Math.round(row.avg_value || 0);
            }
            summary.totalJobs += row.count;
          });
          
          // Get failure rate
          this.getFailureRate(hours).then(failureRate => {
            summary.failureRate = failureRate;
            resolve(summary);
          }).catch(() => resolve(summary));
        }
      });
    });
  }

  /**
   * Get failure rate
   */
  getFailureRate(hours = 24) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(CASE WHEN metric_name = 'failure_count' THEN 1 END) as failures,
          COUNT(*) as total
        FROM system_metrics
        WHERE created_at >= datetime('now', '-${hours} hours')
      `;
      
      db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          const rate = row.total > 0 ? (row.failures / row.total) * 100 : 0;
          resolve(Math.round(rate * 100) / 100);
        }
      });
    });
  }

  /**
   * Get trending categories
   */
  getTrendingCategories(limit = 5) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          metadata->>'$.category' as category,
          COUNT(*) as count,
          AVG(metric_value) as avg_score
        FROM system_metrics
        WHERE metric_name = 'prediction_accuracy'
          AND created_at >= datetime('now', '-7 days')
        GROUP BY category
        ORDER BY count DESC
        LIMIT ?
      `;
      
      db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    try {
      const [performance, failureRate, activeJobs] = await Promise.all([
        this.getAIPerformanceSummary(1),
        this.getFailureRate(1),
        this.getActiveJobCount()
      ]);

      return {
        status: failureRate > 10 ? 'degraded' : failureRate > 5 ? 'warning' : 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        performance,
        failureRate,
        activeJobs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[Metrics] Failed to get system health:', error);
      return {
        status: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get active job count
   */
  getActiveJobCount() {
    return new Promise((resolve) => {
      db.get(`
        SELECT COUNT(*) as count FROM ai_jobs 
        WHERE status IN ('processing', 'queued')
          AND created_at >= datetime('now', '-1 hours')
      `, [], (err, row) => {
        resolve(row?.count || 0);
      });
    });
  }

  /**
   * Clean old metrics (retention policy)
   */
  cleanOldMetrics(daysToKeep = 30) {
    return new Promise((resolve) => {
      db.run(`
        DELETE FROM system_metrics 
        WHERE created_at < datetime('now', '-${daysToKeep} days')
      `, function(err) {
        if (err) {
          logger.error('[Metrics] Failed to clean old metrics:', err);
        }
        logger.info(`[Metrics] Cleaned old metrics, deleted ${this.changes} rows`);
        resolve(this.changes);
      });
    });
  }
}

module.exports = new MetricsAggregator();
