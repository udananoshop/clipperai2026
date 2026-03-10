/**
 * Analytics Routes - Overlord-Level Analytics API
 * 
 * Endpoints:
 * - GET /api/analytics/summary - Get analytics summary
 * - GET /api/analytics/best-clip - Get best performing clip
 * - GET /api/analytics/insights - Get AI insights
 * - GET /api/analytics/best-upload-time - Get best upload time
 * - GET /api/analytics/weekly - Get weekly performance
 * - GET /api/analytics/trend - Get viral score trend
 * - POST /api/analytics/cache/invalidate - Invalidate cache
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// ============================================================================
// GET /api/analytics/summary
// Returns: { totalVideos, totalClips, avgViralScore, platforms, timeRange }
// ============================================================================
router.get('/summary', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const summary = await analyticsService.getSummary(range);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[Analytics] Summary error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load analytics summary' 
    });
  }
});

// ============================================================================
// GET /api/analytics/best-clip
// Returns: { id, title, platform, views, viralScore, createdAt }
// ============================================================================
router.get('/best-clip', async (req, res) => {
  try {
    const bestClip = await analyticsService.getBestClip();
    
    res.json({
      success: true,
      data: bestClip
    });
  } catch (error) {
    console.error('[Analytics] Best clip error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load best clip' 
    });
  }
});

// ============================================================================
// GET /api/analytics/insights
// Returns: Array of insight objects
// ============================================================================
router.get('/insights', async (req, res) => {
  try {
    const insights = await analyticsService.getInsights();
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('[Analytics] Insights error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load insights' 
    });
  }
});

// ============================================================================
// GET /api/analytics/best-upload-time
// Returns: { bestHour, timeRange, avgViralScore, sampleSize, recommendation }
// ============================================================================
router.get('/best-upload-time', async (req, res) => {
  try {
    const uploadTime = await analyticsService.getBestUploadTime();
    
    res.json({
      success: true,
      data: uploadTime
    });
  } catch (error) {
    console.error('[Analytics] Best upload time error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load upload time data' 
    });
  }
});

// ============================================================================
// GET /api/analytics/weekly
// Returns: Weekly performance data
// ============================================================================
router.get('/weekly', async (req, res) => {
  try {
    const weekly = await analyticsService.getWeeklyPerformance();
    
    res.json({
      success: true,
      data: weekly
    });
  } catch (error) {
    console.error('[Analytics] Weekly performance error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load weekly data' 
    });
  }
});

// ============================================================================
// GET /api/analytics/trend
// Returns: Viral score trend data
// ============================================================================
router.get('/trend', async (req, res) => {
  try {
    const trend = await analyticsService.getViralScoreTrend();
    
    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('[Analytics] Trend error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load trend data' 
    });
  }
});

// ============================================================================
// GET /api/analytics/cache/status
// Returns: Cache status
// ============================================================================
router.get('/cache/status', async (req, res) => {
  try {
    const cacheData = analyticsService.analyticsCache;
    const now = Date.now();
    
    const cacheStatus = Object.keys(cacheData.timestamps).map(key => ({
      key,
      age: now - cacheData.timestamps[key],
      isExpired: (now - cacheData.timestamps[key]) > 60000
    }));
    
    res.json({
      success: true,
      data: {
        entries: cacheStatus,
        totalKeys: cacheStatus.length
      }
    });
  } catch (error) {
    console.error('[Analytics] Cache status error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load cache status' 
    });
  }
});

// ============================================================================
// POST /api/analytics/cache/invalidate
// Invalidates all analytics cache
// ============================================================================
router.post('/cache/invalidate', async (req, res) => {
  try {
    analyticsService.invalidateCache();
    
    res.json({
      success: true,
      message: 'Analytics cache invalidated'
    });
  } catch (error) {
    console.error('[Analytics] Cache invalidate error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to invalidate cache' 
    });
  }
});

// ============================================================================
// GET /api/analytics/health
// Health check for analytics service
// ============================================================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cacheTTL: '60 seconds',
    safeMode: true,
    features: {
      bestClip: true,
      insights: true,
      bestUploadTime: true,
      weeklyPerformance: true,
      viralScoreTrend: true
    }
  });
});

module.exports = router;

