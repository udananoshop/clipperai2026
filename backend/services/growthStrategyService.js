/**
 * AI Growth Strategy Engine
 * ClipperAI2026 - GOD LEVEL AI GROWTH ENGINE
 * 
 * Features:
 * - Reuses analyticsService data (RAM optimized)
 * - Reuses viralPredictionService data
 * - Analyzes upload frequency and engagement trends
 * - Returns strategic recommendations
 * - Lightweight - no heavy AI libraries
 * 
 * Output format:
 * {
 *   bestUploadTime: "19:30",
 *   recommendedContentType: "Short Clip",
 *   viralProbability: "82%",
 *   growthStrategy: "Upload 2 clips today focusing on AI tools niche",
 *   riskLevel: "Low"
 * }
 */

let analyticsService = null;
let viralPredictionService = null;

// Lazy load dependencies
const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[GrowthStrategy] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try {
      viralPredictionService = require('./viralPredictionService');
    } catch (e) {
      console.error('[GrowthStrategy] Viral Prediction service not available:', e.message);
    }
  }
  return viralPredictionService;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const strategyCache = {
  data: {},
  timestamps: {},

  get(key) {
    const timestamp = this.timestamps[key];
    const now = Date.now();
    if (timestamp && (now - timestamp) < CACHE_TTL) {
      return this.data[key];
    }
    return null;
  },

  set(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  }
};

// ============================================================================
// CONTENT NICHE TEMPLATES
// ============================================================================
const CONTENT_NICHES = [
  'AI Tools',
  'Productivity',
  'Tech Tips',
  'Life Hacks',
  'Business Growth',
  'Social Media',
  'Automation',
  'Digital Marketing'
];

const CONTENT_TYPES = [
  'Short Clip (9:16)',
  'Tutorial',
  'Review',
  'Comparison',
  'Behind the Scenes',
  'Q&A',
  'List Format'
];

// ============================================================================
// ANALYZE ENGAGEMENT TRENDS
// ============================================================================

/**
 * Analyze engagement trends from analytics data
 */
const analyzeEngagementTrends = async () => {
  const cacheKey = 'engagement_trends';
  const cached = strategyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const analytics = getAnalyticsService();
    if (!analytics) {
      return getDefaultEngagementTrends();
    }

    const [summary, weekly, bestTime] = await Promise.all([
      analytics.getSummary('30d'),
      analytics.getWeeklyPerformance(),
      analytics.getBestUploadTime()
    ]);

    const result = {
      totalClips: summary.totalClips || 0,
      avgViralScore: summary.avgViralScore || 0,
      maxViralScore: summary.maxViralScore || 0,
      bestUploadHour: bestTime?.bestHour || 19,
      bestUploadTime: bestTime?.timeRange || '7:00 PM - 9:00 PM',
      weeklyData: weekly || [],
      platforms: summary.platforms || {}
    };

    strategyCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[GrowthStrategy] Engagement trends error:', error.message);
    return getDefaultEngagementTrends();
  }
};

/**
 * Analyze upload frequency
 */
const analyzeUploadFrequency = async () => {
  const cacheKey = 'upload_frequency';
  const cached = strategyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return { uploadsLastWeek: 3, avgPerDay: 0.4, frequencyStatus: 'low' };
    }

    const viralData = await viralService.calculateViralScore();
    const uploadsPerDay = parseFloat(viralData.uploadFrequency) || 0.5;

    let frequencyStatus = 'low';
    if (uploadsPerDay >= 1) {
      frequencyStatus = 'optimal';
    } else if (uploadsPerDay >= 0.5) {
      frequencyStatus = 'moderate';
    }

    const result = {
      uploadsLastWeek: Math.round(uploadsPerDay * 7),
      avgPerDay: uploadsPerDay,
      frequencyStatus
    };

    strategyCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[GrowthStrategy] Upload frequency error:', error.message);
    return { uploadsLastWeek: 3, avgPerDay: 0.4, frequencyStatus: 'low' };
  }
};

/**
 * Get viral prediction data
 */
const getViralData = async () => {
  const cacheKey = 'viral_data';
  const cached = strategyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return getDefaultViralData();
    }

    const prediction = await viralService.predictViralPotential();
    const result = {
      viralProbability: parseInt(prediction.viralProbability) || 55,
      recommendedFormat: prediction.recommendedFormat || 'Short Clip',
      recommendedTime: prediction.recommendedUploadTime || '7:00 PM',
      riskLevel: prediction.riskLevel || 'Medium',
      riskEmoji: prediction.riskEmoji || '🟡'
    };

    strategyCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[GrowthStrategy] Viral data error:', error.message);
    return getDefaultViralData();
  }
};

// ============================================================================
// DETERMINE BEST CONTENT TYPE
// ============================================================================

/**
 * Determine recommended content type based on trends
 */
const determineRecommendedContentType = (platforms, viralScore) => {
  // Find best performing platform
  let bestPlatform = 'youtube';
  let bestCount = 0;
  
  Object.entries(platforms).forEach(([platform, data]) => {
    if (data.count > bestCount) {
      bestCount = data.count;
      bestPlatform = platform;
    }
  });

  // Map platform to content type
  const platformContentMap = {
    tiktok: 'Short Clip (9:16)',
    youtube: 'Shorts / Short Clip',
    instagram: 'Reels',
    facebook: 'Short Video'
  };

  // Determine based on viral score
  if (viralScore >= 70) {
    return platformContentMap[bestPlatform] || 'Short Clip';
  } else if (viralScore >= 50) {
    return 'Tutorial';
  } else {
    return 'List Format';
  }
};

// ============================================================================
// GENERATE GROWTH STRATEGY
// ============================================================================

/**
 * Generate growth strategy based on all analysis
 */
const generateGrowthStrategy = async (language = 'english') => {
  const cacheKey = `growth_strategy_${language}`;
  const cached = strategyCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Gather all data in parallel (reuse existing service data)
    const [engagement, frequency, viralData] = await Promise.all([
      analyzeEngagementTrends(),
      analyzeUploadFrequency(),
      getViralData()
    ]);

    // Determine best upload time
    const bestHour = engagement.bestUploadHour || 19;
    const bestTimeStr = formatHour(bestHour);

    // Determine recommended content type
    const recommendedContentType = determineRecommendedContentType(
      engagement.platforms,
      viralData.viralProbability
    );

    // Generate growth strategy text
    const growthStrategy = generateStrategyText(
      engagement,
      frequency,
      viralData,
      language
    );

    // Determine risk level
    const riskLevel = viralData.riskLevel || 'Medium';
    const riskScore = viralData.viralProbability;

    const result = {
      bestUploadTime: bestTimeStr,
      recommendedContentType,
      viralProbability: viralData.viralProbability + '%',
      growthStrategy,
      riskLevel,
      metrics: {
        totalClips: engagement.totalClips,
        avgViralScore: engagement.avgViralScore,
        uploadsPerDay: frequency.avgPerDay.toFixed(1),
        frequencyStatus: frequency.frequencyStatus,
        bestPlatform: getBestPlatform(engagement.platforms)
      },
      recommendations: generateRecommendations(engagement, frequency, viralData, language),
      timestamp: new Date().toISOString()
    };

    strategyCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[GrowthStrategy] Generate strategy error:', error.message);
    return getDefaultStrategy(language);
  }
};

/**
 * Generate strategy text based on analysis
 */
const generateStrategyText = (engagement, frequency, viralData, language) => {
  const uploadsNeeded = getUploadsNeeded(frequency.frequencyStatus);
  const niche = CONTENT_NICHES[Math.floor(Math.random() * CONTENT_NICHES.length)];
  
  if (language === 'indonesian') {
    return `Upload ${uploadsNeeded} clip${uploadsNeeded > 1 ? 's' : ''} hari ini fokus pada niche ${niche}. Berdasarkan analytics, waktu terbaik adalah ${engagement.bestUploadTime}.`;
  }

  return `Upload ${uploadsNeeded} clip${uploadsNeeded > 1 ? 's' : ''} today focusing on ${niche} niche. Based on analytics, best time is ${engagement.bestUploadTime}.`;
};

/**
 * Get number of uploads recommended
 */
const getUploadsNeeded = (frequencyStatus) => {
  switch (frequencyStatus) {
    case 'optimal':
      return 2;
    case 'moderate':
      return 3;
    case 'low':
    default:
      return 1;
  }
};

/**
 * Get best performing platform
 */
const getBestPlatform = (platforms) => {
  let bestPlatform = 'YouTube';
  let bestScore = 0;
  
  Object.entries(platforms).forEach(([platform, data]) => {
    if ((data.avgViralScore || 0) > bestScore) {
      bestScore = data.avgViralScore;
      bestPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  });
  
  return bestScore > 0 ? bestPlatform : 'YouTube';
};

/**
 * Generate detailed recommendations
 */
const generateRecommendations = (engagement, frequency, viralData, language) => {
  const recommendations = [];

  // Frequency recommendation
  if (frequency.frequencyStatus === 'low') {
    recommendations.push({
      type: 'frequency',
      text: language === 'indonesian' 
        ? 'Tingkatkan frekuensi upload untuk meningkatkan visibilitas' 
        : 'Increase upload frequency to boost visibility',
      priority: 'high'
    });
  } else if (frequency.frequencyStatus === 'optimal') {
    recommendations.push({
      type: 'frequency',
      text: language === 'indonesian'
        ? 'Frekuensi upload optimal - pertahankan!'
        : 'Optimal upload frequency - keep it up!',
      priority: 'low'
    });
  }

  // Content type recommendation
  recommendations.push({
    type: 'content',
    text: language === 'indonesian'
      ? `Fokus pada format ${viralData.recommendedFormat} untuk hasil terbaik`
      : `Focus on ${viralData.recommendedFormat} format for best results`,
    priority: 'medium'
  });

  // Time recommendation
  recommendations.push({
    type: 'timing',
    text: language === 'indonesian'
      ? `Waktu upload terbaik: ${engagement.bestUploadTime}`
      : `Best upload time: ${engagement.bestUploadTime}`,
    priority: 'medium'
  });

  // Quality vs Quantity
  if (engagement.avgViralScore < 50 && engagement.totalClips > 10) {
    recommendations.push({
      type: 'quality',
      text: language === 'indonesian'
        ? 'Fokus pada kualitas daripada kuantitas'
        : 'Focus on quality over quantity',
      priority: 'high'
    });
  }

  return recommendations;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatHour = (hour) => {
  const h = hour % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:30 ${suffix}`;
};

const getDefaultEngagementTrends = () => ({
  totalClips: 0,
  avgViralScore: 45,
  maxViralScore: 0,
  bestUploadHour: 19,
  bestUploadTime: '7:00 PM - 9:00 PM',
  weeklyData: [],
  platforms: { youtube: { count: 0, avgViralScore: 0 } }
});

const getDefaultViralData = () => ({
  viralProbability: 55,
  recommendedFormat: 'Short Clip',
  recommendedTime: '7:00 PM',
  riskLevel: 'Medium',
  riskEmoji: '🟡'
});

const getDefaultStrategy = (language) => ({
  bestUploadTime: '7:30 PM',
  recommendedContentType: 'Short Clip',
  viralProbability: '55%',
  growthStrategy: language === 'indonesian'
    ? 'Upload 1 clip hari ini dengan topik yang relevan'
    : 'Upload 1 clip today with relevant topics',
  riskLevel: 'Medium',
  metrics: {
    totalClips: 0,
    avgViralScore: 0,
    uploadsPerDay: '0.4',
    frequencyStatus: 'low',
    bestPlatform: 'YouTube'
  },
  recommendations: [],
  timestamp: new Date().toISOString()
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateGrowthStrategy,
  analyzeEngagementTrends,
  analyzeUploadFrequency,
  getViralData,
  strategyCache
};

