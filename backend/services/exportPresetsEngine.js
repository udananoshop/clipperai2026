/**
 * ClipperAi2026 Enterprise - Export Presets Engine
 * Manages export presets for different platforms and quality levels
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Default export presets
 */
const DEFAULT_PRESETS = {
  // Social Media - Vertical
  tiktok_1080: {
    id: 'tiktok_1080',
    name: 'TikTok 1080p',
    platform: 'tiktok',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 128,
    maxDuration: 180,
    description: 'TikTok optimal export with high quality'
  },
  reels_1080: {
    id: 'reels_1080',
    name: 'Instagram Reels 1080p',
    platform: 'instagram',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 128,
    maxDuration: 90,
    description: 'Instagram Reels optimal export'
  },
  shorts_1080: {
    id: 'shorts_1080',
    name: 'YouTube Shorts 1080p',
    platform: 'youtube',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 128,
    maxDuration: 60,
    description: 'YouTube Shorts optimal export'
  },
  
  // YouTube Landscape
  youtube_1080p: {
    id: 'youtube_1080p',
    name: 'YouTube 1080p',
    platform: 'youtube',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 192,
    maxDuration: 600,
    description: 'YouTube standard 1080p export'
  },
  youtube_4k: {
    id: 'youtube_4k',
    name: 'YouTube 4K',
    platform: 'youtube',
    aspectRatio: '16:9',
    width: 3840,
    height: 2160,
    fps: 30,
    bitrate: 'ultra',
    format: 'mp4',
    codec: 'h265',
    audioCodec: 'aac',
    audioBitrate: 256,
    maxDuration: 3600,
    description: 'YouTube 4K ultra HD export'
  },
  youtube_720p: {
    id: 'youtube_720p',
    name: 'YouTube 720p',
    platform: 'youtube',
    aspectRatio: '16:9',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 'medium',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 128,
    maxDuration: 600,
    description: 'YouTube 720p export for faster uploads'
  },
  
  // High Quality
  high_quality: {
    id: 'high_quality',
    name: 'High Quality Master',
    platform: 'universal',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: 'ultra',
    format: 'mp4',
    codec: 'h265',
    audioCodec: 'aac',
    audioBitrate: 320,
    maxDuration: 7200,
    description: 'High quality master for archival'
  },
  
  // Web Optimized
  web_optimized: {
    id: 'web_optimized',
    name: 'Web Optimized',
    platform: 'web',
    aspectRatio: '16:9',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 'medium',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 96,
    maxDuration: 600,
    description: 'Optimized for web streaming'
  },
  
  // Mobile
  mobile_480p: {
    id: 'mobile_480p',
    name: 'Mobile 480p',
    platform: 'mobile',
    aspectRatio: '16:9',
    width: 854,
    height: 480,
    fps: 30,
    bitrate: 'low',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 96,
    maxDuration: 300,
    description: 'Mobile-friendly low bandwidth export'
  },
  
  // GIF
  gif_720p: {
    id: 'gif_720p',
    name: 'GIF 720p',
    platform: 'gif',
    aspectRatio: '16:9',
    width: 1280,
    height: 720,
    fps: 15,
    bitrate: 'low',
    format: 'gif',
    codec: 'gif',
    audioCodec: 'none',
    audioBitrate: 0,
    maxDuration: 30,
    description: 'Animated GIF export'
  }
};

/**
 * Quality presets
 */
const QUALITY_PRESETS = {
  ultra: {
    name: 'Ultra',
    videoBitrate: 20000,
    crf: 18,
    description: 'Best possible quality'
  },
  high: {
    name: 'High',
    videoBitrate: 10000,
    crf: 23,
    description: 'High quality'
  },
  medium: {
    name: 'Medium',
    videoBitrate: 5000,
    crf: 28,
    description: 'Balanced quality/size'
  },
  low: {
    name: 'Low',
    videoBitrate: 2500,
    crf: 32,
    description: 'Smaller file size'
  }
};

/**
 * ExportPresetsEngine Service
 */
class ExportPresetsEngine {
  constructor() {
    this.presets = { ...DEFAULT_PRESETS };
    this.userPresets = new Map();
    this.platformSpecs = this._initializePlatformSpecs();
  }

  /**
   * Initialize platform specifications
   * @private
   */
  _initializePlatformSpecs() {
    return {
      tiktok: {
        name: 'TikTok',
        maxDuration: 180,
        maxFileSize: 287.6 * 1024 * 1024, // 287.6 MB
        supportedFormats: ['mp4', 'mov'],
        aspectRatios: ['9:16'],
        recommendedResolutions: [
          { width: 1080, height: 1920, name: '1080p' },
          { width: 720, height: 1280, name: '720p' }
        ]
      },
      instagram: {
        name: 'Instagram',
        maxDuration: 90,
        maxFileSize: 650 * 1024 * 1024, // 650 MB
        supportedFormats: ['mp4', 'mov'],
        aspectRatios: ['1:1', '4:5', '9:16'],
        recommendedResolutions: [
          { width: 1080, height: 1080, name: 'Square' },
          { width: 1080, height: 1350, name: 'Portrait 4:5' },
          { width: 1080, height: 1920, name: 'Story 9:16' }
        ]
      },
      youtube: {
        name: 'YouTube',
        maxDuration: 43200, // 12 hours
        maxFileSize: 256 * 1024 * 1024 * 1024, // 256 GB
        supportedFormats: ['mp4', 'mov', 'avi', 'mkv'],
        aspectRatios: ['16:9', '9:16'],
        recommendedResolutions: [
          { width: 3840, height: 2160, name: '4K' },
          { width: 1920, height: 1080, name: '1080p' },
          { width: 1280, height: 720, name: '720p' }
        ]
      },
      facebook: {
        name: 'Facebook',
        maxDuration: 240,
        maxFileSize: 4 * 1024 * 1024 * 1024, // 4 GB
        supportedFormats: ['mp4', 'mov', 'avi'],
        aspectRatios: ['1:1', '16:9', '9:16'],
        recommendedResolutions: [
          { width: 1080, height: 1080, name: 'Square' },
          { width: 1920, height: 1080, name: 'Landscape' },
          { width: 1080, height: 1920, name: 'Vertical' }
        ]
      },
      twitter: {
        name: 'Twitter/X',
        maxDuration: 140,
        maxFileSize: 512 * 1024 * 1024, // 512 MB
        supportedFormats: ['mp4', 'mov'],
        aspectRatios: ['16:9', '1:1'],
        recommendedResolutions: [
          { width: 1280, height: 720, name: '720p' },
          { width: 1080, height: 1080, name: 'Square' }
        ]
      },
      linkedin: {
        name: 'LinkedIn',
        maxDuration: 600,
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5 GB
        supportedFormats: ['mp4', 'mov', 'avi'],
        aspectRatios: ['1:1', '16:9'],
        recommendedResolutions: [
          { width: 1920, height: 1080, name: 'Landscape' },
          { width: 1080, height: 1080, name: 'Square' }
        ]
      }
    };
  }

  /**
   * Get all presets
   * @param {string} platform - Filter by platform
   * @returns {Array} - Presets
   */
  getPresets(platform = null) {
    const allPresets = Object.values(this.presets);
    if (platform) {
      return allPresets.filter(p => p.platform === platform);
    }
    return allPresets;
  }

  /**
   * Get preset by ID
   * @param {string} presetId - Preset ID
   * @returns {Object|null} - Preset
   */
  getPreset(presetId) {
    return this.presets[presetId] || null;
  }

  /**
   * Get presets by platform
   * @param {string} platform - Platform
   * @returns {Array} - Presets for platform
   */
  getPresetsByPlatform(platform) {
    return Object.values(this.presets).filter(p => 
      p.platform === platform || 
      this.platformSpecs[platform]?.supportedFormats?.includes(p.format)
    );
  }

  /**
   * Create custom preset
   * @param {Object} preset - Preset configuration
   * @returns {Object} - Created preset
   */
  createPreset(preset) {
    const presetId = `custom_${uuidv4().slice(0, 8)}`;
    
    const newPreset = {
      id: presetId,
      name: preset.name,
      platform: preset.platform || 'custom',
      aspectRatio: preset.aspectRatio || '16:9',
      width: preset.width || 1920,
      height: preset.height || 1080,
      fps: preset.fps || 30,
      bitrate: preset.bitrate || 'medium',
      format: preset.format || 'mp4',
      codec: preset.codec || 'h264',
      audioCodec: preset.audioCodec || 'aac',
      audioBitrate: preset.audioBitrate || 128,
      maxDuration: preset.maxDuration || 600,
      description: preset.description || 'Custom preset',
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    this.presets[presetId] = newPreset;
    logger.info(`[ExportPresets] Created custom preset: ${presetId}`);
    
    return newPreset;
  }

  /**
   * Update custom preset
   * @param {string} presetId - Preset ID
   * @param {Object} updates - Updates
   * @returns {Object|null} - Updated preset
   */
  updatePreset(presetId, updates) {
    const preset = this.presets[presetId];
    if (!preset) {
      return null;
    }

    const updatedPreset = {
      ...preset,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.presets[presetId] = updatedPreset;
    logger.info(`[ExportPresets] Updated preset: ${presetId}`);
    
    return updatedPreset;
  }

  /**
   * Delete custom preset
   * @param {string} presetId - Preset ID
   * @returns {boolean} - Success
   */
  deletePreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) {
      return false;
    }

    if (!preset.isCustom) {
      logger.warn(`[ExportPresets] Cannot delete default preset: ${presetId}`);
      return false;
    }

    delete this.presets[presetId];
    logger.info(`[ExportPresets] Deleted preset: ${presetId}`);
    
    return true;
  }

  /**
   * Get platform specifications
   * @param {string} platform - Platform
   * @returns {Object} - Platform specs
   */
  getPlatformSpecs(platform = null) {
    if (platform) {
      return this.platformSpecs[platform] || null;
    }
    return this.platformSpecs;
  }

  /**
   * Get quality presets
   * @returns {Object} - Quality presets
   */
  getQualityPresets() {
    return QUALITY_PRESETS;
  }

  /**
   * Get recommended preset for platform and duration
   * @param {string} platform - Platform
   * @param {number} duration - Video duration in seconds
   * @returns {Object} - Recommended preset
   */
  getRecommendedPreset(platform, duration) {
    const platformSpecs = this.platformSpecs[platform];
    if (!platformSpecs) {
      return this.presets.high_quality;
    }

    // Filter presets by platform
    let candidates = Object.values(this.presets).filter(p => 
      p.platform === platform || 
      this.platformSpecs[platform]?.supportedFormats?.includes(p.format)
    );

    // Filter by duration
    candidates = candidates.filter(p => p.maxDuration >= duration);

    // Sort by quality
    candidates.sort((a, b) => {
      const qualityOrder = { ultra: 4, high: 3, medium: 2, low: 1 };
      return (qualityOrder[b.bitrate] || 2) - (qualityOrder[a.bitrate] || 2);
    });

    return candidates[0] || this.presets.high_quality;
  }

  /**
   * Validate export settings
   * @param {Object} settings - Export settings
   * @returns {Object} - Validation result
   */
  validateSettings(settings) {
    const errors = [];
    const warnings = [];

    // Check platform specs
    if (settings.platform) {
      const platformSpecs = this.platformSpecs[settings.platform];
      if (platformSpecs) {
        // Check duration
        if (settings.duration > platformSpecs.maxDuration) {
          errors.push(`Duration exceeds ${platformSpecs.name} maximum of ${platformSpecs.maxDuration}s`);
        }

        // Check format
        if (!platformSpecs.supportedFormats.includes(settings.format)) {
          warnings.push(`${platformSpecs.name} recommends ${platformSpecs.supportedFormats.join(', ')} formats`);
        }

        // Check aspect ratio
        if (!platformSpecs.aspectRatios.includes(settings.aspectRatio)) {
          warnings.push(`${platformSpecs.name} recommends aspect ratios: ${platformSpecs.aspectRatios.join(', ')}`);
        }
      }
    }

    // Check resolution
    if (settings.width && settings.height) {
      const aspectRatio = settings.width / settings.height;
      const expectedRatios = {
        '9:16': 9/16,
        '16:9': 16/9,
        '1:1': 1,
        '4:5': 4/5
      };
      
      for (const [ratio, value] of Object.entries(expectedRatios)) {
        if (Math.abs(aspectRatio - value) < 0.01) {
          settings.aspectRatio = ratio;
          break;
        }
      }
    }

    // Check bitrate
    if (settings.bitrate && !QUALITY_PRESETS[settings.bitrate]) {
      warnings.push(`Unknown bitrate preset: ${settings.bitrate}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      settings: {
        ...settings,
        aspectRatio: settings.aspectRatio || '16:9'
      }
    };
  }

  /**
   * Get export command arguments
   * @param {Object} preset - Preset
   * @param {Object} options - Additional options
   * @returns {Array} - FFmpeg arguments
   */
  getExportArgs(preset, options = {}) {
    const args = [
      '-i', options.inputPath,
      '-c:v', preset.codec,
      '-c:a', preset.audioCodec,
      '-r', preset.fps.toString(),
      '-b:v', `${preset.bitrate}k`,
      '-b:a', `${preset.audioBitrate}k`,
      '-aspect', preset.aspectRatio,
      '-movflags', '+faststart'
    ];

    // Add CRF if using h265
    if (preset.codec === 'h265' && options.quality) {
      const quality = QUALITY_PRESETS[options.quality];
      if (quality) {
        args.push('-crf', quality.crf.toString());
      }
    }

    // Add output path
    args.push('-y', options.outputPath);

    return args;
  }

  /**
   * Reset to default presets
   */
  resetToDefaults() {
    this.presets = { ...DEFAULT_PRESETS };
    logger.info('[ExportPresets] Reset to default presets');
  }
}

// Export singleton instance
module.exports = new ExportPresetsEngine();
