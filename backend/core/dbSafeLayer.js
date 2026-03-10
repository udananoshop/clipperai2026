/**
 * DATABASE SAFETY LAYER - Prisma Safe Write
 * 
 * Wraps Prisma operations with safe error handling
 * Prevents server crashes on DB write failures
 */

const prisma = require('../prisma/client');

// Cache for fallback data
let statsCache = {
  videos: 0,
  clips: 0,
  jobsProcessed: 0,
  lastUpdate: null
};

/**
 * Safe video creation - removes invalid fields automatically
 */
async function safeCreateVideo(data) {
  try {
    // Remove invalid fields that aren't in schema
    const cleanData = {
      title: data.title || 'Untitled',
      filename: data.filename || '',
      path: data.path || null,
      platform: data.platform || 'youtube',
      originalName: data.originalName || null,
      size: data.size || null,
      userId: data.userId || 1,
      viralScore: data.viralScore || null,
      predictedViews: data.predictedViews || null,
      // status field - use default if not provided
      status: data.status || 'completed'
    };
    
    const result = await prisma.video.create({ data: cleanData });
    return { success: true, data: result };
  } catch (error) {
    console.error('[DB] Safe create video failed:', error.message);
    console.log('[DB] Safe write fallback used');
    
    // Return safe fallback
    return { 
      success: false, 
      error: error.message,
      fallback: true,
      data: { id: Date.now(), title: data.title || 'Fallback' }
    };
  }
}

/**
 * Safe video update
 */
async function safeUpdateVideo(id, data) {
  try {
    // Filter to only valid fields
    const validFields = ['title', 'filename', 'path', 'platform', 'viralScore', 'predictedViews', 'status'];
    const cleanData = {};
    
    for (const key of validFields) {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    }
    
    const result = await prisma.video.update({
      where: { id: parseInt(id) },
      data: cleanData
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('[DB] Safe update video failed:', error.message);
    console.log('[DB] Safe write fallback used');
    return { success: false, error: error.message, fallback: true };
  }
}

/**
 * Safe video find
 */
async function safeFindVideos(where = {}) {
  try {
    const result = await prisma.video.findMany({ where });
    // Update cache
    statsCache.videos = result.length;
    statsCache.lastUpdate = new Date();
    return { success: true, data: result };
  } catch (error) {
    console.error('[DB] Safe find videos failed:', error.message);
    return { success: false, error: error.message, fallback: true, data: [] };
  }
}

/**
 * Safe clip creation
 */
async function safeCreateClip(data) {
  try {
    const cleanData = {
      title: data.title || 'Untitled Clip',
      videoId: data.videoId,
      platform: data.platform || 'youtube',
      viralScore: data.viralScore || null,
      confidence: data.confidence || null
    };
    
    const result = await prisma.clip.create({ data: cleanData });
    return { success: true, data: result };
  } catch (error) {
    console.error('[DB] Safe create clip failed:', error.message);
    console.log('[DB] Safe write fallback used');
    return { success: false, error: error.message, fallback: true };
  }
}

/**
 * Get stats with cache fallback
 */
async function safeGetStats() {
  try {
    const videos = await prisma.video.count();
    const clips = await prisma.clip.count();
    
    const stats = {
      videos,
      clips,
      jobsProcessed: videos * 3,  // Estimate
      lastUpdate: new Date()
    };
    
    // Update cache
    statsCache = { ...stats };
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('[DB] Safe get stats failed:', error.message);
    console.log('[DB] Using cached stats');
    return { success: false, error: error.message, fallback: true, data: statsCache };
  }
}

/**
 * Generic safe Prisma call
 */
async function safeCall(operation, fallbackValue = null) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error('[DB] Safe call failed:', error.message);
    console.log('[DB] Safe write fallback used');
    return { success: false, error: error.message, fallback: true, data: fallbackValue };
  }
}

module.exports = {
  safeCreateVideo,
  safeUpdateVideo,
  safeFindVideos,
  safeCreateClip,
  safeGetStats,
  safeCall,
  statsCache
};

console.log('[DB] Safe Layer ACTIVE');
