/**
 * AI Daily Strategy Report
 * ClipperAI2026 - GOD LEVEL AI GROWTH ENGINE
 * 
 * Features:
 * - Reuses analyticsService data (RAM optimized)
 * - Reuses viralPredictionService data
 * - Generates daily AI insight report
 * - Lightweight - no heavy AI libraries
 * 
 * Example output:
 * Today's AI Strategy Report:
 * 
 * Best Upload Time: 19:30
 * Viral Probability: 81%
 * Trending Topic: AI Automation
 * Recommended Format: Short Clip
 * Team Activity: Active
 */

let analyticsService = null;
let viralPredictionService = null;
let growthStrategyService = null;

// Lazy load dependencies
const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[DailyReport] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try {
      viralPredictionService = require('./viralPredictionService');
    } catch (e) {
      console.error('[DailyReport] Viral Prediction service not available:', e.message);
    }
  }
  return viralPredictionService;
};

const getGrowthStrategyService = () => {
  if (!growthStrategyService) {
    try {
      growthStrategyService = require('./growthStrategyService');
    } catch (e) {
      console.error('[DailyReport] Growth Strategy service not available:', e.message);
    }
  }
  return growthStrategyService;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const reportCache = {
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
// DAILY REPORT GENERATION
// ============================================================================

/**
 * Generate daily AI strategy report
 */
const generateDailyReport = async (language = 'english') => {
  const cached = reportCache.get();
  if (cached) return cached;

  try {
    // Gather all data in parallel
    const [analytics, viral, growthStrategy, teamActivity] = await Promise.all([
      getAnalyticsData(),
      getViralData(),
      getGrowthData(),
      getTeamActivity()
    ]);

    const result = {
      date: new Date().toISOString().split('T')[0],
      bestUploadTime: analytics.bestUploadTime,
      viralProbability: viral.viralProbability,
      trendingTopic: viral.trendingTopic,
      recommendedFormat: viral.recommendedFormat,
      teamActivity: teamActivity.status,
      metrics: {
        totalClips: analytics.totalClips,
        avgViralScore: analytics.avgViralScore,
        uploadsToday: teamActivity.clipsToday,
        editorsOnline: teamActivity.editorsOnline
      },
      growthStrategy: growthStrategy.strategy,
      riskLevel: viral.riskLevel,
      actionItems: generateActionItems(analytics, viral, teamActivity, language),
      insights: generateInsights(analytics, viral, language),
      timestamp: new Date().toISOString()
    };

    reportCache.set(result);
    return result;
  } catch (error) {
    console.error('[DailyReport] Generate report error:', error.message);
    return getDefaultReport(language);
  }
};

/**
 * Get analytics data
 */
const getAnalyticsData = async () => {
  try {
    const analytics = getAnalyticsService();
    if (!analytics) {
      return getDefaultAnalyticsData();
    }

    const [summary, bestTime] = await Promise.all([
      analytics.getSummary('30d'),
      analytics.getBestUploadTime()
    ]);

    return {
      totalClips: summary.totalClips || 0,
      avgViralScore: summary.avgViralScore || 0,
      maxViralScore: summary.maxViralScore || 0,
      bestUploadTime: bestTime?.timeRange || '7:00 PM - 9:00 PM',
      platforms: summary.platforms || {}
    };
  } catch (error) {
    console.error('[DailyReport] Analytics data error:', error.message);
    return getDefaultAnalyticsData();
  }
};

/**
 * Get viral prediction data
 */
const getViralData = async () => {
  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return getDefaultViralData();
    }

    const [prediction, insights] = await Promise.all([
      viralService.predictViralPotential(),
      viralService.getViralInsights()
    ]);

    // Determine trending topic
    let trendingTopic = 'AI Tools';
    if (insights.topPerforming && insights.topPerforming.length > 0) {
      trendingTopic = extractTopic(insights.topPerforming[0].title);
    }

    return {
      viralProbability: prediction.viralProbability || '55%',
      riskLevel: prediction.riskLevel || 'Medium',
      recommendedFormat: prediction.recommendedFormat || 'Short Clip',
      recommendedTime: prediction.recommendedUploadTime || '7:00 PM',
      trendingTopic
    };
  } catch (error) {
    console.error('[DailyReport] Viral data error:', error.message);
    return getDefaultViralData();
  }
};

/**
 * Get growth strategy data
 */
const getGrowthData = async () => {
  try {
    const growthService = getGrowthStrategyService();
    if (!growthService) {
      return { strategy: 'Upload consistently for best results' };
    }

    const strategy = await growthService.generateGrowthStrategy();
    return {
      strategy: strategy.growthStrategy || 'Upload consistently for best results',
      recommendedContentType: strategy.recommendedContentType
    };
  } catch (error) {
    console.error('[DailyReport] Growth data error:', error.message);
    return { strategy: 'Upload consistently for best results' };
  }
};

/**
 * Get team activity
 */
const getTeamActivity = async () => {
  let prisma = null;
  try {
    prisma = require('../prisma/client');
  } catch (e) {
    return { status: 'Unknown', clipsToday: 0, editorsOnline: 0 };
  }

  if (!prisma) {
    return { status: 'Unknown', clipsToday: 0, editorsOnline: 0 };
  }

  try {
    // Get today's clips
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const clipsToday = await prisma.clip.count({
      where: { createdAt: { gte: todayStart } }
    });

    // Get online users
    const statuses = await prisma.chatUserStatus.findMany({
      where: { online: true }
    });

    // Get users with editor role
    const users = await prisma.user.findMany({
      where: { role: 'editor' }
    });
    
    const editorIds = users.map(u => u.id);
    const editorsOnline = statuses.filter(s => editorIds.includes(s.userId)).length;

    let status = 'Inactive';
    if (editorsOnline > 0 && clipsToday > 0) {
      status = 'Active';
    } else if (editorsOnline > 0 || clipsToday > 0) {
      status = 'Moderate';
    }

    return {
      status,
      clipsToday,
      editorsOnline,
      totalOnline: statuses.length
    };
  } catch (error) {
    console.error('[DailyReport] Team activity error:', error.message);
    return { status: 'Unknown', clipsToday: 0, editorsOnline: 0 };
  }
};

// ============================================================================
// ACTION ITEMS & INSIGHTS
// ============================================================================

/**
 * Generate action items for the day
 */
const generateActionItems = (analytics, viral, teamActivity, language) => {
  const actions = [];

  // Upload frequency action
  if (analytics.totalClips < 5) {
    actions.push({
      priority: 'high',
      text: language === 'indonesian'
        ? 'Upload minimal 1 video untuk mulai membangun data'
        : 'Upload at least 1 video to start building data',
      type: 'upload'
    });
  } else if (teamActivity.clipsToday < 2) {
    actions.push({
      priority: 'medium',
      text: language === 'indonesian'
        ? 'Pertimbangkan upload lebih banyak hari ini'
        : 'Consider uploading more today',
      type: 'upload'
    });
  }

  // Format action
  actions.push({
    priority: 'medium',
    text: language === 'indonesian'
      ? `Gunakan format ${viral.recommendedFormat} untuk hasil terbaik`
      : `Use ${viral.recommendedFormat} format for best results`,
    type: 'content'
  });

  // Time action
  actions.push({
    priority: 'low',
    text: language === 'indonesian'
      ? `Upload di ${analytics.bestUploadTime} untuk engagement maksimal`
      : `Upload at ${analytics.bestUploadTime} for maximum engagement`,
    type: 'timing'
  });

  return actions;
};

/**
 * Generate insights
 */
const generateInsights = (analytics, viral, language) => {
  const insights = [];

  // Viral score insight
  const score = analytics.avgViralScore || 0;
  if (score >= 70) {
    insights.push({
      type: 'performance',
      text: language === 'indonesian'
        ? 'Performa konten Anda sangat baik!'
        : 'Your content performance is excellent!',
      icon: 'star'
    });
  } else if (score >= 50) {
    insights.push({
      type: 'performance',
      text: language === 'indonesian'
        ? 'Performa konten di atas rata-rata'
        : 'Above average content performance',
      icon: 'trending'
    });
  }

  // Growth trend
  insights.push({
    type: 'trend',
    text: language === 'indonesian'
      ? `Topik trending: ${viral.trendingTopic}`
      : `Trending topic: ${viral.trendingTopic}`,
    icon: 'fire'
  });

  // Recommendation
  insights.push({
    type: 'recommendation',
    text: language === 'indonesian'
      ? `Probabilitas viral hari ini: ${viral.viralProbability}`
      : `Today's viral probability: ${viral.viralProbability}`,
    icon: 'target'
  });

  return insights;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const extractTopic = (title) => {
  if (!title) return 'AI Tools';
  
  const words = title.split(' ')
    .filter(w => w.length > 3 && !['about', 'with', 'this', 'that'].includes(w.toLowerCase()));
  
  return words.length > 0 ? words.slice(0, 2).join(' ') : 'AI Tools';
};

const getDefaultAnalyticsData = () => ({
  totalClips: 0,
  avgViralScore: 0,
  maxViralScore: 0,
  bestUploadTime: '7:00 PM - 9:00 PM',
  platforms: {}
});

const getDefaultViralData = () => ({
  viralProbability: '55%',
  riskLevel: 'Medium',
  recommendedFormat: 'Short Clip',
  recommendedTime: '7:00 PM',
  trendingTopic: 'AI Tools'
});

const getDefaultReport = (language) => ({
  date: new Date().toISOString().split('T')[0],
  bestUploadTime: '7:30 PM',
  viralProbability: '55%',
  trendingTopic: 'AI Tools',
  recommendedFormat: 'Short Clip',
  teamActivity: 'Unknown',
  metrics: {
    totalClips: 0,
    avgViralScore: 0,
    uploadsToday: 0,
    editorsOnline: 0
  },
  growthStrategy: language === 'indonesian'
    ? 'Upload konten secara konsisten'
    : 'Upload content consistently',
  riskLevel: 'Medium',
  actionItems: [],
  insights: [],
  timestamp: new Date().toISOString()
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateDailyReport,
  reportCache
};

