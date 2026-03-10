/**
 * OVERLORD DASHBOARD AGGREGATION ENGINE
 * Counts files from DATABASE (not file system)
 * Optimized for 8GB RAM
 */

const path = require('path');

// Valid platforms
const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook'];

/**
 * Get platform counts from DATABASE
 * Optimized with select fields only
 */
async function getPlatformCounts() {
  const prisma = require('../prisma/client');
  const counts = { youtube: 0, tiktok: 0, instagram: 0, facebook: 0 };
  
  try {
    for (const platform of PLATFORMS) {
      counts[platform] = await prisma.video.count({
        where: { platform: platform.toLowerCase() }
      });
    }
  } catch (err) {
    console.error('[StatsAggregator] Error getting platform counts:', err.message);
  }
  
  return counts;
}

/**
 * Get total unique videos from DATABASE
 */
async function getTotalVideos() {
  const prisma = require('../prisma/client');
  
  try {
    return await prisma.video.count();
  } catch (err) {
    console.error('[StatsAggregator] Error getting total videos:', err.message);
    return 0;
  }
}

/**
 * Get total clips from DATABASE
 */
async function getTotalClips() {
  const prisma = require('../prisma/client');
  
  try {
    return await prisma.clip.count();
  } catch (err) {
    console.error('[StatsAggregator] Error getting total clips:', err.message);
    return 0;
  }
}

/**
 * Get average viral score from DATABASE
 */
async function getAverageScore() {
  const prisma = require('../prisma/client');
  
  try {
    // Get average from videos
    const videos = await prisma.video.findMany({
      select: { viralScore: true }
    });
    
    const scores = videos.filter(v => v.viralScore != null).map(v => v.viralScore);
    if (scores.length === 0) return 0;
    
    const sum = scores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / scores.length);
  } catch (err) {
    console.error('[StatsAggregator] Error getting average score:', err.message);
    return 0;
  }
}

/**
 * Get AI confidence score from DATABASE
 * Formula: (avg viralScore + retention metric) / 2
 * For now: uses avg viralScore as proxy
 */
async function getAIConfidence() {
  const avgScore = await getAverageScore();
  
  // In a real system, we'd also get retention metrics
  // For now, return avg viral score as confidence
  return Math.round(avgScore);
}

/**
 * Get platform clip counts from DATABASE
 */
async function getPlatformClipCounts() {
  const prisma = require('../prisma/client');
  const counts = { youtube: 0, tiktok: 0, instagram: 0, facebook: 0 };
  
  try {
    for (const platform of PLATFORMS) {
      counts[platform] = await prisma.clip.count({
        where: { platform: platform.toLowerCase() }
      });
    }
  } catch (err) {
    console.error('[StatsAggregator] Error getting platform clip counts:', err.message);
  }
  
  return counts;
}

/**
 * Generate full stats from DATABASE
 */
async function generateStats() {
  const platformCounts = await getPlatformCounts();
  const platformClipCounts = await getPlatformClipCounts();
  
  const stats = {
    totalVideos: await getTotalVideos(),
    totalClips: await getTotalClips(),
    avgScore: await getAverageScore(),
    aiConfidence: await getAIConfidence(),
    trending: await getAverageScore(), // Using avg as trending proxy
    platforms: platformCounts,
    platformClips: platformClipCounts,
    lastUpdated: new Date().toISOString(),
    source: 'database' // Mark as DB-sourced
  };
  
  return stats;
}

/**
 * Save stats (for caching)
 */
async function saveStats() {
  const stats = await generateStats();
  console.log('[StatsAggregator] Generated stats from database:', {
    totalVideos: stats.totalVideos,
    totalClips: stats.totalClips,
    platforms: stats.platforms
  });
  return stats;
}

/**
 * Simple event-based refresh (no polling)
 * Returns stats directly
 */
async function getStats() {
  return await generateStats();
}

// Export for use
module.exports = {
  generateStats,
  saveStats,
  getStats,
  getPlatformCounts,
  getTotalVideos,
  getTotalClips,
  getAverageScore,
  getAIConfidence,
  getPlatformClipCounts,
  PLATFORMS
};
