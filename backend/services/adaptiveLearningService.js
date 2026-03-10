/**
 * OVERLORD Phase 3 - Adaptive Learning Service
 * Self-optimizing weight system based on performance history
 * 
 * Features:
 * - analyzePerformanceTrends() - Read performance history
 * - calculateOptimalWeights() - Calculate optimal weights
 * - getAdaptiveWeights() - Get current adaptive weights
 * - Auto-optimize every 20 jobs
 */

const db = require('../database');

// Default TITAN weights (fallback)
const DEFAULT_WEIGHTS = {
  viral_score: 0.40,
  engagement_score: 0.30,
  trend_boost: 0.20,
  sentiment_score: 0.10
};

// Safety constraints
const WEIGHT_CONSTRAINTS = {
  MIN: 0.05,
  MAX: 0.60
};

// In-memory storage for adaptive weights
let adaptiveWeights = { ...DEFAULT_WEIGHTS };
let totalJobsProcessed = 0;
let lastOptimizationJobCount = 0;
const OPTIMIZATION_INTERVAL = 20;

/**
 * Get the default weights
 * @returns {Object} - Default weights
 */
function getDefaultWeights() {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Read performance history from database
 * @param {number} limit - Number of records to read
 * @returns {Promise<Array>} - Performance records
 */
function readPerformanceHistory(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM performance_history 
       WHERE final_score IS NOT NULL 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [limit],
      function(err, rows) {
        if (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[AdaptiveLearning] Error reading performance history:', err.message);
          }
          resolve([]);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Calculate correlation between each metric and final_score
 * @param {Array} records - Performance records
 * @returns {Object} - Correlations for each metric
 */
function calculateCorrelations(records) {
  if (!records || records.length < 5) {
    return null;
  }

  const correlations = {
    viral_score: 0,
    engagement_score: 0,
    trend_boost: 0,
    sentiment_score: 0
  };

  // Simple correlation: check if higher metric values correlate with higher final_score
  let count = 0;
  
  for (let i = 0; i < records.length - 1; i++) {
    const current = records[i];
    const next = records[i + 1];
    
    if (current.final_score !== undefined && next.final_score !== undefined) {
      // Viral score correlation
      if (current.viral_score && next.viral_score) {
        if ((current.viral_score > next.viral_score && current.final_score > next.final_score) ||
            (current.viral_score < next.viral_score && current.final_score < next.final_score)) {
          correlations.viral_score++;
        }
      }
      
      // Engagement correlation
      if (current.engagement_score && next.engagement_score) {
        if ((current.engagement_score > next.engagement_score && current.final_score > next.final_score) ||
            (current.engagement_score < next.engagement_score && current.final_score < next.final_score)) {
          correlations.engagement_score++;
        }
      }
      
      // Trend boost correlation
      if (current.trend_boost && next.trend_boost) {
        if ((current.trend_boost > next.trend_boost && current.final_score > next.final_score) ||
            (current.trend_boost < next.trend_boost && current.final_score < next.final_score)) {
          correlations.trend_boost++;
        }
      }
      
      // Sentiment correlation
      if (current.sentiment_score && next.sentiment_score) {
        if ((current.sentiment_score > next.sentiment_score && current.final_score > next.final_score) ||
            (current.sentiment_score < next.sentiment_score && current.final_score < next.final_score)) {
          correlations.sentiment_score++;
        }
      }
      
      count++;
    }
  }

  // Normalize correlations to percentages
  if (count > 0) {
    for (const key in correlations) {
      correlations[key] = correlations[key] / count;
    }
  }

  return correlations;
}

/**
 * Analyze performance trends and update weights
 * @returns {Object} - Analysis result
 */
async function analyzePerformanceTrends() {
  const records = await readPerformanceHistory(50);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AdaptiveLearning] Analyzing', records.length, 'performance records');
  }
  
  // Fallback if not enough data
  if (records.length < 10) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AdaptiveLearning] Not enough data, using default weights');
    }
    return {
      success: false,
      reason: 'insufficient_data',
      weights: getDefaultWeights()
    };
  }

  // Calculate correlations
  const correlations = calculateCorrelations(records);
  
  if (!correlations) {
    return {
      success: false,
      reason: 'correlation_failed',
      weights: getDefaultWeights()
    };
  }

  // Calculate optimal weights based on correlations
  const result = calculateOptimalWeights(correlations);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AdaptiveLearning] Weight adjustments:', result.adjustments);
  }

  return {
    success: true,
    correlations,
    weights: adaptiveWeights,
    adjustments: result.adjustments,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Calculate optimal weights based on correlations
 * @param {Object} correlations - Correlation scores
 * @returns {Object} - Result with adjusted weights
 */
function calculateOptimalWeights(correlations) {
  // Find best and worst performing metrics
  let bestMetric = 'viral_score';
  let worstMetric = 'sentiment_score';
  let maxCorr = -1;
  let minCorr = Infinity;

  for (const [metric, corr] of Object.entries(correlations)) {
    if (corr > maxCorr) {
      maxCorr = corr;
      bestMetric = metric;
    }
    if (corr < minCorr) {
      minCorr = corr;
      worstMetric = metric;
    }
  }

  // Adjust weights
  const adjustments = {};
  const WEIGHT_STEP = 0.05; // 5%

  // Increase best metric by 5%
  let newBestWeight = (adaptiveWeights[bestMetric] || DEFAULT_WEIGHTS[bestMetric]) + WEIGHT_STEP;
  newBestWeight = Math.min(newBestWeight, WEIGHT_CONSTRAINTS.MAX);
  adjustments[bestMetric] = { from: adaptiveWeights[bestMetric], to: newBestWeight, action: 'increase' };
  adaptiveWeights[bestMetric] = newBestWeight;

  // Decrease worst metric by 5%
  let newWorstWeight = (adaptiveWeights[worstMetric] || DEFAULT_WEIGHTS[worstMetric]) - WEIGHT_STEP;
  newWorstWeight = Math.max(newWorstWeight, WEIGHT_CONSTRAINTS.MIN);
  adjustments[worstMetric] = { from: adaptiveWeights[worstMetric], to: newWorstWeight, action: 'decrease' };
  adaptiveWeights[worstMetric] = newWorstWeight;

  // Normalize to ensure total = 100%
  normalizeWeights();

  return {
    bestMetric,
    worstMetric,
    adjustments
  };
}

/**
 * Normalize weights to ensure total = 100%
 */
function normalizeWeights() {
  let total = 0;
  for (const key in adaptiveWeights) {
    total += adaptiveWeights[key];
  }

  // If total is not 1, scale proportionally
  if (Math.abs(total - 1.0) > 0.001) {
    const scale = 1.0 / total;
    for (const key in adaptiveWeights) {
      adaptiveWeights[key] = Math.round(adaptiveWeights[key] * scale * 1000) / 1000;
    }
  }
}

/**
 * Get current adaptive weights
 * @returns {Object} - Current weights
 */
function getAdaptiveWeights() {
  return { ...adaptiveWeights };
}

/**
 * Check if optimization should run (every 20 jobs)
 * @returns {boolean} - Whether to optimize
 */
function shouldOptimize() {
  return (totalJobsProcessed - lastOptimizationJobCount) >= OPTIMIZATION_INTERVAL;
}

/**
 * Increment job counter and auto-optimize if needed
 * @returns {Object} - Current status
 */
function recordJobProcessed() {
  totalJobsProcessed++;
  
  const result = {
    totalJobsProcessed,
    shouldOptimize: shouldOptimize(),
    lastOptimizationJobCount
  };

  // Auto-optimize every 20 jobs
  if (shouldOptimize()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AdaptiveLearning] Auto-optimizing after', totalJobsProcessed, 'jobs');
    }
    
    // Run async optimization (don't await - fire and forget)
    analyzePerformanceTrends().then(optimizationResult => {
      if (optimizationResult.success) {
        lastOptimizationJobCount = totalJobsProcessed;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[AdaptiveLearning] Weights updated:', getAdaptiveWeights());
        }
      }
    }).catch(err => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AdaptiveLearning] Auto-optimization failed:', err.message);
      }
    });
  }

  return result;
}

/**
 * Reset weights to defaults
 */
function resetWeights() {
  adaptiveWeights = { ...DEFAULT_WEIGHTS };
  totalJobsProcessed = 0;
  lastOptimizationJobCount = 0;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AdaptiveLearning] Weights reset to defaults');
  }
}

/**
 * Get current statistics
 * @returns {Object} - Statistics
 */
function getStats() {
  return {
    totalJobsProcessed,
    lastOptimizationJobCount,
    optimizationInterval: OPTIMIZATION_INTERVAL,
    jobsUntilNextOptimization: Math.max(0, OPTIMIZATION_INTERVAL - (totalJobsProcessed - lastOptimizationJobCount)),
    currentWeights: getAdaptiveWeights(),
    defaultWeights: getDefaultWeights()
  };
}

module.exports = {
  analyzePerformanceTrends,
  calculateOptimalWeights,
  getAdaptiveWeights,
  getDefaultWeights,
  recordJobProcessed,
  resetWeights,
  getStats,
  DEFAULT_WEIGHTS,
  WEIGHT_CONSTRAINTS,
  OPTIMIZATION_INTERVAL
};
