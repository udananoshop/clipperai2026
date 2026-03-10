/**
 * OVERLORD Phase 9 - Autonomous Optimization Service
 * Auto-adjust system based on telemetry & performance trends
 * 
 * Functions:
 * - analyzeSystemTrends(range)
 * - detectBottlenecks()
 * - autoTuneConcurrency()
 * - autoTunePriorityWeights()
 * - getOptimizationReport()
 * 
 * Rules:
 * - Read from ai_telemetry_logs and performance metrics
 * - Store adjustments in-memory only
 * - Never alter original SCORE_WEIGHTS permanently
 * - All wrapped in try/catch
 * - Lightweight, non-blocking
 */

const logger = require('../utils/logger');
const db = require('../database');

// Load dependencies
let telemetryService = null;
let performanceGuardian = null;
try {
  telemetryService = require('./intelligenceTelemetryService');
} catch (err) { /* service not available */ }

try {
  performanceGuardian = require('./performanceGuardianService');
} catch (err) { /* service not available */ }

// In-memory adjustments (temporary, non-destructive)
let activeAdjustments = {
  concurrencyMultiplier: 1.0,
  priorityBoost: {
    high: 0,
    medium: 0,
    low: 0
  },
  lastOptimizationTime: null,
  bottleneckDetected: null,
  optimizationsApplied: []
};

// Configuration
const CONFIG = {
  TREND_ANALYSIS_INTERVAL_MS: 60000, // 1 minute
  RETRY_RATE_THRESHOLD: 0.3, // 30% retry rate = high
  SLOW_EXECUTION_THRESHOLD_MS: 120000, // 2 minutes = slow
  MEMORY_PRESSURE_THRESHOLD: 0.85, // 85% memory = pressure
  CONCURRENCY_REDUCTION_FACTOR: 0.5, // Reduce by 50% when bottleneck
  MIN_CONCURRENCY_MULTIPLIER: 0.25,
  MAX_CONCURRENCY_MULTIPLIER: 1.5
};

/**
 * Analyze system trends from telemetry
 * @param {string} range - Time range: 'hour', 'day', 'week'
 * @returns {Object} - Trend analysis
 */
function analyzeSystemTrends(range = 'hour') {
  try {
    const now = Date.now();
    let timeFilter;
    
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
        timeFilter = now - 3600000;
    }

    // Query retry events
    const retryQuery = `
      SELECT COUNT(*) as retry_count 
      FROM ai_telemetry_logs 
      WHERE event_type = 'retry_trace' 
      AND created_at >= datetime(?)
    `;

    // Query total jobs
    const totalQuery = `
      SELECT COUNT(DISTINCT job_id) as total_jobs 
      FROM ai_telemetry_logs 
      WHERE created_at >= datetime(?)
    `;

    // Query slow executions
    const slowQuery = `
      SELECT COUNT(*) as slow_count
      FROM ai_telemetry_logs
      WHERE event_type = 'system_telemetry'
      AND payload_json LIKE '%throttled%'
      AND created_at >= datetime(?)
    `;

    let retryRate = 0;
    let totalJobs = 0;
    let slowCount = 0;

    // Execute queries synchronously for simplicity
    db.get(retryQuery, [new Date(timeFilter).toISOString()], (err, row) => {
      if (!err && row) retryRate = row.retry_count || 0;
    });

    db.get(totalQuery, [new Date(timeFilter).toISOString()], (err, row) => {
      if (!err && row) totalJobs = row.total_jobs || 0;
    });

    db.get(slowQuery, [new Date(timeFilter).toISOString()], (err, row) => {
      if (!err && row) slowCount = row.slow_count || 0;
    });

    // Calculate retry rate
    const calculatedRetryRate = totalJobs > 0 ? retryRate / totalJobs : 0;

    // Get current system metrics
    let systemLoad = null;
    if (performanceGuardian) {
      try {
        systemLoad = performanceGuardian.getSystemLoad();
      } catch (e) { /* ignore */ }
    }

    const trends = {
      retryRate: calculatedRetryRate,
      totalJobs,
      slowExecutions: slowCount,
      systemLoad,
      analyzedAt: new Date().toISOString(),
      range
    };

    // Log analysis
    if (telemetryService) {
      try {
        telemetryService.logSystemTelemetry('system_trends_analyzed', trends);
      } catch (e) { /* non-blocking */ }
    }

    return trends;
  } catch (err) {
    logger.error('[AutonomousOpt] analyzeSystemTrends error:', err.message);
    return { error: err.message };
  }
}

/**
 * Detect system bottlenecks
 * @returns {Object} - Bottleneck detection result
 */
function detectBottlenecks() {
  try {
    const trends = analyzeSystemTrends('hour');
    
    let bottlenecks = [];
    let severity = 'normal';

    // Check retry rate
    if (trends.retryRate > CONFIG.RETRY_RATE_THRESHOLD) {
      bottlenecks.push({
        type: 'high_retry_rate',
        value: trends.retryRate,
        threshold: CONFIG.RETRY_RATE_THRESHOLD,
        severity: trends.retryRate > 0.5 ? 'high' : 'medium'
      });
      severity = 'degraded';
    }

    // Check slow executions
    if (trends.slowExecutions > 10) {
      bottlenecks.push({
        type: 'slow_executions',
        value: trends.slowExecutions,
        threshold: 10,
        severity: 'medium'
      });
      if (severity === 'normal') severity = 'degraded';
    }

    // Check memory pressure
    if (trends.systemLoad?.memory?.usagePercent > CONFIG.MEMORY_PRESSURE_THRESHOLD) {
      bottlenecks.push({
        type: 'memory_pressure',
        value: trends.systemLoad.memory.usagePercent,
        threshold: CONFIG.MEMORY_PRESSURE_THRESHOLD,
        severity: 'high'
      });
      severity = 'critical';
    }

    // Update state
    activeAdjustments.bottleneckDetected = bottlenecks.length > 0 ? {
      bottlenecks,
      severity,
      detectedAt: new Date().toISOString()
    } : null;

    return {
      hasBottlenecks: bottlenecks.length > 0,
      bottlenecks,
      severity,
      recommendations: generateRecommendations(bottlenecks)
    };
  } catch (err) {
    logger.error('[AutonomousOpt] detectBottlenecks error:', err.message);
    return { hasBottlenecks: false, error: err.message };
  }
}

/**
 * Generate optimization recommendations
 * @param {Array} bottlenecks - Detected bottlenecks
 * @returns {Array} - Recommendations
 */
function generateRecommendations(bottlenecks) {
  const recommendations = [];
  
  for (const b of bottlenecks) {
    if (b.type === 'high_retry_rate') {
      recommendations.push('Reduce concurrency to decrease system load');
      recommendations.push('Review retry logic in resilience service');
    } else if (b.type === 'slow_executions') {
      recommendations.push('Consider increasing timeout thresholds');
      recommendations.push('Check for resource contention');
    } else if (b.type === 'memory_pressure') {
      recommendations.push('Reduce max concurrent jobs immediately');
      recommendations.push('Consider queueing new jobs temporarily');
    }
  }
  
  return recommendations;
}

/**
 * Auto-tune concurrency based on detected bottlenecks
 * @returns {Object} - Tuning result
 */
function autoTuneConcurrency() {
  try {
    const bottlenecks = detectBottlenecks();
    
    if (!bottlenecks.hasBottlenecks) {
      // Reset to normal if no bottlenecks
      if (activeAdjustments.concurrencyMultiplier < 1.0) {
        activeAdjustments.concurrencyMultiplier = Math.min(
          activeAdjustments.concurrencyMultiplier + 0.1,
          1.0
        );
      }
      
      return {
        action: 'restore',
        previousMultiplier: activeAdjustments.concurrencyMultiplier,
        newMultiplier: activeAdjustments.concurrencyMultiplier,
        reason: 'No bottlenecks detected'
      };
    }

    // Reduce concurrency
    const previousMultiplier = activeAdjustments.concurrencyMultiplier;
    activeAdjustments.concurrencyMultiplier = Math.max(
      previousMultiplier * CONFIG.CONCURRENCY_REDUCTION_FACTOR,
      CONFIG.MIN_CONCURRENCY_MULTIPLIER
    );

    const optimization = {
      type: 'concurrency_tuning',
      previousMultiplier,
      newMultiplier: activeAdjustments.concurrencyMultiplier,
      bottlenecks: bottlenecks.bottlenecks,
      appliedAt: new Date().toISOString()
    };
    
    activeAdjustments.optimizationsApplied.push(optimization);
    activeAdjustments.lastOptimizationTime = new Date().toISOString();

    logger.info('[AutonomousOpt] Concurrency auto-tuned', {
      previous: previousMultiplier,
      new: activeAdjustments.concurrencyMultiplier
    });

    // Log to telemetry
    if (telemetryService) {
      try {
        telemetryService.logSystemTelemetry('concurrency_optimized', optimization);
      } catch (e) { /* non-blocking */ }
    }

    return {
      action: 'reduce',
      previousMultiplier,
      newMultiplier: activeAdjustments.concurrencyMultiplier,
      reason: 'Bottleneck detected'
    };
  } catch (err) {
    logger.error('[AutonomousOpt] autoTuneConcurrency error:', err.message);
    return { error: err.message };
  }
}

/**
 * Auto-tune priority weights dynamically (non-destructive)
 * @returns {Object} - Tuning result
 */
function autoTunePriorityWeights() {
  try {
    const bottlenecks = detectBottlenecks();
    
    // If critical memory pressure, boost high priority to process faster
    const hasMemoryPressure = bottlenecks.bottlenecks?.some(b => b.type === 'memory_pressure');
    
    if (hasMemoryPressure) {
      // Temporarily favor high priority jobs to complete quickly
      activeAdjustments.priorityBoost.high = 2;
      activeAdjustments.priorityBoost.medium = 0;
      activeAdjustments.priorityBoost.low = -1;
    } else if (!bottlenecks.hasBottlenecks) {
      // Reset to normal
      activeAdjustments.priorityBoost = { high: 0, medium: 0, low: 0 };
    }

    const optimization = {
      type: 'priority_weights_tuning',
      previousBoost: { ...activeAdjustments.priorityBoost },
      appliedAt: new Date().toISOString()
    };
    
    activeAdjustments.optimizationsApplied.push(optimization);
    activeAdjustments.lastOptimizationTime = new Date().toISOString();

    return {
      action: hasMemoryPressure ? 'adjust' : 'reset',
      priorityBoost: { ...activeAdjustments.priorityBoost },
      reason: hasMemoryPressure ? 'Memory pressure detected' : 'System normal'
    };
  } catch (err) {
    logger.error('[AutonomousOpt] autoTunePriorityWeights error:', err.message);
    return { error: err.message };
  }
}

/**
 * Get optimization report
 * @returns {Object} - Full optimization report
 */
function getOptimizationReport() {
  try {
    return {
      activeAdjustments: { ...activeAdjustments },
      currentTrends: analyzeSystemTrends('hour'),
      bottlenecks: detectBottlenecks(),
      config: { ...CONFIG },
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get current adjustments
 * @returns {Object} - Current adjustments
 */
function getCurrentAdjustments() {
  return { ...activeAdjustments };
}

/**
 * Reset all adjustments
 */
function resetAdjustments() {
  activeAdjustments = {
    concurrencyMultiplier: 1.0,
    priorityBoost: { high: 0, medium: 0, low: 0 },
    lastOptimizationTime: null,
    bottleneckDetected: null,
    optimizationsApplied: []
  };
  
  logger.info('[AutonomousOpt] Adjustments reset to defaults');
}

module.exports = {
  analyzeSystemTrends,
  detectBottlenecks,
  autoTuneConcurrency,
  autoTunePriorityWeights,
  getOptimizationReport,
  getCurrentAdjustments,
  resetAdjustments,
  CONFIG
};
