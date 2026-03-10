/**
 * OVERLORD Phase 1 - External AI Brain Service
 * 
 * Integrates external AI API for enhanced decision making
 * Features:
 * - enhanceDecision(job)
 * - requestScoreRefinement(job)
 * - analyzeTrendPrediction(job)
 * - 5-second timeout protection
 * - Graceful fallback to null on API failure
 */

const logger = require('../utils/logger');

// Configuration
const CONFIG = {
  API_TIMEOUT_MS: 5000,
  DEFAULT_WEIGHT_LOCAL: 0.7,
  DEFAULT_WEIGHT_AI: 0.3,
  CONFIDENCE_BOOST_THRESHOLD: 5
};

/**
 * Get API key from environment
 * @returns {string|null} - API key or null
 */
function getApiKey() {
  return process.env.AI_API_KEY || null;
}

/**
 * Check if external AI is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!getApiKey();
}

/**
 * Make API request with timeout protection
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - API response
 */
async function makeApiRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD ExternalBrain] API request failed:', error.message);
    }
    
    return null;
  }
}

/**
 * Enhance decision with external AI analysis
 * @param {Object} job - Job object with scores
 * @returns {Object|null} - Enhanced decision or null
 */
async function enhanceDecision(job) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD ExternalBrain] AI_API_KEY not configured, skipping external enhancement');
    }
    return null;
  }
  
  try {
    const payload = {
      job_id: job.id || job.jobId || 'unknown',
      viral_score: job.viral_score || job.finalScore || 50,
      engagement_score: job.engagement_score || 50,
      trend_boost: job.trend_boost || 50,
      sentiment_score: job.sentiment_score || 50,
      confidence: job.confidence || 50,
      priority_level: job.priorityLevel || job.priority_level || 'medium'
    };
    
    // Try common AI API endpoints (configurable via environment)
    const apiEndpoint = process.env.AI_API_ENDPOINT || 'https://api.example.com/v1/analyze';
    
    const result = await makeApiRequest(apiEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (result && result.ai_score !== undefined) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OVERLORD ExternalBrain] Received AI enhancement:', result.ai_score);
      }
      
      return {
        ai_score: result.ai_score,
        confidence_boost: result.confidence_boost || 0,
        recommendations: result.recommendations || [],
        source: 'external_ai'
      };
    }
    
    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD ExternalBrain] enhanceDecision error:', error.message);
    }
    return null;
  }
}

/**
 * Request score refinement from external AI
 * @param {Object} job - Job object
 * @returns {Object|null} - Refined scores or null
 */
async function requestScoreRefinement(job) {
  if (!isConfigured()) {
    return null;
  }
  
  try {
    const refinementEndpoint = process.env.AI_REFINEMENT_ENDPOINT || 'https://api.example.com/v1/refine';
    
    const payload = {
      current_scores: {
        viral: job.viral_score || job.finalScore || 50,
        engagement: job.engagement_score || 50,
        trend: job.trend_boost || 50,
        sentiment: job.sentiment_score || 50
      },
      job_context: {
        id: job.id || job.jobId,
        platform: job.platform || 'youtube',
        duration: job.duration || 60
      }
    };
    
    const result = await makeApiRequest(refinementEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (result && result.refined_scores) {
      return {
        refined_scores: result.refined_scores,
        reasoning: result.reasoning || '',
        confidence: result.confidence || 50
      };
    }
    
    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD ExternalBrain] requestScoreRefinement error:', error.message);
    }
    return null;
  }
}

/**
 * Analyze trend prediction with external AI
 * @param {Object} job - Job object
 * @returns {Object|null} - Trend predictions or null
 */
async function analyzeTrendPrediction(job) {
  if (!isConfigured()) {
    return null;
  }
  
  try {
    const trendEndpoint = process.env.AI_TREND_ENDPOINT || 'https://api.example.com/v1/trends';
    
    const payload = {
      content_signals: {
        hook: job.viralHook?.hookScore || job.hookScore || 50,
        emotional_peak: job.predictions?.emotionalScore || 50,
        retention_score: job.predictions?.retention || 50
      },
      metadata: {
        title: job.title || '',
        hashtags: job.hashtags || [],
        platform: job.platform || 'youtube'
      }
    };
    
    const result = await makeApiRequest(trendEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (result) {
      return {
        trend_score: result.trend_score || 50,
        virality_prediction: result.virality_prediction || 'unknown',
        optimal_posting_time: result.optimal_posting_time || null,
        platform_recommendations: result.platform_recommendations || []
      };
    }
    
    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD ExternalBrain] analyzeTrendPrediction error:', error.message);
    }
    return null;
  }
}

module.exports = {
  enhanceDecision,
  requestScoreRefinement,
  analyzeTrendPrediction,
  isConfigured,
  getApiKey,
  CONFIG
};
