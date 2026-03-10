/**
 * ClipperAi2026 Enterprise - Multi-Platform Formatter Service
 * Auto-generates formats for TikTok, Reels, YouTube Shorts, and YouTube Landscape
 * Intelligent resize + auto-crop functionality
 * 
 * OVERLORD 8GB OPTIMIZATION PATCH - Sequential Platform Rendering
 * OVERLORD GPU AMD SAFE MODE - Hardware Acceleration Support
 */

// ============================================================================
// OVERLORD 8GB OPTIMIZATION PATCH - Sequential Render Mode
// ============================================================================
console.log('[Optimization] Sequential Render Mode ACTIVE');
// ============================================================================

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ============================================================================
// OVERLORD GPU AMD SAFE MODE - GPU Detection & Safe Bitrate Profiles
// ============================================================================
const gpuDetector = require('../utils/gpuDetector');

// 8GB Safe Bitrate Profiles - REDUCED 20-30% for memory optimization
const SAFE_BITRATE_PROFILES = {
  youtube: {
    '1080p': 2500,  // Reduced from 3000k (-17%)
    '720p': 1800,   // Reduced from 2200k (-18%)
    '540p': 1200    // Reduced from 1500k (-20%)
  },
  tiktok: {
    '720p': 1500,   // Reduced from 1800k (-17%)
    '540p': 1000    // Reduced from 1200k (-17%)
  },
  instagram: {  // Reels
    '720p': 1500,  // Reduced from 1800k (-17%)
    '540p': 1000    // Reduced from 1200k (-17%)
  }
};

// Memory threshold for auto bitrate reduction
const MEMORY_SOFT_THRESHOLD = 80;  // Reduce bitrate if memory > 80%
const MEMORY_HARD_THRESHOLD = 90;  // Force low bitrate if memory > 90%

// Cached GPU detection result
let gpuSettings = null;

/**
 * Initialize GPU detection on module load
 */
async function initGPUDetector() {
  try {
    gpuSettings = await gpuDetector.detectGPU();
    console.log('[GPU] Initialized:', gpuSettings);
    return gpuSettings;
  } catch (error) {
    console.warn('[GPU] Initialization failed, using CPU fallback:', error.message);
    gpuSettings = {
      hasAMF: false,
      encoder: 'libx264'
    };
    return gpuSettings;
  }
}

// Initialize GPU detection
initGPUDetector();

/**
 * Get safe bitrate based on platform, resolution, and memory usage
 * @param {string} platform - Platform ID
 * @param {number} height - Video height in pixels
 * @returns {number} Safe bitrate in kbps
 */
function getSafeBitrate(platform, height) {
  // Check memory usage
  let memoryUsage = 0;
  try {
    const resourceMonitor = require('../core/resourceMonitor');
    memoryUsage = resourceMonitor.getSystemMemoryUsage();
  } catch (e) {
    // resourceMonitor might not be available
  }

  // Determine resolution key
  let resolutionKey;
  if (height >= 1080) resolutionKey = '1080p';
  else if (height >= 720) resolutionKey = '720p';
  else resolutionKey = '540p';

  // Get base bitrate from profile
  let baseBitrate;
  if (platform === 'youtube_landscape') {
    baseBitrate = SAFE_BITRATE_PROFILES.youtube[resolutionKey] || 3000;
  } else if (platform === 'tiktok' || platform === 'youtube_shorts') {
    baseBitrate = SAFE_BITRATE_PROFILES.tiktok[resolutionKey] || 1800;
  } else if (platform === 'reels') {
    baseBitrate = SAFE_BITRATE_PROFILES.instagram[resolutionKey] || 1800;
  } else {
    baseBitrate = 2000; // Default
  }

  // Apply memory-based reduction
  if (memoryUsage > MEMORY_HARD_THRESHOLD) {
    // Force low bitrate mode
    console.log(`[Bitrate] Memory ${memoryUsage}% > ${MEMORY_HARD_THRESHOLD}% - FORCING LOW BITRATE`);
    return Math.floor(baseBitrate * 0.5);
  } else if (memoryUsage > MEMORY_SOFT_THRESHOLD) {
    // Reduce bitrate
    console.log(`[Bitrate] Memory ${memoryUsage}% > ${MEMORY_SOFT_THRESHOLD}% - Reducing bitrate`);
    return Math.floor(baseBitrate * 0.7);
  }

  return baseBitrate;
}

/**
 * Build ffmpeg command with GPU acceleration or CPU fallback
 * @param {Object} options - Build options
 * @returns {Object} ffmpeg settings
 */
function buildFFmpegSettings(options) {
  const { platform, height, memoryMode } = options;
  
  // Get safe bitrate
  const bitrate = getSafeBitrate(platform, height);
  
  // Check if we should use GPU encoding
  const useGPU = gpuSettings && gpuSettings.hasAMF && memoryMode !== 'low';
  
  if (useGPU) {
    // AMD AMF Hardware Encoding
    return {
      videoCodec: 'h264_amf',
      quality: 'speed',
      rc: 'cbr',
      bitrate: `${bitrate}k`,
      maxrate: `${Math.floor(bitrate * 1.2)}k`,
      bufsize: `${Math.floor(bitrate * 1.6)}k`,
      hwaccel: '-hwaccel auto',
      preset: null,
      crf: null,
      tune: null,
      encoder: 'h264_amf',
      mode: 'GPU'
    };
  } else {
    // CPU Software Encoding (libx264 fallback)
    return {
      videoCodec: 'libx264',
      preset: 'veryfast',
      crf: '24',
      tune: 'fastdecode',
      bitrate: null, // Use CRF
      maxrate: null,
      bufsize: null,
      hwaccel: null,
      rc: null,
      quality: null,
      encoder: 'libx264',
      mode: 'CPU'
    };
  }
}

/**
 * Log current GPU status
 */
function logGPUStatus() {
  if (gpuSettings) {
    console.log('===========================================');
    console.log('[GPU] OVERLORD GPU SAFE MODE STATUS');
    console.log('===========================================');
    console.log(`[GPU] AMF encoder available: ${gpuSettings.hasAMF}`);
    console.log(`[GPU] Selected encoder: ${gpuSettings.encoder}`);
    console.log('[GPU] 8GB SAFE MODE ACTIVE');
    console.log('===========================================');
  }
}

/**
 * Platform specifications
 */
const PLATFORMS = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDuration: 180,
    safeZones: {
      top: 150,
      bottom: 250,
      left: 0,
      right: 0
    }
  },
  reels: {
    id: 'reels',
    name: 'Instagram Reels',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDuration: 90,
    safeZones: {
      top: 150,
      bottom: 350,
      left: 0,
      right: 0
    }
  },
  youtube_shorts: {
    id: 'youtube_shorts',
    name: 'YouTube Shorts',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDuration: 60,
    safeZones: {
      top: 100,
      bottom: 200,
      left: 0,
      right: 0
    }
  },
  youtube_landscape: {
    id: 'youtube_landscape',
    name: 'YouTube Landscape',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    maxDuration: 600,
    safeZones: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  }
};

/**
 * Crop focus points
 */
const FOCUS_POINTS = {
  center: { x: 0.5, y: 0.5 },
  top: { x: 0.5, y: 0.25 },
  bottom: { x: 0.5, y: 0.75 },
  left: { x: 0.25, y: 0.5 },
  right: { x: 0.75, y: 0.5 },
  face: { x: 0.5, y: 0.4 }, // Slightly above center for face detection
  action: { x: 0.5, y: 0.5 } // Dynamic based on motion
};

/**
 * MultiPlatformFormatter Service
 */
class MultiPlatformFormatter {
  constructor() {
    this.activeJobs = new Map();
    this.outputDir = path.join(__dirname, '..', 'output', 'formatted');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Format video for multiple platforms
   * @param {Object} options - Format options
   * @returns {Promise<Object>} - Format results
   */
  async formatForPlatforms(options) {
    const {
      videoId,
      videoPath,
      platforms = ['tiktok', 'reels', 'youtube_shorts', 'youtube_landscape'],
      cropMode = 'center', // center, smart, face, action
      autoTrim = true,
      startTime,
      endTime
    } = options;

    const jobId = uuidv4();
    logger.info(`[MultiPlatformFormatter] Starting format job ${jobId}`);

    try {
      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'multi_platform_format',
        platforms: platforms.map(p => PLATFORMS[p] || PLATFORMS.tiktok),
        cropMode,
        results: []
      };

      this.activeJobs.set(jobId, job);

      // Process each platform
      const totalPlatforms = platforms.length;
      
      for (let i = 0; i < totalPlatforms; i++) {
        const platformId = platforms[i];
        const platform = PLATFORMS[platformId];
        
        job.status = `formatting_${platformId}`;
        job.progress = Math.round((i / totalPlatforms) * 100);
        this.activeJobs.set(jobId, job);

        // Calculate crop dimensions
        const cropConfig = this._calculateCrop(
          platform.width,
          platform.height,
          cropMode
        );

        // Calculate duration limits
        const duration = endTime && startTime 
          ? endTime - startTime 
          : platform.maxDuration;

        // Generate output filename
        const outputFilename = `formatted_${platformId}_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
        const outputPath = path.join(this.outputDir, outputFilename);

        // Simulate processing
        await this._delay(300);

        const result = {
          platform: platformId,
          platformName: platform.name,
          outputUrl: `/output/formatted/${outputFilename}`,
          outputPath,
          filename: outputFilename,
          aspectRatio: platform.aspectRatio,
          resolution: {
            width: platform.width,
            height: platform.height
          },
          fps: platform.fps,
          duration: Math.min(duration, platform.maxDuration),
          crop: cropConfig,
          safeZones: platform.safeZones,
          status: 'completed'
        };

        job.results.push(result);
      }

      job.progress = 100;
      job.status = 'completed';
      this.activeJobs.set(jobId, job);

      logger.info(`[MultiPlatformFormatter] Format job ${jobId} completed`);
      return job;
    } catch (error) {
      logger.error(`[MultiPlatformFormatter] Format job ${jobId} failed:`, error);
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        this.activeJobs.set(jobId, job);
      }
      throw error;
    }
  }

  /**
   * Format video for a single platform
   * @param {Object} options - Format options
   * @returns {Promise<Object>} - Format result
   */
  async formatForSinglePlatform(options) {
    const {
      videoId,
      videoPath,
      platform = 'tiktok',
      cropMode = 'center',
      startTime,
      endTime
    } = options;

    const jobId = uuidv4();
    logger.info(`[MultiPlatformFormatter] Starting single format job ${jobId} for ${platform}`);

    try {
      const platformSpec = PLATFORMS[platform] || PLATFORMS.tiktok;

      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'single_platform_format',
        platform: platformSpec
      };

      this.activeJobs.set(jobId, job);

      // Calculate crop
      const cropConfig = this._calculateCrop(
        platformSpec.width,
        platformSpec.height,
        cropMode
      );

      // Calculate duration
      const duration = endTime && startTime 
        ? endTime - startTime 
        : platformSpec.maxDuration;

      job.progress = 50;
      this.activeJobs.set(jobId, job);

      // Simulate processing
      await this._delay(400);

      // Generate output
      const outputFilename = `formatted_${platform}_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      job.progress = 100;
      job.status = 'completed';
      job.output = {
        platform: platform,
        platformName: platformSpec.name,
        outputUrl: `/output/formatted/${outputFilename}`,
        outputPath,
        filename: outputFilename,
        aspectRatio: platformSpec.aspectRatio,
        resolution: {
          width: platformSpec.width,
          height: platformSpec.height
        },
        fps: platformSpec.fps,
        duration: Math.min(duration, platformSpec.maxDuration),
        crop: cropConfig,
        safeZones: platformSpec.safeZones
      };

      this.activeJobs.set(jobId, job);
      return job;
    } catch (error) {
      logger.error(`[MultiPlatformFormatter] Single format job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Calculate crop configuration
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @param {string} cropMode - Crop mode
   * @returns {Object} - Crop configuration
   */
  _calculateCrop(targetWidth, targetHeight, cropMode) {
    const focus = FOCUS_POINTS[cropMode] || FOCUS_POINTS.center;
    
    return {
      mode: cropMode,
      focusPoint: focus,
      cropArea: {
        x: Math.round(focus.x * targetWidth - targetWidth / 2),
        y: Math.round(focus.y * targetHeight - targetHeight / 2),
        width: targetWidth,
        height: targetHeight
      },
      scale: 1.0,
      rotation: 0
    };
  }

  /**
   * Get platform specifications
   * @returns {Object} - Platform specs
   */
  getPlatformSpecs() {
    return PLATFORMS;
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} - Job status
   */
  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all active jobs
   * @returns {Array} - Active jobs
   */
  getAllJobs() {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Helper method for simulated delays
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create and configure the singleton instance
const formatter = new MultiPlatformFormatter();

// Add GPU functions to the singleton instance
formatter.getSafeBitrate = getSafeBitrate;
formatter.buildFFmpegSettings = buildFFmpegSettings;
formatter.logGPUStatus = logGPUStatus;
formatter.SAFE_BITRATE_PROFILES = SAFE_BITRATE_PROFILES;

// Export the configured singleton
module.exports = formatter;
