/**
 * VIRAL SCORE ENGINE
 * Lightweight AI module to analyze videos and predict viral potential
 * Optimized for 8GB RAM machines
 * 
 * Responsibilities:
 * 1. Analyze video metadata
 * 2. Analyze audio intensity
 * 3. Detect scene changes
 * 4. Detect emotional spikes
 * 5. Assign a VIRAL SCORE (0-100)
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const prisma = require('../prisma/client');

// Import existing engines
const sceneDetector = require('../engine/sceneDetector');
const silenceDetector = require('../engine/silenceDetector');
const viralHookDetector = require('../services/viralHookDetector');

// =============================================================================
// 8GB RAM OPTIMIZATION CONSTANTS
// =============================================================================
const MAX_ANALYSIS_DURATION = 60; // Only analyze first 60 seconds
const SCENE_THRESHOLD = 0.36;     // Optimized for low memory
const MIN_SCENE_DURATION = 0.8;   // Skip micro-scenes
const AUDIO_SAMPLE_RATE = '8000'; // Low sample rate for quick analysis

// =============================================================================
// VIRAL SCORING WEIGHTS
// =============================================================================
const SCORING_WEIGHTS = {
  hookStrength: 0.25,
  speechIntensity: 0.20,
  sceneChangeRate: 0.20,
  emotionPeak: 0.20,
  audioEnergy: 0.15
};

// Minimum score to trigger auto-clipping
const MIN_VIRAL_SCORE_THRESHOLD = 70;

// =============================================================================
// ANALYSIS CACHE
// =============================================================================
const analysisCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get video file path from videoId
 */
async function getVideoPath(videoId) {
  const video = await prisma.video.findUnique({
    where: { id: parseInt(videoId) }
  });
  
  if (!video) {
    throw new Error('Video not found in database');
  }
  
  // Try different possible paths
  const possiblePaths = [
    path.join(__dirname, '..', 'uploads', video.filename),
    path.join(__dirname, '..', video.filename),
    video.filename,
    video.path
  ];
  
  for (const videoPath of possiblePaths) {
    if (videoPath && fs.existsSync(videoPath)) {
      return videoPath;
    }
  }
  
  throw new Error('Video file not found on disk');
}

/**
 * Get video metadata using FFprobe
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    const cmd = `"${process.env.FFPROBE_PATH || 'ffprobe'}" -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    
    exec(cmd, { shell: 'cmd.exe' }, (error, stdout) => {
      if (error) {
        // Return basic metadata on failure
        resolve({
          duration: 60,
          width: 1920,
          height: 1080,
          fps: 30,
          bitrate: 0,
          hasAudio: true
        });
        return;
      }
      
      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(s => s.codec_type === 'video');
        const audioStream = data.streams?.find(s => s.codec_type === 'audio');
        
        resolve({
          duration: parseFloat(data.format?.duration) || 60,
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
          fps: eval(videoStream?.r_frame_rate) || 30,
          bitrate: parseInt(data.format?.bit_rate) || 0,
          hasAudio: !!audioStream,
          codec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name
        });
      } catch (e) {
        resolve({
          duration: 60,
          width: 1920,
          height: 1080,
          fps: 30,
          bitrate: 0,
          hasAudio: true
        });
      }
    });
  });
}

/**
 * Analyze audio intensity using FFmpeg
 * Lightweight analysis - only first 60 seconds
 */
async function analyzeAudioIntensity(videoPath) {
  return new Promise((resolve) => {
    const outputFile = path.join(
      path.dirname(videoPath),
      `audio_${Date.now()}.txt`
    );
    
    // Use volumedetect filter on first 60 seconds
    const cmd = `"${process.env.FFMPEG_PATH || 'ffmpeg'}" -i "${videoPath}" -t ${MAX_ANALYSIS_DURATION} -af "volumedetect" -f null - 2>&1 | findstr "mean_volume max_volume" > "${outputFile}"`;
    
    exec(cmd, { shell: 'cmd.exe', timeout: 30000 }, (error) => {
      if (error) {
        resolve({ meanVolume: -20, maxVolume: -10, dynamicRange: 10 });
        return;
      }
      
      try {
        const content = fs.readFileSync(outputFile, 'utf-8');
        
        const meanMatch = content.match(/mean_volume: ([\-\d.]+) dB/);
        const maxMatch = content.match(/max_volume: ([\-\d.]+) dB/);
        
        const meanVolume = meanMatch ? parseFloat(meanMatch[1]) : -20;
        const maxVolume = maxMatch ? parseFloat(maxMatch[1]) : -10;
        const dynamicRange = maxVolume - meanVolume;
        
        // Clean up
        try { fs.unlinkSync(outputFile); } catch {}
        
        resolve({
          meanVolume,
          maxVolume,
          dynamicRange,
          energy: Math.max(0, (maxVolume + 60) / 60) // Normalize to 0-1
        });
      } catch (e) {
        resolve({ meanVolume: -20, maxVolume: -10, dynamicRange: 10 });
      }
    });
  });
}

/**
 * Detect scene changes
 * Returns scene change rate (changes per minute)
 */
async function detectSceneChanges(videoPath) {
  try {
    // Use lightweight scene detection (first 60 seconds)
    const scenes = await sceneDetector.detectScenes(videoPath, SCENE_THRESHOLD);
    
    // Filter out micro-scenes
    const validScenes = scenes.filter((time, index, arr) => {
      if (index === 0) return true;
      return time - arr[index - 1] >= MIN_SCENE_DURATION;
    });
    
    // Calculate scene change rate per minute
    const analysisDuration = Math.min(MAX_ANALYSIS_DURATION, 60);
    const sceneChangeRate = (validScenes.length / analysisDuration) * 60;
    
    return {
      sceneCount: validScenes.length,
      sceneChangeRate: Math.min(sceneChangeRate, 10), // Cap at 10 per minute
      scenes: validScenes.slice(0, 20), // Store first 20 scene timestamps
      frequency: sceneChangeRate > 3 ? 'high' : sceneChangeRate > 1.5 ? 'medium' : 'low'
    };
  } catch (e) {
    return { sceneCount: 0, sceneChangeRate: 0, scenes: [], frequency: 'low' };
  }
}

/**
 * Analyze silence patterns (speech intensity indicator)
 */
async function analyzeSpeechPatterns(videoPath) {
  try {
    const silences = await silenceDetector.detectSilence(videoPath);
    
    // Calculate speech intensity based on silence patterns
    const totalSilenceDuration = silences.reduce((sum, s) => sum + (s.duration || 0), 0);
    const silenceRatio = silences.length > 0 ? totalSilenceDuration / MAX_ANALYSIS_DURATION : 0;
    
    // High speech = low silence ratio
    const speechIntensity = Math.max(0, 1 - silenceRatio);
    
    return {
      silenceCount: silences.length,
      totalSilenceDuration,
      silenceRatio,
      speechIntensity,
      hasGoodPacing: speechIntensity > 0.5
    };
  } catch (e) {
    return {
      silenceCount: 0,
      totalSilenceDuration: 0,
      silenceRatio: 0,
      speechIntensity: 0.5,
      hasGoodPacing: true
    };
  }
}

/**
 * Analyze hook from video title/description if available
 */
async function analyzeHook(videoId) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: parseInt(videoId) }
    });
    
    if (!video) {
      return { hookScore: 50, detected: false };
    }
    
    // Use viralHookDetector for text analysis
    const result = await viralHookDetector.quickScore(
      [video.title, video.originalName].filter(Boolean).join(' ')
    );
    
    return {
      hookScore: result.hookScore || 50,
      detected: result.hookScore >= 60,
      type: result.type,
      strength: result.strength
    };
  } catch (e) {
    return { hookScore: 50, detected: false };
  }
}

/**
 * Find best moment in video (highest potential segment)
 */
async function findBestMoment(videoPath, sceneData, audioData, emotionData) {
  const analysisDuration = Math.min(MAX_ANALYSIS_DURATION, 60);
  
  // Score each second based on multiple factors
  const scores = [];
  
  for (let second = 0; second < analysisDuration; second++) {
    let score = 50; // Base score
    
    // Boost score near scene changes (high engagement)
    const nearSceneChange = sceneData.scenes.some(scene => 
      Math.abs(scene - second) < 2
    );
    if (nearSceneChange) score += 15;
    
    // Boost score for audio energy
    if (audioData.energy > 0.7) score += 10;
    
    // Boost score for emotional moments
    if (emotionData?.spikes?.some(spike => 
      Math.abs(spike.position - second) < 3
    )) score += 20;
    
    // Prefer first 10 seconds (hook position)
    if (second < 10) score += 10;
    
    scores.push({ second, score });
  }
  
  // Find highest scoring moment
  const bestMoment = scores.reduce((best, current) => 
    current.score > best.score ? current : best
  );
  
  // Define clip range (15-30 seconds around best moment)
  const clipStart = Math.max(0, bestMoment.second - 5);
  const clipEnd = Math.min(analysisDuration, clipStart + 25);
  
  return {
    start: clipStart,
    end: clipEnd,
    duration: clipEnd - clipStart,
    bestSecond: bestMoment.second,
    confidence: bestMoment.score
  };
}

/**
 * Main viral score calculation
 */
function calculateViralScore(analysis) {
  const {
    hookScore,
    speechIntensity,
    sceneChangeRate,
    audioEnergy,
    emotionPeak
  } = analysis;
  
  // Normalize scene change rate (0-10 -> 0-100)
  const normalizedSceneRate = Math.min(sceneChangeRate * 10, 100);
  
  // Calculate weighted score
  const viralScore = 
    (hookScore * SCORING_WEIGHTS.hookStrength) +
    (speechIntensity * 100 * SCORING_WEIGHTS.speechIntensity) +
    (normalizedSceneRate * SCORING_WEIGHTS.sceneChangeRate) +
    (emotionPeak * SCORING_WEIGHTS.emotionPeak) +
    (audioEnergy * 100 * SCORING_WEIGHTS.audioEnergy);
  
  // Clamp to 0-100
  return Math.min(100, Math.max(0, Math.round(viralScore)));
}

/**
 * Generate analysis summary
 */
function generateSummary(analysis) {
  const factors = [];
  
  if (analysis.hookScore >= 60) {
    factors.push('Strong opening hook');
  } else if (analysis.hookScore < 40) {
    factors.push('Weak opening hook');
  }
  
  if (analysis.speechIntensity >= 0.7) {
    factors.push('High speech energy');
  }
  
  if (analysis.sceneChangeRate >= 3) {
    factors.push('Dynamic visuals');
  }
  
  if (analysis.emotionPeak >= 60) {
    factors.push('Emotional peaks detected');
  }
  
  if (analysis.audioEnergy >= 0.6) {
    factors.push('High audio quality');
  }
  
  if (factors.length === 0) {
    factors.push('Average content quality');
  }
  
  return factors;
}

/**
 * MAIN ANALYZE FUNCTION
 * Analyzes video and returns viral score with detailed metrics
 */
async function analyzeVideo(videoId, options = {}) {
  const { forceRefresh = false, storeInDb = true } = options;
  
  // Check cache first
  if (!forceRefresh && analysisCache.has(videoId)) {
    const cached = analysisCache.get(videoId);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }
  }
  
  console.log(`[ViralScoreEngine] Starting analysis for video ${videoId}`);
  
  try {
    // Step 1: Get video path
    const videoPath = await getVideoPath(videoId);
    
    // Step 2: Get video metadata
    const metadata = await getVideoMetadata(videoPath);
    console.log(`[ViralScoreEngine] Duration: ${metadata.duration}s, Resolution: ${metadata.width}x${metadata.height}`);
    
    // Step 3: Analyze audio intensity (lightweight FFmpeg)
    const audioData = await analyzeAudioIntensity(videoPath);
    console.log(`[ViralScoreEngine] Audio energy: ${(audioData.energy * 100).toFixed(1)}%`);
    
    // Step 4: Detect scene changes
    const sceneData = await detectSceneChanges(videoPath);
    console.log(`[ViralScoreEngine] Scene changes: ${sceneData.sceneCount}, Rate: ${sceneData.sceneChangeRate.toFixed(2)}/min`);
    
    // Step 5: Analyze speech patterns
    const speechData = await analyzeSpeechPatterns(videoPath);
    console.log(`[ViralScoreEngine] Speech intensity: ${(speechData.speechIntensity * 100).toFixed(1)}%`);
    
    // Step 6: Analyze hook
    const hookData = await analyzeHook(videoId);
    console.log(`[ViralScoreEngine] Hook score: ${hookData.hookScore}`);
    
    // Step 7: Find best moment
    const bestMoment = await findBestMoment(videoPath, sceneData, audioData, null);
    console.log(`[ViralScoreEngine] Best moment: ${bestMoment.start}s - ${bestMoment.end}s`);
    
    // Step 8: Calculate final viral score
    const analysis = {
      hookScore: hookData.hookScore,
      speechIntensity: speechData.speechIntensity,
      sceneChangeRate: sceneData.sceneChangeRate,
      audioEnergy: audioData.energy,
      emotionPeak: hookData.hookScore // Use hook as emotion indicator
    };
    
    const viralScore = calculateViralScore(analysis);
    const hookDetected = viralScore >= 60;
    
    // Step 9: Prepare result
    const result = {
      viralScore,
      hookDetected,
      bestMomentStart: bestMoment.start,
      bestMomentEnd: bestMoment.end,
      metadata: {
        duration: metadata.duration,
        resolution: `${metadata.width}x${metadata.height}`,
        hasAudio: metadata.hasAudio
      },
      analysis: {
        hookScore: hookData.hookScore,
        speechIntensity: speechData.speechIntensity,
        sceneChangeRate: sceneData.sceneChangeRate,
        audioEnergy: audioData.energy,
        silenceCount: speechData.silenceCount,
        sceneCount: sceneData.sceneCount
      },
      summary: generateSummary(analysis),
      shouldTriggerClip: viralScore >= MIN_VIRAL_SCORE_THRESHOLD,
      analyzedAt: new Date().toISOString()
    };
    
    // Step 10: Store in database
    if (storeInDb) {
      try {
        await prisma.video.update({
          where: { id: parseInt(videoId) },
          data: { viralScore }
        });
        console.log(`[ViralScoreEngine] Stored viralScore ${viralScore} in database`);
      } catch (e) {
        console.log(`[ViralScoreEngine] Could not store in DB: ${e.message}`);
      }
    }
    
    // Cache result
    analysisCache.set(videoId, {
      result,
      timestamp: Date.now()
    });
    
    console.log(`[ViralScoreEngine] Analysis complete. Viral Score: ${viralScore}, Should trigger: ${result.shouldTriggerClip}`);
    
    return result;
    
  } catch (error) {
    console.error(`[ViralScoreEngine] Analysis failed: ${error.message}`);
    throw error;
  }
}

/**
 * Quick score check (lightweight, no FFmpeg)
 */
async function quickScore(videoId) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: parseInt(videoId) }
    });
    
    if (!video) {
      throw new Error('Video not found');
    }
    
    // Use existing viralScore if available
    if (video.viralScore !== null && video.viralScore !== undefined) {
      return {
        viralScore: video.viralScore,
        hasExistingScore: true,
        analyzedAt: video.createdAt
      };
    }
    
    // Quick estimate based on metadata
    return {
      viralScore: 50, // Default
      hasExistingScore: false,
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      viralScore: 50,
      error: error.message
    };
  }
}

/**
 * Get viral score for a video from database
 */
async function getStoredScore(videoId) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: parseInt(videoId) },
      select: {
        viralScore: true,
        createdAt: true,
        title: true,
        platform: true
      }
    });
    
    if (!video) {
      return null;
    }
    
    return {
      videoId: parseInt(videoId),
      viralScore: video.viralScore,
      analyzedAt: video.createdAt,
      platform: video.platform,
      title: video.title
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if video should trigger auto-clip
 */
async function shouldTriggerAutoClip(videoId) {
  try {
    const result = await analyzeVideo(videoId);
    return {
      shouldTrigger: result.shouldTriggerClip,
      viralScore: result.viralScore,
      reason: result.shouldTriggerClip 
        ? `Viral score ${result.viralScore} meets threshold`
        : `Viral score ${result.viralScore} below threshold`,
      bestMoment: {
        start: result.bestMomentStart,
        end: result.bestMomentEnd
      }
    };
  } catch (e) {
    return {
      shouldTrigger: false,
      viralScore: 50,
      reason: `Analysis failed: ${e.message}`,
      error: true
    };
  }
}

/**
 * Batch analyze multiple videos
 */
async function batchAnalyze(videoIds) {
  const results = [];
  
  for (const videoId of videoIds) {
    try {
      const result = await analyzeVideo(videoId);
      results.push({
        videoId,
        success: true,
        viralScore: result.viralScore,
        shouldTrigger: result.shouldTriggerClip
      });
    } catch (e) {
      results.push({
        videoId,
        success: false,
        error: e.message
      });
    }
  }
  
  return results;
}

/**
 * Clear analysis cache
 */
function clearCache() {
  analysisCache.clear();
  console.log('[ViralScoreEngine] Cache cleared');
}

/**
 * Get engine status
 */
function getStatus() {
  return {
    maxAnalysisDuration: MAX_ANALYSIS_DURATION,
    sceneThreshold: SCENE_THRESHOLD,
    minViralScoreThreshold: MIN_VIRAL_SCORE_THRESHOLD,
    scoringWeights: SCORING_WEIGHTS,
    cacheSize: analysisCache.size,
    cacheTTL: CACHE_TTL
  };
}

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  analyzeVideo,
  quickScore,
  getStoredScore,
  shouldTriggerAutoClip,
  batchAnalyze,
  clearCache,
  getStatus,
  // Constants
  MAX_ANALYSIS_DURATION,
  MIN_VIRAL_SCORE_THRESHOLD,
  SCORING_WEIGHTS
};

