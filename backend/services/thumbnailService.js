/**
 * Thumbnail Generation Service
 * Lightweight FFmpeg thumbnail generation for 8GB RAM systems
 * 
 * Usage: ffmpeg -i clip.mp4 -ss 00:00:01 -vframes 1 clip.jpg
 * 
 * Optimizations:
 * - Single frame extraction (no video processing)
 * - Low resolution output (320px width)
 * - Fast encoding (single thread)
 * - No memory-intensive operations
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

/**
 * Generate a thumbnail from a video file
 * @param {string} videoPath - Path to the video file
 * @param {string} outputDir - Directory to save the thumbnail
 * @param {Object} options - Thumbnail options
 * @returns {Promise<string|null>} - Path to generated thumbnail or null on failure
 */
async function generateThumbnail(videoPath, outputDir, options = {}) {
  const {
    timestamp = '00:00:01',    // Extract frame at 1 second
    width = 320,                // Low resolution for thumbnail
    quality = 2,                // JPEG quality (1-31, lower is better)
    timeout = 30000             // 30 second timeout
  } = options;

  try {
    // Validate input
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.log('[Thumbnail] Video not found:', videoPath);
      return null;
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate thumbnail filename
    const videoBasename = path.basename(videoPath, path.extname(videoPath));
    const thumbnailFilename = `${videoBasename}_thumb.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailFilename);

    // FFmpeg command: extract single frame at specified timestamp
    // -ss: seek to timestamp (before input for faster seeking)
    // -vframes 1: extract only 1 frame
    // -q:v: JPEG quality (2-31, lower is better)
    // -vf scale: resize to width while maintaining aspect ratio
    const args = [
      '-ss', timestamp,
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', String(quality),
      '-vf', `scale=${width}:-1`,
      '-y',  // Overwrite output
      thumbnailPath
    ];

    console.log('[Thumbnail] Generating:', thumbnailFilename);

    await runFFmpeg(args, timeout);

    // Verify thumbnail was created
    if (fs.existsSync(thumbnailPath)) {
      const stats = fs.statSync(thumbnailPath);
      console.log('[Thumbnail] Created:', thumbnailFilename, `(${(stats.size / 1024).toFixed(1)}KB)`);
      return thumbnailPath;
    }

    console.log('[Thumbnail] Failed to create:', thumbnailFilename);
    return null;

  } catch (error) {
    console.log('[Thumbnail] Error:', error.message);
    return null;
  }
}

/**
 * Generate thumbnail from relative video path
 * Infers output directory from video path
 * @param {string} videoPath - Path to video file
 * @param {Object} options - Thumbnail options
 * @returns {Promise<string|null>} - Relative path to thumbnail
 */
async function generateThumbnailFromPath(videoPath, options = {}) {
  try {
    if (!videoPath) return null;

    // Handle absolute paths
    let absoluteVideoPath = videoPath;
    if (!path.isAbsolute(videoPath)) {
      absoluteVideoPath = path.join(__dirname, '..', videoPath);
    }

    // Determine output directory (same as video, or fallback to output/thumbnails)
    let outputDir = path.dirname(absoluteVideoPath);
    
    // If video is in output/platform/, save thumbnail there
    // Otherwise use output/thumbnails/
    const outputBase = path.join(__dirname, '..', 'output');
    const thumbnailsDir = path.join(outputBase, 'thumbnails');
    
    if (!outputDir.startsWith(outputBase)) {
      outputDir = thumbnailsDir;
    }

    const thumbnailPath = await generateThumbnail(absoluteVideoPath, outputDir, options);
    
    if (thumbnailPath) {
      // Return relative path for database storage
      const relativePath = path.relative(path.join(__dirname, '..'), thumbnailPath);
      return relativePath.replace(/\\/g, '/'); // Normalize for Windows
    }

    return null;

  } catch (error) {
    console.log('[Thumbnail] Error generating from path:', error.message);
    return null;
  }
}

/**
 * Run FFmpeg command with timeout
 */
function runFFmpeg(args, timeout) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(FFMPEG_PATH, args, {
      shell: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let errorData = '';

    ffmpeg.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      try { ffmpeg.kill(); } catch (e) {}
      reject(new Error('FFmpeg timeout'));
    }, timeout);
  });
}

/**
 * Batch generate thumbnails for multiple videos
 * @param {Array<{videoPath: string, outputDir: string}>} videos - Array of video configs
 * @returns {Promise<Array<{videoPath: string, thumbnailPath: string|null}>>}
 */
async function generateBatchThumbnails(videos) {
  const results = [];
  
  for (const { videoPath, outputDir } of videos) {
    const thumbnailPath = await generateThumbnail(videoPath, outputDir);
    results.push({ videoPath, thumbnailPath });
    
    // Small delay between generations to prevent memory spikes
    await new Promise(r => setTimeout(r, 100));
  }
  
  return results;
}

module.exports = {
  generateThumbnail,
  generateThumbnailFromPath,
  generateBatchThumbnails
};

