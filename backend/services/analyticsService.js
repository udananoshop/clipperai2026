/**
 * Analytics Service - Overlord-Level Analytics Engine
 * Optimized for 8GB RAM environments
 * 
 * Features:
 * - 60-second caching layer
 * - Query optimization (LIMIT, aggregation)
 * - Safe mode (no AI engines)
 * - Lightweight insights generation
 */

const prisma = require('../prisma/client');

// ============================================================================
// ANALYTICS CACHING SYSTEM - 60 second cache
// ============================================================================
const CACHE_TTL = 60000; // 60 seconds

const analyticsCache = {
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
  },

  invalidate(key) {
    delete this.data[key];
    delete this.timestamps[key];
  },

  invalidateAll() {
    this.data = {};
    this.timestamps = {};
  }
};

// ============================================================================
// OPTIMIZED PRISMA QUERIES
// ============================================================================

/**
 * Get analytics summary with optimized queries
 * Uses aggregation and limited queries for 8GB RAM optimization
 */
async function getSummary(timeRange = '30d') {
  const cacheKey = `summary_${timeRange}`;
  const cached = analyticsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Calculate date filter
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // OPTIMIZED: Use count instead of findMany for large tables
    const [videoCount, clipCount] = await Promise.all([
      prisma.video.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.clip.count({
        where: { createdAt: { gte: startDate } }
      })
    ]);

    // OPTIMIZED: Get viral score stats with aggregation (using camelCase)
    const clipStats = await prisma.clip.aggregate({
      where: { 
        createdAt: { gte: startDate },
        viralScore: { not: null }
      },
      _avg: { viralScore: true },
      _max: { viralScore: true },
      _count: true
    });

    // Get platform breakdown with optimized query (using camelCase)
    const platformStats = await prisma.clip.groupBy({
      by: ['platform'],
      where: { createdAt: { gte: startDate } },
      _count: true,
      _avg: { viralScore: true }
    });

    // Format platform data
    const platforms = {
      tiktok: { count: 0, avgViralScore: 0 },
      youtube: { count: 0, avgViralScore: 0 },
      instagram: { count: 0, avgViralScore: 0 },
      facebook: { count: 0, avgViralScore: 0 }
    };
    
    platformStats.forEach(stat => {
      const platform = stat.platform?.toLowerCase() || 'youtube';
      if (platforms.hasOwnProperty(platform)) {
        platforms[platform] = {
          count: stat._count,
          avgViralScore: Math.round(stat._avg.viralScore || 0)
        };
      }
    });

    const result = {
      totalVideos: videoCount,
      totalClips: clipCount,
      avgViralScore: Math.round(clipStats._avg.viralScore || 0),
      maxViralScore: clipStats._max.viralScore || 0,
      totalClipsWithScore: clipStats._count,
      platforms,
      timeRange,
      generatedAt: new Date().toISOString()
    };

    analyticsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AnalyticsService] Summary error:', error.message);
    return getDefaultSummary();
  }
}

/**
 * Get best performing clip - optimized query
 * Only fetches 1 clip, sorted by viralScore (camelCase)
 */
async function getBestClip() {
  const cacheKey = 'best_clip';
  const cached = analyticsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // OPTIMIZED: findFirst with orderBy - only fetches 1 record (using camelCase)
    const bestClip = await prisma.clip.findFirst({
      where: {
        viralScore: { not: null }
      },
      orderBy: { viralScore: 'desc' },
      select: {
        id: true,
        title: true,
        platform: true,
        viralScore: true,
        createdAt: true
      }
    });

    if (!bestClip) {
      return null;
    }

    const result = {
      id: bestClip.id,
      title: bestClip.title,
      platform: bestClip.platform,
      views: 0, // No views field available, estimate from viral score
      viralScore: bestClip.viralScore,
      createdAt: bestClip.createdAt
    };

    analyticsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AnalyticsService] Best clip error:', error.message);
    return null;
  }
}

/**
 * AI Insights Engine - Lightweight
 * Generates insights using database statistics only
 * NO AI models - SAFE MODE FOR 8GB RAM
 */
async function getInsights() {
  const cacheKey = 'insights';
  const cached = analyticsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Get all clips with viral scores for analysis (using camelCase)
    const clips = await prisma.clip.findMany({
      where: { viralScore: { not: null } },
      select: {
        platform: true,
        viralScore: true,
        createdAt: true
      },
      take: 100, // LIMIT for memory optimization
      orderBy: { createdAt: 'desc' }
    });

    if (clips.length === 0) {
      return generateDefaultInsights();
    }

    const insights = [];

    // Insight 1: Platform performance comparison
    const platformScores = {};
    clips.forEach(clip => {
      const platform = clip.platform?.toLowerCase() || 'youtube';
      if (!platformScores[platform]) {
        platformScores[platform] = { total: 0, count: 0 };
      }
      platformScores[platform].total += clip.viralScore || 0;
      platformScores[platform].count += 1;
    });

    const platforms = Object.keys(platformScores);
    if (platforms.length >= 2) {
      let bestPlatform = null;
      let worstPlatform = null;
      let bestAvg = 0;
      let worstAvg = Infinity;

      platforms.forEach(platform => {
        const avg = platformScores[platform].total / platformScores[platform].count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestPlatform = platform;
        }
        if (avg < worstAvg && platformScores[platform].count >= 3) {
          worstAvg = avg;
          worstPlatform = platform;
        }
      });

      if (bestPlatform && worstPlatform) {
        const percentageDiff = Math.round(((bestAvg - worstAvg) / worstAvg) * 100);
        insights.push({
          type: 'platform',
          text: `${bestPlatform.charAt(0).toUpperCase() + bestPlatform.slice(1)} outperforming ${worstPlatform} by ${percentageDiff}%`,
          icon: 'trending',
          priority: 'high'
        });
      }
    }

    // Insight 2: Time-based performance
    const now = new Date();
    const recentClips = clips.filter(c => {
      const clipDate = new Date(c.createdAt);
      return (now - clipDate) < 7 * 24 * 60 * 60 * 1000;
    });

    if (recentClips.length >= 5) {
      const recentAvg = recentClips.reduce((sum, c) => sum + (c.viralScore || 0), 0) / recentClips.length;
      const olderClips = clips.filter(c => !recentClips.includes(c));
      
      if (olderClips.length >= 5) {
        const olderAvg = olderClips.reduce((sum, c) => sum + (c.viralScore || 0), 0) / olderClips.length;
        
        if (recentAvg > olderAvg + 5) {
          insights.push({
            type: 'trend',
            text: 'Recent uploads showing improved performance trend',
            icon: 'uptrend',
            priority: 'medium'
          });
        } else if (recentAvg < olderAvg - 5) {
          insights.push({
            type: 'trend',
            text: 'Consider reviewing recent content strategy',
            icon: 'downtrend',
            priority: 'medium'
          });
        }
      }
    }

    // Insight 3: Performance distribution
    const highScoreClips = clips.filter(c => (c.viralScore || 0) >= 75);
    const mediumScoreClips = clips.filter(c => (c.viralScore || 0) >= 50 && (c.viralScore || 0) < 75);
    const lowScoreClips = clips.filter(c => (c.viralScore || 0) < 50);

    if (highScoreClips.length > mediumScoreClips.length + lowScoreClips.length) {
      insights.push({
        type: 'quality',
        text: 'High-performing content ratio is excellent',
        icon: 'star',
        priority: 'low'
      });
    } else if (lowScoreClips.length > highScoreClips.length + mediumScoreClips.length) {
      insights.push({
        type: 'quality',
        text: 'Focus on improving clip quality for better engagement',
        icon: 'warning',
        priority: 'high'
      });
    }

    while (insights.length < 3) {
      insights.push({
        type: 'general',
        text: 'Keep creating consistent content for better results',
        icon: 'info',
        priority: 'low'
      });
    }

    const result = insights.slice(0, 3);
    analyticsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AnalyticsService] Insights error:', error.message);
    return generateDefaultInsights();
  }
}

/**
 * Best Upload Time Analysis
 * Analyzes clips performance grouped by hour
 */
async function getBestUploadTime() {
  const cacheKey = 'best_upload_time';
  const cached = analyticsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Get clips with timestamps (using camelCase)
    const clips = await prisma.clip.findMany({
      where: { viralScore: { not: null } },
      select: {
        createdAt: true,
        viralScore: true
      },
      take: 200,
      orderBy: { createdAt: 'desc' }
    });

    if (clips.length < 5) {
      return getDefaultUploadTime();
    }

    const hourStats = {};
    clips.forEach(clip => {
      const hour = new Date(clip.createdAt).getHours();
      if (!hourStats[hour]) {
        hourStats[hour] = { total: 0, count: 0 };
      }
      hourStats[hour].total += clip.viralScore || 0;
      hourStats[hour].count += 1;
    });

    let bestHour = -1;
    let bestAvg = 0;

    Object.keys(hourStats).forEach(hour => {
      const avg = hourStats[hour].total / hourStats[hour].count;
      if (avg > bestAvg && hourStats[hour].count >= 2) {
        bestAvg = avg;
        bestHour = parseInt(hour);
      }
    });

    if (bestHour === -1) {
      return getDefaultUploadTime();
    }

    const startHour = bestHour;
    const endHour = (bestHour + 2) % 24;
    const timeRange = formatTimeRange(startHour, endHour);

    const result = {
      bestHour,
      timeRange,
      avgViralScore: Math.round(bestAvg),
      sampleSize: hourStats[bestHour].count,
      recommendation: `Upload between ${timeRange} for best engagement`
    };

    analyticsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AnalyticsService] Best upload time error:', error.message);
    return getDefaultUploadTime();
  }
}

/**
 * Get weekly performance data
 */
async function getWeeklyPerformance() {
  const cacheKey = 'weekly_performance';
  const cached = analyticsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const clips = await prisma.clip.findMany({
      where: {
        createdAt: { gte: weekAgo }
      },
      select: {
        createdAt: true,
        viralScore: true
      },
      take: 100
    });

    const dayStats = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      dayStats[dayNames[i]] = { views: 0, count: 0 };
    }

    clips.forEach(clip => {
      const dayName = dayNames[new Date(clip.createdAt).getDay()];
      dayStats[dayName].views += (clip.viralScore || 0) * 10;
      dayStats[dayName].count += 1;
    });

    const result = dayNames.map(day => ({
      day,
      views: Math.floor(dayStats[day].views),
      clips: dayStats[day].count
    }));

    analyticsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AnalyticsService] Weekly performance error:', error.message);
    return getDefaultWeeklyData();
  }
}

/**
 * Get viral score trend
 */
async function getViralScoreTrend() {
  const cacheKey = 'viral_score_trend';
  const cached = analyticsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const clips = await prisma.clip.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        viralScore: { not: null }
      },
      select: {
        createdAt: true,
        viralScore: true
      },
      take: 50,
      orderBy: { createdAt: 'asc' }
    });

    const weekStats = {};
    clips.forEach(clip => {
      const date = new Date(clip.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekStats[weekKey]) {
        weekStats[weekKey] = { total: 0, count: 0 };
      }
      weekStats[weekKey].total += clip.viralScore || 0;
      weekStats[weekKey].count += 1;
    });

    const result = Object.entries(weekStats)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round(stats.total / stats.count)
      }))
      .slice(-8);

    analyticsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AnalyticsService] Viral score trend error:', error.message);
    return getDefaultTrendData();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeRange(startHour, endHour) {
  const formatHour = (h) => {
    const hour = h % 24;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${suffix}`;
  };
  
  if (endHour <= startHour) {
    return `${formatHour(startHour)} - ${formatHour(endHour + 24)}`;
  }
  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

function getDefaultSummary() {
  return {
    totalVideos: 0,
    totalClips: 0,
    avgViralScore: 0,
    maxViralScore: 0,
    totalClipsWithScore: 0,
    platforms: { tiktok: 0, youtube: 0, instagram: 0, facebook: 0 },
    timeRange: '30d',
    generatedAt: new Date().toISOString()
  };
}

function generateDefaultInsights() {
  return [
    { type: 'general', text: 'Start creating clips to see performance insights', icon: 'info', priority: 'low' },
    { type: 'general', text: 'Upload videos to analyze platform performance', icon: 'info', priority: 'low' },
    { type: 'general', text: 'Consistent uploading leads to better analytics', icon: 'info', priority: 'low' }
  ];
}

function getDefaultUploadTime() {
  return {
    bestHour: 19,
    timeRange: '7:00 PM - 9:00 PM',
    avgViralScore: 0,
    sampleSize: 0,
    recommendation: 'Upload in the evening for best engagement'
  };
}

function getDefaultWeeklyData() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({
    day,
    views: 0,
    clips: 0
  }));
}

function getDefaultTrendData() {
  return Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (7 * (7 - i)));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: 0
    };
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getSummary,
  getBestClip,
  getInsights,
  getBestUploadTime,
  getWeeklyPerformance,
  getViralScoreTrend,
  analyticsCache,
  invalidateCache: () => analyticsCache.invalidateAll()
};

