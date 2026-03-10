/**
 * TITAN-B Decision Engine Service
 * Phase 7: AI Decision Intelligence Layer
 * OVERLORD Phase 4: AI Decision Accuracy Upgrade
 * 
 * Responsibilities:
 * - calculateFinalScore(job) - weighted average scoring
 * - calculateConfidence(job) - dynamic confidence based on data quality
 * - assignPriorityLevel(finalScore) - priority assignment
 * - applyRefinement() - refine score based on confidence
 * - applyHistoricalCorrection() - apply historical correction factor
 */

const logger = require('../utils/logger');

// Database import
let db = null;
try {
  db = require('../database');
} catch (err) {
  // Database not available
}

// OVERLORD Phase 3 - Adaptive Learning Service
let adaptiveLearningService = null;
try {
  adaptiveLearningService = require('./adaptiveLearningService');
} catch (err) {
  // Service not available - will use defaults
}

// Default weight configuration for final score calculation
const DEFAULT_SCORE_WEIGHTS = {
  viral_score: 0.40,      // 40%
  engagement_score: 0.30, // 30%
  trend_boost: 0.20,      // 20%
  sentiment_score: 0.10   // 10%
};

// Current weights (starts with defaults, updated by adaptive learning)
let SCORE_WEIGHTS = { ...DEFAULT_SCORE_WEIGHTS };

// Priority level thresholds
const PRIORITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50
};

/**
 * Calculate the final score using weighted average
 * Formula: final_score = viral_score(40%) + engagement_score(30%) + trend_boost(20%) + sentiment_score(10%)
 * 
 * @param {Object} job - Job object containing scores
 * @returns {number} - Final score (0-100)
 */
function calculateFinalScore(job) {
  try {
    // Extract scores from job (with defaults for backward compatibility)
    const viralScore = normalizeScore(job.viral_score ?? job.viralHook?.hookScore ?? job.predictions?.viralScore ?? 50);
    const engagementScore = normalizeScore(job.engagement_score ?? job.predictions?.engagement ?? 50);
    const trendBoost = normalizeScore(job.trend_boost ?? job.viralHook?.trendScore ?? job.predictions?.trendAlignment ?? 50);
    const sentimentScore = normalizeScore(job.sentiment_score ?? job.predictions?.emotionalScore ?? 50);

    // Calculate weighted average
    const finalScore = Math.round(
      (viralScore * SCORE_WEIGHTS.viral_score) +
      (engagementScore * SCORE_WEIGHTS.engagement_score) +
      (trendBoost * SCORE_WEIGHTS.trend_boost) +
      (sentimentScore * SCORE_WEIGHTS.sentiment_score)
    );

    // Ensure score is within bounds
    return Math.min(100, Math.max(0, finalScore));
  } catch (error) {
    logger.warn('[DecisionEngineService] calculateFinalScore error:', error.message);
    return 50; // Safe default
  }
}

/**
 * Calculate confidence based on data completeness and processing history
 * 
 * @param {Object} job - Job object
 * @returns {number} - Confidence score (0-100)
 */
function calculateConfidence(job) {
  try {
    let completenessScore = 0;
    let totalFields = 0;

    // Check data completeness
    const dataFields = [
      'viral_score', 'engagement_score', 'trend_boost', 'sentiment_score',
      'viralHook', 'predictions', 'metadata', 'subtitles'
    ];

    for (const field of dataFields) {
      totalFields++;
      if (job[field] !== undefined && job[field] !== null) {
        // Check if object has meaningful data
        if (typeof job[field] === 'object') {
          const keys = Object.keys(job[field]);
          if (keys.length > 0) completenessScore += 1;
        } else {
          completenessScore += 1;
        }
      }
    }

    const dataCompleteness = Math.round((completenessScore / totalFields) * 50);

    // Check processing history
    let processingHistoryScore = 0;
    if (job.execution_time_ms !== undefined && job.execution_time_ms !== null) {
      processingHistoryScore += 20; // Has execution time
    }
    if (job.result !== undefined && job.result !== null) {
      processingHistoryScore += 15; // Has result
    }
    if (job.completed_at !== undefined && job.completed_at !== null) {
      processingHistoryScore += 15; // Was completed
    }

    // Check retry count (fewer retries = higher confidence)
    const retryCount = job.retry_count ?? job.retryCount ?? 0;
    const retryPenalty = Math.min(20, retryCount * 5); // Max 20 point penalty
    const retryScore = 20 - retryPenalty;

    // Calculate total confidence
    const confidence = Math.min(100, dataCompleteness + processingHistoryScore + Math.max(0, retryScore));

    return Math.max(0, confidence);
  } catch (error) {
    logger.warn('[DecisionEngineService] calculateConfidence error:', error.message);
    return 30; // Safe default
  }
}

/**
 * Assign priority level based on final score
 * 
 * @param {number} finalScore - The calculated final score
 * @returns {string} - Priority level: 'high', 'medium', or 'low'
 */
function assignPriorityLevel(finalScore) {
  if (finalScore > PRIORITY_THRESHOLDS.HIGH) {
    return 'high';
  } else if (finalScore >= PRIORITY_THRESHOLDS.MEDIUM) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get current adaptive weights (from OVERLORD Phase 3)
 * Falls back to defaults if service fails
 * @returns {Object} - Current weights
 */
function getCurrentWeights() {
  if (adaptiveLearningService) {
    try {
      const weights = adaptiveLearningService.getAdaptiveWeights();
      SCORE_WEIGHTS = weights;
      return weights;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DecisionEngine] Using default weights (adaptive service error)');
      }
    }
  }
  return { ...DEFAULT_SCORE_WEIGHTS };
}

/**
 * Update weights from adaptive learning service
 */
function syncAdaptiveWeights() {
  if (adaptiveLearningService) {
    try {
      const weights = adaptiveLearningService.getAdaptiveWeights();
      SCORE_WEIGHTS = weights;
    } catch (err) {
      // Keep current weights on error
    }
  }
}

/**
 * OVERLORD Phase 4 - Apply Refinement Layer
 * Refine score based on confidence level
 * 
 * Logic:
 * - If confidence < 40 → reduce score by 10%
 * - If confidence > 80 → boost score by 5%
 * - Clamp 0-100
 * 
 * @param {number} finalScore - The calculated final score
 * @param {number} confidence - Confidence level (0-100)
 * @returns {number} - Refined score
 */
function applyRefinement(finalScore, confidence) {
  let refinedScore = finalScore;
  
  try {
    if (confidence < 40) {
      // Low confidence - reduce score by 10%
      refinedScore = finalScore * 0.90;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DecisionEngine] Low confidence (${confidence}), reducing score by 10%: ${finalScore} -> ${refinedScore}`);
      }
    } else if (confidence > 80) {
      // High confidence - boost score by 5%
      refinedScore = finalScore * 1.05;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DecisionEngine] High confidence (${confidence}), boosting score by 5%: ${finalScore} -> ${refinedScore}`);
      }
    }
    
    // Clamp to 0-100 range
    refinedScore = Math.round(Math.min(100, Math.max(0, refinedScore)));
    
    return refinedScore;
  } catch (error) {
    // Fail silently, return original score
    return finalScore;
  }
}

/**
 * OVERLORD Phase 4 - Historical Correction Factor
 * Fetch last 5 performance_history entries and apply correction
 * 
 * - If past average < 40 → apply -5 penalty
 * - If past average > 75 → apply +5 boost
 * 
 * @param {string} jobId - Job ID (optional)
 * @returns {Object} - Correction factor and history info
 */
function applyHistoricalCorrection(jobId) {
  const correction = {
    applied: false,
    factor: 0,
    pastAverage: null,
    reason: ''
  };
  
  // Check if database is available
  if (!db) {
    correction.reason = 'database_unavailable';
    return correction;
  }
  
  try {
    // Lightweight query - only select needed fields
    return new Promise((resolve) => {
      db.all(
        `SELECT final_score FROM performance_history 
         WHERE final_score IS NOT NULL 
         ORDER BY created_at DESC LIMIT 5`,
        [],
        function(err, rows) {
          if (err || !rows || rows.length === 0) {
            correction.reason = 'no_history';
            resolve(correction);
            return;
          }
          
          // Calculate average
          const sum = rows.reduce((acc, row) => acc + (row.final_score || 0), 0);
          const avg = sum / rows.length;
          correction.pastAverage = Math.round(avg);
          
          // Apply correction
          if (avg < 40) {
            correction.factor = -5;
            correction.applied = true;
            correction.reason = 'below_threshold';
            
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[DecisionEngine] Historical average (${avg}) < 40, applying -5 penalty`);
            }
          } else if (avg > 75) {
            correction.factor = 5;
            correction.applied = true;
            correction.reason = 'above_threshold';
            
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[DecisionEngine] Historical average (${avg}) > 75, applying +5 boost`);
            }
          } else {
            correction.reason = 'within_range';
          }
          
          resolve(correction);
        }
      );
    });
  } catch (error) {
    correction.reason = 'error';
    return correction;
  }
}

/**
 * Apply historical correction synchronously (wrapper)
 * @param {number} currentScore - Current score
 * @returns {Object} - Result with adjusted score
 */
async function applyHistoricalCorrectionSync(currentScore) {
  const correction = await applyHistoricalCorrection();
  
  if (correction.applied && correction.pastAverage !== null) {
    const adjustedScore = Math.round(Math.min(100, Math.max(0, currentScore + correction.factor)));
    return {
      originalScore: currentScore,
      adjustedScore,
      correction
    };
  }
  
  return {
    originalScore: currentScore,
    adjustedScore: currentScore,
    correction
  };
}

/**
 * Calculate decision for a job (combines all three functions)
 * 
 * @param {Object} job - Job object
 * @param {boolean} applyRefinements - Whether to apply refinements (default true)
 * @returns {Object} - Complete decision object
 */
async function calculateDecision(job, applyRefinements = true) {
  // Sync adaptive weights before calculating
  syncAdaptiveWeights();
  
  let finalScore = calculateFinalScore(job);
  const confidence = calculateConfidence(job);
  
  // Apply refinements if enabled (OVERLORD Phase 4)
  let refinementApplied = false;
  let historicalCorrectionApplied = false;
  
  if (applyRefinements) {
    // Apply confidence-based refinement
    finalScore = applyRefinement(finalScore, confidence);
    refinementApplied = true;
    
    // Apply historical correction (async)
    try {
      const correctionResult = await applyHistoricalCorrectionSync(finalScore);
      if (correctionResult.correction.applied) {
        finalScore = correctionResult.adjustedScore;
        historicalCorrectionApplied = true;
      }
    } catch (err) {
      // Fail silently - continue with current score
    }
  }
  
  const priorityLevel = assignPriorityLevel(finalScore);

  // DEV MODE ONLY: Log decision results
  if (process.env.NODE_ENV !== 'production') {
    console.log('[TITAN-B DecisionEngine] Job:', job.id || job.jobId || 'unknown');
    console.log('  final_score:', finalScore);
    console.log('  confidence:', confidence);
    console.log('  priority_level:', priorityLevel);
    console.log('  weights:', SCORE_WEIGHTS);
    if (refinementApplied) console.log('  refinement: applied');
    if (historicalCorrectionApplied) console.log('  historical_correction: applied');
  }

  // Record job for adaptive learning (OVERLORD Phase 4)
  if (adaptiveLearningService) {
    try {
      adaptiveLearningService.recordJobProcessed();
    } catch (err) {
      // Non-blocking - continue even if this fails
    }
  }

  return {
    finalScore,
    confidence,
    priorityLevel,
    weights: { ...SCORE_WEIGHTS },
    refinements: {
      confidenceRefinement: refinementApplied,
      historicalCorrection: historicalCorrectionApplied
    },
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Normalize a score to 0-100 range
 * @param {number} score - Input score
 * @returns {number} - Normalized score
 */
function normalizeScore(score) {
  if (score === undefined || score === null) return 50;
  const num = Number(score);
  if (isNaN(num)) return 50;
  return Math.min(100, Math.max(0, num));
}

/**
 * Get priority numeric value for sorting
 * @param {string} level - Priority level
 * @returns {number} - Numeric value
 */
function getPriorityNumeric(level) {
  switch (level) {
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 2;
  }
}

/**
 * OVERLORD Phase 2 - Calculate Hybrid Score
 * Fusion of local and AI scores
 * 
 * Weight logic: finalScore = (localScore * 0.7) + (aiScore * 0.3)
 * If aiScore null → use localScore only
 * Boost confidence by +10 if alignment < 5 diff
 * 
 * @param {number} localScore - Local calculated score
 * @param {number|null} aiScore - External AI score
 * @param {number} currentConfidence - Current confidence level
 * @returns {Object} - Hybrid decision result
 */
function calculateHybridScore(localScore, aiScore, currentConfidence = 50) {
  let finalScore;
  let aiContribution = 0;
  let confidenceBoost = 0;
  
  if (aiScore === null || aiScore === undefined) {
    // No AI score - use local only
    finalScore = localScore;
    aiContribution = 0;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD HybridScore] Using local score only (no AI score)');
    }
  } else {
    // Calculate weighted hybrid
    finalScore = Math.round((localScore * 0.7) + (aiScore * 0.3));
    aiContribution = aiScore;
    
    // Check alignment for confidence boost
    const alignmentDiff = Math.abs(localScore - aiScore);
    if (alignmentDiff < 5) {
      confidenceBoost = 10;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD HybridScore] Local:', localScore, 'AI:', aiScore, 'Final:', finalScore);
      console.log('  Alignment diff:', alignmentDiff, 'Confidence boost:', confidenceBoost);
    }
  }
  
  const newConfidence = Math.min(100, currentConfidence + confidenceBoost);
  
  return {
    finalScore: Math.min(100, Math.max(0, finalScore)),
    localScore,
    aiScore,
    aiContribution,
    confidenceBoost,
    confidence: newConfidence,
    isHybrid: aiScore !== null && aiScore !== undefined,
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateFinalScore,
  calculateConfidence,
  assignPriorityLevel,
  calculateDecision,
  calculateHybridScore,
  applyRefinement,
  applyHistoricalCorrection,
  applyHistoricalCorrectionSync,
  normalizeScore,
  getPriorityNumeric,
  getCurrentWeights,
  syncAdaptiveWeights,
  SCORE_WEIGHTS,
  DEFAULT_SCORE_WEIGHTS,
  PRIORITY_THRESHOLDS
};
