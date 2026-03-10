/**
 * VIRAL HUNTER ROUTES
 * API endpoints for ViralHunterAI dashboard
 */

const express = require('express');
const router = express.Router();
const viralHunterService = require('../services/viralHunterService');
const viralDownloaderService = require('../services/viralDownloaderService');
const viralScheduler = require('../services/viralScheduler');
const prisma = require('../prisma/client');

// GET /api/viral-hunter/status - Get system status
router.get('/status', async (req, res) => {
  try {
    const status = viralScheduler.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[ViralHunter] Status error:', error.message);
    res.json({
      success: true,
      data: {
        enabled: true,
        error: error.message
      }
    });
  }
});

// GET /api/viral-hunter/trending - Get trending candidates
router.get('/trending', async (req, res) => {
  try {
    const trending = await viralHunterService.getTrendingData();
    res.json({
      success: true,
      data: {
        candidates: trending,
        count: trending.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ViralHunter] Trending error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/viral-hunter/discoveries - Get all discoveries from DB
router.get('/discoveries', async (req, res) => {
  try {
    const discoveries = await prisma.viralDiscovery.findMany({
      orderBy: { discoveredAt: 'desc' },
      take: 50
    });
    res.json({
      success: true,
      data: discoveries
    });
  } catch (error) {
    console.error('[ViralHunter] Discoveries error:', error.message);
    res.json({
      success: true,
      data: []
    });
  }
});

// GET /api/viral-hunter/downloads - Get all downloads from DB
router.get('/downloads', async (req, res) => {
  try {
    const downloads = await prisma.viralDownload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        discovery: true
      }
    });
    res.json({
      success: true,
      data: downloads
    });
  } catch (error) {
    console.error('[ViralHunter] Downloads error:', error.message);
    res.json({
      success: true,
      data: []
    });
  }
});

// GET /api/viral-hunter/clips - Get clips generated from viral videos
router.get('/clips', async (req, res) => {
  try {
    // Get clips from viral videos
    const viralDownloads = await prisma.viralDownload.findMany({
      where: {
        status: 'clipped'
      },
      include: {
        discovery: true
      },
      orderBy: { clippedAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: viralDownloads
    });
  } catch (error) {
    console.error('[ViralHunter] Clips error:', error.message);
    res.json({
      success: true,
      data: []
    });
  }
});

// GET /api/viral-hunter/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    let stats = {
      totalDiscovered: 0,
      totalDownloaded: 0,
      totalClipped: 0,
      activeDownloads: 0,
      queuedJobs: 0
    };
    
    try {
      const discoveries = await prisma.viralDiscovery.count();
      const downloads = await prisma.viralDownload.count();
      const clipped = await prisma.viralDownload.count({
        where: { status: 'clipped' }
      });
      
      stats.totalDiscovered = discoveries;
      stats.totalDownloaded = downloads;
      stats.totalClipped = clipped;
    } catch (e) {
      console.log('[ViralHunter] DB stats error (using fallback):', e.message);
    }
    
    // Add runtime stats
    const schedulerStatus = viralScheduler.getStatus();
    stats.activeDownloads = schedulerStatus.downloaderStatus?.active || 0;
    stats.queuedJobs = schedulerStatus.downloaderStatus?.queued || 0;
    stats.schedulerRunning = schedulerStatus.running;
    stats.lastRun = schedulerStatus.lastRun;
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[ViralHunter] Stats error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/viral-hunter/scan - Trigger manual scan
router.post('/scan', async (req, res) => {
  try {
    await viralScheduler.triggerRun();
    res.json({
      success: true,
      message: 'Scan triggered successfully'
    });
  } catch (error) {
    console.error('[ViralHunter] Scan error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/viral-hunter/start - Start scheduler
router.post('/start', async (req, res) => {
  try {
    viralScheduler.start();
    res.json({
      success: true,
      message: 'Scheduler started'
    });
  } catch (error) {
    console.error('[ViralHunter] Start error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/viral-hunter/stop - Stop scheduler
router.post('/stop', async (req, res) => {
  try {
    viralScheduler.stop();
    res.json({
      success: true,
      message: 'Scheduler stopped'
    });
  } catch (error) {
    console.error('[ViralHunter] Stop error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/viral-hunter/download - Download a specific video
router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const result = await viralDownloaderService.queueDownload(url);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[ViralHunter] Download error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/viral-hunter/downloader-status - Get downloader status
router.get('/downloader-status', async (req, res) => {
  try {
    const status = viralDownloaderService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[ViralHunter] Downloader status error:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

