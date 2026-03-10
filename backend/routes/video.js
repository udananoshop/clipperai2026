const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');
const { generateClips } = require('../engine/autoClipEngine');

const router = express.Router();

// Simple duplicate processing prevention
const processingSet = new Set();

// 🔍 DEBUG: List uploaded files in uploads folder
router.get('/debug/list-files', async (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const videoFiles = files.filter(f => f.endsWith('.mp4'));
    res.json({ success: true, count: videoFiles.length, files: videoFiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 DEBUG: Get video count directly from database
router.get('/debug/count', async (req, res) => {
  try {
    const count = await prisma.video.count();
    console.log('[DEBUG] Video count from DB:', count);
    
    const videos = await prisma.video.findMany({ take: 5 });
    console.log('[DEBUG] Sample videos:', JSON.stringify(videos, null, 2));
    
    res.json({ 
      success: true, 
      count,
      sampleVideos: videos.map(v => ({ id: v.id, filename: v.filename, title: v.title, createdAt: v.createdAt }))
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 DEBUG: Get clips count directly from database
router.get('/debug/clips-count', async (req, res) => {
  try {
    const count = await prisma.clip.count();
    console.log('[DEBUG] Clips count from DB:', count);
    res.json({ success: true, count });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// UPLOAD DIRECTORY SETUP - CREATE IF NOT EXISTS
// ===================================================================
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('[UPLOAD] Created uploads directory:', uploadDir);
}

// Ensure uploads/videos subdirectory exists
const videosDir = path.join(uploadDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Configure multer for video uploads - SIMPLE & STABLE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1000 * 1024 * 1024 // 1000MB (1GB) limit
  }
});

// ===================================================================
// SIMPLE UPLOAD ROUTE - ALWAYS RETURNS RESPONSE
// ===================================================================
router.post('/upload-simple', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const userId = parseInt(req.headers['x-user-id']) || 1;

    const video = await prisma.video.create({
      data: {
        title: req.body.title || req.file.originalname,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        userId: userId
      }
    });

    // AUTO CLIP TRIGGER (non-blocking)
    const videoPath = path.join(__dirname, '..', 'uploads', req.file.filename);
    console.log('🚀 AutoClip Triggered:', videoPath);
    
    if (!processingSet.has(videoPath)) {
      processingSet.add(videoPath);
      setImmediate(() => {
        generateClips(videoPath)
          .then(() => { console.log('🔥 AutoClip Completed'); processingSet.delete(videoPath); })
          .catch(err => { console.error('❌ AutoClip Error:', err); processingSet.delete(videoPath); });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        id: video.id,
        title: video.title,
        filename: video.filename,
        originalName: video.originalName,
        size: video.size,
        createdAt: video.createdAt
      }
    });

  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + err.message 
    });
  }
});

// ===================================================================
// AUTHENTICATED UPLOAD ROUTE
// ===================================================================
router.post('/upload', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const userId = req.user?.id || 1;

    const video = await prisma.video.create({
      data: {
        title: req.body.title || req.file.originalname,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        userId: userId
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        id: video.id,
        title: video.title,
        filename: video.filename,
        originalName: video.originalName,
        size: video.size,
        createdAt: video.createdAt
      }
    });

  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + err.message 
    });
  }
});

// Other routes
router.get('/', authMiddleware, videoController.getVideos);
router.delete('/:id', authMiddleware, videoController.deleteVideo);
router.post('/bulk-delete', authMiddleware, videoController.bulkDelete);
router.post('/download', authMiddleware, videoController.downloadVideo);
router.post('/clip', authMiddleware, videoController.createClip);
router.get('/clips', authMiddleware, videoController.getClips);
router.get('/stats', authMiddleware, videoController.getStats);
router.post('/subtitles', authMiddleware, videoController.generateSubtitles);

// Video streaming endpoint
router.get('/:id/stream', authMiddleware, videoController.streamVideo);

// TikTok Export
router.post('/export/tiktok/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await prisma.video.findUnique({ where: { id: Number(id) } });
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
    
    const sourcePath = path.join(__dirname, '..', 'uploads', video.filename);
    if (!fs.existsSync(sourcePath)) return res.status(404).json({ success: false, error: 'Source file not found' });
    
    const downloadsDir = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    
    const exportName = 'tiktok-' + Date.now() + '.mp4';
    const exportPath = path.join(downloadsDir, exportName);
    fs.copyFileSync(sourcePath, exportPath);
    
    res.json({ success: true, file: exportName, url: 'http://localhost:3001/downloads/' + exportName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shorts Export
router.post('/export/shorts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await prisma.video.findUnique({ where: { id: Number(id) } });
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
    
    const sourcePath = path.join(__dirname, '..', 'uploads', video.filename);
    if (!fs.existsSync(sourcePath)) return res.status(404).json({ success: false, error: 'Source file not found' });
    
    const downloadsDir = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    
    const exportName = 'shorts-' + Date.now() + '.mp4';
    const exportPath = path.join(downloadsDir, exportName);
    fs.copyFileSync(sourcePath, exportPath);
    
    res.json({ success: true, file: exportName, url: 'http://localhost:3001/downloads/' + exportName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Captions
router.post('/:id/captions', async (req, res) => {
  try {
    const { id } = req.params;
    const captionFile = 'captions_' + id + '_' + Date.now() + '.srt';
    res.json({ success: true, captionFile: captionFile, url: 'http://localhost:3001/api/captions/' + captionFile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UNIFIED EXPORT ENDPOINT
router.post('/export/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { platform } = req.body;
    
    const video = await prisma.video.findUnique({
      where: { id: Number(videoId) }
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    const sourcePath = path.join(__dirname, '..', 'uploads', video.filename);
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ success: false, error: 'Source file not found' });
    }
    
    const outputDir = path.join(__dirname, '..', 'output', platform || 'tiktok');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const exportName = 'export_' + videoId + '_' + Date.now() + '_' + (platform || 'tiktok') + '.mp4';
    const exportPath = path.join(outputDir, exportName);
    
    fs.copyFileSync(sourcePath, exportPath);
    
    const downloadUrl = 'http://localhost:3001/output/' + (platform || 'tiktok') + '/' + exportName;
    
    res.json({
      success: true,
      message: 'Video exported successfully',
      data: {
        videoId: Number(videoId),
        platform: platform || 'tiktok',
        filename: exportName,
        url: downloadUrl,
        path: exportPath
      }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET EXPORT STATUS
router.get('/export/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await prisma.video.findUnique({
      where: { id: Number(videoId) }
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    const outputDir = path.join(__dirname, '..', 'output');
    const exports = [];
    
    const platforms = ['tiktok', 'instagram', 'facebook', 'youtube', 'shorts'];
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const platformDir = path.join(outputDir, platform);
      if (fs.existsSync(platformDir)) {
        const files = fs.readdirSync(platformDir).filter(f => f.startsWith('export_' + videoId + '_') && f.endsWith('.mp4'));
        
        for (let j = 0; j < files.length; j++) {
          const file = files[j];
          exports.push({
            platform: platform,
            filename: file,
            url: 'http://localhost:3001/output/' + platform + '/' + file
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        videoId: Number(videoId),
        title: video.title,
        exports: exports
      }
    });
    
  } catch (error) {
    console.error('Export status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ALL AVAILABLE EXPORTS FOR A VIDEO
router.get('/:id/exports', async (req, res) => {
  try {
    const { id } = req.params;
    const videoId = Number(id);
    
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    const outputDir = path.join(__dirname, '..', 'output');
    const exports = [];
    
    const platformDirs = [
      { dir: 'tiktok', name: 'TikTok', icon: 'tiktok' },
      { dir: 'instagram', name: 'Instagram Reels', icon: 'instagram' },
      { dir: 'youtube', name: 'YouTube', icon: 'youtube' },
      { dir: 'facebook', name: 'Facebook', icon: 'facebook' }
    ];
    
    for (let i = 0; i < platformDirs.length; i++) {
      const platform = platformDirs[i];
      const platformDir = path.join(outputDir, platform.dir);
      if (fs.existsSync(platformDir)) {
        const files = fs.readdirSync(platformDir).filter(f => f.endsWith('.mp4'));
        
        const matchingFiles = files.filter(f => {
          return f.includes('_' + videoId + '_') || 
                 f.includes('_' + video.filename.split('.')[0]) ||
                 f.includes('-' + videoId + '-') ||
                 f.includes('-' + videoId + '_');
        });
        
        for (let j = 0; j < matchingFiles.length; j++) {
          const file = matchingFiles[j];
          const filePath = path.join(platformDir, file);
          const stats = fs.statSync(filePath);
          exports.push({
            id: platform.dir + '_' + file,
            platform: platform.dir,
            platformName: platform.name,
            icon: platform.icon,
            filename: file,
            size: stats.size,
            url: 'http://localhost:3001/output/' + platform.dir + '/' + file,
            createdAt: stats.mtime
          });
        }
      }
    }
    
    const clips = await prisma.clip.findMany({
      where: { videoId: videoId },
      orderBy: { createdAt: 'desc' }
    });
    
    for (let k = 0; k < clips.length; k++) {
      const clip = clips[k];
      exports.push({
        id: 'clip_' + clip.id,
        platform: clip.platform || 'youtube',
        platformName: clip.platform ? clip.platform.charAt(0).toUpperCase() + clip.platform.slice(1) : 'YouTube',
        icon: 'video',
        filename: clip.title,
        viralScore: clip.viralScore,
        confidence: clip.confidence,
        createdAt: clip.createdAt
      });
    }
    
    res.json({
      success: true,
      data: {
        videoId: videoId,
        title: video.title,
        filename: video.filename,
        hasExports: exports.length > 0,
        exports: exports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      }
    });
    
  } catch (error) {
    console.error('Get exports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// SYNC FILES - Sync uploaded files to database
// POST /api/video/sync-files
// ===================================================================
router.post('/sync-files', async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadDir);

    const existingVideos = await prisma.video.findMany();
    const existingNames = existingVideos.map(function(v) { return v.filename; });

    let added = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!existingNames.includes(file) && file.endsWith('.mp4')) {
        await prisma.video.create({
          data: {
            title: file,
            filename: file
          }
        });
        added++;
      }
    }

    res.json({ success: true, added: added });
  } catch (error) {
    console.error('SYNC ERROR:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
