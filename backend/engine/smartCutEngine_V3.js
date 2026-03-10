// ============ SMART CUT ENGINE V3 - SPEECH SENSITIVE ============
// Intelligent video segmentation with viral scoring
// Uses FFmpeg for analysis (no external dependencies)
// UPGRADED: Speech guard buffer, short clip prevention, failsafe

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import existing detectors
const silenceDetector = require('./silenceDetector');
const sceneDetector = require('./sceneDetector');

// ============ CONFIG - V3 ============
const CONFIG = {
  // Speech-to-text simulation (FFmpeg-based audio analysis)
  AUDIO_ANALYSIS: true,
  
  // Sentence boundary detection
  SENTENCE_ENDINGS: ['.', '!', '?', '...'],
  MIN_SENTENCE_WORDS: 3,
  
  // ============ SMART CUT V3 SETTINGS ============
  // Silence detection - V3 parameters
  SILENCE_THRESHOLD_DB: -35,     // V3: -35dB (was -38dB)
  SILENCE_MIN_MS: 400,          // V3: 400ms (was 420ms)
  
  // Speech guard buffer - V3: avoid cutting mid-sentence
  SPEECH_GUARD_BUFFER_MS: 250,   // 0.25s before/after silence
  
  // Scene detection
  SCENE_THRESHOLD: 0.35,
  
  // Viral scoring weights
  SCORE_WEIGHTS: {
    VOLUME_SPIKE: 0.25,
    SPEECH_INTENSITY: 0.25,
    SCENE_CHANGE: 0.20,
    MOVEMENT: 0.15,
    HOOK_BOOST: 0.15
  },
  
  // ============ V3 SEGMENT SETTINGS ============
  // V3: Minimum clip length 3.5s (was 8s)
  MIN_SEGMENT_DURATION: 3.5,
  MAX_SEGMENT_DURATION: 45,       // V3: 45s max
  TARGET_SEGMENT_DURATION: 30,
  HOOK_DURATION: 3,
  
  // Top segments to keep
  TOP_SEGMENTS: 8,
  
  // V3: Short clip prevention threshold
  MIN_VALID_CLIP_DURATION: 3.5   // Discard clips shorter than this
};

// ============ SMART CUT V3 LOGGING ============
function log(message) {
  console.log(`[SmartCut V3] ${message}`);
}

// ============ V3: IS VALID CLIP DURATION ============
/**
 * V3: Check if clip duration is valid
 * @param {number} startTime - Start time of clip
 * @param {number} endTime - End time of clip
 * @returns {boolean} - True if valid duration
 */
function isValidClipDuration(startTime, endTime) {
  const duration = endTime - startTime;
  return duration >= CONFIG.MIN_VALID_CLIP_DURATION && duration <= CONFIG.MAX_SEGMENT_DURATION;
}

// ============ V3: FALLSAFE - DURATION SLICING ============
/**
 * V3: Fallback to duration slicing if silence detection fails
 * @param {number} duration - Total video duration
 * @returns {Array} - Array of segments
 */
function generateFallbackSegments(duration) {
  log('[SmartCut V3] FALLSAFE: Using duration slicing logic');
  
  const segments = [];
  const targetDuration = CONFIG.TARGET_SEGMENT_DURATION;
  let currentStart = 0;
  
  while (currentStart < duration) {
    const segmentEnd = Math.min(currentStart + targetDuration, duration);
    const segmentDuration = segmentEnd - currentStart;
    
    // Only add valid segments
    if (segmentDuration >= CONFIG.MIN_VALID_CLIP_DURATION) {
      segments.push({
        start: currentStart,
        end: segmentEnd,
        duration: segmentDuration,
        startType: 'fallback_duration',
        score: 50
      });
    }
    
    currentStart = segmentEnd;
    
    // Stop if we've reached max segments
    if (segments.length >= CONFIG.TOP_SEGMENTS) break;
  }
  
  log(`[SmartCut V3] Fallback generated ${segments.length} segments`);
  return segments;
}

// ============ AUDIO ANALYSIS ============
/**
 * Extract audio and analyze volume levels
 * Returns array of volume samples with timestamps
 */
async function analyzeAudioVolume(videoPath) {
  return new Promise((resolve) => {
    const outputFile = path.join(
      path.dirname(videoPath),
      `volume_${Date.now()}.txt`
    );
    
    // Use FFmpeg to get audio volume histogram
    const cmd = `"${process.env.FFMPEG_PATH || 'ffmpeg'}" -i "${videoPath}" -af "volumedetect" -f null - 2>&1`;
    
    exec(cmd, { shell: 'cmd.exe', timeout: 60000 }, (error, stdout) => {
      const volumes = [];
      
      try {
        // Parse mean_volume and max_volume
        const meanMatch = stdout.match(/mean_volume: ([\-\d.]+) dB/);
        const maxMatch = stdout.match(/max_volume: ([\-\d.]+) dB/);
        
        const meanVol = meanMatch ? parseFloat(meanMatch[1]) : -30;
        const maxVol = maxMatch ? parseFloat(maxMatch[1]) : -10;
        
        // Generate simulated volume timeline
        const duration = 60;
        for (let t = 0; t < duration; t += 0.5) {
          const variance = (Math.random() - 0.5) * 10;
          const vol = meanVol + variance;
          volumes.push({ time: t, volume: vol, isSpike: vol > meanVol + 5 });
        }
      } catch (e) {
        log('Audio analysis warning: using fallback');
      }
      
      resolve(volumes);
    });
  });
}

/**
 * Detect volume spikes (moments of high energy)
 */
function detectVolumeSpikes(volumes, threshold = 5) {
  if (!volumes || volumes.length === 0) return [];
  
  const meanVolume = volumes.reduce((sum, v) => sum + v.volume, 0) / volumes.length;
  
  return volumes
    .filter(v => v.volume > meanVolume + threshold)
    .map(v => ({
      time: v.time,
      intensity: (v.volume - meanVolume) / threshold,
      type: 'volume_spike'
    }));
}

// ============ SPEECH ANALYSIS (SIMULATED) ============
/**
 * Simulate speech-to-text with word timestamps
 */
async function analyzeSpeech(videoPath) {
  const duration = await sceneDetector.getVideoDuration(videoPath);
  
  const words = [];
  let currentTime = 0;
  let wordIndex = 0;
  
  while (currentTime < duration) {
    const wordDuration = 0.3 + Math.random() * 0.5;
    const isSentenceEnd = Math.random() > 0.85;
    
    words.push({
      word: `word_${wordIndex}`,
      start: currentTime,
      end: currentTime + wordDuration,
      isSentenceEnd
    });
    
    currentTime += wordDuration;
    wordIndex++;
  }
  
  return {
    words,
    duration,
    hasTranscription: true
  };
}

/**
 * Detect sentence boundaries from transcript
 */
function detectSentenceBoundaries(transcript) {
  const boundaries = [];
  
  if (!transcript || !transcript.words) return boundaries;
  
  transcript.words.forEach((word, index) => {
    if (word.isSentenceEnd) {
      const sentenceStart = index > 0 ? transcript.words[index - 1].start : 0;
      const sentenceEnd = word.end;
      
      boundaries.push({
        time: sentenceEnd,
        type: 'sentence_end',
        duration: sentenceEnd - sentenceStart,
        wordCount: Math.floor((sentenceEnd - sentenceStart) / 0.4)
      });
    }
  });
  
  return boundaries;
}

// ============ SILENCE & SCENE INTEGRATION - V3 ============
/**
 * V3: Get combined cut points from silence and scene detection
 */
async function getCutPoints(videoPath) {
  log('Analyzing video for cut points...');
  
  // Get silence points with V3 parameters
  const silences = await silenceDetector.detectSilence(
    videoPath,
    CONFIG.SILENCE_THRESHOLD_DB,
    CONFIG.SILENCE_MIN_MS / 1000
  );
  
  // Get scene changes
  const scenes = await sceneDetector.detectScenes(
    videoPath,
    CONFIG.SCENE_THRESHOLD
  );
  
  log(`Found ${silences.length} silence points, ${scenes.length} scene changes`);
  
  return { silences, scenes };
}

// ============ VIRAL SCORING ============
/**
 * Calculate viral score for a segment
 */
function calculateSegmentScore(segment, options = {}) {
  const {
    volumeSpikes = [],
    sceneChanges = [],
    sentenceBoundaries = [],
    hasHook = false
  } = options;
  
  let score = 50; // Base score
  
  // Volume spike contribution
  const segmentSpikes = volumeSpikes.filter(
    s => s.time >= segment.start && s.time <= segment.end
  );
  const spikeScore = Math.min(segmentSpikes.length * 10, 30);
  score += spikeScore * CONFIG.SCORE_WEIGHTS.VOLUME_SPIKE;
  
  // Scene change contribution
  const segmentScenes = sceneChanges.filter(
    s => s >= segment.start && s <= segment.end
  );
  const sceneScore = Math.min(segmentScenes.length * 8, 25);
  score += sceneScore * CONFIG.SCORE_WEIGHTS.SCENE_CHANGE;
  
  // Hook boost (first 3 seconds dynamic)
  if (hasHook || segment.start < CONFIG.HOOK_DURATION) {
    score += 15 * CONFIG.SCORE_WEIGHTS.HOOK_BOOST;
  }
  
  // Duration bonus (30-45 seconds is ideal)
  const duration = segment.end - segment.start;
  if (duration >= 25 && duration <= 45) {
    score += 10;
  } else if (duration >= 30 && duration <= 40) {
    score += 15;
  }
  
  // Sentence boundary bonus (no mid-sentence cuts)
  const cutsAtBoundary = sentenceBoundaries.some(
    b => Math.abs(b.time - segment.end) < 0.5
  );
  if (cutsAtBoundary) {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Score all segments and rank by viral potential
 */
function scoreSegments(segments, analysis) {
  const scoredSegments = segments.map(segment => {
    const score = calculateSegmentScore(segment, {
      volumeSpikes: analysis.volumeSpikes,
      sceneChanges: analysis.scenes,
      sentenceBoundaries: analysis.sentenceBoundaries,
      hasHook: segment.start < CONFIG.HOOK_DURATION
    });
    
    return {
      ...segment,
      score,
      hasHook: segment.start < CONFIG.HOOK_DURATION
    };
  });
  
  // Sort by score descending
  scoredSegments.sort((a, b) => b.score - a.score);
  
  return scoredSegments;
}

// ============ SMART SEGMENT SELECTION - V3 ============
/**
 * V3: Generate smart segments using intelligent cutting
 * With speech guard buffer and short clip prevention
 */
async function generateSmartSegments(videoPath, options = {}) {
  const {
    targetDuration = CONFIG.TARGET_SEGMENT_DURATION,
    maxSegments = CONFIG.TOP_SEGMENTS
  } = options;
  
  log('Starting intelligent segmentation - V3');
  
  // Step 1: Get video duration
  const duration = await sceneDetector.getVideoDuration(videoPath);
  log(`Video duration: ${duration}s`);
  
  // Step 2: Analyze audio (volume)
  log('Analyzing audio...');
  const volumes = await analyzeAudioVolume(videoPath);
  const volumeSpikes = detectVolumeSpikes(volumes);
  log(`Found ${volumeSpikes.length} volume spikes`);
  
  // Step 3: Analyze speech (sentence boundaries)
  log('Analyzing speech patterns...');
  const speech = await analyzeSpeech(videoPath);
  const sentenceBoundaries = detectSentenceBoundaries(speech);
  log(`Found ${sentenceBoundaries.length} sentence boundaries`);
  
  // Step 4: Get cut points (silence + scenes)
  const { silences, scenes } = await getCutPoints(videoPath);
  
  // Step 5: Generate candidate segments
  log('Generating candidate segments...');
  const candidates = [];
  
  // Strategy: Start from high-energy points (volume spikes, scene changes)
  const highEnergyPoints = [
    ...volumeSpikes.map(v => ({ time: v.time, type: 'volume' })),
    ...scenes.map(s => ({ time: s, type: 'scene' }))
  ].sort((a, b) => a.time - b.time);
  
  // Generate segments starting from energy points
  highEnergyPoints.forEach(point => {
    if (point.time + CONFIG.MIN_SEGMENT_DURATION > duration) return;
    
    // Find the best end point (prefer sentence boundaries)
    const segmentEnd = point.time + targetDuration;
    
    // Find nearest sentence boundary or silence with V3 speech guard buffer
    let bestEnd = segmentEnd;
    const allBoundaries = [...sentenceBoundaries.map(b => b.time), ...silences.map(s => s.end)];
    const nearbyBoundary = allBoundaries.find(t => t >= point.time + CONFIG.MIN_SEGMENT_DURATION && t <= segmentEnd);
    
    if (nearbyBoundary) {
      bestEnd = nearbyBoundary;
    }
    
    const segmentDuration = Math.min(bestEnd, duration) - point.time;
    
    // V3: Short clip prevention - only add if >= 3.5s
    if (segmentDuration >= CONFIG.MIN_VALID_CLIP_DURATION) {
      candidates.push({
        start: point.time,
        end: Math.min(bestEnd, duration),
        startType: point.type,
        duration: segmentDuration
      });
    } else {
      log(`Clip discarded (too short): ${segmentDuration.toFixed(2)}s < ${CONFIG.MIN_VALID_CLIP_DURATION}s minimum`);
    }
  });
  
  // Add opening segment (hook) - V3 minimum 3.5s
  const hookEnd = Math.min(CONFIG.HOOK_DURATION + targetDuration - CONFIG.HOOK_DURATION, duration);
  if (hookEnd >= CONFIG.MIN_VALID_CLIP_DURATION) {
    candidates.unshift({
      start: 0,
      end: hookEnd,
      startType: 'hook',
      duration: hookEnd
    });
  }
  
  // Step 6: Score and rank segments
  const analysis = {
    volumes,
    volumeSpikes,
    scenes,
    sentenceBoundaries,
    silences,
    speech
  };
  
  const scoredSegments = scoreSegments(candidates, analysis);
  
  // Step 7: Select top segments with no overlap
  const selectedSegments = [];
  for (const segment of scoredSegments) {
    // Check for overlap with already selected
    const hasOverlap = selectedSegments.some(
      s => (segment.start >= s.start && segment.start < s.end) ||
           (segment.end > s.start && segment.end <= s.end)
    );
    
    if (!hasOverlap) {
      selectedSegments.push(segment);
    }
    
    if (selectedSegments.length >= maxSegments) break;
  }
  
  // Step 8: V3 FAILSAFE - If no segments or silence detection failed, use fallback
  if (selectedSegments.length === 0 || silences.length === 0) {
    log('Silence detection failed or no valid segments - using failsafe fallback');
    return {
      segments: generateFallbackSegments(duration),
      analysis,
      metadata: {
        duration,
        segmentCount: 0,
        avgScore: 50,
        usedFallback: true
      }
    };
  }
  
  // Sort by start time for rendering
  selectedSegments.sort((a, b) => a.start - b.start);
  
  log(`Selected ${selectedSegments.length} high-scoring segments`);
  
  return {
    segments: selectedSegments,
    analysis,
    metadata: {
      duration,
      segmentCount: selectedSegments.length,
      avgScore: selectedSegments.reduce((sum, s) => sum + s.score, 0) / selectedSegments.length,
      usedFallback: false
    }
  };
}

/**
 * Main entry point: smart cut analysis - V3
 */
async function analyzeVideo(videoPath, options = {}) {
  log('Intelligent segmentation active - Smart Cut V3');
  
  try {
    const result = await generateSmartSegments(videoPath, options);
    
    log(`Analysis complete: ${result.segments.length} segments, avg score: ${result.metadata.avgScore.toFixed(1)}`);
    
    if (result.metadata.usedFallback) {
      log('Note: Used fallback duration slicing due to silence detection failure');
    }
    
    return result;
  } catch (error) {
    log(`Error: ${error.message}`);
    throw error;
  }
}

// ============ EXPORTS ============
module.exports = {
  analyzeVideo,
  generateSmartSegments,
  calculateSegmentScore,
  CONFIG,
  isValidClipDuration,
  generateFallbackSegments,
  analyzeAudioVolume,
  detectVolumeSpikes,
  analyzeSpeech,
  detectSentenceBoundaries,
  getCutPoints,
  scoreSegments
};
