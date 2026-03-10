const multer = require('multer');
const path = require('path');
const express = require('express');
const uploadService = require('../services/uploadService');
const uploadEngine = require('../services/uploadEngine');
const clipSaver = require('../services/clipSaver');
const db = require('../database');

const router = express.Router();

// ============================================
// VALIDATION HELPERS
// ============================================
const VALID_PLATFORMS = ['youtube', 'facebook', 'instagram', 'tiktok'];

const isValidPlatform = (platform) => {
  return VALID_PLATFORMS.includes(platform?.toLowerCase());
};

// ============================================
// PUBLIC CLIPS ROUTE - No auth required
// Returns clips from SQLite for UploadCenter
// ============================================
router.get('/clips', async (req, res) => {
  try {
    console.log('[CLIPS] Fetching clips from SQLite...');
    
// Helper to convert file path to relative URL
    // IMPORTANT: Return relative paths like /output/platform/filename.mp4
    const toRelativeUrl = (filePath) => {
      if (!filePath) return null;
      // If already has full URL, extract the path part
      if (filePath.startsWith('http')) {
        try {
          const url = new URL(filePath);
          return url.pathname;
        } catch {
          return null;
        }
      }
      
      // Normalize relative path: ensure it starts with /output/ or /clips/
      let urlPath = filePath;
      if (!urlPath.startsWith('/output/') && !urlPath.startsWith('/clips/') && 
          !urlPath.startsWith('output/') && !urlPath.startsWith('clips/')) {
        // Add output prefix as default
        urlPath = `/output/${urlPath}`;
      }
      // Ensure it starts with /
      if (!urlPath.startsWith('/')) {
        urlPath = '/' + urlPath;
      }
      return urlPath;
    };
    
    // Helper to generate thumbnail URL from video path
    const getThumbnailUrl = (filePath) => {
      if (!filePath) return null;
      // If it's a video file, replace extension with .jpg
      const basePath = filePath.replace(/\.(mp4|mov|avi|webm|mkv)$/i, '');
      // Check common thumbnail locations
      const possibleThumbPaths = [
        // Same directory as video
        `${basePath}_thumb.jpg`,
        `${basePath}.jpg`,
        // Thumbnails directory
        `/output/thumbnails/${require('path').basename(basePath)}_thumb.jpg`
      ];
      // Return the first one (relative path)
      return possibleThumbPaths[0];
    };
    
    // Helper to generate thumbnail path from video file path
    const generateThumbnailPath = (filePath) => {
      if (!filePath) return null;
      // If video has _clip suffix, replace it with _thumb
      let basePath = filePath.replace(/\.(mp4|mov|avi|webm|mkv)$/i, '');
      return `${basePath}_thumb.jpg`;
    };

    // Get clips from SQLite database using db.all (async)
    db.all("SELECT * FROM clips ORDER BY created_at DESC LIMIT 50", [], async (err, clips) => {
      if (err) {
        console.error('[CLIPS] Error fetching clips:', err.message);
        return res.json([]);
      }
      
      console.log(`[CLIPS] Found ${clips.length} clips`);
      
      // Transform file paths to relative URLs for frontend
      const clipsWithUrls = await Promise.all((clips || []).map(async clip => {
        // Get file path - prefer filePath/filename field
        let filePath = clip.filePath || clip.filename;
        
        // If no filePath, try to construct from video title
        if (!filePath && clip.title) {
          filePath = `/output/${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}_${clip.id}.mp4`;
        }
        
        // Generate relative URL
        const fileUrl = toRelativeUrl(filePath);
        
        // Get thumbnail URL - prefer saved thumbnail_url, then try to generate from file path
        let thumbnailUrl = clip.thumbnail_url || null;
        
        // If no saved thumbnail, try to find or generate one
        if (!thumbnailUrl && filePath) {
          const possibleThumbPath = generateThumbnailPath(filePath);
          const fs = require('fs');
          const path = require('path');
          
          // Check if thumbnail file exists
          const possibleFullPaths = [
            path.join(__dirname, '..', possibleThumbPath),
            path.join(__dirname, '..', 'output', 'thumbnails', path.basename(possibleThumbPath))
          ];
          
          for (const thumbPath of possibleFullPaths) {
            if (fs.existsSync(thumbPath)) {
              thumbnailUrl = toRelativeUrl(thumbPath.replace(path.join(__dirname, '..'), ''));
              break;
            }
          }
        }
        
        // Also generate videoUrl for compatibility
        const videoUrl = fileUrl;
        
        return {
          ...clip,
          // Return relative path for the video player
          url: fileUrl,
          filePath: fileUrl,
          file_path: fileUrl,
          // Add videoUrl and thumbnailUrl for frontend
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          thumbnail: thumbnailUrl,
          // Convert viral_score to viralScore for frontend compatibility
          viralScore: clip.viral_score || clip.score || 0,
          viral_score: clip.viral_score || clip.score || 0
        };
      }));
      
      // Return empty array if no clips
      res.json(clipsWithUrls || []);
    });
  } catch (error) {
    console.error('[CLIPS] Error fetching clips:', error.message);
    // Return empty array on error - don't crash
    res.json([]);
  }
});

// 🔐 SECURITY PATCH: Allowed video MIME types
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/webm',
  'video/x-matroska'
];

// 🔐 SECURITY PATCH: Max file size 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// 🔐 SECURITY PATCH: File filter for video validation
const fileFilter = (req, file, cb) => {
  // Check if file has a valid video mime type
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Upload video dari komputer (local)
router.post('/local', upload.single('video'), async (req, res) => {
  try {
    await uploadService.saveVideoToDB({
      title: req.body.title || req.file.filename,
      filename: req.file.filename,
      platform: 'local'
    });
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      file: req.file
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all saved videos
router.get('/videos', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: videos
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Exchange code for token
router.post('/auth/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const result = await uploadService.exchangeCodeForToken(platform, code);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get platform connection status
router.get('/platform/status', async (req, res) => {
  try {
    const platformStatus = {
      youtube: !!process.env.YOUTUBE_ACCESS_TOKEN,
      facebook: !!process.env.FACEBOOK_ACCESS_TOKEN,
      instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      tiktok: !!process.env.TIKTOK_ACCESS_TOKEN
    };

    res.json({
      success: true,
      data: platformStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:platform', async (req, res) => {
  const { platform } = req.params;
  if (!isValidPlatform(platform)) {
    return res.status(400).json({ success: false, error: `Invalid platform` });
  }
  const { videoPath, metadata, clipId } = req.body;
  if (!videoPath || !metadata) {
    return res.status(400).json({ success: false, error: 'Video path and metadata required' });
  }
  let clipExists = false;
  try {
    if (clipId) {
      const clip = await prisma.video.findUnique({ where: { id: parseInt(clipId) } });
      clipExists = !!clip;
    }
  } catch (err) { console.log('[UPLOAD] Could not verify clip'); }
  if (!clipExists && clipId) {
    return res.status(404).json({ success: false, error: 'Clip not found' });
  }
  try {
    const queueStatus = uploadEngine.getQueueStatus();
    const uploadPromise = uploadEngine.addToQueue({
      platform: platform.toLowerCase(), videoPath, metadata, clipId: clipId || 'unknown'
    });
    res.status(200).json({ success: true, message: 'Upload queued', data: { queuePosition: queueStatus.queueLength, status: 'queued' } });
    uploadPromise.then(() => {
      console.log(`[UPLOAD] Done: ${platform}`);
      // Save clip to SQLite after successful upload
      clipSaver.saveClip({
        title: metadata?.title || `Upload - ${platform}`,
        filename: videoPath ? require('path').basename(videoPath) : 'unknown',
        platform: platform.toLowerCase(),
        duration: metadata?.duration || 0,
        score: metadata?.score || 0
      }).catch(err => console.log('[CLIP SAVE] Error:', err.message));
    }).catch(e => console.error(`[UPLOAD] Fail: ${e.message}`));
  } catch (error) {
    res.status(500).json({ success: false, error: 'Queue failed: ' + error.message });
  }
});

router.get('/queue/status', async (req, res) => {
  try {
    res.json({ success: true, data: uploadEngine.getQueueStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
