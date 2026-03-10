/**
 * OVERLORD GPU AMD SAFE MODE - GPU Detection Utility
 * 
 * Simplified Detection:
 * - Check if h264_amf encoder is available in ffmpeg -encoders
 * - If available, use it (force AMF)
 * - Otherwise, fallback to libx264 (only if AMF fails at runtime)
 * 
 * Exports:
 * {
 *   hasAMF,
 *   encoder: "h264_amf" | "libx264"
 * }
 * 
 * Designed for: Ryzen 3 7320U + Radeon 610M (8GB RAM)
 */

const { execSync } = require('child_process');
const os = require('os');

// Cached detection result
let cachedResult = null;

/**
 * Detect if h264_amf encoder is available in ffmpeg
 * @returns {Promise<boolean>}
 */
async function detectAMFEncoder() {
  try {
    // Run ffmpeg -encoders to list available encoders
    const output = execSync('ffmpeg -encoders 2>&1', {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true
    });

    // Check for h264_amf encoder
    const hasAMF = /h264_amf|h264_amd/i.test(output);
    console.log('[GPU] AMF encoder available:', hasAMF);
    
    return hasAMF;
  } catch (error) {
    console.warn('[GPU] Could not detect AMF encoder:', error.message);
    // Fallback: assume no AMF if detection fails
    return false;
  }
}

/**
 * Main GPU detection function
 * Returns cached result if already detected
 * @returns {Promise<Object>} GPU detection result
 */
async function detectGPU() {
  // Return cached result if available
  if (cachedResult) {
    return cachedResult;
  }

  console.log('[GPU] Starting encoder detection...');
  
  const result = {
    hasAMF: false,
    encoder: 'libx264', // Default fallback
    platform: os.platform(),
    detected: false
  };

  try {
    // Always try to detect AMF encoder - no AMD GPU check needed
    result.hasAMF = await detectAMFEncoder();

    // Force AMF if available
    if (result.hasAMF) {
      result.encoder = 'h264_amf';
      console.log('[GPU] Selected encoder: h264_amf (AMD Hardware Acceleration)');
    } else {
      result.encoder = 'libx264';
      console.log('[GPU] Selected encoder: libx264 (CPU Software Encoding)');
    }

    result.detected = true;
    console.log('[GPU] Detection complete:', result);

  } catch (error) {
    console.error('[GPU] Detection error:', error.message);
    // Fallback to libx264 on any error
    result.encoder = 'libx264';
    result.detected = true;
  }

  // Cache the result
  cachedResult = result;
  
  return result;
}

/**
 * Check if AMF encoder is currently available
 * @returns {boolean}
 */
function isAMFAvailable() {
  return cachedResult && cachedResult.hasAMF;
}

/**
 * Get encoder settings based on GPU detection
 * @returns {Object} Encoder settings for ffmpeg
 */
function getEncoderSettings() {
  const encoder = cachedResult ? cachedResult.encoder : 'libx264';
  
  if (encoder === 'h264_amf') {
    return {
      codec: 'h264_amf',
      quality: 'speed',
      rc: 'cbr',
      bitrate: '2500k',
      maxrate: '3000k',
      bufsize: '4000k',
      extra: '-hwaccel auto'
    };
  }
  
  // Default CPU fallback (libx264)
  return {
    codec: 'libx264',
    preset: 'veryfast',
    crf: '24',
    tune: 'fastdecode',
    bitrate: null, // Will use CRF
    extra: ''
  };
}

/**
 * Reset cached result (for testing)
 */
function resetCache() {
  cachedResult = null;
  console.log('[GPU] Cache reset');
}

module.exports = {
  detectGPU,
  getEncoderSettings,
  isAMFAvailable,
  resetCache,
  detectAMFEncoder
};
