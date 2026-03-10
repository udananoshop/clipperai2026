/**
 * Crash Protection Service
 * ClipperAI2026 - Service Wrappers with Crash Protection
 * 
 * Wraps critical services with try/catch guards to prevent crashes.
 * Returns fallback data instead of crashing the application.
 * Optimized for 8GB RAM environments.
 */

const safeModeService = require('./safeModeService');

// Service names for tracking
const SERVICE_NAMES = {
  analyticsService: 'analyticsService',
  viralPredictionService: 'viralPredictionService',
  growthStrategyService: 'growthStrategyService',
  uploadService: 'uploadService'
};

// Default fallback data for each service
const FALLBACK_DATA = {
  analyticsService: {
    getSummary: {
      totalVideos: 0,
      totalClips: 0,
      avgViralScore: 0,
      maxViralScore: 0,
      totalClipsWithScore: 0,
      platforms: { tiktok: 0, youtube: 0, instagram: 0, facebook: 0 },
      timeRange: '30d',
      generatedAt: new Date().toISOString(),
      safeModeFallback: true
    },
    getBestClip: null,
    getInsights: [
      { type: 'general', text: 'Service temporarily unavailable', icon: 'info', priority: 'low' }
    ],
    getBestUploadTime: {
      bestHour: 19,
      timeRange: '7:00 PM - 9:00 PM',
      avgViralScore: 0,
      sampleSize: 0,
      recommendation: 'Service temporarily unavailable'
    },
    getWeeklyPerformance: [],
    getViralScoreTrend: []
  },
  viralPredictionService: {
    predictViralPotential: {
      viralProbability: '55%',
      recommendedUploadTime: '7:00 PM',
      recommendedFormat: 'Short Clip',
      riskLevel: 'Medium',
      riskEmoji: '🟡',
      riskReason: 'Service temporarily unavailable',
      metrics: {
        engagementRate: '50%',
        estimatedViews: '750',
        uploadFrequency: '0.5/day',
        trendingScore: '60%'
      },
      timestamp: new Date().toISOString(),
      safeModeFallback: true
    },
    predictVideo: {
      viralProbability: '55%',
      recommendedUploadTime: '7:00 PM',
      recommendedFormat: 'Short Clip',
      riskLevel: 'Medium',
      safeModeFallback: true
    },
    getStrategyRecommendation: {
      overallScore: 55,
      recommendations: [],
      timestamp: new Date().toISOString()
    },
    getViralInsights: {
      topPerforming: [],
      recentTrends: [],
      recommendations: []
    }
  },
  growthStrategyService: {
    generateGrowthStrategy: {
      bestUploadTime: '7:30 PM',
      recommendedContentType: 'Short Clip',
      viralProbability: '55%',
      growthStrategy: 'Service temporarily unavailable',
      riskLevel: 'Medium',
      metrics: {
        totalClips: 0,
        avgViralScore: 0,
        uploadsPerDay: '0.4',
        frequencyStatus: 'low',
        bestPlatform: 'YouTube'
      },
      recommendations: [],
      timestamp: new Date().toISOString(),
      safeModeFallback: true
    }
  },
  uploadService: {
    uploadToPlatform: {
      success: false,
      error: 'Service temporarily unavailable',
      safeModeFallback: true
    },
    saveVideoToDB: null,
    downloadFromUrl: null
  }
};

// Lazy load services
let services = {
  analyticsService: null,
  viralPredictionService: null,
  growthStrategyService: null,
  uploadService: null
};

const getService = (serviceName) => {
  if (!services[serviceName]) {
    try {
      services[serviceName] = require(`./${serviceName}`);
    } catch (error) {
      console.error(`[CrashProtection] Failed to load ${serviceName}:`, error.message);
      return null;
    }
  }
  return services[serviceName];
};

// ============================================================================
// ANALYTICS SERVICE WRAPPERS
// ============================================================================

const analyticsServiceSafe = {
  async getSummary(timeRange = '30d') {
    const service = getService('analyticsService');
    if (!service) {
      return FALLBACK_DATA.analyticsService.getSummary;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.analyticsService,
      () => service.getSummary(timeRange),
      FALLBACK_DATA.analyticsService.getSummary
    )(timeRange);
  },

  async getBestClip() {
    const service = getService('analyticsService');
    if (!service) {
      return FALLBACK_DATA.analyticsService.getBestClip;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.analyticsService,
      () => service.getBestClip(),
      FALLBACK_DATA.analyticsService.getBestClip
    )();
  },

  async getInsights() {
    const service = getService('analyticsService');
    if (!service) {
      return FALLBACK_DATA.analyticsService.getInsights;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.analyticsService,
      () => service.getInsights(),
      FALLBACK_DATA.analyticsService.getInsights
    )();
  },

  async getBestUploadTime() {
    const service = getService('analyticsService');
    if (!service) {
      return FALLBACK_DATA.analyticsService.getBestUploadTime;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.analyticsService,
      () => service.getBestUploadTime(),
      FALLBACK_DATA.analyticsService.getBestUploadTime
    )();
  },

  async getWeeklyPerformance() {
    const service = getService('analyticsService');
    if (!service) {
      return FALLBACK_DATA.analyticsService.getWeeklyPerformance;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.analyticsService,
      () => service.getWeeklyPerformance(),
      FALLBACK_DATA.analyticsService.getWeeklyPerformance
    )();
  },

  async getViralScoreTrend() {
    const service = getService('analyticsService');
    if (!service) {
      return FALLBACK_DATA.analyticsService.getViralScoreTrend;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.analyticsService,
      () => service.getViralScoreTrend(),
      FALLBACK_DATA.analyticsService.getViralScoreTrend
    )();
  }
};

// ============================================================================
// VIRAL PREDICTION SERVICE WRAPPERS
// ============================================================================

const viralPredictionServiceSafe = {
  async predictViralPotential(videoId = null) {
    const service = getService('viralPredictionService');
    if (!service) {
      return FALLBACK_DATA.viralPredictionService.predictViralPotential;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.viralPredictionService,
      () => service.predictViralPotential(videoId),
      FALLBACK_DATA.viralPredictionService.predictViralPotential
    )(videoId);
  },

  async predictVideo(videoId) {
    const service = getService('viralPredictionService');
    if (!service) {
      return FALLBACK_DATA.viralPredictionService.predictVideo;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.viralPredictionService,
      () => service.predictVideo(videoId),
      FALLBACK_DATA.viralPredictionService.predictVideo
    )(videoId);
  },

  async getStrategyRecommendation(language = 'english') {
    const service = getService('viralPredictionService');
    if (!service) {
      return FALLBACK_DATA.viralPredictionService.getStrategyRecommendation;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.viralPredictionService,
      () => service.getStrategyRecommendation(language),
      FALLBACK_DATA.viralPredictionService.getStrategyRecommendation
    )(language);
  },

  async getViralInsights(language = 'english') {
    const service = getService('viralPredictionService');
    if (!service) {
      return FALLBACK_DATA.viralPredictionService.getViralInsights;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.viralPredictionService,
      () => service.getViralInsights(language),
      FALLBACK_DATA.viralPredictionService.getViralInsights
    )(language);
  }
};

// ============================================================================
// GROWTH STRATEGY SERVICE WRAPPERS
// ============================================================================

const growthStrategyServiceSafe = {
  async generateGrowthStrategy(language = 'english') {
    const service = getService('growthStrategyService');
    if (!service) {
      return FALLBACK_DATA.growthStrategyService.generateGrowthStrategy;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.growthStrategyService,
      () => service.generateGrowthStrategy(language),
      FALLBACK_DATA.growthStrategyService.generateGrowthStrategy
    )(language);
  }
};

// ============================================================================
// UPLOAD SERVICE WRAPPERS
// ============================================================================

const uploadServiceSafe = {
  async uploadToPlatform(platform, videoPath, metadata) {
    const service = getService('uploadService');
    if (!service) {
      return FALLBACK_DATA.uploadService.uploadToPlatform;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.uploadService,
      () => service.uploadToPlatform(platform, videoPath, metadata),
      FALLBACK_DATA.uploadService.uploadToPlatform
    )(platform, videoPath, metadata);
  },

  async saveVideoToDB(data) {
    const service = getService('uploadService');
    if (!service) {
      return FALLBACK_DATA.uploadService.saveVideoToDB;
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.uploadService,
      () => service.saveVideoToDB(data),
      FALLBACK_DATA.uploadService.saveVideoToDB
    )(data);
  },

  async downloadFromUrl(url) {
    const service = getService('uploadService');
    if (!service) {
      return { success: false, error: 'Service unavailable', safeModeFallback: true };
    }
    return safeModeService.withCrashProtection(
      SERVICE_NAMES.uploadService,
      () => service.downloadFromUrl(url),
      { success: false, error: 'Service unavailable', safeModeFallback: true }
    )(url);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  analyticsService: analyticsServiceSafe,
  viralPredictionService: viralPredictionServiceSafe,
  growthStrategyService: growthStrategyServiceSafe,
  uploadService: uploadServiceSafe,
  
  // Export safe mode service functions
  ...safeModeService,
  
  // Get protected version of any service function
  protect: (serviceName, fn, fallback) => {
    return safeModeService.withCrashProtection(serviceName, fn, fallback);
  }
};

