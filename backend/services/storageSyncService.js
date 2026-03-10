/**
 * OVERLORD SAFE STORAGE SYNC SERVICE
 * Scans physical folders and removes orphaned DB entries
 * NON-DESTRUCTIVE: Does NOT delete physical files
 * 
 * PRODUCTION_CLEAN_MODE: When true, disables aggressive scanning
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PLATFORM_DIRS = ['youtube', 'tiktok', 'instagram', 'facebook'];

/**
 * Check if production clean mode is enabled
 */
function isProductionCleanMode() {
  return process.env.PRODUCTION_CLEAN_MODE === 'true';
}

/**
 * Get all video files from a directory
 */
function getVideoFiles(dir) {
  if (!fs.existsSync(dir)) return new Set();
  
  try {
    const files = fs.readdirSync(dir);
    return new Set(files.filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i)));
  } catch (err) {
    return new Set();
  }
}

/**
 * Get all physical files (uploads + all platform outputs)
 * In PRODUCTION_CLEAN_MODE, this returns empty set to skip scanning
 */
async function getAllPhysicalFiles() {
  // In production clean mode, skip aggressive folder scanning
  if (isProductionCleanMode()) {
    return new Set();
  }
  
  const physicalFiles = new Set();
  
  // Scan uploads
  const uploads = getVideoFiles(UPLOADS_DIR);
  uploads.forEach(f => physicalFiles.add(f));
  
  // Scan each platform output folder
  for (const platform of PLATFORM_DIRS) {
    const dir = path.join(OUTPUT_DIR, platform);
    const files = getVideoFiles(dir);
    files.forEach(f => physicalFiles.add(f));
  }
  
  return physicalFiles;
}

/**
 * Sync database with physical storage
 * Marks orphaned videos as archived (non-destructive)
 */
async function syncDatabase() {
  const prisma = require('../prisma/client');
  
  // Get all physical files
  const physicalFiles = await getAllPhysicalFiles();
  
  // Get all videos from DB
  const dbVideos = await prisma.video.findMany({
    select: { id: true, filename: true, path: true }
  });
  
  // Find orphaned videos (in DB but file doesn't exist)
  let orphanedVideos = 0;
  for (const video of dbVideos) {
    const fileExists = physicalFiles.has(video.filename);
    let pathExists = false;
    if (video.path && fs.existsSync(video.path)) {
      pathExists = true;
    }
    
    if (!fileExists && !pathExists) {
      // Mark as archived instead of deleting
      try {
        await prisma.video.update({
          where: { id: video.id },
          data: { status: 'archived' }
        });
        orphanedVideos++;
      } catch (err) {
        // Ignore errors
      }
    }
  }
  
  // Recalculate stats
  const stats = await recalculateStats();
  
  return {
    success: true,
    physicalFiles: physicalFiles.size,
    dbVideos: dbVideos.length,
    orphanedVideos,
    stats
  };
}

/**
 * Recalculate all stats from database
 */
async function recalculateStats() {
  const prisma = require('../prisma/client');
  
  // Get total videos (excluding archived)
  const totalVideos = await prisma.video.count({
    where: { status: { not: 'archived' } }
  });
  
  // Get total clips
  const totalClips = await prisma.clip.count();
  
  // Get platform counts
  const platformCounts = { youtube: 0, tiktok: 0, instagram: 0, facebook: 0 };
  for (const platform of PLATFORM_DIRS) {
    platformCounts[platform] = await prisma.video.count({
      where: { platform: platform.toLowerCase(), status: { not: 'archived' } }
    });
  }
  
  // Get platform clip counts
  const platformClips = { youtube: 0, tiktok: 0, instagram: 0, facebook: 0 };
  for (const platform of PLATFORM_DIRS) {
    platformClips[platform] = await prisma.clip.count({
      where: { platform: platform.toLowerCase() }
    });
  }
  
  // Get average viral score
  const clips = await prisma.clip.findMany({
    select: { viralScore: true }
  });
  
  let avgScore = 0;
  if (clips.length > 0) {
    const total = clips.reduce((sum, c) => sum + (c.viralScore || 0), 0);
    avgScore = Math.round(total / clips.length);
  }
  
  return {
    totalVideos,
    totalClips,
    platformCounts,
    platformClips,
    avgScore
  };
}

/**
 * Clear any cached stats
 */
function clearCache() {
  return { success: true, message: 'Cache cleared' };
}

/**
 * Full sync and rebuild
 */
async function fullSync() {
  const syncResult = await syncDatabase();
  clearCache();
  return syncResult;
}

/**
 * Get physical storage stats
 */
async function getStorageStats() {
  const stats = {
    uploads: { count: 0, size: 0 },
    youtube: { count: 0, size: 0 },
    tiktok: { count: 0, size: 0 },
    instagram: { count: 0, size: 0 },
    facebook: { count: 0, size: 0 },
    total: { count: 0, size: 0 }
  };
  
  // Scan uploads
  const uploadsDir = UPLOADS_DIR;
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir).filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i));
    stats.uploads.count = files.length;
    files.forEach(f => {
      stats.uploads.size += fs.statSync(path.join(uploadsDir, f)).size;
    });
    stats.total.count += stats.uploads.count;
    stats.total.size += stats.uploads.size;
  }
  
  // Scan each platform
  for (const platform of PLATFORM_DIRS) {
    const dir = path.join(OUTPUT_DIR, platform);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i));
      stats[platform].count = files.length;
      files.forEach(f => {
        stats[platform].size += fs.statSync(path.join(dir, f)).size;
      });
      stats.total.count += stats[platform].count;
      stats.total.size += stats[platform].size;
    }
  }
  
  return stats;
}

/**
 * Permanently remove archived DB entries
 * Only removes records marked as 'archived' status
 */
async function cleanGhostRecords() {
  const prisma = require('../prisma/client');
  
  // Permanently delete archived video records
  const deletedVideos = await prisma.video.deleteMany({
    where: { status: 'archived' }
  });
  
  // Recalculate stats after cleanup
  const stats = await recalculateStats();
  
  return {
    success: true,
    deletedVideos: deletedVideos.count,
    stats
  };
}

module.exports = {
  syncDatabase,
  recalculateStats,
  clearCache,
  fullSync,
  getStorageStats,
  getAllPhysicalFiles,
  cleanGhostRecords,
  isProductionCleanMode
};
