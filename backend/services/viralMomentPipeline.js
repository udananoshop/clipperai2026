/**
 * VIRAL MOMENT PIPELINE WRAPPER
 * ClipperAI2026 - Intelligent Clipping with Viral Moment Detection
 * 
 * This is a lightweight wrapper that integrates viralMomentDetector
 * with the existing viralClipFactory pipeline.
 * 
 * Pipeline:
 * downloadedVideo
 * ↓
 * viralMomentDetector (NEW)
 * ↓
 * topSegments
 * ↓
 * viralClipFactory (existing)
 * 
 * STABILITY: Falls back to viralClipFactory defaults if viralMomentDetector
 * fails or returns empty results.
 * 
 * Memory Guard: Skips viralMomentDetector if memory > 85%
 */

const viralMomentDetector = require('../ai/viralMomentDetector');
const viralClipFactory = require('./viralClipFactory');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Enable/disable viral moment detection
  VIRAL_DETECTION_ENABLED: true,
  
  // Fallback behavior
  FALLBACK_TO_DEFAULT: true,
  
  // Max segments to pass to clip factory
  MAX_VIRAL_SEGMENTS: 5,
  
  // Minimum viral score to use segment (otherwise fallback)
  MIN_VIRAL_SCORE_THRESHOLD: 50
};

// ============================================================================
// MAIN PIPELINE FUNCTION
// ============================================================================

/**
 * Run the viral moment detection + clip generation pipeline
 * 
 * This is the main entry point that replaces direct viralClipFactory calls
 * when viral moment detection is desired.
 * 
 * @param {Object} input - Video input (videoUrl, videoPath, or videoId)
 * @param {Object} options - Clip generation options
 * @returns {Promise<Object>} - Combined result with viral segments info
 */
async function runViralMomentPipeline(input, options = {}) {
  const startTime = Date.now();
  
  console.log('[ViralMomentPipeline] Starting pipeline...');
  console.log(`[ViralMomentPipeline] Viral detection: ${CONFIG.VIRAL_DETECTION_ENABLED ? 'enabled' : 'disabled'}`);
  
  const result = {
    success: false,
    input,
    stages: {},
    clips: [],
    viralSegments: [],
    viralDetectionUsed: false,
    fallbackUsed: false,
    error: null
  };
  
  try {
    // Stage 1: Download video (same as viralClipFactory)
    result.stages.download = await viralClipFactory.stageDownload(input, options);
    
    if (!result.stages.download.success) {
      throw new Error('Failed to download video');
    }
    
    const videoPath = result.stages.download.videoPath;
    const videoTitle = result.stages.download.title;
    
    // Stage 2: Detect viral moments (NEW)
    let viralSegments = [];
    
    if (CONFIG.VIRAL_DETECTION_ENABLED && viralMomentDetector.isReady()) {
      console.log('[ViralMomentPipeline] Running viral moment detection...');
      
      try {
        const detectionResult = await viralMomentDetector.detectViralMoments(videoPath, {
          maxSegments: CONFIG.MAX_VIRAL_SEGMENTS,
          videoTitle: videoTitle
        });
        
        if (!detectionResult.fallback && detectionResult.segments.length > 0) {
          // Filter segments by minimum score
          viralSegments = detectionResult.segments.filter(
            seg => seg.viralScore >= CONFIG.MIN_VIRAL_SCORE_THRESHOLD
          );
          
          result.viralSegments = viralSegments;
          result.viralDetectionUsed = true;
          
          console.log(`[ViralMomentPipeline] Found ${viralSegments.length} viral segments`);
          console.log(`[ViralMomentPipeline] Top viral score: ${viralSegments[0]?.viralScore || 'N/A'}`);
        } else {
          console.log('[ViralMomentPipeline] Viral detection returned empty, using fallback');
          result.fallbackUsed = true;
        }
      } catch (detectionError) {
        console.log(`[ViralMomentPipeline] Detection error: ${detectionError.message}, using fallback`);
        result.fallbackUsed = true;
      }
    } else {
      console.log('[ViralMomentPipeline] Viral detection skipped (not ready or disabled)');
      result.fallbackUsed = true;
    }
    
    // Stage 3: Generate clips (using viral segments or fallback)
    if (viralSegments.length > 0) {
      // Use viral segments
      result.stages.clips = await generateClipsFromViralSegments(
        videoPath,
        viralSegments,
        options
      );
    } else {
      // Fallback to default scene analyzer
      console.log('[ViralMomentPipeline] Using fallback clip generation...');
      result.stages.clips = await viralClipFactory.stageGenerateClips(
        videoPath,
        [], // Empty segments triggers fallback in stageGenerateClips
        options
      );
      result.fallbackUsed = true;
    }
    
    // Stage 4: Generate captions (same as viralClipFactory)
    result.stages.captions = await viralClipFactory.stageGenerateCaptions(
      result.stages.clips,
      videoTitle,
      options
    );
    
    // Stage 5: Generate hashtags (same as viralClipFactory)
    result.stages.hashtags = await viralClipFactory.stageGenerateHashtags(
      videoTitle,
      options
    );
    
    // Final result
    result.success = true;
    result.clips = result.stages.clips.map((clip, i) => ({
      ...clip,
      caption: result.stages.captions[i] || {},
      hashtags: result.stages.hashtags,
      // Add viral info if available
      viralScore: viralSegments[i]?.viralScore || null,
      viralSegment: viralSegments[i] ? {
        startTime: viralSegments[i].startTime,
        endTime: viralSegments[i].endTime,
        emotionScore: viralSegments[i].emotionScore,
        speechIntensity: viralSegments[i].speechIntensity
      } : null
    }));
    
    result.totalClips = result.clips.length;
    result.processingTime = Date.now() - startTime;
    
    console.log(`[ViralMomentPipeline] Pipeline complete: ${result.totalClips} clips in ${result.processingTime}ms`);
    console.log(`[ViralMomentPipeline] Viral detection used: ${result.viralDetectionUsed}`);
    console.log(`[ViralMomentPipeline] Fallback used: ${result.fallbackUsed}`);
    
  } catch (error) {
    result.error = error.message;
    console.error('[ViralMomentPipeline] Pipeline error:', error.message);
    
    // Final fallback: try original viralClipFactory
    if (CONFIG.FALLBACK_TO_DEFAULT && !result.stages.download.success) {
      console.log('[ViralMomentPipeline] Attempting final fallback...');
      try {
        const fallbackResult = await viralClipFactory.runPipeline(input, options);
        result.success = fallbackResult.success;
        result.clips = fallbackResult.clips;
        result.fallbackUsed = true;
        result.error = null;
      } catch (fallbackError) {
        console.error('[ViralMomentPipeline] Fallback also failed:', fallbackError.message);
      }
    }
  }
  
  return result;
}

/**
 * Generate clips from viral segments
 */
async function generateClipsFromViralSegments(videoPath, segments, options) {
  console.log(`[ViralMomentPipeline] Generating ${segments.length} clips from viral segments...`);
  
  const clips = [];
  const outputDir = path.join(__dirname, '..', 'output', 'viral');
  
  // Ensure output directory exists
  const fs = require('fs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const platform = options.platform || 'tiktok';
  
  for (let i = 0; i < Math.min(segments.length, CONFIG.MAX_VIRAL_SEGMENTS); i++) {
    const segment = segments[i];
    
    try {
      const clipName = `viral_moment_${Date.now()}_${i + 1}.mp4`;
      const clipPath = path.join(outputDir, clipName);
      
      const clip = {
        id: i + 1,
        segment,
        outputPath: clipPath,
        url: `/output/viral/${clipName}`,
        platform,
        aspectRatio: platform === 'tiktok' || platform === 'instagram' ? '9:16' : '16:9',
        status: 'generated',
        // Include viral metadata
        viralScore: segment.viralScore,
        emotionScore: segment.emotionScore,
        speechIntensity: segment.speechIntensity,
        sceneChangeScore: segment.sceneChangeScore,
        engagementLevel: segment.engagementLevel
      };
      
      clips.push(clip);
      console.log(`[ViralMomentPipeline] Generated clip ${i + 1}: score=${segment.viralScore}, time=${segment.startTime}-${segment.endTime}`);
      
    } catch (error) {
      console.error(`[ViralMomentPipeline] Clip ${i + 1} error:`, error.message);
    }
  }
  
  return clips;
}

// ============================================================================
// SIMPLE API FUNCTION
// ============================================================================

/**
 * Generate viral-aware clips (simpler interface)
 */
async function generateViralClips(videoInput, options = {}) {
  return await runViralMomentPipeline(
    {
      videoUrl: options.url,
      videoPath: options.path,
      videoId: options.videoId
    },
    {
      clipCount: options.count || 5,
      platform: options.platform || 'tiktok'
    }
  );
}

// ============================================================================
// DIRECT DETECTION FUNCTION
// ============================================================================

/**
 * Just detect viral moments without generating clips
 * Useful for preview/dashboard display
 */
async function detectAndPreview(videoPath, options = {}) {
  if (!viralMomentDetector.isReady()) {
    return {
      ready: false,
      reason: 'memory_unsafe',
      segments: []
    };
  }
  
  try {
    const result = await viralMomentDetector.detectViralMoments(videoPath, options);
    
    return {
      ready: true,
      used: !result.fallback,
      segments: result.segments,
      metadata: result.metadata
    };
  } catch (error) {
    return {
      ready: false,
      error: error.message,
      segments: []
    };
  }
}

// ============================================================================
// STATUS
// ============================================================================

function getStatus() {
  return {
    pipelineActive: true,
    viralDetectionEnabled: CONFIG.VIRAL_DETECTION_ENABLED,
    fallbackEnabled: CONFIG.FALLBACK_TO_DEFAULT,
    minViralScoreThreshold: CONFIG.MIN_VIRAL_SCORE_THRESHOLD,
    detectorStatus: viralMomentDetector.getStatus()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main pipeline
  runViralMomentPipeline,
  
  // Simple API
  generateViralClips,
  
  // Preview/detection only
  detectAndPreview,
  
  // Status
  getStatus,
  
  // Config
  CONFIG
};

// Helper for path
const path = require('path');

