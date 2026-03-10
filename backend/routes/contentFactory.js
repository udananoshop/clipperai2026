/**
 * CONTENT FACTORY ROUTES
 * API routes for automated content generation and scheduling
 */

const express = require('express');
const router = express.Router();

// Import AI modules
const titleGenerator = require('../ai/titleGenerator');
const captionGenerator = require('../ai/captionGenerator');
const hashtagEngine = require('../ai/hashtagEngine');
const postScheduler = require('../services/postScheduler');
const contentQueue = require('../services/contentQueue');
const viralScoreEngine = require('../ai/viralScoreEngine');

// ===================================================================
// TITLE GENERATOR ROUTES
// ===================================================================

/**
 * POST /api/content-factory/titles
 * Generate viral titles for a clip
 */
router.post('/titles', async (req, res) => {
  try {
    const { metadata = {}, viralScore = 50, platform = 'youtube' } = req.body;
    
    // Generate 5 viral titles
    const titles = titleGenerator.generateTitles({
      metadata,
      viralScore,
      platform
    });
    
    res.json({
      success: true,
      platform,
      viralScore,
      titles,
      count: titles.length
    });
  } catch (error) {
    console.error('Title generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/content-factory/titles/custom
 * Generate titles with specific category
 */
router.post('/titles/custom', async (req, res) => {
  try {
    const { metadata = {}, viralScore = 50, platform = 'youtube', category = 'all' } = req.body;
    
    const titles = titleGenerator.generateTitlesWithCategory({
      metadata,
      viralScore,
      platform,
      category
    });
    
    res.json({
      success: true,
      platform,
      category,
      titles,
      count: titles.length
    });
  } catch (error) {
    console.error('Custom title generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// CAPTION GENERATOR ROUTES
// ===================================================================

/**
 * POST /api/content-factory/captions
 * Generate captions for a clip
 */
router.post('/captions', async (req, res) => {
  try {
    const { 
      platform = 'tiktok', 
      viralScore = 50,
      customTopic = null,
      includeHook = true,
      includeEmotion = true,
      includeCTA = true
    } = req.body;
    
    const caption = captionGenerator.generateCaption({
      platform,
      viralScore,
      customTopic,
      includeHook,
      includeEmotion,
      includeCTA
    });
    
    res.json({
      success: true,
      caption
    });
  } catch (error) {
    console.error('Caption generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/content-factory/captions/multi
 * Generate captions for all platforms
 */
router.post('/captions/multi', async (req, res) => {
  try {
    const { viralScore = 50, customTopic = null } = req.body;
    
    const captions = captionGenerator.generateMultiPlatformCaptions({
      viralScore,
      customTopic
    });
    
    res.json({
      success: true,
      captions,
      platforms: Object.keys(captions)
    });
  } catch (error) {
    console.error('Multi-platform caption generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// HASHTAG ENGINE ROUTES
// ===================================================================

/**
 * POST /api/content-factory/hashtags
 * Generate hashtags for a clip
 */
router.post('/hashtags', async (req, res) => {
  try {
    const { platform = 'tiktok', metadata = {}, viralScore = 50 } = req.body;
    
    const hashtags = hashtagEngine.generateHashtags({
      platform,
      metadata,
      viralScore
    });
    
    res.json({
      success: true,
      hashtags
    });
  } catch (error) {
    console.error('Hashtag generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/content-factory/hashtags/multi
 * Generate hashtags for all platforms
 */
router.post('/hashtags/multi', async (req, res) => {
  try {
    const { metadata = {}, viralScore = 50 } = req.body;
    
    const hashtags = hashtagEngine.generateMultiPlatformHashtags({
      metadata,
      viralScore
    });
    
    res.json({
      success: true,
      hashtags,
      platforms: Object.keys(hashtags)
    });
  } catch (error) {
    console.error('Multi-platform hashtag generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// POST SCHEDULER ROUTES
// ===================================================================

/**
 * POST /api/content-factory/schedule
 * Schedule a post
 */
router.post('/schedule', async (req, res) => {
  try {
    const { 
      clipId,
      platform = 'tiktok',
      title = '',
      caption = '',
      hashtags = [],
      scheduledTime = null
    } = req.body;
    
    if (!clipId) {
      return res.status(400).json({
        success: false,
        error: 'clipId is required'
      });
    }
    
    const post = postScheduler.schedulePost({
      clipId,
      platform,
      title,
      caption,
      hashtags,
      scheduledTime
    });
    
    // Also add to content queue
    contentQueue.addToQueue({
      clipId,
      platform,
      title,
      caption,
      hashtags,
      scheduledTime: post.scheduledTime
    });
    
    res.json({
      success: true,
      post,
      scheduledTime: post.scheduledTime
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/content-factory/schedule/multi
 * Schedule posts for multiple platforms
 */
router.post('/schedule/multi', async (req, res) => {
  try {
    const { 
      clipId,
      platforms = ['tiktok', 'instagram', 'youtube', 'facebook'],
      title = '',
      caption = '',
      hashtags = []
    } = req.body;
    
    if (!clipId) {
      return res.status(400).json({
        success: false,
        error: 'clipId is required'
      });
    }
    
    const posts = postScheduler.scheduleMultiPlatform({
      clipId,
      platforms,
      title,
      caption,
      hashtags
    });
    
    // Add all to content queue
    for (const post of posts) {
      contentQueue.addToQueue({
        clipId,
        platform: post.platform,
        title,
        caption,
        hashtags,
        scheduledTime: post.scheduledTime
      });
    }
    
    res.json({
      success: true,
      posts,
      count: posts.length
    });
  } catch (error) {
    console.error('Multi-platform schedule error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/content-factory/schedule/slots
 * Get available schedule slots
 */
router.get('/schedule/slots', async (req, res) => {
  try {
    const { platform = 'tiktok', days = 7 } = req.query;
    
    const slots = postScheduler.getScheduleSlots(platform, parseInt(days));
    
    res.json({
      success: true,
      platform,
      slots,
      count: slots.length
    });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/content-factory/schedule/next
 * Get next scheduled post
 */
router.get('/schedule/next', async (req, res) => {
  try {
    const nextPost = postScheduler.getNextPost();
    
    res.json({
      success: true,
      nextPost
    });
  } catch (error) {
    console.error('Get next post error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// CONTENT QUEUE ROUTES
// ===================================================================

/**
 * GET /api/content-factory/queue
 * Get content queue
 */
router.get('/queue', async (req, res) => {
  try {
    const { status, platform, limit = 50 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (platform) filters.platform = platform;
    if (limit) filters.limit = parseInt(limit);
    
    const queue = contentQueue.getQueue(filters);
    
    res.json({
      success: true,
      queue,
      count: queue.length
    });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/content-factory/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = contentQueue.getQueueStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/content-factory/queue
 * Add item to queue
 */
router.post('/queue', async (req, res) => {
  try {
    const { 
      clipId,
      platform = 'tiktok',
      title = '',
      caption = '',
      hashtags = [],
      scheduledTime = null
    } = req.body;
    
    if (!clipId) {
      return res.status(400).json({
        success: false,
        error: 'clipId is required'
      });
    }
    
    const item = contentQueue.addToQueue({
      clipId,
      platform,
      title,
      caption,
      hashtags,
      scheduledTime
    });
    
    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Add to queue error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * PUT /api/content-factory/queue/:id
 * Update queue item
 */
router.put('/queue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const item = contentQueue.updateQueueItem(id, updates);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Update queue item error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/content-factory/queue/:id
 * Remove item from queue
 */
router.delete('/queue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = contentQueue.removeFromQueue(id);
    
    res.json({
      success,
      message: success ? 'Item removed' : 'Item not found'
    });
  } catch (error) {
    console.error('Remove from queue error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// FULL CONTENT GENERATION
// ===================================================================

/**
 * POST /api/content-factory/generate
 * Generate complete content package (titles, captions, hashtags, schedule)
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      clipId,
      metadata = {},
      viralScore = 50,
      platforms = ['tiktok', 'instagram', 'youtube', 'facebook'],
      autoSchedule = true
    } = req.body;
    
    if (!clipId) {
      return res.status(400).json({
        success: false,
        error: 'clipId is required'
      });
    }
    
    // Generate titles (5 per platform)
    const titles = titleGenerator.generateTitles({
      metadata,
      viralScore,
      platform: platforms[0]
    });
    
    // Generate captions for all platforms
    const captions = captionGenerator.generateMultiPlatformCaptions({
      viralScore,
      customTopic: metadata.topic || null
    });
    
    // Generate hashtags for all platforms
    const hashtags = hashtagEngine.generateMultiPlatformHashtags({
      metadata,
      viralScore
    });
    
    // Schedule posts if autoSchedule is enabled
    let scheduledPosts = [];
    if (autoSchedule) {
      scheduledPosts = postScheduler.scheduleMultiPlatform({
        clipId,
        platforms,
        title: titles[0]?.title || '',
        caption: captions[platforms[0]]?.caption || '',
        hashtags: hashtags[platforms[0]]?.hashtags?.all || []
      });
      
      // Add to content queue
      for (const post of scheduledPosts) {
        contentQueue.addToQueue({
          clipId,
          platform: post.platform,
          title: titles[0]?.title || '',
          caption: captions[post.platform]?.caption || '',
          hashtags: hashtags[post.platform]?.hashtags?.all || [],
          scheduledTime: post.scheduledTime
        });
      }
    }
    
    res.json({
      success: true,
      clipId,
      viralScore,
      generated: {
        titles,
        captions,
        hashtags,
        scheduled: scheduledPosts
      },
      stats: {
        titlesCount: titles.length,
        platformsCount: platforms.length,
        scheduledCount: scheduledPosts.length
      }
    });
  } catch (error) {
    console.error('Full content generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// STATUS ROUTES
// ===================================================================

/**
 * GET /api/content-factory/status
 * Get overall content factory status
 */
router.get('/status', async (req, res) => {
  try {
    const queueStats = contentQueue.getQueueStats();
    const schedulerStats = postScheduler.getSchedulerStats();
    const nextPost = postScheduler.getNextPost();
    
    res.json({
      success: true,
      status: 'active',
      queue: queueStats,
      scheduler: schedulerStats,
      nextUpload: nextPost ? {
        id: nextPost.id,
        platform: nextPost.platform,
        scheduledTime: nextPost.scheduledTime
      } : null,
      platforms: {
        tiktok: postScheduler.getPlatformSchedule('tiktok'),
        instagram: postScheduler.getPlatformSchedule('instagram'),
        youtube: postScheduler.getPlatformSchedule('youtube'),
        facebook: postScheduler.getPlatformSchedule('facebook')
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

