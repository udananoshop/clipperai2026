const express = require('express');
const prisma = require('../prisma/client');

const router = express.Router();

// Get backend URL from environment or use default
const getBaseUrl = () => {
  return process.env.BACKEND_URL || 'http://localhost:3001';
};

// Helper to convert file path to full URL
const toFullUrl = (filePath) => {
  if (!filePath) return null;
  // If already has full URL, return as is
  if (filePath.startsWith('http')) return filePath;
  
  // Ensure it has the correct prefix
  let urlPath = filePath;
  if (filePath && !filePath.startsWith('http')) {
    // If it's a relative path like "clip_123.mp4", add /output/ prefix
    if (!filePath.startsWith('output/') && !filePath.startsWith('/output/')) {
      urlPath = `/output/${filePath}`;
    } else if (!filePath.startsWith('/')) {
      urlPath = `/${filePath}`;
    }
  }
  
  // Add base URL prefix
  return `${getBaseUrl()}${urlPath}`;
};

// ============================================
// PUBLIC CLIPS ROUTE - No auth required
// Returns clips for UploadCenter
// ============================================
router.get('/', async (req, res) => {
  try {
    console.log('[CLIPS] Fetching clips from database...');
    
    // Get clips from database using Prisma
    const clips = await prisma.clip.findMany({
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
    });
    
    console.log(`[CLIPS] Found ${clips.length} clips`);
    
    // Helper to generate thumbnail path from video file path
    const generateThumbnailPath = (filePath) => {
      if (!filePath) return null;
      let basePath = filePath.replace(/\.(mp4|mov|avi|webm|mkv)$/i, '');
      return `${basePath}_thumb.jpg`;
    };

    // Transform file paths to relative URLs for frontend
    // IMPORTANT: Return relative paths like /output/platform/filename.mp4
    // Frontend will prepend BACKEND_URL
    const fs = require('fs');
    const path = require('path');
    
    const clipsWithUrls = (clips || []).map(clip => {
      // Get file path from clip record
      let filePath = clip.filePath;
      
      // If no filePath, try to construct from video filename
      if (!filePath && clip.video) {
        const videoFilename = clip.video.filename;
        if (videoFilename) {
          // Check if it's already a full path or just a filename
          if (videoFilename.includes('/') || videoFilename.includes('\\')) {
            // It's already a path, use as is
            filePath = videoFilename;
          } else {
            // Just a filename, add output prefix
            filePath = `/output/${videoFilename}`;
          }
        }
      }
      
      // Normalize path: ensure it starts with /output/ or /clips/
      let urlPath = filePath;
      if (urlPath && !urlPath.startsWith('http')) {
        if (!urlPath.startsWith('/output/') && !urlPath.startsWith('/clips/') && !urlPath.startsWith('output/') && !urlPath.startsWith('clips/')) {
          urlPath = `/output/${urlPath}`;
        }
        // Ensure it starts with /
        if (!urlPath.startsWith('/')) {
          urlPath = '/' + urlPath;
        }
      }
      
      // Get thumbnail URL - prefer saved thumbnailUrl, then check file system
      let thumbnailUrl = clip.thumbnailUrl || null;
      
      // If no saved thumbnail, try to find thumbnail file
      if (!thumbnailUrl && filePath) {
        const possibleThumbPath = generateThumbnailPath(filePath);
        const possibleFullPaths = [
          path.join(__dirname, '..', possibleThumbPath),
          path.join(__dirname, '..', 'output', 'thumbnails', path.basename(possibleThumbPath))
        ];
        
        for (const thumbPath of possibleFullPaths) {
          if (fs.existsSync(thumbPath)) {
            thumbnailUrl = thumbPath.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/');
            if (!thumbnailUrl.startsWith('/')) {
              thumbnailUrl = '/' + thumbnailUrl;
            }
            break;
          }
        }
      }
      
      return {
        ...clip,
        // Return relative path for the video player
        url: urlPath,
        filePath: urlPath,
        file_path: urlPath,
        // Add thumbnailUrl for frontend
        thumbnailUrl: thumbnailUrl,
        thumbnail: thumbnailUrl,
        videoUrl: urlPath,
        // Convert viralScore to viral_score for legacy compatibility
        viralScore: clip.viralScore,
        viral_score: clip.viralScore
      };
    });
    
    // Return empty array if no clips (don't throw error)
    res.json(clipsWithUrls);
  } catch (error) {
    console.error('[CLIPS] Error fetching clips:', error.message);
    // Return empty array on error - don't crash
    res.json([]);
  }
});

module.exports = router;
