/**
 * VIDEO LIBRARY API ROUTES
 * Provides organized access to uploads, downloads, and clips by platform
 * 
 * This is an EXTENSION to the existing system - does not modify existing routes
 * Backward compatibility with existing /uploads, /output, /downloads maintained
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Base paths - NEW storage structure
const STORAGE_BASE = path.join(__dirname, '..', 'storage');
const UPLOADS_DIR = path.join(STORAGE_BASE, 'uploads');
const DOWNLOADS_DIR = path.join(STORAGE_BASE, 'downloads');
const CLIPS_DIR = path.join(STORAGE_BASE, 'clips');
const PROCESSED_DIR = path.join(STORAGE_BASE, 'processed');
const EXPORTS_DIR = path.join(STORAGE_BASE, 'exports');

// Legacy paths for backward compatibility
const LEGACY_UPLOADS = path.join(__dirname, '..', 'uploads');
const LEGACY_OUTPUT = path.join(__dirname, '..', 'output');
const LEGACY_DOWNLOADS = path.join(__dirname, '..', 'downloads');

// Helper: Get files from directory with metadata - SAFE
function getFilesWithMetadata(dirPath, options = {}) {
  const { extensions = ['.mp4', '.mov', '.avi', '.webm', '.jpg', '.png', '.json'], limit = 50 } = options;
  
  // Safely check if directory exists
  if (!dirPath || !fs.existsSync(dirPath)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(dirPath)
      .filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext)))
      .map(filename => {
        try {
          const filePath = path.join(dirPath, filename);
          const stats = fs.statSync(filePath);
          return {
            filename,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        } catch (statError) {
          // Skip files that can't be stat'd
          return null;
        }
      })
      .filter(f => f !== null) // Remove null entries
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
      .slice(0, limit);
    
    return files;
  } catch (error) {
    console.error('[Library] Error reading directory:', error.message);
    return [];
  }
}

// Helper: Convert file path to URL - SAFE
function toUrl(filePath) {
  if (!filePath) return null;
  try {
    const basePath = path.join(__dirname, '..');
    const relativePath = filePath.replace(basePath, '');
    return relativePath.replace(/\\/g, '/');
  } catch (error) {
    return null;
  }
}

// Helper: Safe Prisma query
async function safePrismaQuery(queryFn, fallback = []) {
  try {
    const prisma = require('../prisma/client');
    return await queryFn(prisma);
  } catch (error) {
    console.error('[Library] Prisma error:', error.message);
    return fallback;
  }
}

// ============================================
// GET /api/library/uploads
// List all uploaded videos - SAFE
// ============================================
router.get('/uploads', async (req, res) => {
  try {
    console.log('[Library] Fetching uploads...');
    
    // Get videos from database safely
    const videos = await safePrismaQuery(
      (prisma) => prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          filename: true,
          size: true,
          createdAt: true,
          status: true,
          path: true,
          platform: true,
          originalName: true,
          userId: true,
          viralScore: true
        }
      }),
      []
    );
    
    // Get files from directories safely
    const newUploads = getFilesWithMetadata(UPLOADS_DIR);
    const legacyUploads = getFilesWithMetadata(LEGACY_UPLOADS);
    
    // Merge and deduplicate
    const allFiles = [...newUploads, ...legacyUploads];
    const uniqueFiles = allFiles.filter((file, index, self) => 
      index === self.findIndex(f => f.filename === file.filename)
    );
    
    // Map database videos to response format
    const uploadsWithUrls = (videos || []).map(video => ({
      id: video.id,
      title: video.title || video.filename,
      filename: video.filename,
      url: `/uploads/${video.filename}`,
      size: video.size || 0,
      duration: video.duration,
      createdAt: video.createdAt,
      status: video.status,
      source: 'database'
    }));
    
    // Add files not in database
    const dbFilenames = new Set((videos || []).map(v => v.filename));
    const orphanFiles = uniqueFiles
      .filter(f => !dbFilenames.has(f.filename))
      .map(f => ({
        id: null,
        title: f.filename,
        filename: f.filename,
        url: toUrl(f.path),
        size: f.size,
        duration: null,
        createdAt: f.created,
        status: 'file',
        source: 'file'
      }));
    
    const result = [...uploadsWithUrls, ...orphanFiles].slice(0, 50);
    
    res.json({
      success: true,
      count: result.length,
      uploads: result
    });
    
  } catch (error) {
    console.error('[Library] Error fetching uploads:', error);
    // Return safe empty response
    res.json({
      success: true,
      count: 0,
      uploads: []
    });
  }
});

// ============================================
// GET /api/library/downloads
// List all downloaded videos - SAFE
// ============================================
router.get('/downloads', async (req, res) => {
  try {
    console.log('[Library] Fetching downloads...');
    
    // Get files from directories safely
    const newDownloads = getFilesWithMetadata(DOWNLOADS_DIR);
    const legacyDownloads = getFilesWithMetadata(LEGACY_DOWNLOADS);
    
    // Merge and deduplicate
    const allFiles = [...newDownloads, ...legacyDownloads];
    const uniqueFiles = allFiles.filter((file, index, self) => 
      index === self.findIndex(f => f.filename === file.filename)
    );
    
    const downloads = uniqueFiles.map(f => ({
      filename: f.filename,
      url: toUrl(f.path),
      size: f.size,
      createdAt: f.created,
      modifiedAt: f.modified
    }));
    
    res.json({
      success: true,
      count: downloads.length,
      downloads: downloads
    });
    
  } catch (error) {
    console.error('[Library] Error fetching downloads:', error);
    res.json({
      success: true,
      count: 0,
      downloads: []
    });
  }
});

// ============================================
// GET /api/library/clips
// List all clips (all platforms) - SAFE
// ============================================
router.get('/clips', async (req, res) => {
  try {
    console.log('[Library] Fetching all clips...');
    
    // Get clips from database safely
    const clips = await safePrismaQuery(
      (prisma) => prisma.clip.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          video: {
            select: {
              id: true,
              title: true,
              filename: true
            }
          }
        }
      }),
      []
    );
    
    // Get files from both new and legacy directories safely
    const platforms = ['tiktok', 'youtube', 'instagram', 'facebook'];
    let allClipFiles = [];
    
    // Check new storage
    platforms.forEach(platform => {
      const newDir = path.join(CLIPS_DIR, platform);
      const files = getFilesWithMetadata(newDir);
      files.forEach(f => allClipFiles.push({ ...f, platform, location: 'new' }));
    });
    
    // Check legacy output directory
    platforms.forEach(platform => {
      const legacyDir = path.join(LEGACY_OUTPUT, platform);
      const files = getFilesWithMetadata(legacyDir);
      files.forEach(f => allClipFiles.push({ ...f, platform, location: 'legacy' }));
    });
    
// Map database clips - include thumbnailUrl
    const dbClips = (clips || []).map(clip => {
      // Get thumbnail from saved field or try to find file
      let thumbnailUrl = clip.thumbnailUrl || null;
      
      // If no saved thumbnail but has filename, try to find thumbnail file
      if (!thumbnailUrl && clip.filename) {
        const baseName = clip.filename.replace(/\.(mp4|mov|avi|webm|mkv)$/i, '');
        const platformDir = clip.platform || 'tiktok';
        const possibleThumbs = [
          path.join(CLIPS_DIR, platformDir, `${baseName}_thumb.jpg`),
          path.join(LEGACY_OUTPUT, platformDir, `${baseName}_thumb.jpg`)
        ];
        
        for (const thumbPath of possibleThumbs) {
          if (fs.existsSync(thumbPath)) {
            thumbnailUrl = `/output/${platformDir}/${baseName}_thumb.jpg`;
            break;
          }
        }
      }
      
      return {
        id: clip.id,
        title: clip.title,
        filename: clip.filename,
        platform: clip.platform,
        viralScore: clip.viralScore,
        url: clip.filename ? `/output/${clip.platform}/${clip.filename}` : null,
        videoUrl: clip.filename ? `/output/${clip.platform}/${clip.filename}` : null,
        thumbnailUrl: thumbnailUrl,
        thumbnail: thumbnailUrl,
        createdAt: clip.createdAt,
        source: 'database',
        videoId: clip.videoId
      };
    });
    
    // Add orphan files not in database
    const dbFilenames = new Set((clips || []).map(c => c.filename));
    const orphanClips = allClipFiles
      .filter(f => !dbFilenames.has(f.filename))
      .map(f => ({
        id: null,
        title: f.filename,
        filename: f.filename,
        platform: f.platform,
        viralScore: null,
        url: f.location === 'new' 
          ? `/storage/clips/${f.platform}/${f.filename}`
          : `/output/${f.platform}/${f.filename}`,
        createdAt: f.created,
        source: 'file',
        videoId: null
      }));
    
    const result = [...dbClips, ...orphanClips].slice(0, 100);
    
    res.json({
      success: true,
      count: result.length,
      clips: result
    });
    
  } catch (error) {
    console.error('[Library] Error fetching clips:', error);
    res.json({
      success: true,
      count: 0,
      clips: []
    });
  }
});

// ============================================
// GET /api/library/clips/:platform
// List clips for specific platform - SAFE
// ============================================
router.get('/clips/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const validPlatforms = ['tiktok', 'youtube', 'instagram', 'facebook'];
    
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.json({
        success: false,
        error: `Invalid platform. Valid: ${validPlatforms.join(', ')}`
      });
    }
    
    console.log(`[Library] Fetching ${platform} clips...`);
    
    const platformName = platform.toLowerCase();
    
    // Get clips from database safely
    const clips = await safePrismaQuery(
      (prisma) => prisma.clip.findMany({
        where: { platform: platformName },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          video: {
            select: {
              id: true,
              title: true,
              filename: true
            }
          }
        }
      }),
      []
    );
    
    // Get files from both new storage and legacy output
    const newDir = path.join(CLIPS_DIR, platformName);
    const legacyDir = path.join(LEGACY_OUTPUT, platformName);
    
    const newFiles = getFilesWithMetadata(newDir);
    const legacyFiles = getFilesWithMetadata(legacyDir);
    
    // Map database clips
    const dbClips = (clips || []).map(clip => ({
      id: clip.id,
      title: clip.title,
      filename: clip.filename,
      platform: clip.platform,
      viralScore: clip.viralScore,
      url: clip.filename ? `/output/${clip.platform}/${clip.filename}` : null,
      createdAt: clip.createdAt,
      source: 'database'
    }));
    
    // Add orphan files
    const dbFilenames = new Set((clips || []).map(c => c.filename));
    const allFiles = [...newFiles, ...legacyFiles];
    const orphanClips = allFiles
      .filter(f => !dbFilenames.has(f.filename))
      .map(f => ({
        id: null,
        title: f.filename,
        filename: f.filename,
        platform: platformName,
        viralScore: null,
        url: f.path.includes('storage') 
          ? `/storage/clips/${platformName}/${f.filename}`
          : `/output/${platformName}/${f.filename}`,
        createdAt: f.created,
        source: 'file'
      }));
    
    const result = [...dbClips, ...orphanClips].slice(0, 50);
    
    res.json({
      success: true,
      platform: platformName,
      count: result.length,
      clips: result
    });
    
  } catch (error) {
    console.error('[Library] Error fetching platform clips:', error);
    res.json({
      success: true,
      count: 0,
      clips: []
    });
  }
});

// ============================================
// GET /api/library/stats
// Get library statistics - SAFE
// ============================================
router.get('/stats', async (req, res) => {
  try {
    console.log('[Library] Fetching library stats...');
    
    // Get database counts safely
    const videoCount = await safePrismaQuery((prisma) => prisma.video.count(), 0);
    const clipCount = await safePrismaQuery((prisma) => prisma.clip.count(), 0);
    
    // Count by platform safely
    const platformCounts = await safePrismaQuery(
      (prisma) => prisma.clip.groupBy({
        by: ['platform'],
        _count: { id: true }
      }),
      []
    );
    
    const platformStats = {
      tiktok: 0,
      youtube: 0,
      instagram: 0,
      facebook: 0
    };
    
    (platformCounts || []).forEach(p => {
      if (platformStats.hasOwnProperty(p.platform)) {
        platformStats[p.platform] = p._count.id;
      }
    });
    
    // File counts from directories - SAFE
    const getDirCount = (dir) => {
      if (!fs.existsSync(dir)) return 0;
      try {
        return fs.readdirSync(dir).filter(f => f.endsWith('.mp4')).length;
      } catch {
        return 0;
      }
    };
    
    const storageStats = {
      uploads: getDirCount(UPLOADS_DIR) + getDirCount(LEGACY_UPLOADS),
      downloads: getDirCount(DOWNLOADS_DIR) + getDirCount(LEGACY_DOWNLOADS),
      clips: {
        tiktok: getDirCount(path.join(CLIPS_DIR, 'tiktok')) + getDirCount(path.join(LEGACY_OUTPUT, 'tiktok')),
        youtube: getDirCount(path.join(CLIPS_DIR, 'youtube')) + getDirCount(path.join(LEGACY_OUTPUT, 'youtube')),
        instagram: getDirCount(path.join(CLIPS_DIR, 'instagram')) + getDirCount(path.join(LEGACY_OUTPUT, 'instagram')),
        facebook: getDirCount(path.join(CLIPS_DIR, 'facebook')) + getDirCount(path.join(LEGACY_OUTPUT, 'facebook'))
      }
    };
    
    res.json({
      success: true,
      stats: {
        database: {
          videos: videoCount,
          clips: clipCount,
          byPlatform: platformStats
        },
        files: storageStats
      }
    });
    
  } catch (error) {
    console.error('[Library] Error fetching stats:', error);
    res.json({
      success: true,
      stats: {
        database: { videos: 0, clips: 0, byPlatform: { tiktok: 0, youtube: 0, instagram: 0, facebook: 0 } },
        files: { uploads: 0, downloads: 0, clips: { tiktok: 0, youtube: 0, instagram: 0, facebook: 0 } }
      }
    });
  }
});

// ============================================
// GET /api/library/health
// Check library health and directory status - SAFE
// ============================================
router.get('/health', (req, res) => {
  try {
    const checkDir = (dir) => {
      try {
        return {
          path: dir.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/'),
          exists: fs.existsSync(dir),
          writable: fs.existsSync(dir) ? fs.statSync(dir).isDirectory() : false
        };
      } catch {
        return {
          path: dir.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/'),
          exists: false,
          writable: false
        };
      }
    };
    
    const health = {
      storage: {
        uploads: checkDir(UPLOADS_DIR),
        downloads: checkDir(DOWNLOADS_DIR),
        clips: {
          tiktok: checkDir(path.join(CLIPS_DIR, 'tiktok')),
          youtube: checkDir(path.join(CLIPS_DIR, 'youtube')),
          instagram: checkDir(path.join(CLIPS_DIR, 'instagram')),
          facebook: checkDir(path.join(CLIPS_DIR, 'facebook'))
        },
        processed: {
          subtitles: checkDir(path.join(PROCESSED_DIR, 'subtitles')),
          watermark: checkDir(path.join(PROCESSED_DIR, 'watermark')),
          music: checkDir(path.join(PROCESSED_DIR, 'music'))
        },
        exports: checkDir(path.join(EXPORTS_DIR, 'ready'))
      },
      legacy: {
        uploads: checkDir(LEGACY_UPLOADS),
        output: checkDir(LEGACY_OUTPUT),
        downloads: checkDir(LEGACY_DOWNLOADS)
      }
    };
    
    res.json({
      success: true,
      health
    });
    
  } catch (error) {
    console.error('[Library] Error checking health:', error);
    res.json({
      success: true,
      health: {}
    });
  }
});

module.exports = router;

