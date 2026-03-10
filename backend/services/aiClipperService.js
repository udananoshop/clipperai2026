const clipService = require('./clipService');
const predictionService = require('./predictionService');
const hashtagService = require('./hashtagService');
const prisma = require('../prisma/client');
const path = require('path');
const fs = require('fs');

/**
 * AI Clipper Service - Auto-generates clips from uploaded videos
 * Runs in background after video upload
 */
class AIClipperService {
  constructor() {
    // Possible video locations
    this.videoPaths = [
      path.join(__dirname, '../uploads/videos'),
      path.join(__dirname, '../uploads'),
      path.join(process.cwd(), 'uploads/videos'),
      path.join(process.cwd(), 'uploads'),
    ];
  }

  /**
   * Find the actual video file path
   * @param {string} filename 
   * @returns {string|null}
   */
  findVideoPath(filename) {
    for (const basePath of this.videoPaths) {
      const fullPath = path.join(basePath, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Generate random number between min and max
   */
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Choose 3 timestamps between 20% - 80% of video duration
   * @param {number} duration - video duration in seconds
   * @returns {number[]} array of 3 timestamps
   */
  chooseTimestamps(duration) {
    const startPercent = 0.2;
    const endPercent = 0.8;
    
    const minTime = duration * startPercent;
    const maxTime = duration * endPercent;
    
    // Generate 3 evenly spaced timestamps
    const timestamps = [];
    const step = (maxTime - minTime) / 2;
    
    for (let i = 0; i < 3; i++) {
      const timestamp = minTime + (step * i);
      timestamps.push(Math.floor(timestamp));
    }
    
    return timestamps;
  }

  /**
   * Run auto clipper in background
   * @param {number} videoId - Prisma video ID
   * @param {string} filename - video filename
   */
  runAutoClipper(videoId, filename) {
    // Run in background - non-blocking
    setTimeout(async () => {
      try {
        console.log(`[AIClipper] Starting auto-clip for video ${videoId}`);
        
        // Find video path
        const videoPath = this.findVideoPath(filename);
        
        if (!videoPath) {
          console.error(`[AIClipper] Video file not found: ${filename}`);
          return;
        }

        // Get video duration using ffprobe
        const videoInfo = await clipService.getVideoInfo(videoPath);
        const duration = videoInfo.duration;
        
        console.log(`[AIClipper] Video duration: ${duration}s`);
        
        // Choose 3 timestamps between 20% - 80%
        const timestamps = this.chooseTimestamps(duration);
        
        // Process each timestamp
        for (let i = 0; i < timestamps.length; i++) {
          const startTime = timestamps[i];
          const clipDuration = this.randomBetween(25, 35); // 25-35 sec random
          
          // Ensure we don't exceed video duration
          const actualDuration = Math.min(clipDuration, duration - startTime);
          
          if (actualDuration < 10) {
            console.log(`[AIClipper] Skipping clip ${i + 1}: too short`);
            continue;
          }

          try {
            // Generate output filename
            const outputFilename = `auto_clip_${videoId}_${Date.now()}_${i}.mp4`;
            const outputDir = path.join(process.cwd(), 'output');
            
            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const outputPath = path.join(outputDir, outputFilename);
            const publicPath = `/output/${outputFilename}`;
            
            // Create clip with 9:16 vertical aspect ratio
            await clipService.createClip(
              videoPath,
              outputPath,
              startTime,
              actualDuration,
              { aspectRatio: '9:16' }
            );
            
            console.log(`[AIClipper] Created clip ${i + 1}: ${outputFilename}`);
            
            // Get AI predictions
            let viralResult = { score: 60 };
            let hashtags = [];
            
            try {
              viralResult = await predictionService.calculateViralScore('', `Clip ${i + 1}`);
              hashtags = await hashtagService.generateHashtags(`Clip ${i + 1}`, 'tiktok');
            } catch (aiError) {
              console.log(`[AIClipper] AI prediction failed, using defaults`);
            }
            
            // Save clip to database using Prisma
            await prisma.clip.create({
              data: {
                title: `Auto Clip ${i + 1} - ${filename}`,
                videoId: videoId
              }
            });
            
            console.log(`[AIClipper] Saved clip ${i + 1} to database`);
            
          } catch (clipError) {
            console.error(`[AIClipper] Error creating clip ${i + 1}:`, clipError.message);
            // Continue with next clip
          }
        }
        
        console.log(`[AIClipper] Completed auto-clip for video ${videoId}`);
        
      } catch (error) {
        console.error(`[AIClipper] Error in auto-clipper:`, error.message);
        // Never throw - this runs in background
      }
    }, 5000); // 5 second delay
  }
}

module.exports = new AIClipperService();
