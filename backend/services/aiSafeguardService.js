/**
 * ClipperAi2026 - AI Safeguard Service
 * OVERLORD Phase 3: Protective validation before AI processing
 * 
 * Purpose:
 * Add protective validation before AI processing to prevent bad jobs from entering pipeline.
 * 
 * Features:
 * - Job structure validation
 * - Spam pattern detection
 * - Risk score evaluation
 * - Job blocking logic
 * 
 * No external dependencies - pure logic only.
 */

const logger = require('../utils/logger');

// In-memory store for duplicate URL detection (in production, use Redis/shared cache)
const recentUrls = new Map();
const URL_CACHE_TTL = 3600000; // 1 hour

/**
 * Validate job structure - ensure required fields exist
 * @param {Object} job - Job object to validate
 * @returns {Object} - { valid: boolean, reason?: string }
 */
function validateJobStructure(job) {
  // Check if job exists
  if (!job || typeof job !== 'object') {
    return { valid: false, reason: 'Job must be an object' };
  }

  // Required fields
  const requiredFields = ['id', 'title', 'original_url'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!job[field] || (typeof job[field] === 'string' && job[field].trim() === '')) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return { 
      valid: false, 
      reason: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }

  // Validate ID format (basic check)
  if (typeof job.id !== 'string' || job.id.length < 5) {
    return { valid: false, reason: 'Invalid job ID format' };
  }

  // Validate URL format
  try {
    const url = new URL(job.original_url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, reason: 'Invalid URL protocol' };
    }
  } catch (e) {
    return { valid: false, reason: 'Invalid URL format' };
  }

  return { valid: true };
}

/**
 * Detect spam patterns using simple heuristics
 * @param {Object} job - Job object to check
 * @returns {boolean} - True if spam pattern detected
 */
function detectSpamPattern(job) {
  if (!job) return true;

  // Check 1: Title length < 3 characters
  if (job.title && typeof job.title === 'string' && job.title.trim().length < 3) {
    logger.warn('[AI Safeguard] Spam detected: Title too short', { jobId: job.id });
    return true;
  }

  // Check 2: Duplicate URL detection
  if (job.original_url) {
    const now = Date.now();
    const urlLower = job.original_url.toLowerCase();
    
    // Check if this URL was used recently
    if (recentUrls.has(urlLower)) {
      const lastSeen = recentUrls.get(urlLower);
      if (now - lastSeen < URL_CACHE_TTL) {
        logger.warn('[AI Safeguard] Spam detected: Duplicate URL', { jobId: job.id, url: job.original_url });
        return true;
      }
    }
    
    // Add to recent URLs
    recentUrls.set(urlLower, now);
    
    // Clean old entries periodically
    if (recentUrls.size > 1000) {
      for (const [key, value] of recentUrls.entries()) {
        if (now - value > URL_CACHE_TTL) {
          recentUrls.delete(key);
        }
      }
    }
  }

  // Check 3: Too many retries (> 5)
  const retryCount = job.retry_count || job.retryCount || 0;
  if (retryCount > 5) {
    logger.warn('[AI Safeguard] Spam detected: Too many retries', { jobId: job.id, retryCount });
    return true;
  }

  // Check 4: Suspicious title patterns
  if (job.title) {
    const title = job.title.toLowerCase();
    const spamPatterns = [
      /^(.)\1{5,}/,  // Same character repeated 6+ times
      /^[a-z0-9]{1,2}$/,  // Only 1-2 random characters
      /(click here|buy now|free money|earn money)/i,  // Spam keywords
      /(.)\1{3,}(.)\2{3,}/  // Repeated patterns
    ];
    
    for (const pattern of spamPatterns) {
      if (pattern.test(title)) {
        logger.warn('[AI Safeguard] Spam detected: Suspicious title pattern', { jobId: job.id, title: job.title });
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluate risk score for a job (0-100)
 * @param {Object} job - Job object to evaluate
 * @returns {number} - Risk score (0-100)
 */
function evaluateRiskScore(job) {
  let riskScore = 0;

  if (!job) return 100;

  // Factor 1: Missing optional fields (0-30 points)
  const optionalFields = ['description', 'tags', 'category', 'target_platform'];
  const missingOptional = optionalFields.filter(field => !job[field]);
  riskScore += missingOptional.length * 6; // 6 points per missing field (max 30)

  // Factor 2: Retry count (0-30 points)
  const retryCount = job.retry_count || job.retryCount || 0;
  if (retryCount > 0) {
    riskScore += Math.min(retryCount * 6, 30); // 6 points per retry (max 30)
  }

  // Factor 3: Previous failures (0-40 points)
  const previousFailures = job.previous_failures || job.previousFailures || 0;
  riskScore += Math.min(previousFailures * 10, 40); // 10 points per failure (max 40)

  // Factor 4: Low confidence score (0-20 points)
  const confidence = job.confidence || 0;
  if (confidence > 0 && confidence < 50) {
    riskScore += Math.round((50 - confidence) * 0.4); // Scale 0-20 based on how low
  }

  // Factor 5: Title quality (0-10 points)
  if (job.title) {
    const titleLength = job.title.trim().length;
    if (titleLength < 10) {
      riskScore += 10 - Math.floor(titleLength / 1); // More points for very short titles
    } else if (titleLength > 200) {
      riskScore += 5; // Slight risk for very long titles
    }
  }

  // Cap at 100
  return Math.min(Math.round(riskScore), 100);
}

/**
 * Determine if job should be blocked based on risk score
 * @param {Object} job - Job object to evaluate
 * @returns {Object} - { blocked: boolean, riskScore: number }
 */
function shouldBlockJob(job) {
  const riskScore = evaluateRiskScore(job);
  const blocked = riskScore > 70;

  if (blocked) {
    logger.warn('[AI Safeguard] Job blocked due to high risk score', { 
      jobId: job?.id, 
      riskScore 
    });
  }

  return { blocked, riskScore };
}

/**
 * Full validation check - combines all safeguards
 * @param {Object} job - Job object to validate
 * @returns {Object} - Validation result with details
 */
function validateJob(job) {
  // Step 1: Structure validation
  const structureCheck = validateJobStructure(job);
  if (!structureCheck.valid) {
    return {
      valid: false,
      blocked: true,
      reason: structureCheck.reason,
      riskScore: 100,
      step: 'structure'
    };
  }

  // Step 2: Spam pattern detection
  if (detectSpamPattern(job)) {
    return {
      valid: true,
      blocked: true,
      reason: 'Spam pattern detected',
      riskScore: 100,
      step: 'spam'
    };
  }

  // Step 3: Risk score evaluation
  const riskScore = evaluateRiskScore(job);
  
  // Step 4: Block decision
  const shouldBlock = riskScore > 70;

  return {
    valid: true,
    blocked: shouldBlock,
    reason: shouldBlock ? `High risk score: ${riskScore}` : null,
    riskScore,
    step: 'risk'
  };
}

/**
 * Get current risk factors for a job (for debugging/display)
 * @param {Object} job - Job object
 * @returns {Object} - Risk factors breakdown
 */
function getRiskFactors(job) {
  const factors = {
    missingOptionalFields: [],
    retryPenalty: 0,
    failurePenalty: 0,
    confidencePenalty: 0,
    titlePenalty: 0
  };

  if (!job) {
    factors.missingOptionalFields = ['all'];
    return factors;
  }

  // Check optional fields
  const optionalFields = ['description', 'tags', 'category', 'target_platform'];
  factors.missingOptionalFields = optionalFields.filter(field => !job[field]);

  // Retry penalty
  const retryCount = job.retry_count || job.retryCount || 0;
  factors.retryPenalty = Math.min(retryCount * 6, 30);

  // Failure penalty
  const previousFailures = job.previous_failures || job.previousFailures || 0;
  factors.failurePenalty = Math.min(previousFailures * 10, 40);

  // Confidence penalty
  const confidence = job.confidence || 0;
  if (confidence > 0 && confidence < 50) {
    factors.confidencePenalty = Math.round((50 - confidence) * 0.4);
  }

  // Title penalty
  if (job.title) {
    const titleLength = job.title.trim().length;
    if (titleLength < 10) {
      factors.titlePenalty = 10 - Math.floor(titleLength / 1);
    } else if (titleLength > 200) {
      factors.titlePenalty = 5;
    }
  }

  return factors;
}

/**
 * Clear URL cache (for testing)
 */
function clearUrlCache() {
  recentUrls.clear();
}

/**
 * Get cache stats (for monitoring)
 */
function getCacheStats() {
  return {
    size: recentUrls.size,
    ttl: URL_CACHE_TTL
  };
}

module.exports = {
  validateJobStructure,
  detectSpamPattern,
  evaluateRiskScore,
  shouldBlockJob,
  validateJob,
  getRiskFactors,
  clearUrlCache,
  getCacheStats,
  
  // OVERLORD PRO MODE - Phase 3 - Resource Safeguard Functions
  // These are imported from resourceMonitor
  getResourceMonitor: () => require('../core/resourceMonitor')
};

/**
 * OVERLORD PRO MODE - Phase 3
 * Resource Safeguard Functions
 * 
 * These functions provide resource-based job throttling:
 * - canProcessNewJob() - Check if system can accept new jobs
 * - shouldThrottle() - Check if system should enable throttle mode
 * - getSystemStatus() - Get full system status
 */

const resourceMonitor = require('../core/resourceMonitor');

/**
 * Check if system can process a new job
 * @returns {Object} Can process result
 */
function canProcessNewJob() {
  const health = resourceMonitor.getSystemHealth();
  
  if (health.mode === 'critical') {
    return {
      canProcess: false,
      reason: 'System in critical state',
      mode: health.mode,
      waitTime: 10000
    };
  }
  
  return {
    canProcess: true,
    mode: health.mode
  };
}

/**
 * Check if system should throttle processing
 * @returns {Object} Throttle status
 */
function shouldThrottle() {
  const health = resourceMonitor.getSystemHealth();
  
  return {
    shouldThrottle: health.mode === 'throttle' || health.mode === 'critical',
    mode: health.mode,
    memoryUsage: health.memoryUsage,
    cpuUsage: health.cpuUsage
  };
}

/**
 * Get full system status
 * @returns {Object} System status
 */
function getSystemStatus() {
  const health = resourceMonitor.getSystemHealth();
  
  return {
    memoryUsage: health.memoryUsage,
    cpuUsage: health.cpuUsage,
    mode: health.mode,
    thresholds: health.thresholds,
    system: health.system
  };
}

// Export additional functions
module.exports.canProcessNewJob = canProcessNewJob;
module.exports.shouldThrottle = shouldThrottle;
module.exports.getSystemStatus = getSystemStatus;
module.exports.resourceMonitor = resourceMonitor;
