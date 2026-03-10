/**
 * AI Dashboard Insight Service
 * ClipperAI2026 - Lightweight AI Strategy Dashboard
 * 
 * Features:
 * - Reuses data from existing services (RAM optimized)
 * - 60-second caching for low RAM usage
 * - No heavy AI libraries
 * - Lightweight calculations only
 * 
 * Output:
 * {
 *   bestUploadTime: "19:30",
 *   viralProbability: "81%",
 *   recommendedFormat: "Short Clip",
 *   trendingTopic: "AI Automation",
 *   topClip: "Video #12",
 *   strategySummary: "Upload 2 short clips today focusing on AI tools niche"
 * }
 */

let analyticsService = null;
let viralPredictionService = null;
let growthStrategyService = null;
let dailyStrategyReport = null;

// Lazy load dependencies
const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[DashboardInsight] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try {
      viralPredictionService = require('./viralPredictionService');
    } catch (e) {
      console.error('[DashboardInsight] Viral Prediction service not available:', e.message);
    }
  }
  return viralPredictionService;
};

const getGrowthStrategyService = () => {
  if (!growthStrategyService) {
    try {
      growthStrategyService = require('./growthStrategyService');
    } catch (e) {
      console.error('[DashboardInsight] Growth Strategy service not available:', e.message);
    }
  }
  return growthStrategyService;
};

const getDailyStrategyReport = () => {
  if (!dailyStrategyReport) {
    try {
      dailyStrategyReport = require('./dailyStrategyReport');
    } catch (e) {
      console.error('[DashboardInsight] Daily Strategy Report not available:', e.message);
    }
  }
  return dailyStrategyReport;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const insightCache = {
  data: null,
  timestamp: null,

  get() {
    if (this.timestamp && (Date.now() - this.timestamp) < CACHE_TTL) {
      return this.data;
    }
    return null;
  },

  set(value) {
    this.data = value;
    this.timestamp = Date.now();
  }
};

// ============================================================================
// MAIN INSIGHT GENERATION
// ============================================================================

/**
 * Get AI Dashboard Insights
 * Reuses data from existing services with caching
 */
const getDashboardInsights = async () => {
  // Check cache first
  const cached = insightCache.get();
  if (cached) {
    return cached;
  }

  try {
    // Gather data from all existing services in parallel
    const [analytics, viralPrediction, growthStrategy, dailyReport] = await Promise.all([
      getAnalyticsData(),
      getViralPredictionData(),
      getGrowthStrategyData(),
      getDailyReportData()
    ]);

    // Build lightweight insight object
    const insights = {
      bestUploadTime: viralPrediction.bestUploadTime || '19:30',
      viralProbability: viralPrediction.viralProbability || '55%',
      recommendedFormat: viralPrediction.recommendedFormat || 'Short Clip',
      trendingTopic: dailyReport.trendingTopic || 'AI Tools',
      topClip: analytics.topClip || 'Video #1',
      strategySummary: growthStrategy.strategySummary || 'Upload consistently for best results',
      
      // Additional metadata
      timestamp: new Date().toISOString(),
      cached: false,
      source: 'dashboard_insight_service'
    };

    // Cache the result
    insightCache.set(insights);
    insights.cached = true;

    return insights;
  } catch (error) {
    console.error('[DashboardInsight] Error generating insights:', error.message);
    return getDefaultInsights();
  }
};

// ============================================================================
// DATA GATHERING FROM EXISTING SERVICES
// ============================================================================

/**
 * Get analytics data (reuse from analyticsService)
 */
const getAnalyticsData = async () => {
  try {
    const analytics = getAnalyticsService();
    if (!analytics) {
      return getDefaultAnalyticsData();
    }

    const [bestClip, bestTime] = await Promise.all([
      analytics.getBestClip(),
      analytics.getBestUploadTime()
    ]);

    return {
      topClip: bestClip?.title ? `Video #${bestClip.id?.slice(0, 4)}` : 'Video #1',
      bestTime: bestTime?.timeRange || '7:00 PM - 9:00 PM'
    };
  } catch (error) {
    console.error('[DashboardInsight] Analytics data error:', error.message);
    return getDefaultAnalyticsData();
  }
};

/**
 * Get viral prediction data (reuse from viralPredictionService)
 */
const getViralPredictionData = async () => {
  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return getDefaultViralData();
    }

    const prediction = await viralService.predictViralPotential();
    const uploadTime = await viralService.getRecommendedUploadTime();

    return {
      viralProbability: prediction.viralProbability || '55%',
      recommendedFormat: prediction.recommendedFormat || 'Short Clip',
      bestUploadTime: formatHour(uploadTime?.hour || 19)
    };
  } catch (error) {
    console.error('[DashboardInsight] Viral prediction error:', error.message);
    return getDefaultViralData();
  }
};

/**
 * Get growth strategy data (reuse from growthStrategyService)
 */
const getGrowthStrategyData = async () => {
  try {
    const growthService = getGrowthStrategyService();
    if (!growthService) {
      return getDefaultGrowthData();
    }

    const strategy = await growthService.generateGrowthStrategy();

    return {
      strategySummary: strategy.growthStrategy || 'Upload consistently for best results',
      recommendedContentType: strategy.recommendedContentType || 'Short Clip'
    };
  } catch (error) {
    console.error('[DashboardInsight] Growth strategy error:', error.message);
    return getDefaultGrowthData();
  }
};

/**
 * Get daily report data (reuse from dailyStrategyReport)
 */
const getDailyReportData = async () => {
  try {
    const reportService = getDailyStrategyReport();
    if (!reportService) {
      return getDefaultReportData();
    }

    const report = await reportService.generateDailyReport();

    return {
      trendingTopic: report.trendingTopic || 'AI Tools',
      recommendedFormat: report.recommendedFormat || 'Short Clip',
      teamActivity: report.teamActivity || 'Unknown'
    };
  } catch (error) {
    console.error('[DashboardInsight] Daily report error:', error.message);
    return getDefaultReportData();
  }
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

// Default fallback data
const getDefaultInsights = () => ({
  bestUploadTime: '19:30',
  viralProbability: '55%',
  recommendedFormat: 'Short Clip',
  trendingTopic: 'AI Tools',
  topClip: 'Video #1',
  strategySummary: 'Upload consistently for best results',
  timestamp: new Date().toISOString(),
  cached: false,
  source: 'dashboard_insight_service'
});

const getDefaultAnalyticsData = () => ({
  topClip: 'Video #1',
  bestTime: '7:00 PM - 9:00 PM'
});

const getDefaultViralData = () => ({
  viralProbability: '55%',
  recommendedFormat: 'Short Clip',
  bestUploadTime: '19:30'
});

const getDefaultGrowthData = () => ({
  strategySummary: 'Upload consistently for best results',
  recommendedContentType: 'Short Clip'
});

const getDefaultReportData = () => ({
  trendingTopic: 'AI Tools',
  recommendedFormat: 'Short Clip',
  teamActivity: 'Unknown'
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getDashboardInsights,
  insightCache
};

