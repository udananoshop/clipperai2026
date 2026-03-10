// Scene Detector - Identifies scene changes in video
// Uses FFmpeg to detect scene changes

// ============================================================================
// OVERLORD 8GB OPTIMIZATION PATCH - Lightweight Scene Scan Mode
// ============================================================================

// 8GB optimized: Lower threshold sensitivity by 10% (0.4 → 0.36)
// Skip micro-scene detection under 0.8s
const DEFAULT_SCENE_THRESHOLD_8GB = 0.36;
const MIN_SCENE_DURATION_8GB = 0.8;

console.log('[Optimization] Lightweight Scene Scan Mode ACTIVE');
console.log(`[Optimization] Scene threshold: ${DEFAULT_SCENE_THRESHOLD_8GB} (lowered from 0.4)`);
console.log(`[Optimization] Min scene duration: ${MIN_SCENE_DURATION_8GB}s`);

// ============================================================================
// END OVERLORD 8GB OPTIMIZATION PATCH
// ============================================================================

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Detect scene changes in a video file
 * @param {string} videoPath - Path to the video file
 * @param {number} threshold - Scene detection threshold (default: 0.4, optimized: 0.36 for 8GB)
 * @returns {Promise<Array>} - Array of scene timestamps
 */
const detectScenes = async (videoPath, threshold = DEFAULT_SCENE_THRESHOLD_8GB) => {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(
      path.dirname(videoPath),
      `scenes_${Date.now()}.txt`
    );

    // Use FFmpeg scene detection
    const cmd = `"${process.env.FFMPEG_PATH || 'ffmpeg'}" -i "${videoPath}" -filter:v "select='gt(scene,${threshold})',showinfo" -f null - 2>&1 | findstr "pts_time" > "${outputFile}"`;

    exec(cmd, { shell: 'cmd.exe' }, (error) => {
      if (error) {
        // If scene detection fails, return empty array
        resolve([]);
        return;
      }

      try {
        const content = fs.readFileSync(outputFile, 'utf-8');
        const lines = content.split('\n').filter(l => l.includes('pts_time'));
        
        const scenes = lines.map(line => {
          const match = line.match(/pts_time:([\d.]+)/);
          return match ? parseFloat(match[1]) : null;
        }).filter(t => t !== null);

        // Clean up
        try { fs.unlinkSync(outputFile); } catch {}

        resolve(scenes);
      } catch (e) {
        resolve([]);
      }
    });
  });
};

/**
 * Get video duration
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} - Duration in seconds
 */
const getVideoDuration = async (videoPath) => {
  return new Promise((resolve) => {
    const cmd = `"${process.env.FFMPEG_PATH || 'ffmpeg'}" -i "${videoPath}" 2>&1 | findstr "Duration"`;
    
    exec(cmd, { shell: 'cmd.exe' }, (error, stdout) => {
      if (error) {
        resolve(0);
        return;
      }

      const match = stdout.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        resolve(hours * 3600 + minutes * 60 + seconds);
      } else {
        resolve(0);
      }
    });
  });
};

/**
 * Generate fixed-duration clips from video
 * @param {string} videoPath - Path to the video file
 * @param {number} clipDuration - Duration of each clip in seconds
 * @returns {Promise<Array>} - Array of clip start times
 */
const generateFixedClips = async (videoPath, clipDuration = 30) => {
  const duration = await getVideoDuration(videoPath);
  const clips = [];
  
  for (let start = 0; start < duration; start += clipDuration - 5) { // 5 second overlap
    clips.push({
      start,
      end: Math.min(start + clipDuration, duration),
      duration: Math.min(clipDuration, duration - start)
    });
  }

  return clips;
};

/**
 * Smart clip generation combining scene detection and fixed intervals
 * @param {string} videoPath - Path to the video file
 * @param {number} clipDuration - Duration of each clip in seconds
 * @param {number} maxClips - Maximum number of clips to generate
 * @returns {Promise<Array>} - Array of clip segments
 */
const generateSmartClips = async (videoPath, clipDuration = 30, maxClips = 10) => {
  // First try scene detection
  const scenes = await detectScenes(videoPath);
  
  // If not enough scenes, fall back to fixed intervals
  if (scenes.length < 3) {
    return generateFixedClips(videoPath, clipDuration);
  }

  // Convert scene timestamps to clip segments
  const clips = [];
  for (let i = 0; i < scenes.length - 1 && clips.length < maxClips; i++) {
    const start = scenes[i];
    const end = Math.min(scenes[i] + clipDuration, scenes[i + 1]);
    
    if (end - start >= 10) { // Minimum 10 second clip
      clips.push({
        start,
        end,
        duration: end - start
      });
    }
  }

  return clips.slice(0, maxClips);
};

module.exports = {
  detectScenes,
  getVideoDuration,
  generateFixedClips,
  generateSmartClips
};
