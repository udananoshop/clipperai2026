// ============ SMART CUT V3 - SPEECH SENSITIVE MODE ============
// Silence Detector with SPEECH GUARD BUFFER
// Avoids cutting mid-sentence

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============ SMART CUT V3 CONSTANTS ============
const MIN_CLIP_DURATION = 3.5;       // Minimum clip length (was 2.8s)
const MAX_CLIP_DURATION = 45;        // Maximum clip length
const SILENCE_THRESHOLD_DB = -35;    // Silence threshold in dB (was -38dB)
const SILENCE_MIN_MS = 400;         // Minimum silence in ms (was 420ms)
const SPEECH_GUARD_BUFFER_MS = 250;  // 0.25s before/after silence

// ============ V3 LOGGING ============
function logV3(message) {
  console.log(`[SmartCut V3] ${message}`);
}

/**
 * Detect silence periods in video - Smart Cut V3
 * Uses FFmpeg silencedetect filter with V3 parameters
 * @param {string} videoPath - Path to the video file
 * @param {number} threshold - Silence threshold in dB (default: -35)
 * @param {number} minDuration - Minimum silence duration in seconds (default: 0.4 = 400ms)
 * @returns {Promise<Array>} - Array of silence timestamps
 */
const detectSilence = async (videoPath, threshold = SILENCE_THRESHOLD_DB, minDuration = SILENCE_MIN_MS / 1000) => {
  logV3(`Detecting silence: threshold=${threshold}dB, minDuration=${minDuration}s`);
  
  return new Promise((resolve) => {
    const outputFile = path.join(
      path.dirname(videoPath),
      `silence_${Date.now()}.txt`
    );

    // Use FFmpeg silencedetect filter with V3 parameters
    const cmd = `"${process.env.FFMPEG_PATH || 'ffmpeg'}" -i "${videoPath}" -af "silencedetect=noise=${threshold}dB:d=${minDuration}" -f null - 2>&1 | findstr "silence_start|silence_end" > "${outputFile}"`;

    exec(cmd, { shell: 'cmd.exe' }, (error) => {
      if (error) {
        logV3('Silence detection failed, returning empty array');
        resolve([]);
        return;
      }

      try {
        const content = fs.readFileSync(outputFile, 'utf-8');
        const lines = content.split('\n').filter(l => l.includes('silence_'));
        
        const silences = [];
        let currentSilence = null;

        lines.forEach(line => {
          if (line.includes('silence_start')) {
            const match = line.match(/silence_start: ([\d.]+)/);
            if (match) {
              currentSilence = { start: parseFloat(match[1]) };
            }
          } else if (line.includes('silence_end') && currentSilence) {
            const match = line.match(/silence_end: ([\d.]+)/);
            if (match) {
              currentSilence.end = parseFloat(match[1]);
              currentSilence.duration = currentSilence.end - currentSilence.start;
              silences.push(currentSilence);
              currentSilence = null;
            }
          }
        });

        // Clean up
        try { fs.unlinkSync(outputFile); } catch {}

        logV3(`Silence detected: ${silences.length} valid silence periods found`);
        resolve(silences);
      } catch (e) {
        logV3('Error parsing silence data: ' + e.message);
        resolve([]);
      }
    });
  });
};

/**
 * Find optimal cut points from silence detection - Smart Cut V3
 * V3 Rules:
 * - CUT only at silence >= 0.4s
 * - Audio level below -35dB
 * - ADD 0.25s SPEECH GUARD BUFFER before silence start AND after silence end
 * - MIN clip length: 3.5 seconds
 * - MAX clip length: 45 seconds
 * @param {string} videoPath - Path to the video file
 * @param {number} clipDuration - Target clip duration
 * @returns {Promise<Array>} - Array of cut points with V3 metadata
 */
const findCutPoints = async (videoPath, clipDuration = 30) => {
  const silences = await detectSilence(videoPath);
  
  if (silences.length === 0) {
    logV3('No silence detected - no valid cut points found');
    return [];
  }

  logV3(`Analyzing ${silences.length} silence periods for cut points...`);
  
  // V3: Cut ONLY at silence >= 0.4s (400ms)
  const cutPoints = [];
  const minSilenceDuration = SILENCE_MIN_MS / 1000; // 0.4 seconds
  
  // Find silence points good for cutting (between 0.4s and 3s)
  const goodSilence = silences.filter(s => s.duration >= minSilenceDuration && s.duration <= 3);
  
  logV3(`Found ${goodSilence.length} valid silence gaps for cutting`);
  
  goodSilence.forEach(silence => {
    // V3: Add SPEECH GUARD BUFFER - 0.25s before silence start, 0.25s after silence end
    const bufferSeconds = SPEECH_GUARD_BUFFER_MS / 1000; // 0.25s
    
    // Cut point is at silence end + buffer (to avoid cutting mid-sentence)
    const cutTime = silence.end + bufferSeconds;
    
    // V3: Only add cut point if clip duration >= MIN_CLIP_DURATION (3.5s)
    if (cutTime >= MIN_CLIP_DURATION) {
      cutPoints.push({
        time: cutTime,
        type: 'silence',
        confidence: Math.min(silence.duration / 2, 1),
        // V3 metadata with speech guard buffer
        silenceStart: silence.start,
        silenceEnd: silence.end,
        silenceDuration: silence.duration,
        bufferBefore: bufferSeconds,
        bufferAfter: bufferSeconds,
        minDuration: MIN_CLIP_DURATION,
        maxDuration: MAX_CLIP_DURATION,
        validCutPoint: true
      });
      
      logV3(`Valid cut point at ${cutTime.toFixed(2)}s (silence: ${silence.start.toFixed(2)}s - ${silence.end.toFixed(2)}s, duration: ${silence.duration.toFixed(2)}s)`);
    } else {
      logV3(`Clip discarded (too short): cut at ${cutTime.toFixed(2)}s < ${MIN_CLIP_DURATION}s minimum`);
    }
  });

  logV3(`Total valid cut points: ${cutPoints.length}`);
  return cutPoints;
};

/**
 * V3: Check if clip duration is valid
 * @param {number} startTime - Start time of clip
 * @param {number} endTime - End time of clip
 * @returns {boolean} - True if valid duration
 */
const isValidClipDuration = (startTime, endTime) => {
  const duration = endTime - startTime;
  return duration >= MIN_CLIP_DURATION && duration <= MAX_CLIP_DURATION;
};

/**
 * V3: Get minimum clip duration
 * @returns {number} - Minimum clip duration in seconds
 */
const getMinClipDuration = () => MIN_CLIP_DURATION;

/**
 * V3: Get maximum clip duration
 * @returns {number} - Maximum clip duration in seconds
 */
const getMaxClipDuration = () => MAX_CLIP_DURATION;

module.exports = {
  detectSilence,
  findCutPoints,
  isValidClipDuration,
  getMinClipDuration,
  getMaxClipDuration,
  // Export V3 constants
  MIN_CLIP_DURATION,
  MAX_CLIP_DURATION,
  SILENCE_THRESHOLD_DB,
  SILENCE_MIN_MS,
  SPEECH_GUARD_BUFFER_MS
};
