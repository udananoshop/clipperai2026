/**
 * VIRAL MOMENT DETECTION ENGINE
 * ClipperAI2026 - Viral Moment Detection Module
 * 
 * Analyzes videos to detect the most engaging segments for clipping.
 * Optimized for 8GB RAM machines.
 * 
 * Key Features:
 * - Process video in 3-second windows
 * - Analyze: speech intensity, emotion spikes, scene changes, audio volume spikes, keyword excitement
 * - Return top 5 highest viral segments
 * 
 * STABILITY RULES:
 * - Skip if memory usage > 85%
 * - Analyze only first 60% of video
 * - Max concurrent analysis: 1
 * - Do not load entire video into memory
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Lazy-loaded dependencies
let resourceMonitor = null;
let silenceDetector = null;
let sceneDetector = null;
let viralHookDetector = null;

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try { resourceMonitor = require('../core/resourceMonitor'); } catch (e) {}
  }
  return resourceMonitor;
};

const getSilenceDetector = () => {
  if (!silenceDetector) {
    try { silenceDetector = require('../engine/silenceDetector'); } catch (e) {}
  }
  return silenceDetector;
};

const getSceneDetector = () => {
  if (!sceneDetector) {
    try { sceneDetector = require('../engine/sceneDetector'); } catch (e) {}
  }
  return sceneDetector;
};

const getViralHookDetector = () => {
  if (!viralHookDetector) {
    try { viralHookDetector = require('../services/viralHookDetector'); } catch (e) {}
  }
  return viralHookDetector;
};

// ============================================================================
// CONFIGURATION - 8GB RAM OPTIMIZED
// ============================================================================

const CONFIG = {
  // Analysis limits
  MAX_ANALYSIS_PERCENT: 0.60,    // Analyze only first 60% of video
  SEGMENT_WINDOW: 3,              // 3-second analysis window
  MIN_SEGMENT_DURATION: 3,        // Minimum segment duration
  MAX_SEGMENT_DURATION: 30,       // Maximum segment duration
  
  // Output limits
  MAX_TOP_SEGMENTS: 5,            // Return top 5 viral segments
  MAX_CONCURRENT_TASKS: 1,       // Sequential processing for 8GB RAM
  
  // Memory guard
  MEMORY_THRESHOLD: 85,           // Skip if memory > 85%
  
  // Scoring weights
  WEIGHTS: {
    speechIntensity: 0.25,       // High speech energy
    emotionSpike: 0.20,          // Emotional peaks
    sceneChange: 0.20,           // Scene transitions
    audioVolume: 0.20,           // Audio energy spikes
    keywordExcitement: 0.15      // Exciting keywords
  },
  
  // Thresholds
  SPEECH_INTENSITY_THRESHOLD: 0.6,
  EMOTION_THRESHOLD: 60,
  SCENE_CHANGE_THRESHOLD: 0.3,
  AUDIO_PEAK_THRESHOLD: -15     // dB
};

// ============================================================================
// CACHE
// ============================================================================

const analysisCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if memory is safe for analysis
 */
function isMemorySafe() {
  const monitor = getResourceMonitor();
  if (monitor && monitor.getMemoryStatus) {
    const status = monitor.getMemoryStatus();
    if (status.system && status.system.percent > CONFIG.MEMORY_THRESHOLD) {
      console.log('[ViralMomentDetector] Memory unsafe, skipping analysis');
      return false;
    }
  }
  
  // Also check OS-level memory
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const percent = ((totalMem - freeMem) / totalMem) * 100;
    
    if (percent > CONFIG.MEMORY_THRESHOLD) {
      console.log(`[ViralMomentDetector] System memory ${percent.toFixed(1)}% > ${CONFIG.MEMORY_THRESHOLD}%, skipping`);
      return false;
    }
  } catch (e) {}
  
  return true;
}

/**
 * Get video duration using ffprobe (lightweight)
 */
async function getVideoDuration(videoPath) {
  return new Promise((resolve) => {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    exec(cmd, { timeout: 30000 }, (error, stdout) => {
      if (error) {
        resolve(60); // Default fallback
        return;
      }
      resolve(parseFloat(stdout.trim()) || 60);
    });
  });
}

/**
 * Get video metadata
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve) => {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    exec(cmd, { timeout: 30000 }, (error, stdout) => {
      if (error) {
        resolve({ duration: 60, width: 1920, height: 1080, fps: 30, hasAudio: true });
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
          hasAudio: !!audioStream
        });
      } catch (e) {
        resolve({ duration: 60, width: 1920, height: 1080, fps: 30, hasAudio: true });
      }
    });
  });
}

/**
 * Execute shell command with timeout
 */
function execPromise(command, timeout = 60000) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

// ============================================================================
// SIGNAL DETECTION FUNCTIONS
// ============================================================================

/**
 * Analyze audio for a specific time window
 * Returns audio volume level (dB)
 */
async function analyzeAudioWindow(videoPath, startTime, endTime) {
  try {
    const duration = endTime - startTime;
    const tempFile = path.join(__dirname, '..', 'temp', `audio_${Date.now()}.txt`);
    
    // Use volumedetect filter for specific segment
    const cmd = `"${process.env.FFMPEG_PATH || 'ffmpeg'}" -i "${videoPath}" -ss ${startTime} -t ${duration} -af "volumedetect" -f null - 2>&1 | findstr "mean_volume max_volume" > "${tempFile}"`;
    
    await new Promise((resolve, reject) => {
      exec(cmd, { timeout: 30000 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    if (!fs.existsSync(tempFile)) {
      return { meanVolume: -20, maxVolume: -10, dynamicRange: 10 };
    }
    
    const content = fs.readFileSync(tempFile, 'utf-8');
    
    const meanMatch = content.match(/mean_volume: ([\-\d.]+) dB/);
    const maxMatch = content.match(/max_volume: ([\-\d.]+) dB/);
    
    const meanVolume = meanMatch ? parseFloat(meanMatch[1]) : -20;
    const maxVolume = maxMatch ? parseFloat(maxMatch[1]) : -10;
    const dynamicRange = maxVolume - meanVolume;
    
    // Clean up
    try { fs.unlinkSync(tempFile); } catch {}
    
    return { meanVolume, maxVolume, dynamicRange };
  } catch (e) {
    return { meanVolume: -20, maxVolume: -10, dynamicRange: 10 };
  }
}

/**
 * Detect scene changes in a time window
 * Returns scene change score (0-1)
 */
async function detectSceneChanges(videoPath, startTime, endTime) {
  try {
    const sceneDet = getSceneDetector();
    
    if (sceneDet && sceneDet.detectScenes) {
      // Use existing scene detector with limited range
      const scenes = await sceneDet.detectScenes(videoPath, 0.4);
      
      // Count scenes in this window
      const scenesInWindow = scenes.filter(s => s >= startTime && s < endTime);
      
      // Calculate score based on scene density
      const windowDuration = endTime - startTime;
      const sceneDensity = scenesInWindow.length / windowDuration;
      
      return {
        sceneCount: scenesInWindow.length,
        score: Math.min(1, sceneDensity * 2), // Cap at 1
        scenes: scenesInWindow
      };
    }
    
    // Fallback: return random-ish score based on time
    return { sceneCount: 0, score: 0.2, scenes: [] };
  } catch (e) {
    return { sceneCount: 0, score: 0.2, scenes: [] };
  }
}

/**
 * Analyze speech intensity in a time window
 * Returns speech intensity score (0-1)
 */
async function analyzeSpeechIntensity(videoPath, startTime, endTime) {
  try {
    const silenceDet = getSilenceDetector();
    
    if (silenceDet && silenceDet.detectSilence) {
      // Get silence segments in this window
      const allSilences = await silenceDet.detectSilence(videoPath);
      
      // Filter to window
      const silencesInWindow = allSilences.filter(s => 
        s.start >= startTime && s.start < endTime
      );
      
      const windowDuration = endTime - startTime;
      const silenceDuration = silencesInWindow.reduce((sum, s) => sum + (s.duration || 0), 0);
      const silenceRatio = silenceDuration / windowDuration;
      
      // High speech = low silence
      const speechIntensity = Math.max(0, 1 - silenceRatio);
      
      return {
        speechIntensity,
        silenceCount: silencesInWindow.length,
        silenceRatio
      };
    }
    
    // Fallback: use audio analysis
    const audioData = await analyzeAudioWindow(videoPath, startTime, endTime);
    const speechIntensity = audioData.dynamicRange > 15 ? 0.8 : 0.5;
    
    return { speechIntensity, silenceCount: 0, silenceRatio: 1 - speechIntensity };
  } catch (e) {
    return { speechIntensity: 0.5, silenceCount: 0, silenceRatio: 0.5 };
  }
}

/**
 * Detect emotion spikes (simplified)
 * Uses audio characteristics as emotion proxy
 */
async function detectEmotionSpikes(videoPath, startTime, endTime) {
  try {
    const audioData = await analyzeAudioWindow(videoPath, startTime, endTime);
    
    // High dynamic range often indicates emotional peaks
    const emotionScore = Math.min(100, (audioData.dynamicRange / 20) * 100);
    
    // Also check for sudden loud moments (exclamation-like)
    const isPeak = audioData.maxVolume > -5;
    
    return {
      emotionScore,
      isPeak,
      intensity: audioData.dynamicRange
    };
  } catch (e) {
    return { emotionScore: 50, isPeak: false, intensity: 10 };
  }
}

/**
 * Analyze keyword excitement (simplified)
 * Uses video title/metadata if available
 */
async function analyzeKeywordExcitement(videoPath, videoTitle = '') {
  try {
    const hookDet = getViralHookDetector();
    
    if (hookDet && hookDet.quickScore) {
      const result = await hookDet.quickScore(videoTitle || 'video content');
      return {
        keywordScore: result.hookScore || 50,
        keywords: result.keywords || []
      };
    }
    
    return { keywordScore: 50, keywords: [] };
  } catch (e) {
    return { keywordScore: 50, keywords: [] };
  }
}

// ============================================================================
// VIRAL SCORE CALCULATION
// ============================================================================

/**
 * Calculate viral score for a segment
 */
function calculateViralScore(segment, weights) {
  const {
    speechIntensity = 0.5,
    emotionScore = 50,
    sceneChangeScore = 0,
    audioVolume = -20,
    keywordScore = 50
  } = segment;
  
  // Normalize scores to 0-100
  const speechScore = speechIntensity * 100;
  const sceneScore = sceneChangeScore * 100;
  const emotionNorm = emotionScore;
  const keywordNorm = keywordScore;
  
  // Audio volume to 0-100 (higher volume = higher score)
  const audioNorm = Math.min(100, Math.max(0, (audioVolume + 60) * 1.67));
  
  // Calculate weighted score
  const viralScore = 
    (speechScore * weights.speechIntensity) +
    (emotionNorm * weights.emotionSpike) +
    (sceneScore * weights.sceneChange) +
    (audioNorm * weights.audioVolume) +
    (keywordNorm * weights.keywordExcitement);
  
  return Math.min(100, Math.max(0, Math.round(viralScore)));
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect viral moments in a video
 * Returns top 5 segments sorted by viral score
 */
async function detectViralMoments(videoPath, options = {}) {
  const { 
    forceRefresh = false,
    maxSegments = CONFIG.MAX_TOP_SEGMENTS,
    windowSize = CONFIG.SEGMENT_WINDOW,
    videoTitle = ''
  } = options;
  
  // Check cache first
  const cacheKey = videoPath + '_' + (videoTitle || '');
  if (!forceRefresh && analysisCache.has(cacheKey)) {
    const cached = analysisCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[ViralMomentDetector] Returning cached results');
      return cached.result;
    }
  }
  
  // Check memory safety
  if (!isMemorySafe()) {
    console.log('[ViralMomentDetector] Memory check failed, returning empty results');
    return {
      segments: [],
      fallback: true,
      reason: 'memory_unsafe',
      analyzedAt: new Date().toISOString()
    };
  }
  
  console.log('[ViralMomentDetector] Starting viral moment detection...');
  console.log(`[ViralMomentDetector] Video: ${videoPath}`);
  
  try {
    // Get video metadata
    const metadata = await getVideoMetadata(videoPath);
    const totalDuration = metadata.duration;
    
    // Calculate analysis window (first 60% of video)
    const analysisDuration = totalDuration * CONFIG.MAX_ANALYSIS_PERCENT;
    const maxAnalysisTime = Math.min(analysisDuration, 300); // Cap at 5 minutes
    
    console.log(`[ViralMomentDetector] Total duration: ${totalDuration}s, Analyzing: ${maxAnalysisTime}s (60%)`);
    
    // Get keyword excitement (one-time analysis)
    const keywordData = await analyzeKeywordExcitement(videoPath, videoTitle);
    
    // Scan video in windows
    const segments = [];
    const windowDuration = windowSize;
    
    for (let startTime = 0; startTime < maxAnalysisTime - windowDuration; startTime += windowDuration) {
      const endTime = Math.min(startTime + windowDuration, maxAnalysisTime);
      
      try {
        // Analyze each signal in parallel (but process windows sequentially for memory)
        const [speechData, sceneData, emotionData, audioData] = await Promise.all([
          analyzeSpeechIntensity(videoPath, startTime, endTime),
          detectSceneChanges(videoPath, startTime, endTime),
          detectEmotionSpikes(videoPath, startTime, endTime),
          analyzeAudioWindow(videoPath, startTime, endTime)
        ]);
        
        // Create segment object
        const segment = {
          startTime: Math.round(startTime * 10) / 10,
          endTime: Math.round(endTime * 10) / 10,
          duration: Math.round((endTime - startTime) * 10) / 10,
          speechIntensity: speechData.speechIntensity,
          emotionScore: emotionData.emotionScore,
          sceneChangeScore: sceneData.score,
          audioVolume: audioData.maxVolume,
          keywordScore: keywordData.keywordScore,
          // Combined scores
          emotionSpike: emotionData.isPeak,
          hasSceneChange: sceneData.sceneCount > 0
        };
        
        // Calculate viral score
        segment.viralScore = calculateViralScore(segment, CONFIG.WEIGHTS);
        
        segments.push(segment);
        
      } catch (e) {
        console.log(`[ViralMomentDetector] Error at ${startTime}s: ${e.message}`);
      }
    }
    
    console.log(`[ViralMomentDetector] Analyzed ${segments.length} segments`);
    
    // Sort by viral score and get top segments
    const sortedSegments = segments.sort((a, b) => b.viralScore - a.viralScore);
    const topSegments = sortedSegments.slice(0, maxSegments);
    
    // Expand segments to clip-friendly duration (merge nearby high-scoring segments)
    const expandedSegments = expandToClipDuration(topSegments, totalDuration);
    
    // Final result
    const result = {
      segments: expandedSegments,
      metadata: {
        totalDuration,
        analyzedDuration: maxAnalysisTime,
        windowSize,
        segmentCount: segments.length,
        topScore: topSegments[0]?.viralScore || 0,
        averageScore: segments.length > 0 
          ? Math.round(segments.reduce((sum, s) => sum + s.viralScore, 0) / segments.length)
          : 0
      },
      fallback: false,
      analyzedAt: new Date().toISOString()
    };
    
    // Cache result
    analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    console.log(`[ViralMomentDetector] Detection complete. Top score: ${result.metadata.topScore}`);
    
    return result;
    
  } catch (error) {
    console.error('[ViralMomentDetector] Detection error:', error.message);
    return {
      segments: [],
      fallback: true,
      reason: 'analysis_error',
      error: error.message,
      analyzedAt: new Date().toISOString()
    };
  }
}

/**
 * Expand segments to clip-friendly duration
 * Merges nearby high-scoring windows into larger segments
 */
function expandToClipDuration(segments, totalDuration) {
  if (segments.length === 0) return [];
  
  const expanded = [];
  const minDuration = CONFIG.MIN_SEGMENT_DURATION;
  const maxDuration = CONFIG.MAX_SEGMENT_DURATION;
  
  for (const segment of segments) {
    let startTime = segment.startTime;
    let endTime = segment.endTime;
    
    // Try to expand to min duration
    while (endTime - startTime < minDuration && endTime < totalDuration) {
      endTime += 0.5;
    }
    
    // Cap at max duration
    if (endTime - startTime > maxDuration) {
      endTime = startTime + maxDuration;
    }
    
    // Ensure within bounds
    startTime = Math.max(0, startTime);
    endTime = Math.min(totalDuration, endTime);
    
    expanded.push({
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      duration: Math.round((endTime - startTime) * 10) / 10,
      viralScore: segment.viralScore,
      emotionScore: segment.emotionScore,
      speechIntensity: segment.speechIntensity,
      sceneChangeScore: segment.sceneChangeScore,
      // Engagement level label
      engagementLevel: segment.viralScore >= 80 ? 'high' 
        : segment.viralScore >= 60 ? 'medium' 
        : 'low'
    });
  }
  
  return expanded;
}

// ============================================================================
// INTEGRATION FUNCTION
// ============================================================================

/**
 * Get viral segments for clipping pipeline
 * This is the main integration point for viralClipFactory
 * 
 * Returns segments ready for clip generation
 * Falls back to empty if detection fails
 */
async function getViralSegmentsForClipping(videoPath, options = {}) {
  const result = await detectViralMoments(videoPath, options);
  
  if (result.fallback || result.segments.length === 0) {
    console.log('[ViralMomentDetector] Falling back to default segments');
    return [];
  }
  
  return result.segments.map((seg, index) => ({
    id: index + 1,
    startTime: seg.startTime,
    endTime: seg.endTime,
    duration: seg.duration,
    viralScore: seg.viralScore,
    emotionScore: seg.emotionScore,
    speechIntensity: seg.speechIntensity,
    sceneChangeScore: seg.sceneChangeScore,
    type: 'viral_moment',
    reason: `Viral moment detected (score: ${seg.viralScore})`
  }));
}

// ============================================================================
// STATUS & UTILS
// ============================================================================

/**
 * Get detector status
 */
function getStatus() {
  return {
    isActive: true,
    config: CONFIG,
    cacheSize: analysisCache.size,
    memoryThreshold: CONFIG.MEMORY_THRESHOLD,
    maxAnalysisPercent: CONFIG.MAX_ANALYSIS_PERCENT * 100,
    segmentWindow: CONFIG.SEGMENT_WINDOW,
    maxSegments: CONFIG.MAX_TOP_SEGMENTS
  };
}

/**
 * Clear cache
 */
function clearCache() {
  analysisCache.clear();
  console.log('[ViralMomentDetector] Cache cleared');
}

/**
 * Check if detector is ready
 */
function isReady() {
  return isMemorySafe();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main detection functions
  detectViralMoments,
  getViralSegmentsForClipping,
  
  // Status & utils
  getStatus,
  clearCache,
  isReady,
  isMemorySafe,
  
  // Constants
  CONFIG
};

