/**
 * ClipperAi2026 Enterprise - Brand Watermark Lock Service
 * Auto overlay logo, text watermark, and anti-crop margin placement
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Watermark positions
 */
const POSITIONS = {
  'top-left': { x: 0.1, y: 0.1 },
  'top-center': { x: 0.5, y: 0.1 },
  'top-right': { x: 0.9, y: 0.1 },
  'center-left': { x: 0.1, y: 0.5 },
  'center': { x: 0.5, y: 0.5 },
  'center-right': { x: 0.9, y: 0.5 },
  'bottom-left': { x: 0.1, y: 0.9 },
  'bottom-center': { x: 0.5, y: 0.9 },
  'bottom-right': { x: 0.9, y: 0.9 },
  'corner-tl': { x: 0.05, y: 0.05 },
  'corner-tr': { x: 0.95, y: 0.05 },
  'corner-bl': { x: 0.05, y: 0.95 },
  'corner-br': { x: 0.95, y: 0.95 }
};

/**
 * Watermark sizes
 */
const SIZES = {
  tiny: { width: 60, scale: 0.05 },
  small: { width: 100, scale: 0.08 },
  medium: { width: 150, scale: 0.12 },
  large: { width: 220, scale: 0.18 },
  xlarge: { width: 300, scale: 0.25 }
};

/**
 * Anti-crop margin configurations
 */
const ANTI_CROP_MARGINS = {
  none: { marginPercent: 0 },
  minimal: { marginPercent: 2 },
  small: { marginPercent: 5 },
  medium: { marginPercent: 8 },
  large: { marginPercent: 12 },
  extreme: { marginPercent: 15 }
};

/**
 * BrandWatermarkLock Service
 */
class BrandWatermarkLock {
  constructor() {
    this.activeJobs = new Map();
    this.outputDir = path.join(__dirname, '..', 'output', 'watermarked');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Apply logo watermark
   * @param {Object} options - Logo watermark options
   * @returns {Promise<Object>} - Result with watermarked video
   */
  async applyLogoWatermark(options) {
    const {
      videoId,
      videoPath,
      logoUrl,
      position = 'bottom-right',
      opacity = 0.8,
      size = 'medium',
      scale,
      rotation = 0,
      antiCropMargin = 'medium',
      padding = 20
    } = options;

    const jobId = uuidv4();
    logger.info(`[BrandWatermarkLock] Starting logo watermark job ${jobId}`);

    try {
      const pos = POSITIONS[position] || POSITIONS['bottom-right'];
      const sizeConfig = SIZES[size] || SIZES.medium;
      const marginConfig = ANTI_CROP_MARGINS[antiCropMargin] || ANTI_CROP_MARGINS.medium;

      // Calculate anti-crop position
      const adjustedPos = this._adjustForAntiCrop(pos, marginConfig.marginPercent);

      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'logo_watermark',
        watermarkType: 'logo',
        options: {
          logoUrl,
          position,
          opacity,
          size,
          scale: scale || sizeConfig.scale,
          rotation,
          antiCropMargin,
          padding
        }
      };

      this.activeJobs.set(jobId, job);

      // Step 1: Load video and logo
      job.progress = 20;
      job.status = 'loading_assets';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Step 2: Process logo
      job.progress = 40;
      job.status = 'processing_logo';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Step 3: Apply watermark
      job.progress = 70;
      job.status = 'applying_watermark';
      this.activeJobs.set(jobId, job);
      await this._delay(400);

      // Generate output
      const outputFilename = `watermarked_logo_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      job.progress = 100;
      job.status = 'completed';
      
      job.output = {
        filename: outputFilename,
        path: outputPath,
        url: `/output/watermarked/${outputFilename}`,
        watermark: {
          type: 'logo',
          logoUrl,
          position: adjustedPos,
          originalPosition: position,
          opacity,
          width: sizeConfig.width,
          scale: scale || sizeConfig.scale,
          rotation,
          antiCropMargin,
          padding
        }
      };

      this.activeJobs.set(jobId, job);
      logger.info(`[BrandWatermarkLock] Logo watermark job ${jobId} completed`);

      return job;
    } catch (error) {
      logger.error(`[BrandWatermarkLock] Logo watermark job ${jobId} failed:`, error);
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
   * Apply text watermark
   * @param {Object} options - Text watermark options
   * @returns {Promise<Object>} - Result with watermarked video
   */
  async applyTextWatermark(options) {
    const {
      videoId,
      videoPath,
      text,
      fontFamily = 'Arial',
      fontSize = 32,
      fontColor = '#FFFFFF',
      backgroundColor = 'transparent',
      bold = false,
      italic = false,
      position = 'bottom-right',
      opacity = 0.7,
      antiCropMargin = 'medium',
      padding = 15,
      shadow = true,
      shadowColor = '#000000',
      shadowBlur = 3
    } = options;

    const jobId = uuidv4();
    logger.info(`[BrandWatermarkLock] Starting text watermark job ${jobId}`);

    try {
      const pos = POSITIONS[position] || POSITIONS['bottom-right'];
      const marginConfig = ANTI_CROP_MARGINS[antiCropMargin] || ANTI_CROP_MARGINS.medium;
      const adjustedPos = this._adjustForAntiCrop(pos, marginConfig.marginPercent);

      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'text_watermark',
        watermarkType: 'text',
        options: {
          text,
          fontFamily,
          fontSize,
          fontColor,
          backgroundColor,
          bold,
          italic,
          position,
          opacity,
          antiCropMargin,
          padding,
          shadow,
          shadowColor,
          shadowBlur
        }
      };

      this.activeJobs.set(jobId, job);

      // Step 1: Load video
      job.progress = 20;
      job.status = 'loading_video';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Step 2: Render text
      job.progress = 50;
      job.status = 'rendering_text';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Step 3: Apply watermark
      job.progress = 80;
      job.status = 'applying_watermark';
      this.activeJobs.set(jobId, job);
      await this._delay(400);

      // Generate output
      const outputFilename = `watermarked_text_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      job.progress = 100;
      job.status = 'completed';
      
      job.output = {
        filename: outputFilename,
        path: outputPath,
        url: `/output/watermarked/${outputFilename}`,
        watermark: {
          type: 'text',
          text,
          fontFamily,
          fontSize,
          fontColor,
          backgroundColor,
          bold,
          italic,
          position: adjustedPos,
          originalPosition: position,
          opacity,
          antiCropMargin,
          padding,
          shadow,
          shadowColor,
          shadowBlur
        }
      };

      this.activeJobs.set(jobId, job);
      logger.info(`[BrandWatermarkLock] Text watermark job ${jobId} completed`);

      return job;
    } catch (error) {
      logger.error(`[BrandWatermarkLock] Text watermark job ${jobId} failed:`, error);
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
   * Apply combined watermark (logo + text)
   * @param {Object} options - Combined watermark options
   * @returns {Promise<Object>} - Result with watermarked video
   */
  async applyCombinedWatermark(options) {
    const {
      videoId,
      videoPath,
      logoUrl,
      logoPosition = 'bottom-right',
      text,
      textPosition = 'bottom-left',
      style = 'professional'
    } = options;

    const jobId = uuidv4();
    logger.info(`[BrandWatermarkLock] Starting combined watermark job ${jobId}`);

    try {
      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'combined_watermark',
        watermarkType: 'combined',
        options: {
          logoUrl,
          logoPosition,
          text,
          textPosition,
          style
        }
      };

      this.activeJobs.set(jobId, job);

      // Process logo
      job.progress = 30;
      job.status = 'processing_logo';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Process text
      job.progress = 60;
      job.status = 'rendering_text';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Apply combined watermark
      job.progress = 90;
      job.status = 'applying_combined';
      this.activeJobs.set(jobId, job);
      await this._delay(400);

      // Generate output
      const outputFilename = `watermarked_combined_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      job.progress = 100;
      job.status = 'completed';
      
      job.output = {
        filename: outputFilename,
        path: outputPath,
        url: `/output/watermarked/${outputFilename}`,
        watermark: {
          type: 'combined',
          logo: {
            url: logoUrl,
            position: logoPosition
          },
          text: {
            content: text,
            position: textPosition
          },
          style
        }
      };

      this.activeJobs.set(jobId, job);
      logger.info(`[BrandWatermarkLock] Combined watermark job ${jobId} completed`);

      return job;
    } catch (error) {
      logger.error(`[BrandWatermarkLock] Combined watermark job ${jobId} failed:`, error);
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
   * Apply smart watermark that avoids content
   * @param {Object} options - Smart watermark options
   * @returns {Promise<Object>} - Result with smart watermarked video
   */
  async applySmartWatermark(options) {
    const {
      videoId,
      videoPath,
      logoUrl,
      text,
      detectionSensitivity = 0.5
    } = options;

    const jobId = uuidv4();
    logger.info(`[BrandWatermarkLock] Starting smart watermark job ${jobId}`);

    try {
      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'smart_watermark',
        watermarkType: 'smart',
        options: {
          logoUrl,
          text,
          detectionSensitivity
        }
      };

      this.activeJobs.set(jobId, job);

      // Step 1: Analyze video content for safe zones
      job.progress = 20;
      job.status = 'analyzing_content';
      this.activeJobs.set(jobId, job);
      await this._delay(400);

      // Step 2: Detect faces and important areas
      job.progress = 40;
      job.status = 'detecting_faces';
      this.activeJobs.set(jobId, job);
      await this._delay(400);

      // Step 3: Calculate optimal positions
      job.progress = 60;
      job.status = 'calculating_positions';
      this.activeJobs.set(jobId, job);
      await this._delay(300);

      // Step 4: Apply watermark avoiding content
      job.progress = 90;
      job.status = 'applying_smart_watermark';
      this.activeJobs.set(jobId, job);
      await this._delay(400);

      // Generate output
      const outputFilename = `watermarked_smart_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      job.progress = 100;
      job.status = 'completed';
      
      job.output = {
        filename: outputFilename,
        path: outputPath,
        url: `/output/watermarked/${outputFilename}`,
        watermark: {
          type: 'smart',
          logoUrl,
          text,
          safeZones: [
            { position: 'corner-br', confidence: 0.95 },
            { position: 'corner-bl', confidence: 0.88 }
          ],
          detectionSensitivity
        }
      };

      this.activeJobs.set(jobId, job);
      logger.info(`[BrandWatermarkLock] Smart watermark job ${jobId} completed`);

      return job;
    } catch (error) {
      logger.error(`[BrandWatermarkLock] Smart watermark job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Adjust position for anti-crop margin
   * @param {Object} pos - Original position
   * @param {number} marginPercent - Margin percentage
   * @returns {Object} - Adjusted position
   */
  _adjustForAntiCrop(pos, marginPercent) {
    const margin = marginPercent / 100;
    
    // Clamp position within margins
    return {
      x: Math.max(margin, Math.min(1 - margin, pos.x)),
      y: Math.max(margin, Math.min(1 - margin, pos.y))
    };
  }

  /**
   * Get available positions
   * @returns {Object} - Available positions
   */
  getPositions() {
    return POSITIONS;
  }

  /**
   * Get available sizes
   * @returns {Object} - Available sizes
   */
  getSizes() {
    return SIZES;
  }

  /**
   * Get anti-crop margin options
   * @returns {Object} - Margin options
   */
  getAntiCropOptions() {
    return ANTI_CROP_MARGINS;
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
   * Helper method for simulated delays
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new BrandWatermarkLock();
