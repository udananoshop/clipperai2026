/**
 * OVERLORD 8GB SAFE - Subtitle Lite
 * 
 * Lightweight subtitle overlay for unified pipeline
 * - NO database writes
 * - Creates derived file: *_final.mp4
 * - Respects memory limits
 * - Uses FFmpeg for burning subtitles
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
    return percent < 90;
  } catch (e) {
    return true;
  }
}

/**
 * Create subtitle file from text
 */
function createSubtitleFile(text, outputPath, duration = 10) {
  const srtContent = `1
00:00:00,000 --> 00:00:${String(Math.floor(duration)).padStart(2, '0')},000
${text}
`;
  fs.writeFileSync(outputPath, srtContent, 'utf8');
  return outputPath;
}

/**
 * Apply subtitles to video
 * @param {string} inputPath - Input video path (*_music.mp4)
 * @param {string} outputPath - Output video path (*_final.mp4)
 * @param {Object} options - Subtitle options
 * @returns {Promise<{success: boolean, outputPath: string, error?: string}>}
 */
async function apply(inputPath, outputPath, options = {}) {
  const { subtitleText = '', fontSize = 24, fontColor = 'white', bottomMargin = 50 } = options;
  
  // Check memory first
  if (!checkMemory()) {
    return { success: false, outputPath: '', error: 'Memory too high, skipping subtitles' };
  }
  
  // If no subtitle text, pass through
  if (!subtitleText || subtitleText.trim() === '') {
    console.log('[SubtitleLite] No subtitle text, passing through');
    try {
      fs.copyFileSync(inputPath, outputPath);
      return { success: true, outputPath };
    } catch (e) {
      return { success: false, outputPath: '', error: e.message };
    }
  }
  
  // Create temp subtitle file
  const tempSubPath = outputPath.replace('.mp4', '_temp.srt');
  createSubtitleFile(subtitleText, tempSubPath);
  
  return new Promise((resolve) => {
    try {
      // Burn subtitles into video
      const args = [
        '-i', inputPath,
        '-vf', `subtitles='${tempSubPath}':force_style='FontSize=${fontSize},PrimaryColour=&H${fontColor === 'white' ? 'FFFFFF' : 'FFFFFF'}&,MarginV=${bottomMargin}'`,
        '-c:a', 'copy',
        '-shortest',
        outputPath
      ];
      
      const ffmpeg = spawn(FFMPEG_PATH, args);
      let errorData = '';
      
      ffmpeg.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        // Cleanup temp subtitle
        try { fs.unlinkSync(tempSubPath); } catch (e) {}
        
        if (code === 0 && fs.existsSync(outputPath)) {
          console.log('[SubtitleLite] Subtitles applied:', outputPath);
          resolve({ success: true, outputPath });
        } else {
          console.error('[SubtitleLite] Failed:', errorData);
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
        console.error('[SubtitleLite] Spawn error:', err.message);
        try { fs.unlinkSync(tempSubPath); } catch (e) {}
        // Fallback: copy
        try {
          fs.copyFileSync(inputPath, outputPath);
          resolve({ success: true, outputPath });
        } catch (e) {
          resolve({ success: false, outputPath: '', error: e.message });
        }
      });
      
    } catch (e) {
      console.error('[SubtitleLite] Error:', e.message);
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
  checkMemory,
  createSubtitleFile
};
