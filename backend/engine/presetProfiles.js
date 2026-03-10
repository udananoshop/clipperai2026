// SMART_AI_BALANCED_8GB Mode - Optimized for 8GB RAM without crash
// Features: Silence cut 300ms, subtitle medium, basic fade, lightweight watermark

const PRESETS = {
  balanced: {
    silenceThreshold: -35,
    minClipLength: 15,
    maxClipLength: 45,
    musicIntensity: 0.5,
    subtitleSpeed: 1,
    name: 'Balanced',
    description: 'Standard processing for mixed content'
  },
  aggressive: {
    silenceThreshold: -28,
    minClipLength: 10,
    maxClipLength: 30,
    musicIntensity: 0.8,
    subtitleSpeed: 1.3,
    name: 'Aggressive Viral',
    description: 'Fast-paced clips for maximum engagement'
  },
  calm: {
    silenceThreshold: -40,
    minClipLength: 25,
    maxClipLength: 60,
    musicIntensity: 0.3,
    subtitleSpeed: 0.8,
    name: 'Calm Podcast',
    description: 'Smooth processing for interviews/podcasts'
  },
  // NEW: SMART_AI_BALANCED_8GB Mode
  smart_ai_balanced_8gb: {
    silenceThreshold: -30,          // 300ms silence detection (more sensitive)
    minClipLength: 15,
    maxClipLength: 45,
    musicIntensity: 0.5,
    subtitleSpeed: 1,
    subtitlePrecision: 'medium',    // Medium precision for 8GB RAM
    enableSmartCutSmoothing: true,  // Smooth cuts enabled
    enableFadeInOut: true,          // Basic fade transitions
    fadeDuration: 0.5,              // 0.5 second fades
    watermarkMode: 'lightweight',    // Lightweight watermark
    sensitiveContentTrim: 'soft',   // Soft trim for sensitive content
    name: 'Smart AI Balanced 8GB',
    description: 'AI-powered processing optimized for 8GB RAM'
  }
};

// SMART_AI_BALANCED_8GB Platform presets - LIMITED RESOLUTION for 8GB RAM
// TikTok/IG/FB: max 720p, YouTube: max 854p
const PLATFORM_PRESETS = {
  youtube: {
    name: 'YouTube',
    folder: 'youtube_shorts',
    // SMART_AI_BALANCED_8GB: 854p max for YouTube (480x854)
    resolution: { width: 480, height: 854 },
    aspectRatio: '9:16',
    codec: 'libx264',
    bitrate: '4M',                   // Reduced bitrate for 8GB
    maxDuration: 60,
    prefix: 'YT',
    // Lightweight encoding: veryfast preset, fewer threads
    ffmpegOpts: ['-preset', 'veryfast', '-crf', '26', '-threads', '1'],
    // Fade and subtitle options
    enableFade: true,
    fadeDuration: 0.5,
    enableSubtitles: true,
    subtitlePrecision: 'medium'
  },
  tiktok: {
    name: 'TikTok',
    folder: 'tiktok',
    // SMART_AI_BALANCED_8GB: 720p max for TikTok
    resolution: { width: 720, height: 1280 },
    aspectRatio: '9:16',
    codec: 'libx264',
    bitrate: '4M',
    maxDuration: 60,
    prefix: 'TT',
    ffmpegOpts: ['-preset', 'veryfast', '-crf', '26', '-threads', '1'],
    enableFade: true,
    fadeDuration: 0.5,
    enableSubtitles: true,
    subtitlePrecision: 'medium'
  },
  instagram: {
    name: 'Instagram',
    folder: 'instagram_reels',
    // SMART_AI_BALANCED_8GB: 720p max for IG
    resolution: { width: 720, height: 1280 },
    aspectRatio: '9:16',
    codec: 'libx264',
    bitrate: '4M',
    maxDuration: 90,
    prefix: 'IG',
    ffmpegOpts: ['-preset', 'veryfast', '-crf', '26', '-threads', '1'],
    enableFade: true,
    fadeDuration: 0.5,
    enableSubtitles: true,
    subtitlePrecision: 'medium'
  },
  shorts: {
    name: 'YouTube Shorts',
    folder: 'youtube_shorts',
    // SMART_AI_BALANCED_8GB: 854p max for Shorts
    resolution: { width: 480, height: 854 },
    aspectRatio: '9:16',
    codec: 'libx264',
    bitrate: '4M',
    maxDuration: 60,
    prefix: 'YT',
    ffmpegOpts: ['-preset', 'veryfast', '-crf', '26', '-threads', '1'],
    enableFade: true,
    fadeDuration: 0.5,
    enableSubtitles: true,
    subtitlePrecision: 'medium'
  },
  facebook: {
    name: 'Facebook',
    folder: 'facebook_reels',
    // SMART_AI_BALANCED_8GB: 720p max for FB
    resolution: { width: 720, height: 1280 },
    aspectRatio: '9:16',
    codec: 'libx264',
    bitrate: '4M',
    maxDuration: 60,
    prefix: 'FB',
    ffmpegOpts: ['-preset', 'veryfast', '-crf', '26', '-threads', '1'],
    enableFade: true,
    fadeDuration: 0.5,
    enableSubtitles: true,
    subtitlePrecision: 'medium'
  }
};

// SMART_AI_BALANCED_8GB Memory protection config
const SMART_AI_BALANCED_8GB_CONFIG = {
  // Memory protection - HARD STOP at 90% RAM
  maxConcurrency: 1,                  // Sequential render (no parallel)
  threads: 1,                        // Single thread to save RAM
  memoryThreshold: 90,               // Hard stop at 90% RAM
  enableSubtitles: true,              // Subtitle enabled
  enableTranslate: false,             // Translation disabled for RAM
  enableAutoMusic: true,              // Background music enabled
  enableMultiPlatform: true,          // Multi-platform export enabled
  enableSmartCutSmoothing: true,      // Smart cut smoothing
  enableFadeInOut: true,              // Basic fade transitions
  watermarkMode: 'lightweight',       // Lightweight watermark
  subtitleVolume: 0.6,
  musicVolume: 0.3,
  musicFadeIn: 0.5,                  // Quick fade
  musicFadeOut: 0.5,
  // Auto GC cleanup after each platform
  enableAutoGC: true,
  gcInterval: 1,                     // Run GC after each export
  // Sequential render (no parallel)
  sequentialRender: true,
  // Medium precision subtitles (balanced)
  subtitlePrecision: 'medium'
};

// Legacy LIGHT mode config (deprecated, use SMART_AI_BALANCED_8GB)
const LIGHT_MODE_CONFIG = {
  maxConcurrency: 2,
  threads: 2,
  memoryThreshold: 80,
  enableSubtitles: false,
  enableTranslate: false,
  enableAutoMusic: true,
  enableMultiPlatform: true,
  subtitleVolume: 0.6,
  musicVolume: 0.3,
  musicFadeIn: 2,
  musicFadeOut: 2
};

/**
 * Get preset by mode name
 * @param {string} mode - Preset mode name
 * @returns {Object} - Preset configuration
 */
const getPreset = (mode) => {
  // Use SMART_AI_BALANCED_8GB as default for 8GB systems
  if (mode === 'smart_ai_balanced_8gb' || !mode) {
    return PRESETS.smart_ai_balanced_8gb;
  }
  return PRESETS[mode] || PRESETS.smart_ai_balanced_8gb;
};

/**
 * Get platform preset
 * @param {string} platform - Platform name
 * @returns {Object} - Platform configuration
 */
const getPlatformPreset = (platform) => {
  return PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.youtube;
};

/**
 * Get the active AI mode configuration
 * @param {string} mode - Mode name (optional)
 * @returns {Object} - Full mode configuration
 */
const getActiveConfig = (mode = 'smart_ai_balanced_8gb') => {
  if (mode === 'smart_ai_balanced_8gb' || !mode) {
    return {
      ...SMART_AI_BALANCED_8GB_CONFIG,
      preset: getPreset(mode),
      platform: null // Will be set per-export
    };
  }
  return LIGHT_MODE_CONFIG;
};

/**
 * Check if memory is safe for processing
 * @returns {boolean} - True if memory is safe
 */
const isMemorySafe = () => {
  const os = require('os');
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
  
  return usedPercent < SMART_AI_BALANCED_8GB_CONFIG.memoryThreshold;
};

/**
 * Get current memory usage percentage
 * @returns {number} - Memory usage percentage
 */
const getMemoryUsage = () => {
  const os = require('os');
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return ((totalMem - freeMem) / totalMem) * 100;
};

module.exports = { 
  PRESETS, 
  PLATFORM_PRESETS, 
  LIGHT_MODE_CONFIG,
  SMART_AI_BALANCED_8GB_CONFIG,
  getPreset, 
  getPlatformPreset,
  getActiveConfig,
  isMemorySafe,
  getMemoryUsage
};
