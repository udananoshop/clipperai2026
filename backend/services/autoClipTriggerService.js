/**
 * AUTO CLIP TRIGGER SERVICE
 * Automatically triggers AI clip generation when video is uploaded
 * Modular service - does NOT modify upload module
 * 
 * INTEGRATED: ViralScoreEngine for intelligent filtering
 * Only triggers clip generation if viralScore >= 70
 */

const path = require('path');
const fs = require('fs');
const { generateClips } = require('../engine/autoClipEngine');
const prisma = require('../prisma/client');

// Import ViralScoreEngine for intelligent filtering
const viralScoreEngine = require('../ai/viralScoreEngine');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// ===================================================================
// ENSURE OUTPUT FOLDER STRUCTURE
// ===================================================================
var ensureDir = function(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

var baseOutput = OUTPUT_DIR;
ensureDir(path.join(baseOutput, 'tiktok'));
ensureDir(path.join(baseOutput, 'youtube'));
ensureDir(path.join(baseOutput, 'instagram'));
ensureDir(path.join(baseOutput, 'facebook'));
ensureDir(path.join(baseOutput, 'subtitles'));
ensureDir(path.join(baseOutput, 'soundtracks'));
ensureDir(path.join(baseOutput, 'watermarked'));
ensureDir(path.join(baseOutput, 'formatted'));

console.log('[AutoClip] Output folders ensured');

// Auto-trigger configuration
const AUTO_TRIGGER_CONFIG = {
  enabled: true,
  platforms: ['tiktok', 'instagram', 'youtube', 'facebook'],
  defaultDuration: 30,
  generateTopClips: 3,
  minScoreThreshold: 60
};

/**
 * Trigger auto-clip generation for a video
 * INTEGRATED: ViralScoreEngine pre-check
 * Only triggers if viralScore >= 70 (configurable threshold)
 */
async function triggerAutoClip(videoId, options = {}) {
  const skipViralCheck = options.skipViralCheck || false;
  const viralThreshold = options.viralThreshold || viralScoreEngine.MIN_VIRAL_SCORE_THRESHOLD;
  
  try {
    console.log('[AutoClip Trigger] Starting for video ID:', videoId);
    
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      throw new Error('Video not found in database');
    }
    
    // =====================================================================
    // VIRAL SCORE ENGINE PRE-CHECK
    // =====================================================================
    if (!skipViralCheck) {
      console.log('[AutoClip Trigger] Running ViralScoreEngine pre-check...');
      
      try {
        const viralCheck = await viralScoreEngine.shouldTriggerAutoClip(videoId);
        
        console.log(`[AutoClip Trigger] Viral score: ${viralCheck.viralScore}, Threshold: ${viralThreshold}`);
        
        if (!viralCheck.shouldTrigger) {
          console.log(`[AutoClip Trigger] SKIPPED - Viral score ${viralCheck.viralScore} below threshold ${viralThreshold}`);
          console.log(`[AutoClip Trigger] Reason: ${viralCheck.reason}`);
          
          return {
            success: true,
            skipped: true,
            videoId: videoId,
            viralScore: viralCheck.viralScore,
            reason: viralCheck.reason,
            message: 'Clip generation skipped - low viral potential',
            threshold: viralThreshold
          };
        }
        
        console.log(`[AutoClip Trigger] APPROVED - Viral score ${viralCheck.viralScore} meets threshold`);
        
        // Store the viralScore in the video record
        await prisma.video.update({
          where: { id: videoId },
          data: { viralScore: viralCheck.viralScore }
        });
        
      } catch (viralError) {
        console.error('[AutoClip Trigger] Viral score check failed:', viralError.message);
        // Continue with clip generation if viral check fails (fail-open)
      }
    } else {
      console.log('[AutoClip Trigger] Skipping viral score check (skipViralCheck=true)');
    }
    // =====================================================================
    
    const videoPath = path.join(__dirname, '..', 'uploads', video.filename);
    
    if (!fs.existsSync(videoPath)) {
      throw new Error('Video file not found: ' + videoPath);
    }
    
    console.log('[AutoClip Trigger] Video path:', videoPath);
    
    const jobId = 'autoclip_' + videoId + '_' + Date.now();
    
    const result = await generateClips(videoPath, {
      jobId: jobId,
      platform: 'all',
      duration: options.duration || AUTO_TRIGGER_CONFIG.defaultDuration,
      options: {
        smartTrim: true,
        autoSubtitle: true,
        autoTranslate: false,
        addMusic: true,
        smartHook: true
      },
      onProgress: function(progress) {
        console.log('[AutoClip Trigger] Progress:', progress);
      }
    });
    
    if (result.success && result.clips) {
      await storeClipMetadata(videoId, result);
    }
    
    return {
      success: true,
      videoId: videoId,
      jobId: jobId,
      clips: result.clips,
      viralScores: result.viralScores,
      platforms: Object.keys(result.clips),
      message: 'Generated ' + Object.keys(result.clips).length + ' clips'
    };
    
  } catch (error) {
    console.error('[AutoClip Trigger] Error:', error);
    return {
      success: false,
      videoId: videoId,
      error: error.message
    };
  }
}

/**
 * Store clip metadata in database
 */
async function storeClipMetadata(videoId, result) {
  try {
    for (const [platform, clipPath] of Object.entries(result.clips)) {
      if (clipPath && fs.existsSync(clipPath)) {
        const stats = fs.statSync(clipPath);
        const viralScore = result.viralScores?.[platform] || 70;
        
        const existingClip = await prisma.clip.findFirst({
          where: {
            videoId: videoId,
            platform: platform
          }
        });
        
        if (existingClip) {
          // Construct the proper filePath with platform prefix
          const relativePath = path.relative(path.join(__dirname, '..'), clipPath);
          const normalizedPath = relativePath.replace(/\\/g, '/');
          const filePath = '/' + normalizedPath;
          
          await prisma.clip.update({
            where: { id: existingClip.id },
            data: {
              title: platform + ' - ' + path.basename(clipPath),
              filename: path.basename(clipPath),
              filePath: filePath,  // Save the full relative path for frontend access
              platform: platform,
              viralScore: viralScore,
              confidence: viralScore,
              status: 'completed'
            }
          });
        } else {
          // Construct the proper filePath with platform prefix
          const relativePath = path.relative(path.join(__dirname, '..'), clipPath);
          const normalizedPath = relativePath.replace(/\\/g, '/');
          const filePath = '/' + normalizedPath;
          
          await prisma.clip.create({
            data: {
              title: platform + ' - ' + path.basename(clipPath),
              filename: path.basename(clipPath),
              filePath: filePath,  // Save the full relative path for frontend access
              videoId: videoId,
              platform: platform,
              viralScore: viralScore,
              confidence: viralScore,
              status: 'completed',
              userId: 1
            }
          });
        }
        
        console.log('[AutoClip Trigger] Stored clip:', platform, viralScore);
      }
    }
  } catch (error) {
    console.error('[AutoClip Trigger] Store metadata error:', error);
  }
}

/**
 * Get clips for a specific video
 */
async function getClipsByVideoId(videoId) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      throw new Error('Video not found');
    }
    
    const clips = await prisma.clip.findMany({
      where: { videoId: videoId },
      orderBy: { viralScore: 'desc' }
    });
    
    const clipsWithPaths = clips.map(function(clip) {
      // Use filePath if available, otherwise construct from filename and platform
      let urlPath = clip.filePath;
      if (!urlPath && clip.filename) {
        urlPath = '/output/' + clip.platform + '/' + clip.filename;
      }
      
      return {
        id: clip.id,
        title: clip.title,
        platform: clip.platform,
        viralScore: clip.viralScore,
        confidence: clip.confidence,
        filename: clip.filename,
        filePath: clip.filePath,
        status: clip.status,
        url: urlPath,
        createdAt: clip.createdAt
      };
    });
    
    return {
      success: true,
      videoId: videoId,
      title: video.title,
      filename: video.filename,
      clips: clipsWithPaths,
      totalClips: clipsWithPaths.length,
      hasExports: clipsWithPaths.length > 0
    };
    
  } catch (error) {
    console.error('[AutoClip Trigger] Get clips error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get available exports for a video from output folder
 */
async function getVideoExports(videoId) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      throw new Error('Video not found');
    }
    
    const exports = [];
    const platforms = ['tiktok', 'instagram', 'youtube', 'facebook'];
    
    for (const platform of platforms) {
      const platformDir = path.join(OUTPUT_DIR, platform);
      if (fs.existsSync(platformDir)) {
        const files = fs.readdirSync(platformDir).filter(function(f) {
          return f.endsWith('.mp4');
        });
        
        const matchingFiles = files.filter(function(f) {
          return f.includes('_' + videoId + '_') || 
                 f.includes('-' + videoId + '-') ||
                 f.includes(videoId.toString());
        });
        
        for (const file of matchingFiles) {
          const filePath = path.join(platformDir, file);
          const stats = fs.statSync(filePath);
          exports.push({
            id: platform + '_' + file,
            platform: platform,
            filename: file,
            size: stats.size,
            url: '/output/' + platform + '/' + file,
            createdAt: stats.mtime
          });
        }
      }
    }
    
    return {
      success: true,
      videoId: videoId,
      exports: exports.sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    };
    
  } catch (error) {
    console.error('[AutoClip Trigger] Get exports error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get system status
 */
function getStatus() {
  return {
    enabled: AUTO_TRIGGER_CONFIG.enabled,
    platforms: AUTO_TRIGGER_CONFIG.platforms,
    defaultDuration: AUTO_TRIGGER_CONFIG.defaultDuration,
    generateTopClips: AUTO_TRIGGER_CONFIG.generateTopClips,
    minScoreThreshold: AUTO_TRIGGER_CONFIG.minScoreThreshold
  };
}

module.exports = {
  triggerAutoClip: triggerAutoClip,
  getClipsByVideoId: getClipsByVideoId,
  getVideoExports: getVideoExports,
  getStatus: getStatus,
  AUTO_TRIGGER_CONFIG: AUTO_TRIGGER_CONFIG
};
