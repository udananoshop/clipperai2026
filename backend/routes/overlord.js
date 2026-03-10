/**
 * Overlord AI Core Routes
 * ClipperAI2026 - Overlord AI Controller Endpoints
 * 
 * Routes for:
 * - Command processing (text)
 * - Voice command processing
 * - Status checks
 * - Quick actions
 * 
 * Original routes (storage, clips, reindex) are preserved below
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Lazy-load Overlord services
const getOverlordCore = () => {
  try {
    return require('../services/overlordCoreService');
  } catch (e) {
    console.error('[Overlord] Core service not available:', e.message);
    return null;
  }
};

// ============================================================================
// NEW OVERLORD AI ENDPOINTS
// ============================================================================

/**
 * POST /api/overlord/command
 * Process a text command
 */
router.post('/command', async (req, res) => {
  try {
    const { command, language = 'en', videoId } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    const overlord = getOverlordCore();
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.processCommand(command, {
      language,
      videoId,
      isVoice: false
    });

    res.json(result);
  } catch (err) {
    console.error('[Overlord] Command error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/voice
 * Process a voice command (transcribed text from client)
 */
router.post('/voice', async (req, res) => {
  try {
    const { text, language = 'en', confidence = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Transcribed text is required'
      });
    }

    const overlord = getOverlordCore();
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.processCommand(
      { text, language, confidence },
      { language, isVoice: true }
    );

    res.json(result);
  } catch (err) {
    console.error('[Overlord] Voice command error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/status
 * Get Overlord AI status
 */
router.get('/status', (req, res) => {
  try {
    const overlord = getOverlordCore();
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const status = overlord.getStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    console.error('[Overlord] Status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/history
 * Get command history
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const history = overlord.getHistory(parseInt(limit));
    res.json({ success: true, history });
  } catch (err) {
    console.error('[Overlord] History error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/clear-history
 * Clear command history
 */
router.post('/clear-history', (req, res) => {
  try {
    const overlord = getOverlordCore();
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = overlord.clearHistory();
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Clear history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/quick/ideas
 * Quick action: Generate content ideas
 */
router.get('/quick/ideas', async (req, res) => {
  try {
    const { count = 10, language = 'en' } = req.query;
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.quickGenerateIdeas(
      parseInt(count),
      language
    );
    
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Quick ideas error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/quick/caption
 * Quick action: Generate caption
 */
router.get('/quick/caption', async (req, res) => {
  try {
    const { style = 'viral', language = 'en' } = req.query;
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.quickGenerateCaption(style, language);
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Quick caption error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/quick/hashtags
 * Quick action: Generate hashtags
 */
router.get('/quick/hashtags', async (req, res) => {
  try {
    const { count = 15, language = 'en' } = req.query;
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.quickGenerateHashtags(
      parseInt(count),
      language
    );
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Quick hashtags error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/quick/analytics
 * Quick action: Get analytics
 */
router.get('/quick/analytics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.quickGetAnalytics(timeframe);
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Quick analytics error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/quick/viral
 * Quick action: Get viral prediction
 */
router.get('/quick/viral', async (req, res) => {
  try {
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.quickGetViralPrediction();
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Quick viral error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/quick/strategy
 * Quick action: Get growth strategy
 */
router.get('/quick/strategy', async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const overlord = getOverlordCore();
    
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = await overlord.quickGetGrowthStrategy(language);
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Quick strategy error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/device-mode
 * Set device mode for adaptive processing
 */
router.post('/device-mode', (req, res) => {
  try {
    const { mode } = req.body;
    const validModes = ['high-performance', 'balanced', 'low-resource', 'mobile-lite'];
    
    if (!mode || !validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid mode. Valid: ${validModes.join(', ')}`
      });
    }

    const overlord = getOverlordCore();
    if (!overlord) {
      return res.status(500).json({
        success: false,
        error: 'Overlord service not available'
      });
    }

    const result = overlord.adaptToDevice(mode);
    res.json(result);
  } catch (err) {
    console.error('[Overlord] Device mode error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// OVERLORD AI CORE - CENTRAL INTELLIGENCE SYSTEM
// ============================================================================

/**
 * GET /api/overlord/core/status
 * Get OVERLORD AI CORE comprehensive status - System Dashboard
 */
router.get('/core/status', (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const status = overlordCore.getStatus();
    
    res.json({ 
      success: true, 
      data: status 
    });
  } catch (err) {
    console.error('[OverLord] Core status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/core/health
 * Get quick system health check
 */
router.get('/core/health', (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const health = overlordCore.getSystemHealth();
    
    res.json({ 
      success: true, 
      data: health 
    });
  } catch (err) {
    console.error('[OverLord] Core health error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/core/safety
 * Get safety guard status
 */
router.get('/core/safety', (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const safety = overlordCore.checkSafetyGuard();
    
    res.json({ 
      success: true, 
      data: safety 
    });
  } catch (err) {
    console.error('[OverLord] Core safety error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/core/queues
 * Get queue status for download, clip, and publish queues
 */
router.get('/core/queues', (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const queues = overlordCore.getQueueStatus();
    
    res.json({ 
      success: true, 
      data: queues 
    });
  } catch (err) {
    console.error('[OverLord] Core queues error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/core/viral-hunter/trigger
 * Manually trigger viral hunter scan
 */
router.post('/core/viral-hunter/trigger', async (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const result = await overlordCore.triggerViralHunter();
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (err) {
    console.error('[OverLord] Core viral hunter trigger error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/core/viral-hunter/toggle
 * Enable/disable viral hunter
 */
router.post('/core/viral-hunter/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const overlordCore = require('../core/overlordCore');
    const result = overlordCore.setViralHunterEnabled(enabled);
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (err) {
    console.error('[OverLord] Core viral hunter toggle error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/core/emergency-stop
 * Emergency stop all operations
 */
router.post('/core/emergency-stop', (req, res) => {
  try {
    const { reason } = req.body;
    const overlordCore = require('../core/overlordCore');
    const result = overlordCore.emergencyStop(reason || 'Manual emergency stop');
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (err) {
    console.error('[OverLord] Core emergency stop error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/core/resume
 * Resume from emergency stop
 */
router.post('/core/resume', (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const result = overlordCore.resume();
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (err) {
    console.error('[OverLord] Core resume error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/core/reset-daily
 * Reset daily statistics
 */
router.post('/core/reset-daily', (req, res) => {
  try {
    const overlordCore = require('../core/overlordCore');
    const result = overlordCore.resetDailyStats();
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (err) {
    console.error('[OverLord] Core reset daily error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ORIGINAL OVERLORD ROUTES (Preserved)
// ============================================================================

/**
 * POST /api/overlord/reindex - Trigger hybrid reindex
 */
router.post('/reindex', async (req, res) => {
  try {
    const hybridReindex = require('../services/hybridReindexService');
    const result = await hybridReindex.reindex();
    
    res.json({
      success: true,
      message: 'Reindex complete',
      ...result
    });
  } catch (err) {
    console.error('[Overlord] Reindex error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/stats - Get real-time stats from database
 */
router.get('/stats', async (req, res) => {
  try {
    const statsAggregator = require('../services/statsAggregator');
    const stats = await statsAggregator.generateStats();
    
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[OverLord] Stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/platform-counts - Get platform counts from database
 */
router.get('/platform-counts', async (req, res) => {
  try {
    const hybridReindex = require('../services/hybridReindexService');
    const counts = await hybridReindex.getPlatformCountsFromDB();
    
    res.json({ success: true, data: counts });
  } catch (err) {
    console.error('[OverLord] Platform counts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/storage/sync - Sync database with physical storage
 */
router.post('/storage/sync', async (req, res) => {
  try {
    const storageSync = require('../services/storageSyncService');
    const result = await storageSync.syncDatabase();
    
    res.json({
      success: true,
      message: 'Storage sync complete',
      ...result
    });
  } catch (err) {
    console.error('[OverLord] Storage sync error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/storage/stats - Get physical storage stats
 */
router.get('/storage/stats', async (req, res) => {
  try {
    const storageSync = require('../services/storageSyncService');
    const stats = await storageSync.getStorageStats();
    
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[OverLord] Storage stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/storage/full-sync - Full sync and rebuild
 */
router.post('/storage/full-sync', async (req, res) => {
  try {
    const storageSync = require('../services/storageSyncService');
    const result = await storageSync.fullSync();
    
    res.json({
      success: true,
      message: 'Full sync complete',
      ...result
    });
  } catch (err) {
    console.error('[OverLord] Full sync error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/cache/clear - Clear cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const storageSync = require('../services/storageSyncService');
    const result = storageSync.clearCache();
    
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[OverLord] Cache clear error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/storage/clean-ghosts - Permanently remove archived DB entries
 */
router.post('/storage/clean-ghosts', async (req, res) => {
  try {
    const storageSync = require('../services/storageSyncService');
    const result = await storageSync.cleanGhostRecords();
    
    res.json({
      success: true,
      message: 'Ghost records cleaned',
      ...result
    });
  } catch (err) {
    console.error('[OverLord] Clean ghosts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/clips/generate - Generate a new clip
 */
router.post('/clips/generate', async (req, res) => {
  try {
    const rawVideoId = req.body.videoId;
    const { platform = 'youtube', title } = req.body;
    
    // ✅ Validate videoId exists
    if (!rawVideoId) {
      return res.status(400).json({ 
        success: false, 
        error: "videoId is required" 
      });
    }
    
    // ✅ Ensure videoId is a valid number (parseInt + isNaN check)
    const videoId = parseInt(rawVideoId, 10);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ 
        success: false, 
        error: "videoId must be a number" 
      });
    }
    
    const prisma = require('../prisma/client');
    
    // Get source video
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    // ✅ Return 404 if video not found
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        error: "Video not found" 
      });
    }
    
    // Determine platform
    const targetPlatform = platform.toLowerCase();
    
    // Create output directory for platform
    const outputDir = path.join(__dirname, '..', 'output', targetPlatform);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate clip filename
    const clipId = Date.now();
    const clipFilename = `clip_${clipId}_${targetPlatform}.mp4`;
    const clipPath = path.join(outputDir, clipFilename);
    
    // In a real implementation, this would process the video
    // For now, we'll create a placeholder or copy the source
    const sourcePath = video.path || path.join(__dirname, '..', 'uploads', video.filename);
    
    if (fs.existsSync(sourcePath)) {
      // Copy source to clip (placeholder for actual processing)
      fs.copyFileSync(sourcePath, clipPath);
    }
    
    // Generate AI score (placeholder)
    const viralScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const confidence = viralScore / 100;
    
    // Construct the proper filePath with platform prefix
    const relativePath = path.relative(path.join(__dirname, '..'), clipPath);
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const filePath = '/' + normalizedPath;
    
    // Save clip to database
    const clip = await prisma.clip.create({
      data: {
        title: title || `Clip ${clipId} - ${targetPlatform}`,
        videoId: video.id,
        platform: targetPlatform,
        viralScore,
        confidence,
        filename: clipFilename,
        filePath: filePath  // Save the full relative path for frontend access
      }
    });
    
    // Update video's viral score if higher
    if (!video.viralScore || viralScore > video.viralScore) {
      await prisma.video.update({
        where: { id: video.id },
        data: { viralScore, platform: targetPlatform }
      });
    }
    
    // Recalculate stats
    const statsAggregator = require('../services/statsAggregator');
    await statsAggregator.saveStats();
    
    console.log(`[OverLord] Generated clip ${clip.id} for video ${videoId} on ${targetPlatform}`);
    
    res.json({
      success: true,
      clip: {
        id: clip.id,
        title: clip.title,
        platform: clip.platform,
        viralScore: clip.viralScore,
        confidence: clip.confidence,
        url: `http://localhost:3001/output/${targetPlatform}/${clipFilename}`
      }
    });
  } catch (err) {
    console.error('[OverLord] Generate clip error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// OVERLORD AI DIRECTOR - SYSTEM MONITOR, REPAIR, ERROR ANALYSIS, PIPELINE
// ============================================================================

/**
 * GET /api/overlord/system/status
 * Get comprehensive system status (memory, CPU, FFmpeg, storage)
 */
router.get('/system/status', async (req, res) => {
  try {
    const systemMonitor = require('../services/systemMonitor');
    const status = systemMonitor.getServerHealth();
    
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] System status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/system/quick
 * Get quick system status
 */
router.get('/system/quick', async (req, res) => {
  try {
    const systemMonitor = require('../services/systemMonitor');
    const status = systemMonitor.getQuickStatus();
    
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] System quick error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/system/suggestions
 * Get system repair suggestions
 */
router.get('/system/suggestions', async (req, res) => {
  try {
    const systemMonitor = require('../services/systemMonitor');
    const suggestions = systemMonitor.getSuggestions();
    
    res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error('[OverLord] System suggestions error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/scan
 * Scan uploads directory
 */
router.post('/system/repair/scan', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.scanUploads();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Repair scan error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/rebuild
 * Rebuild video index
 */
router.post('/system/repair/rebuild', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.rebuildVideoIndex();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Repair rebuild error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/clean
 * Clean temp files
 */
router.post('/system/repair/clean', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.cleanTempFiles();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Repair clean error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/ffmpeg
 * Restart FFmpeg jobs
 */
router.post('/system/repair/ffmpeg', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.restartFFmpegJobs();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Repair FFmpeg error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/refresh-cache
 * Refresh cache
 */
router.post('/system/repair/refresh-cache', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.refreshCache();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Repair cache error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/full
 * Run full system repair
 */
router.post('/system/repair/full', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.runFullRepair();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Full repair error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/system/repair/quick
 * Run quick repair
 */
router.post('/system/repair/quick', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const result = await systemRepair.quickRepair();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Quick repair error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/system/repair/suggestions
 * Get repair suggestions
 */
router.get('/system/repair/suggestions', async (req, res) => {
  try {
    const systemRepair = require('../services/systemRepair');
    const suggestions = await systemRepair.getRepairSuggestions();
    
    res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error('[OverLord] Repair suggestions error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/system/errors
 * Get error analysis summary
 */
router.get('/system/errors', async (req, res) => {
  try {
    const errorAnalyzer = require('../services/errorAnalyzer');
    const summary = errorAnalyzer.getDiagnosticSummary();
    
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[OverLord] Error analysis error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/system/errors/count
 * Get error count
 */
router.get('/system/errors/count', async (req, res) => {
  try {
    const errorAnalyzer = require('../services/errorAnalyzer');
    const count = errorAnalyzer.getErrorCount();
    
    res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('[OverLord] Error count error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/system/errors/recent
 * Get recent errors
 */
router.get('/system/errors/recent', async (req, res) => {
  try {
    const { count = 20 } = req.query;
    const errorAnalyzer = require('../services/errorAnalyzer');
    const errors = errorAnalyzer.getRecentErrors(parseInt(count));
    
    res.json({ success: true, data: { errors } });
  } catch (err) {
    console.error('[OverLord] Recent errors error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/pipeline/status
 * Get pipeline status
 */
router.get('/pipeline/status', async (req, res) => {
  try {
    const taskPipeline = require('../services/taskPipeline');
    const status = taskPipeline.getPipelineStatus();
    
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] Pipeline status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/pipeline/templates
 * Get pipeline templates
 */
router.get('/pipeline/templates', async (req, res) => {
  try {
    const taskPipeline = require('../services/taskPipeline');
    const templates = taskPipeline.getPipelineTemplates();
    
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('[OverLord] Pipeline templates error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/pipeline/run
 * Run a pipeline
 */
router.post('/pipeline/run', async (req, res) => {
  try {
    const { taskType, params = {} } = req.body;
    const taskPipeline = require('../services/taskPipeline');
    
    if (!taskType) {
      return res.status(400).json({ 
        success: false, 
        error: "taskType is required" 
      });
    }
    
    const result = await taskPipeline.runSimplePipeline(taskType, params);
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Pipeline run error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/pipeline/cancel
 * Cancel active pipeline
 */
router.post('/pipeline/cancel', async (req, res) => {
  try {
    const taskPipeline = require('../services/taskPipeline');
    const result = taskPipeline.cancelPipeline();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Pipeline cancel error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * GET /api/overlord/pipeline/history
 * Get pipeline history
 */
router.get('/pipeline/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const taskPipeline = require('../services/taskPipeline');
    const history = taskPipeline.getPipelineHistory(parseInt(limit));

    res.json({ success: true, data: { history } });
  } catch (err) {
    console.error('[OverLord] Pipeline history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GOD MODE ENDPOINTS - AI God Mode Service Integration
// ============================================================================

/**
 * POST /api/overlord/god-mode/scan
 * Run comprehensive system scan
 */
router.post('/god-mode/scan', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.systemScan();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode scan error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/god-mode/fix
 * Run automatic error fixes
 */
router.post('/god-mode/fix', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.autoFixErrors();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode fix error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/god-mode/analyze-logs
 * Analyze server logs
 */
router.post('/god-mode/analyze-logs', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.analyzeLogs();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode analyze logs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/god-mode/optimize-memory
 * Optimize server memory
 */
router.post('/god-mode/optimize-memory', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.optimizeMemory();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode optimize memory error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/god-mode/clean-temp
 * Clean temporary files
 */
router.post('/god-mode/clean-temp', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.cleanTempFiles();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode clean temp error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/god-mode/scan-uploads
 * Scan uploads directory
 */
router.post('/god-mode/scan-uploads', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.scanUploads();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode scan uploads error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/god-mode/rebuild-index
 * Rebuild video index
 */
router.post('/god-mode/rebuild-index', async (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const result = await aiGodMode.rebuildVideoIndex();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] God mode rebuild index error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/god-mode/status
 * Get God Mode status
 */
router.get('/god-mode/status', (req, res) => {
  try {
    const aiGodMode = require('../services/aiGodMode');
    const status = aiGodMode.getStatus();
    const logs = aiGodMode.getOperationsLog(20);

    res.json({ success: true, data: { status, logs } });
  } catch (err) {
    console.error('[OverLord] God mode status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// VIRAL CLIP FACTORY ENDPOINTS
// ============================================================================

/**
 * POST /api/overlord/viral-factory/run
 * Run the complete viral clip factory pipeline
 */
router.post('/viral-factory/run', async (req, res) => {
  try {
    const { videoUrl, videoPath, videoId, clipCount = 15, platform = 'tiktok' } = req.body;

    if (!videoUrl && !videoPath && !videoId) {
      return res.status(400).json({
        success: false,
        error: 'videoUrl, videoPath, or videoId is required'
      });
    }

    const viralClipFactory = require('../services/viralClipFactory');
    const result = await viralClipFactory.runPipeline(
      { videoUrl, videoPath, videoId },
      { clipCount, platform }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Viral factory run error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/viral-factory/generate-clips
 * Generate viral clips (simpler interface)
 */
router.post('/viral-factory/generate-clips', async (req, res) => {
  try {
    const { videoId, count = 15, platform = 'tiktok', url, path } = req.body;

    const viralClipFactory = require('../services/viralClipFactory');
    const result = await viralClipFactory.generateViralClips(
      { videoId, videoUrl: url, videoPath: path },
      { count, platform }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Generate clips error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/viral-factory/status
 * Get viral clip factory status
 */
router.get('/viral-factory/status', (req, res) => {
  try {
    const viralClipFactory = require('../services/viralClipFactory');
    const status = viralClipFactory.getStatus();

    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] Viral factory status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// SCENE ANALYZER ENDPOINTS
// ============================================================================

/**
 * POST /api/overlord/scene-analyzer/analyze
 * Analyze video scenes
 */
router.post('/scene-analyzer/analyze', async (req, res) => {
  try {
    const { videoPath, videoId, clipCount = 15 } = req.body;

    let actualPath = videoPath;

    // If videoId is provided, get the path from database
    if (!actualPath && videoId) {
      const prisma = require('../prisma/client');
      const video = await prisma.video.findUnique({
        where: { id: parseInt(videoId) }
      });

      if (video) {
        actualPath = video.path || path.join(__dirname, '..', 'uploads', video.filename);
      }
    }

    if (!actualPath) {
      return res.status(400).json({
        success: false,
        error: 'videoPath or videoId is required'
      });
    }

    const sceneAnalyzer = require('../services/sceneAnalyzer');
    const result = await sceneAnalyzer.analyzeVideo(actualPath, { clipCount });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Scene analyzer error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/scene-analyzer/highlights
 * Detect video highlights
 */
router.post('/scene-analyzer/highlights', async (req, res) => {
  try {
    const { videoPath, videoId } = req.body;

    let actualPath = videoPath;

    if (!actualPath && videoId) {
      const prisma = require('../prisma/client');
      const video = await prisma.video.findUnique({
        where: { id: parseInt(videoId) }
      });

      if (video) {
        actualPath = video.path || path.join(__dirname, '..', 'uploads', video.filename);
      }
    }

    if (!actualPath) {
      return res.status(400).json({
        success: false,
        error: 'videoPath or videoId is required'
      });
    }

    const sceneAnalyzer = require('../services/sceneAnalyzer');
    const result = await sceneAnalyzer.detectHighlights(actualPath);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Scene highlights error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/scene-analyzer/config
 * Get scene analyzer configuration
 */
router.get('/scene-analyzer/config', (req, res) => {
  try {
    const sceneAnalyzer = require('../services/sceneAnalyzer');
    const config = sceneAnalyzer.config;

    res.json({ success: true, data: config });
  } catch (err) {
    console.error('[OverLord] Scene analyzer config error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// MEMORY OPTIMIZER ENDPOINTS
// ============================================================================

/**
 * GET /api/overlord/memory/status
 * Get memory status
 */
router.get('/memory/status', (req, res) => {
  try {
    const memoryOptimizer = require('../services/memoryOptimizer');
    const status = memoryOptimizer.getMemoryStatus();

    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] Memory status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/memory/optimize
 * Run memory optimization
 */
router.post('/memory/optimize', async (req, res) => {
  try {
    const memoryOptimizer = require('../services/memoryOptimizer');
    const result = await memoryOptimizer.optimizeMemory();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Memory optimize error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/memory/start-monitoring
 * Start memory monitoring
 */
router.post('/memory/start-monitoring', (req, res) => {
  try {
    const memoryOptimizer = require('../services/memoryOptimizer');
    const result = memoryOptimizer.startMonitoring();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Memory start monitoring error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/memory/stop-monitoring
 * Stop memory monitoring
 */
router.post('/memory/stop-monitoring', (req, res) => {
  try {
    const memoryOptimizer = require('../services/memoryOptimizer');
    const result = memoryOptimizer.stopMonitoring();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Memory stop monitoring error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/memory/usage
 * Get current memory usage
 */
router.get('/memory/usage', (req, res) => {
  try {
    const memoryOptimizer = require('../services/memoryOptimizer');
    const usage = memoryOptimizer.getMemoryUsage();
    const processMem = memoryOptimizer.getProcessMemory();

    res.json({ success: true, data: { system: usage, process: processMem } });
  } catch (err) {
    console.error('[OverLord] Memory usage error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/memory/check
 * Check and auto-optimize if needed
 */
router.post('/memory/check', async (req, res) => {
  try {
    const memoryOptimizer = require('../services/memoryOptimizer');
    const result = await memoryOptimizer.checkAndOptimize();

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Memory check error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// VIRAL CAPTION ENDPOINTS
// ============================================================================

/**
 * GET /api/overlord/caption/generate
 * Generate viral caption
 */
router.get('/caption/generate', (req, res) => {
  try {
    const { platform = 'tiktok', includeEmojis = true, includeCTA = true } = req.query;

    const viralCaptionService = require('../services/viralCaptionService');
    let result;

    switch (platform) {
      case 'youtube':
      case 'shorts':
        result = viralCaptionService.generateYouTubeShortsCaption({
          includeEmojis: includeEmojis === 'true',
          includeCTA: includeCTA === 'true'
        });
        break;
      case 'instagram':
        result = viralCaptionService.generateInstagramCaption({
          includeEmojis: includeEmojis === 'true',
          includeCTA: includeCTA === 'true'
        });
        break;
      default:
        result = viralCaptionService.generateTikTokCaption({
          includeEmojis: includeEmojis === 'true',
          includeCTA: includeCTA === 'true',
          fyp: true
        });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Caption generate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/caption/multi-platform
 * Generate captions for all platforms
 */
router.get('/caption/multi-platform', (req, res) => {
  try {
    const { includeEmojis = true } = req.query;

    const viralCaptionService = require('../services/viralCaptionService');
    const result = viralCaptionService.generateMultiPlatformCaptions({
      includeEmojis: includeEmojis === 'true'
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Caption multi-platform error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// HASHTAG GENERATOR ENDPOINTS
// ============================================================================

/**
 * GET /api/overlord/hashtags/generate
 * Generate hashtags
 */
router.get('/hashtags/generate', (req, res) => {
  try {
    const { topic = 'viral', platform = 'tiktok', count = 15 } = req.query;

    const hashtagGenerator = require('../services/hashtagGenerator');
    const result = hashtagGenerator.generateCustomHashtags(topic, platform, parseInt(count));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Hashtags generate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/hashtags/all-platforms
 * Generate hashtags for all platforms
 */
router.get('/hashtags/all-platforms', (req, res) => {
  try {
    const { topic = 'viral', count = 15 } = req.query;

    const hashtagGenerator = require('../services/hashtagGenerator');
    const result = hashtagGenerator.generateAllPlatformHashtags(topic, parseInt(count));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Hashtags all platforms error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// AUTONOMOUS CONTENT LOOP ENDPOINTS
// ============================================================================

/**
 * GET /api/overlord/autonomous/status
 * Get autonomous content loop status
 */
router.get('/autonomous/status', (req, res) => {
  try {
    const autonomousLoop = require('../core/autonomousContentLoop');
    const status = autonomousLoop.getStatus();
    
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] Autonomous status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/autonomous/start
 * Start autonomous content loop
 */
router.post('/autonomous/start', async (req, res) => {
  try {
    const autonomousLoop = require('../core/autonomousContentLoop');
    const result = await autonomousLoop.startLoop();
    
    res.json(result);
  } catch (err) {
    console.error('[OverLord] Autonomous start error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/autonomous/stop
 * Stop autonomous content loop
 */
router.post('/autonomous/stop', async (req, res) => {
  try {
    const autonomousLoop = require('../core/autonomousContentLoop');
    const result = await autonomousLoop.stopLoop();
    
    res.json(result);
  } catch (err) {
    console.error('[OverLord] Autonomous stop error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/autonomous/trigger
 * Manually trigger an autonomous cycle
 */
router.post('/autonomous/trigger', async (req, res) => {
  try {
    const autonomousLoop = require('../core/autonomousContentLoop');
    const result = await autonomousLoop.triggerCycle();
    
    res.json(result);
  } catch (err) {
    console.error('[OverLord] Autonomous trigger error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/autonomous/report
 * Get comprehensive system report
 */
router.get('/autonomous/report', (req, res) => {
  try {
    const autonomousLoop = require('../core/autonomousContentLoop');
    const report = autonomousLoop.getSystemReport();
    
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[OverLord] Autonomous report error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/autonomous/history
 * Get cycle history
 */
router.get('/autonomous/history', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const autonomousLoop = require('../core/autonomousContentLoop');
    const history = autonomousLoop.getCycleHistory(parseInt(limit));
    
    res.json({ success: true, data: { history } });
  } catch (err) {
    console.error('[OverLord] Autonomous history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/autonomous/clear-history
 * Clear cycle history
 */
router.post('/autonomous/clear-history', (req, res) => {
  try {
    const autonomousLoop = require('../core/autonomousContentLoop');
    const result = autonomousLoop.clearHistory();
    
    res.json(result);
  } catch (err) {
    console.error('[OverLord] Autonomous clear history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// SYSTEM DIAGNOSTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/overlord/diagnostics/status
 * Get diagnostic system status
 */
router.get('/diagnostics/status', (req, res) => {
  try {
    const diagnostics = require('../core/systemDiagnostics');
    const status = diagnostics.getStatus();
    
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[OverLord] Diagnostics status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/diagnostics/health
 * Get system health report
 */
router.get('/diagnostics/health', (req, res) => {
  try {
    const diagnostics = require('../core/systemDiagnostics');
    const report = diagnostics.getHealthReport();
    
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[OverLord] Diagnostics health error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/diagnostics/run
 * Run diagnostics manually
 */
router.post('/diagnostics/run', async (req, res) => {
  try {
    const diagnostics = require('../core/systemDiagnostics');
    const result = await diagnostics.runDiagnostics();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Diagnostics run error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/diagnostics/repair
 * Run automatic repair
 */
router.post('/diagnostics/repair', async (req, res) => {
  try {
    const diagnostics = require('../core/systemDiagnostics');
    const result = await diagnostics.handleRepairSystem();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Diagnostics repair error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/overlord/diagnostics/history
 * Get diagnostic history
 */
router.get('/diagnostics/history', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const diagnostics = require('../core/systemDiagnostics');
    const history = diagnostics.getHistory(parseInt(limit));
    
    res.json({ success: true, data: { history } });
  } catch (err) {
    console.error('[OverLord] Diagnostics history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/diagnostics/start
 * Start automatic diagnostics
 */
router.post('/diagnostics/start', (req, res) => {
  try {
    const diagnostics = require('../core/systemDiagnostics');
    const result = diagnostics.startDiagnostics();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Diagnostics start error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/overlord/diagnostics/stop
 * Stop automatic diagnostics
 */
router.post('/diagnostics/stop', (req, res) => {
  try {
    const diagnostics = require('../core/systemDiagnostics');
    const result = diagnostics.stopDiagnostics();
    
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OverLord] Diagnostics stop error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
