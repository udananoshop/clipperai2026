/**
 * Viral Prediction Service
 * Auto Viral Content Predictor for ClipperAI2026
 * 
 * Features:
 * - Lightweight calculations for 8GB RAM optimization
 * - No heavy AI libraries
 * - Reuses existing analytics data
 * - Multilingual support (Indonesian + English)
 * 
 * Analyzes:
 * - engagement rate
 * - total views
 * - upload frequency
 * - trending score
 */

let prisma = null;
let analyticsService = null;

// Lazy load dependencies
const getPrisma = () => {
  if (!prisma) {
    try {
      prisma = require('../prisma/client');
    } catch (e) {
      console.error('[ViralPrediction] Prisma not available:', e.message);
    }
  }
  return prisma;
};

const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[ViralPrediction] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const predictionCache = {
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
// VIRAL SCORE CALCULATION WEIGHTS
// ============================================================================
const WEIGHTS = {
  engagementRate: 0.30,
  views: 0.20,
  uploadFrequency: 0.25,
  trendingScore: 0.25
};

// ============================================================================
// ANALYTICS DATA GATHERING
// ============================================================================

/**
 * Get analytics data for prediction
 */
const getAnalyticsData = async () => {
  try {
    const analytics = getAnalyticsService();
    if (!analytics) {
      return getDefaultAnalytics();
    }

    const [summary, bestClip, weekly] = await Promise.all([
      analytics.getSummary('30d'),
      analytics.getBestClip(),
      analytics.getWeeklyPerformance()
    ]);

    return { summary, bestClip, weekly };
  } catch (error) {
    console.error('[ViralPrediction] Analytics error:', error.message);
    return getDefaultAnalytics();
  }
};

/**
 * Get upload frequency data
 */
const getUploadFrequency = async (days = 7) => {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return { uploadsLastWeek: 3, avgPerDay: 0.4 };
  }

  try {
    const weekAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const clipCount = await prismaClient.clip.count({
      where: { createdAt: { gte: weekAgo } }
    });

    return {
      uploadsLastWeek: clipCount,
      avgPerDay: clipCount / days
    };
  } catch (error) {
    console.error('[ViralPrediction] Upload frequency error:', error.message);
    return { uploadsLastWeek: 3, avgPerDay: 0.4 };
  }
};

/**
 * Get engagement rate from clips
 */
const getEngagementRate = async () => {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return 65; // Default
  }

  try {
    const clips = await prismaClient.clip.findMany({
      where: { viralScore: { not: null } },
      take: 50,
      orderBy: { createdAt: 'desc' }
    });

    if (clips.length === 0) {
      return 50;
    }

    // Calculate average viral score as proxy for engagement
    const avgScore = clips.reduce((sum, c) => sum + (c.viralScore || 0), 0) / clips.length;
    return Math.round(avgScore);
  } catch (error) {
    console.error('[ViralPrediction] Engagement rate error:', error.message);
    return 50;
  }
};

/**
 * Get trending score based on recent performance
 */
const getTrendingScore = async () => {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return 60;
  }

  try {
    // Compare last 7 days vs previous 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentClips, olderClips] = await Promise.all([
      prismaClient.clip.findMany({
        where: { createdAt: { gte: weekAgo }, viralScore: { not: null } },
        select: { viralScore: true }
      }),
      prismaClient.clip.findMany({
        where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo }, viralScore: { not: null } },
        select: { viralScore: true }
      })
    ]);

    if (recentClips.length === 0 || olderClips.length === 0) {
      return 60;
    }

    const recentAvg = recentClips.reduce((sum, c) => sum + (c.viralScore || 0), 0) / recentClips.length;
    const olderAvg = olderClips.reduce((sum, c) => sum + (c.viralScore || 0), 0) / olderClips.length;

    if (olderAvg === 0) return 70;

    // Calculate trend percentage
    const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    // Convert to 0-100 scale with base of 50
    return Math.min(100, Math.max(0, 50 + trend));
  } catch (error) {
    console.error('[ViralPrediction] Trending score error:', error.message);
    return 60;
  }
};

// ============================================================================
// VIRAL SCORE CALCULATION
// ============================================================================

/**
 * Calculate viral probability score (0-100)
 */
const calculateViralScore = async () => {
  const cacheKey = 'viral_score';
  const cached = predictionCache.get(cacheKey);
  if (cached) return cached;

  try {
    const [engagementRate, uploadFreq, trendingScore] = await Promise.all([
      getEngagementRate(),
      getUploadFrequency(),
      getTrendingScore()
    ]);

    // Views is estimated from engagement
    const estimatedViews = engagementRate * 15; // Approximate

    // Calculate weighted score
    const normalizedEngagement = Math.min(100, engagementRate);
    const normalizedViews = Math.min(100, estimatedViews / 10);
    const normalizedFrequency = Math.min(100, uploadFreq.avgPerDay * 50);
    const normalizedTrending = trendingScore;

    const viralScore = Math.round(
      (normalizedEngagement * WEIGHTS.engagementRate) +
      (normalizedViews * WEIGHTS.views) +
      (normalizedFrequency * WEIGHTS.uploadFrequency) +
      (normalizedTrending * WEIGHTS.trendingScore)
    );

    const result = {
      engagementRate: Math.round(normalizedEngagement),
      estimatedViews: Math.round(estimatedViews),
      uploadFrequency: uploadFreq.avgPerDay.toFixed(1),
      trendingScore: Math.round(normalizedTrending),
      viralScore
    };

    predictionCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ViralPrediction] Calculate viral score error:', error.message);
    return { engagementRate: 50, estimatedViews: 750, uploadFrequency: 0.5, trendingScore: 60, viralScore: 55 };
  }
};

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

/**
 * Get best upload time recommendation
 */
const getRecommendedUploadTime = async () => {
  const cacheKey = 'upload_time';
  const cached = predictionCache.get(cacheKey);
  if (cached) return cached;

  try {
    const analytics = getAnalyticsService();
    if (analytics) {
      const bestTime = await analytics.getBestUploadTime();
      if (bestTime && bestTime.bestHour !== undefined) {
        const result = {
          hour: bestTime.bestHour,
          time: bestTime.timeRange,
          avgScore: bestTime.avgViralScore
        };
        predictionCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (error) {
    console.error('[ViralPrediction] Best upload time error:', error.message);
  }

  // Default recommendations based on time patterns
  const result = {
    hour: 19,
    time: '7:00 PM - 9:00 PM',
    avgScore: 0
  };
  predictionCache.set(cacheKey, result);
  return result;
};

/**
 * Get recommended content format
 */
const getRecommendedFormat = async () => {
  const prismaClient = getPrisma();
  
  // Analyze what format works best
  try {
    if (prismaClient) {
      const platformStats = await prismaClient.clip.groupBy({
        by: ['platform'],
        _avg: { viralScore: true },
        _count: true
      });

      if (platformStats.length > 0) {
        // Find best performing platform
        let bestPlatform = platformStats[0];
        platformStats.forEach(stat => {
          if ((stat._avg.viralScore || 0) > (bestPlatform._avg.viralScore || 0)) {
            bestPlatform = stat;
          }
        });

        const platform = bestPlatform.platform?.toLowerCase() || 'youtube';
        
        // Map to recommended format
        const formatMap = {
          tiktok: 'Short Clip (9:16)',
          youtube: 'Shorts (9:16)',
          instagram: 'Reels (9:16)',
          facebook: 'Short Video'
        };

        return {
          format: formatMap[platform] || 'Short Clip',
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          avgScore: Math.round(bestPlatform._avg.viralScore || 0)
        };
      }
    }
  } catch (error) {
    console.error('[ViralPrediction] Format analysis error:', error.message);
  }

  // Default
  return { format: 'Short Clip (9:16)', platform: 'TikTok', avgScore: 0 };
};

/**
 * Calculate risk level based on prediction
 */
const getRiskLevel = (viralScore) => {
  if (viralScore >= 75) return { level: 'Low', emoji: '🟢', reason: 'High viral potential' };
  if (viralScore >= 50) return { level: 'Medium', emoji: '🟡', reason: 'Moderate viral potential' };
  return { level: 'High', emoji: '🔴', reason: 'Low viral potential - consider strategy change' };
};

// ============================================================================
// MAIN PREDICTION FUNCTION
// ============================================================================

/**
 * Predict viral potential for content
 * @param {string} videoId - Optional video ID to predict specific video
 * @returns {Object} Prediction result
 */
const predictViralPotential = async (videoId = null) => {
  try {
    // Get viral score data
    const viralScore = await calculateViralScore();
    
    // Get recommendations
    const [uploadTime, format, risk] = await Promise.all([
      getRecommendedUploadTime(),
      getRecommendedFormat(),
      Promise.resolve(getRiskLevel(viralScore.viralScore))
    ]);

    const prediction = {
      viralProbability: viralScore.viralScore + '%',
      recommendedUploadTime: formatTime(uploadTime.hour),
      recommendedFormat: format.format,
      riskLevel: risk.level,
      riskEmoji: risk.emoji,
      riskReason: risk.reason,
      metrics: {
        engagementRate: viralScore.engagementRate + '%',
        estimatedViews: viralScore.estimatedViews.toLocaleString(),
        uploadFrequency: viralScore.uploadFrequency + '/day',
        trendingScore: viralScore.trendingScore + '%'
      },
      platform: format.platform,
      timestamp: new Date().toISOString()
    };

    return prediction;
  } catch (error) {
    console.error('[ViralPrediction] Prediction error:', error.message);
    return getDefaultPrediction();
  }
};

/**
 * Predict for specific video
 */
const predictVideo = async (videoId) => {
  const prismaClient = getPrisma();
  
  if (!prismaClient || !videoId) {
    return predictViralPotential();
  }

  try {
    // Get specific video data
    const clip = await prismaClient.clip.findFirst({
      where: {
        OR: [
          { id: videoId },
          { id: { contains: videoId } }
        ]
      },
      select: {
        id: true,
        title: true,
        platform: true,
        viralScore: true,
        createdAt: true
      }
    });

    if (!clip) {
      return {
        ...await predictViralPotential(),
        videoId,
        message: 'Video not found - showing general prediction'
      };
    }

    // Calculate specific prediction based on clip's score
    const score = clip.viralScore || 50;
    const viralProbability = Math.min(99, Math.max(10, score + Math.floor(Math.random() * 15 - 7)));
    
    const [uploadTime, format, risk] = await Promise.all([
      getRecommendedUploadTime(),
      getRecommendedFormat(),
      Promise.resolve(getRiskLevel(viralProbability))
    ]);

    return {
      videoId: clip.id,
      title: clip.title || 'Untitled',
      currentScore: score,
      viralProbability: viralProbability + '%',
      recommendedUploadTime: formatTime(uploadTime.hour),
      recommendedFormat: format.format,
      riskLevel: risk.level,
      riskEmoji: risk.emoji,
      platform: clip.platform || format.platform,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[ViralPrediction] Video prediction error:', error.message);
    return predictViralPotential();
  }
};

/**
 * Get overall strategy recommendations
 */
const getStrategyRecommendation = async (language = 'english') => {
  const [viralScore, analytics] = await Promise.all([
    calculateViralScore(),
    getAnalyticsData()
  ]);

  const recommendations = [];
  const t = language === 'indonesian' ? {
    high: 'Performa Tinggi!',
    medium: 'Performa Sedang',
    low: 'Perlu Perbaikan',
    uploadMore: 'Pertimbangkan untuk upload lebih sering',
    optimizeTime: 'Optimalkan waktu upload Anda',
    improveContent: 'Perbaiki kualitas konten',
    keepGoing: 'Pertahankan momentum!',
    focusQuality: 'Fokus pada kualitas daripada kuantitas'
  } : {
    high: 'High Performance!',
    medium: 'Moderate Performance',
    low: 'Needs Improvement',
    uploadMore: 'Consider uploading more frequently',
    optimizeTime: 'Optimize your upload time',
    improveContent: 'Improve content quality',
    keepGoing: 'Keep up the good work!',
    focusQuality: 'Focus on quality over quantity'
  };

  // Engagement recommendation
  if (viralScore.engagementRate >= 70) {
    recommendations.push({ type: 'engagement', text: t.high, priority: 'high' });
    recommendations.push({ type: 'engagement', text: t.keepGoing, priority: 'medium' });
  } else if (viralScore.engagementRate >= 50) {
    recommendations.push({ type: 'engagement', text: t.medium, priority: 'medium' });
    recommendations.push({ type: 'engagement', text: t.improveContent, priority: 'medium' });
  } else {
    recommendations.push({ type: 'engagement', text: t.low, priority: 'high' });
    recommendations.push({ type: 'engagement', text: t.improveContent, priority: 'high' });
  }

  // Frequency recommendation
  if (parseFloat(viralScore.uploadFrequency) < 0.5) {
    recommendations.push({ type: 'frequency', text: t.uploadMore, priority: 'medium' });
  }

  // Time recommendation
  recommendations.push({ type: 'timing', text: t.optimizeTime, priority: 'medium' });

  // Quality vs Quantity
  if (analytics.summary?.totalClips > 10 && viralScore.engagementRate < 60) {
    recommendations.push({ type: 'quality', text: t.focusQuality, priority: 'high' });
  }

  return {
    overallScore: viralScore.viralScore,
    recommendations,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get viral content insights
 */
const getViralInsights = async (language = 'english') => {
  const prismaClient = getPrisma();
  
  const insights = {
    topPerforming: [],
    recentTrends: [],
    recommendations: []
  };

  try {
    if (prismaClient) {
      // Get top performing clips
      const topClips = await prismaClient.clip.findMany({
        where: { viralScore: { not: null, gte: 70 } },
        take: 5,
        orderBy: { viralScore: 'desc' },
        select: {
          id: true,
          title: true,
          platform: true,
          viralScore: true
        }
      });

      insights.topPerforming = topClips.map(clip => ({
        id: clip.id.substring(0, 8),
        title: clip.title || 'Untitled',
        platform: clip.platform,
        score: clip.viralScore
      }));

      // Recent trends
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentClips = await prismaClient.clip.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { platform: true, viralScore: true }
      });

      if (recentClips.length > 0) {
        const platformCounts = {};
        recentClips.forEach(clip => {
          const p = clip.platform?.toLowerCase() || 'youtube';
          if (!platformCounts[p]) platformCounts[p] = { count: 0, totalScore: 0 };
          platformCounts[p].count++;
          platformCounts[p].totalScore += clip.viralScore || 0;
        });

        insights.recentTrends = Object.entries(platformCounts).map(([platform, data]) => ({
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          count: data.count,
          avgScore: Math.round(data.totalScore / data.count)
        }));
      }
    }
  } catch (error) {
    console.error('[ViralPrediction] Viral insights error:', error.message);
  }

  // Default insights if none found
  if (insights.topPerforming.length === 0) {
    const t = language === 'indonesian' ? {
      noData: 'Belum cukup data',
      uploadMore: 'Upload lebih banyak konten untuk melihat insights',
      tip: 'Tips: Fokus pada kualitas konten untuk viral'
    } : {
      noData: 'Not enough data',
      uploadMore: 'Upload more content to see insights',
      tip: 'Tip: Focus on content quality for virality'
    };

    insights.recommendations.push({ type: 'info', text: t.noData });
    insights.recommendations.push({ type: 'tip', text: t.uploadMore });
  }

  return insights;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTime = (hour) => {
  const h = hour % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:00 ${suffix}`;
};

const getDefaultAnalytics = () => ({
  summary: { totalClips: 0, avgViralScore: 0 },
  bestClip: null,
  weekly: []
});

const getDefaultPrediction = () => ({
  viralProbability: '55%',
  recommendedUploadTime: '7:00 PM',
  recommendedFormat: 'Short Clip',
  riskLevel: 'Medium',
  riskEmoji: '🟡',
  riskReason: 'Moderate viral potential',
  metrics: {
    engagementRate: '50%',
    estimatedViews: '750',
    uploadFrequency: '0.5/day',
    trendingScore: '60%'
  },
  timestamp: new Date().toISOString()
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  predictViralPotential,
  predictVideo,
  getStrategyRecommendation,
  getViralInsights,
  getRecommendedUploadTime,
  getRecommendedFormat,
  calculateViralScore,
  predictionCache
};

