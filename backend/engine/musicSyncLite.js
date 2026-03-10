/**
 * OVERLORD 8GB SAFE - Music Sync Lite
 * 
 * Lightweight music overlay for unified pipeline
 * - NO database writes
 * - Creates derived file: *_music.mp4
 * - Respects memory limits
 * - Uses FFmpeg for audio mixing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Get FFmpeg path
 */
function getFFmpegPath() {
  try {
    const { execSync } = require('child_process');
    const result = execSync('where ffmpeg', { encoding: 'utf8', timeout: 5000 });
    const paths = result.split('\n').filter(p => p.trim());
    if (paths.length > 0) return paths[0].trim();
  } catch (e) {}
  return 'ffmpeg';
}

const FFMPEG_PATH = getFFmpegPath();

/**
 * Check memory before processing
 */
function checkMemory() {
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percent = Math.round((usedMem / totalMem) * 100);
    return percent < 90;  // Allow if under 90%
  } catch (e) {
    return true;  // Allow if check fails
  }
}

/**
 * Apply music overlay to video
 * @param {string} inputPath - Input video path (*_raw.mp4)
 * @param {string} outputPath - Output video path (*_music.mp4)
 * @param {Object} options - Music options
 * @returns {Promise<{success: boolean, outputPath: string, error?: string}>}
 */
async function apply(inputPath, outputPath, options = {}) {
  const { musicVolume = 0.3, musicPath = null } = options;
  
  // Check memory first
  if (!checkMemory()) {
    return { success: false, outputPath: '', error: 'Memory too high, skipping music' };
  }
  
  // If no music file, just copy (pass-through)
  if (!musicPath || !fs.existsSync(musicPath)) {
    console.log('[MusicSync] No music file, passing through');
    try {
      fs.copyFileSync(inputPath, outputPath);
      return { success: true, outputPath };
    } catch (e) {
      return { success: false, outputPath: '', error: e.message };
    }
  }
  
  return new Promise((resolve) => {
    try {
      // Mix original audio with music
      const args = [
        '-i', inputPath,
        '-i', musicPath,
        '-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        outputPath
      ];
      
      const ffmpeg = spawn(FFMPEG_PATH, args);
      let errorData = '';
      
      ffmpeg.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          console.log('[MusicSync] Music applied:', outputPath);
          resolve({ success: true, outputPath });
        } else {
          console.error('[MusicSync] Failed:', errorData);
          // Fallback: just copy
          try {
            fs.copyFileSync(inputPath, outputPath);
            resolve({ success: true, outputPath });
          } catch (e) {
            resolve({ success: false, outputPath: '', error: e.message });
          }
        }
      });
      
      ffmpeg.on('error', (err) => {
        console.error('[MusicSync] Spawn error:', err.message);
        // Fallback: copy
        try {
          fs.copyFileSync(inputPath, outputPath);
          resolve({ success: true, outputPath });
        } catch (e) {
          resolve({ success: false, outputPath: '', error: e.message });
        }
      });
      
    } catch (e) {
      console.error('[MusicSync] Error:', e.message);
      resolve({ success: false, outputPath: '', error: e.message });
    }
  });
}

/**
 * Cleanup temp files
 */
function cleanup(tempPaths) {
  for (const p of tempPaths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {}
  }
}

module.exports = {
  apply,
  cleanup,
  checkMemory
};
