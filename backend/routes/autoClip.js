const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateClips, checkMemorySafety } = require('../engine/autoClipEngine');
const { downloadVideo } = require('../services/downloader');
const clipSaver = require('../services/clipSaver');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `autoclip_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, WebM allowed.'));
    }
  }
});

const jobStatus = new Map();

router.post('/generate', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { platform, duration, smartTrim, autoSubtitle, autoTranslate, addMusic, smartHook } = req.body;

    const videoPath = req.file.path;
    const jobId = `job_${Date.now()}`;
    const isSmartTrim = smartTrim === 'true' || smartTrim === true;

    jobStatus.set(jobId, {
      id: jobId,
      status: 'processing',
      progress: 0,
      message: isSmartTrim ? 'Starting smart trim...' : 'Starting...',
      videoPath,
      platform: platform || 'youtube_shorts',
      smartTrim: isSmartTrim,
      createdAt: new Date()
    });

    generateClips(videoPath, {
      jobId: jobId,
      platform: platform || 'youtube_shorts',
      duration: parseInt(duration) || 30,
      options: {
        smartTrim: isSmartTrim,
        autoSubtitle: autoSubtitle === 'true',
        autoTranslate: autoTranslate === 'true',
        addMusic: addMusic === 'true',
        smartHook: smartHook === 'true'
      },
      onProgress: (progress) => {
        const job = jobStatus.get(jobId);
        if (job) {
          job.status = progress.stage === 'complete' ? 'completed' : 'processing';
          job.progress = progress.percent || 0;
          job.message = progress.stage || 'Processing';
          jobStatus.set(jobId, job);
        }
      }
    }).then((result) => {
      const job = jobStatus.get(jobId);
      if (job) {
        job.status = result.success ? 'completed' : 'failed';
        job.progress = 100;
        job.message = result.success ? 'Clips generated!' : 'Generation failed';
        job.clips = result.clips;
        job.error = result.error;
        jobStatus.set(jobId, job);
        
        // Save clips to SQLite after successful generation
        if (result.success && result.clips) {
          Object.entries(result.clips).forEach(([platform, clipPath]) => {
            if (clipPath && fs.existsSync(clipPath)) {
              clipSaver.saveClip({
                title: `AutoClip - ${platform}`,
                filename: path.basename(clipPath),
                platform: platform,
                duration: parseInt(duration) || 30,
                score: 0
              }).catch(err => console.log('[CLIP SAVE] Error:', err.message));
            }
          });
        }
      }
    }).catch((error) => {
      const job = jobStatus.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        jobStatus.set(jobId, job);
      }
    });

    res.json({
      success: true,
      jobId,
      message: isSmartTrim ? 'Smart clip generation started' : 'Clip generation started'
    });

  } catch (error) {
    console.error('Auto clip error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobStatus.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

router.get('/clips/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobStatus.get(jobId);
  
  if (!job || !job.clips) {
    return res.status(404).json({ error: 'No clips found' });
  }

  const clipsArray = Object.entries(job.clips).map(([platform, clipPath]) => ({
    platform,
    path: clipPath,
    url: clipPath ? `/output/${platform}/${path.basename(clipPath)}` : null
  })).filter(c => c.path);

  res.json({
    clips: clipsArray
  });
});

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const clipsDir = path.join(__dirname, '..', 'output');
  const filePath = path.join(clipsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

router.get('/presets', (req, res) => {
  res.json({
    platforms: [
      { id: 'tiktok', name: 'TikTok', resolution: '1080x1920', aspectRatio: '9:16' },
      { id: 'instagram', name: 'Instagram', resolution: '1080x1920', aspectRatio: '9:16' },
      { id: 'youtube_shorts', name: 'YouTube Shorts', resolution: '1080x1920', aspectRatio: '9:16' },
      { id: 'youtube_normal', name: 'YouTube', resolution: '1920x1080', aspectRatio: '16:9' },
      { id: 'facebook', name: 'Facebook', resolution: '1080x1080', aspectRatio: '1:1' }
    ],
    durations: [
      { value: '30', label: '30 seconds' },
      { value: '45', label: '45 seconds' },
      { value: '60', label: '60 seconds' }
    ],
    features: {
      smartTrim: {
        name: 'Smart Trim Mode',
        description: 'Removes boring parts and keeps high-energy moments automatically',
        default: true
      }
    }
  });
});

router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, reason: 'INVALID_URL', message: 'URL is required' });
    }

    console.log('[Download] Starting download for:', url);
    
    const result = await downloadVideo(url);
    
    if (result.success) {
      res.json({
        success: true,
        filePath: result.filePath,
        filename: result.filename,
        title: result.title,
        platform: result.platform,
        message: 'Download complete!'
      });
    } else {
      const errorMessages = {
        'PRIVATE_VIDEO': 'Video private. Please use public video.',
        'AGE_RESTRICTED': 'Age restricted video.',
        'UNAVAILABLE': 'Video unavailable.',
        'UNSUPPORTED': 'Platform not supported.',
        'LOGIN_REQUIRED': 'Login required to access this content.',
        'INVALID_URL': 'Invalid URL format.',
        'TIMEOUT': 'Download timed out. Please try again.',
        'YTDLP_NOT_FOUND': 'Download tool not found. Please install yt-dlp.',
        'DOWNLOAD_FAILED': 'Download failed. Please try again.'
      };
      
      res.json({
        success: false,
        reason: result.reason,
        message: errorMessages[result.reason] || 'Download failed'
      });
    }
  } catch (error) {
    console.error('[Download] Error:', error);
    res.status(500).json({ success: false, reason: 'SERVER_ERROR', message: 'Server error' });
  }
});

// ===================================================================
// AUTO CLIP TRIGGER - Generate clips for uploaded video
// POST /api/auto-clip/trigger/:videoId
// ===================================================================
router.post('/trigger/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { duration } = req.body;
    
    const videoIdNum = Number(videoId);
    if (isNaN(videoIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid video ID' });
    }
    
    console.log('[AutoClip Trigger] Request for video:', videoIdNum);
    
    const autoClipTrigger = require('../services/autoClipTriggerService');
    
    const result = await autoClipTrigger.triggerAutoClip(videoIdNum, {
      duration: duration || 30
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        jobId: result.jobId,
        videoId: result.videoId,
        platforms: result.platforms,
        clips: result.clips,
        viralScores: result.viralScores
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[AutoClip Trigger] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// GET CLIPS FOR A VIDEO
// GET /api/auto-clip/video/:videoId/clips
// ===================================================================
router.get('/video/:videoId/clips', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoIdNum = Number(videoId);
    
    if (isNaN(videoIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid video ID' });
    }
    
    const autoClipTrigger = require('../services/autoClipTriggerService');
    const result = await autoClipTrigger.getClipsByVideoId(videoIdNum);
    
    res.json(result);
  } catch (error) {
    console.error('[AutoClip Get Clips] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// GET EXPORT FILES FOR A VIDEO
// GET /api/auto-clip/video/:videoId/exports
// ===================================================================
router.get('/video/:videoId/exports', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoIdNum = Number(videoId);
    
    if (isNaN(videoIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid video ID' });
    }
    
    const autoClipTrigger = require('../services/autoClipTriggerService');
    const result = await autoClipTrigger.getVideoExports(videoIdNum);
    
    res.json(result);
  } catch (error) {
    console.error('[AutoClip Get Exports] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// GET AUTO CLIP STATUS
// GET /api/auto-clip/status
// ===================================================================
router.get('/status', (req, res) => {
  try {
    const autoClipTrigger = require('../services/autoClipTriggerService');
    const status = autoClipTrigger.getStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('[AutoClip Status] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
