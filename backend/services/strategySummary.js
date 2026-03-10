/**
 * TITAN-A Strategy Summary Generator
 * Phase 3: Generate strategic recommendations based on score analysis
 * No external AI - rule-based logic only
 */

const logger = require('../utils/logger');
const { safeGetScore, isValidScore } = require('./scoreNormalizer');

/**
 * Platform recommendations
 */
const PLATFORMS = {
  TIKTOK: 'tiktok',
  YOUTUBE_SHORTS: 'youtube_shorts',
  INSTAGRAM_REELS: 'instagram_reels',
  YOUTUBE: 'youtube'
};

/**
 * Generate strategic summary based on score object
 * @param {Object} scoreObject - Object containing scores and decision
 * @returns {Object} - Strategic summary
 */
function generateStrategicSummary(scoreObject) {
  try {
    if (!scoreObject || typeof scoreObject !== 'object') {
      return getDefaultSummary();
    }

    // Extract relevant scores
    const emotionalIntensity = safeGetScore(scoreObject, 'emotionalIntensity', 50);
    const retentionScore = safeGetScore(scoreObject, 'retentionScore', 50);
    const engagementScore = safeGetScore(scoreObject, 'engagementScore', 50);
    const hookStrength = safeGetScore(scoreObject, 'hookStrength', 5) * 10; // Convert from 0-10 to 0-100
    const trendAlignment = safeGetScore(scoreObject, 'trendAlignment', 50);
    const finalScore = safeGetScore(scoreObject, 'finalScore', 50);

    // Generate summary text
    const summaryText = generateSummaryText({
      emotionalIntensity,
      retentionScore,
      engagementScore,
      hookStrength,
      trendAlignment,
      finalScore
    });

    // Determine recommended platforms
    const recommendedPlatform = determinePlatforms({
      trendAlignment,
      retentionScore,
      engagementScore,
      finalScore
    });

    // Generate optimization tips
    const optimizationTips = generateOptimizationTips({
      emotionalIntensity,
      retentionScore,
      engagementScore,
      hookStrength,
      trendAlignment,
      finalScore
    });

    return {
      summaryText,
      recommendedPlatform,
      optimizationTips
    };
  } catch (error) {
    logger.warn('[StrategySummary] generateStrategicSummary error:', error.message);
    return getDefaultSummary();
  }
}

/**
 * Generate summary text based on scores
 * @param {Object} scores - Score analysis
 * @returns {string} - Summary text
 */
function generateSummaryText(scores) {
  const { emotionalIntensity, retentionScore, engagementScore, finalScore } = scores;

  // High performance
  if (finalScore >= 80) {
    return 'Excellent content with strong viral potential. This video has all the key elements for high engagement and reach.';
  }

  // Above average
  if (finalScore >= 65) {
    if (emotionalIntensity >= 70 && retentionScore >= 60) {
      return 'Strong emotional content with good retention potential. Minor optimizations could maximize reach.';
    }
    if (trendAlignment >= 70) {
      return 'Trending-aligned content with good metrics. Capitalize on current trends for maximum exposure.';
    }
    return 'Good overall performance. Focus on specific optimizations to improve engagement.';
  }

  // Average
  if (finalScore >= 50) {
    if (emotionalIntensity < 40 && retentionScore >= 60) {
      return 'Solid retention but could benefit from more emotional hooks. Consider adding emotional moments.';
    }
    if (retentionScore < 40 && engagementScore >= 50) {
      return 'Engaging content but viewers may not be watching until the end. Review pacing and content structure.';
    }
    return 'Average performance. Several improvements needed for better engagement and reach.';
  }

  // Below average
  return 'Content needs optimization. Focus on improving hooks, emotional impact, and alignment with trending topics.';
}

/**
 * Determine recommended platforms based on scores
 * @param {Object} scores - Score analysis
 * @returns {string[]} - Array of platform names
 */
function determinePlatforms(scores) {
  const { trendAlignment, retentionScore, engagementScore, finalScore } = scores;
  const platforms = [];

  // Strong trend alignment → TikTok
  if (trendAlignment >= 70) {
    platforms.push(PLATFORMS.TIKTOK);
  }

  // Strong retention → YouTube Shorts
  if (retentionScore >= 65) {
    platforms.push(PLATFORMS.YOUTUBE_SHORTS);
  }

  // High engagement → Instagram Reels
  if (engagementScore >= 65) {
    platforms.push(PLATFORMS.INSTAGRAM_REELS);
  }

  // Good overall score but not platform-specific → YouTube
  if (finalScore >= 60 && platforms.length === 0) {
    platforms.push(PLATFORMS.YOUTUBE);
  }

  // Default fallback
  if (platforms.length === 0) {
    platforms.push(PLATFORMS.YOUTUBE_SHORTS);
    platforms.push(PLATFORMS.TIKTOK);
  }

  return [...new Set(platforms)]; // Remove duplicates
}

/**
 * Generate optimization tips based on scores
 * @param {Object} scores - Score analysis
 * @returns {string[]} - Array of optimization tips
 */
function generateOptimizationTips(scores) {
  const tips = [];
  const { emotionalIntensity, retentionScore, engagementScore, hookStrength, trendAlignment, finalScore } = scores;

  // Hook optimization
  if (hookStrength < 60) {
    tips.push('Strengthen your opening hook within the first 3 seconds to capture attention immediately.');
  }

  // Emotional + retention analysis
  if (emotionalIntensity >= 70 && retentionScore < 50) {
    tips.push('High emotional content but viewers leave early. Trim intro and get to the main content faster.');
  }

  if (emotionalIntensity < 40 && retentionScore >= 60) {
    tips.push('Good retention but low emotional impact. Add more emotional moments or use music to enhance feelings.');
  }

  // Engagement optimization
  if (engagementScore < 50 && finalScore >= 50) {
    tips.push('Content is watchable but not engaging. Add CTAs, questions, or interactive elements.');
  }

  if (engagementScore >= 60 && retentionScore < 50) {
    tips.push('Strong engagement but viewers don\'t finish watching. Review video length and pacing.');
  }

  // CTA optimization
  if (hookStrength >= 60 && engagementScore >= 50 && engagementScore < 70) {
    tips.push('Good hook and moderate engagement. Optimize call-to-action for better conversion.');
  }

  // Trend optimization
  if (trendAlignment < 40) {
    tips.push('Low trend alignment. Research current trending topics and hashtags in your niche.');
  }

  if (trendAlignment >= 70 && finalScore < 65) {
    tips.push('Great trend alignment! Ensure other metrics are optimized to capitalize on the trend.');
  }

  // General optimization
  if (finalScore >= 50 && finalScore < 65) {
    tips.push('Consider A/B testing thumbnails and titles to improve click-through rate.');
  }

  // Always add one positive tip for good scores
  if (finalScore >= 75) {
    tips.push('Great content! Publish during peak hours in your target timezone for maximum reach.');
  }

  // Limit to 4 tips max
  return tips.slice(0, 4);
}

/**
 * Get default summary
 * @returns {Object} - Default summary object
 */
function getDefaultSummary() {
  return {
    summaryText: 'Analysis complete. Review metrics and optimize based on specific recommendations.',
    recommendedPlatform: [PLATFORMS.YOUTUBE_SHORTS],
    optimizationTips: [
      'Ensure your video has a strong opening hook',
      'Add relevant trending hashtags',
      'Include a clear call-to-action',
      'Test different thumbnails and titles'
    ]
  };
}

module.exports = {
  generateStrategicSummary,
  generateSummaryText,
  determinePlatforms,
  generateOptimizationTips,
  getDefaultSummary,
  PLATFORMS
};
