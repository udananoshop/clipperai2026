/**
 * OVERLORD HYBRID REINDEX SERVICE
 * Scans output folders and syncs with database
 * Does NOT lose existing data
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PLATFORM_DIRS = ['youtube', 'tiktok', 'instagram', 'facebook'];

/**
 * Normalize platform name to lowercase
 */
function normalizePlatform(platform) {
  return platform.toLowerCase();
}

/**
 * Detect platform from filename
 */
function detectPlatform(filename, folderName) {
  // Check folder first
  if (folderName && PLATFORM_DIRS.includes(folderName.toLowerCase())) {
    return normalizePlatform(folderName);
  }
  
  // Check filename patterns
  const lower = filename.toLowerCase();
  if (lower.includes('tiktok')) return 'tiktok';
  if (lower.includes('instagram') || lower.includes('reel')) return 'instagram';
  if (lower.includes('shorts')) return 'youtube';
  if (lower.includes('facebook') || lower.includes('fb')) return 'facebook';
  
  return 'youtube'; // default
}

/**
 * Scan a platform folder for videos
 */
function scanPlatformFolder(platform) {
  const folderPath = path.join(OUTPUT_DIR, platform);
  const videos = [];
  
  try {
    if (!fs.existsSync(folderPath)) {
      console.log(`[HybridReindex] Folder does not exist: ${folderPath}`);
      return videos;
    }
    
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      // Only process video files
      if (!file.match(/\.(mp4|mov|mkv|webm)$/i)) continue;
      
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      
      videos.push({
        filename: file,
        path: filePath,
        platform: normalizePlatform(platform),
        size: stats.size,
        createdAt: stats.birthtime
      });
    }
    
    console.log(`[HybridReindex] Found ${videos.length} videos in ${platform} folder`);
  } catch (err) {
    console.error(`[HybridReindex] Error scanning ${platform} folder:`, err.message);
  }
  
  return videos;
}

/**
 * Main reindex function
 */
async function reindex() {
  console.log('[HybridReindex] ========================================');
  console.log('[HybridReindex] Starting hybrid reindex...');
  
  const prisma = require('../prisma/client');
  
  let totalVideos = 0;
  let totalClips = 0;
  let skippedExisting = 0;
  let insertedVideos = 0;
  
  // Get default user (first user in DB)
  let defaultUser;
  try {
    defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      console.log('[HybridReindex] ERROR: No users in database. Please create a user first.');
      return { success: false, error: 'No users in database' };
    }
  } catch (err) {
    console.error('[HybridReindex] Error getting default user:', err.message);
    return { success: false, error: err.message };
  }
  
  // Scan each platform folder
  for (const platform of PLATFORM_DIRS) {
    console.log(`[HybridReindex] Scanning ${platform} folder...`);
    const videos = scanPlatformFolder(platform);
    
    for (const video of videos) {
      totalVideos++;
      
      // Check if video already exists in DB by filename
      const existingVideo = await prisma.video.findFirst({
        where: { filename: video.filename }
      });
      
      if (existingVideo) {
        skippedExisting++;
        console.log(`[HybridReindex] Skipping existing video: ${video.filename}`);
        
        // Update platform if not set
        if (!existingVideo.platform || existingVideo.platform === 'youtube') {
          await prisma.video.update({
            where: { id: existingVideo.id },
            data: { platform: video.platform }
          });
          console.log(`[HybridReindex] Updated platform for: ${video.filename} -> ${video.platform}`);
        }
        continue;
      }
      
      // Insert new video
      try {
        await prisma.video.create({
          data: {
            title: video.filename.replace(/\.[^/.]+$/, ''), // Remove extension
            filename: video.filename,
            path: video.path,
            platform: video.platform,
            size: video.size,
            userId: defaultUser.id,
            createdAt: video.createdAt
          }
        });
        insertedVideos++;
        console.log(`[HybridReindex] Inserted: ${video.filename} (${video.platform})`);
      } catch (err) {
        console.error(`[HybridReindex] Error inserting video ${video.filename}:`, err.message);
      }
    }
  }
  
  // Count total clips in DB
  try {
    totalClips = await prisma.clip.count();
  } catch (err) {
    console.error('[HybridReindex] Error counting clips:', err.message);
  }
  
  // Update stats aggregator
  try {
    const statsAggregator = require('./statsAggregator');
    statsAggregator.saveStats();
  } catch (err) {
    console.error('[HybridReindex] Error saving stats:', err.message);
  }
  
  console.log('[HybridReindex] ========================================');
  console.log('[HybridReindex] Reindex complete!');
  console.log(`[HybridReindex] Total videos scanned: ${totalVideos}`);
  console.log(`[HybridReindex] Existing videos skipped: ${skippedExisting}`);
  console.log(`[HybridReindex] New videos inserted: ${insertedVideos}`);
  console.log(`[HybridReindex] Total clips in DB: ${totalClips}`);
  console.log('[HybridReindex] ========================================');
  
  return {
    success: true,
    totalVideos,
    skippedExisting,
    insertedVideos,
    totalClips
  };
}

/**
 * Get platform counts from database
 */
async function getPlatformCountsFromDB() {
  const prisma = require('../prisma/client');
  
  const counts = {
    youtube: 0,
    tiktok: 0,
    instagram: 0,
    facebook: 0
  };
  
  try {
    for (const platform of PLATFORM_DIRS) {
      const count = await prisma.video.count({
        where: { platform: normalizePlatform(platform) }
      });
      counts[platform] = count;
    }
  } catch (err) {
    console.error('[HybridReindex] Error getting platform counts:', err.message);
  }
  
  return counts;
}

module.exports = {
  reindex,
  getPlatformCountsFromDB,
  scanPlatformFolder,
  normalizePlatform,
  detectPlatform
};
