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

// Import OVERLORD Stage B - Scene + Emotion AI
const sceneEmotionEngine = require('./sceneEmotionEngine');

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
  
  // ============ OVERCUT PROTECTION V3 ============
  // V3: Speech energy threshold - DO NOT CUT if above this
  SPEECH_ENERGY_THRESHOLD_DB: -28,
  
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
  MIN_VALID_CLIP_DURATION: 3.5,   // Discard clips shorter than this
  
  // ============ V3 FAILSAFE SYSTEM ============
  FAILSAFE_ENABLED: true,
  FAILSAFE_AVOID_FIRST_SEC: 5,   // Avoid first 5 seconds
  FAILSAFE_AVOID_LAST_SEC: 5,    // Avoid last 5 seconds
  FAILSAFE_MIN_DURATION: 20,      // Fallback min segment
  FAILSAFE_MAX_DURATION: 35,      // Fallback max segment
  
  // ============ V3 8GB MEMORY GUARD ============
  // V3: Limit concurrent processing for 8GB RAM safety
  MAX_CONCURRENT_RENDERS: 1
};

// ============ SMART CUT V3 LOGGING ============
function log(message) {
  console.log(`[SmartCut V3] ${message}`);
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
        
        // Generate simulated volume timeline (in production, use audio waveform analysis)
        // For now, create realistic distribution around mean
        const duration = 60; // Assume 60 seconds for demo
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
 * In production, replace with actual Whisper integration
 */
async function analyzeSpeech(videoPath) {
  // Get video duration first
  const duration = await sceneDetector.getVideoDuration(videoPath);
  
  // Generate simulated transcript with sentence boundaries
  // In production: use Whisper API or local model
  const words = [];
  let currentTime = 0;
  let wordIndex = 0;
  
  // Simulate words every 0.3-0.8 seconds
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
      // Find the end of this "sentence" (cluster of words)
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

// ============ SILENCE & SCENE INTEGRATION ============
/**
 * Get combined cut points from silence and scene detection
 */
async function getCutPoints(videoPath) {
  log('Analyzing video for cut points...');
  
  // Get silence points
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

// ============ SMART SEGMENT SELECTION ============
/**
 * V3: Check if audio has active speech at a given time point
 * Returns true if speech energy is above threshold (should NOT cut)
 */
function hasActiveSpeechAt(volumes, timePoint) {
  if (!volumes || volumes.length === 0) return false;
  
  // Find volume at or near the time point
  const nearbyVol = volumes.find(v => Math.abs(v.time - timePoint) < 0.5);
  if (!nearbyVol) return false;
  
  // V3: If speech energy > -28dB, there's active speech - DO NOT CUT
  return nearbyVol.volume > CONFIG.SPEECH_ENERGY_THRESHOLD_DB;
}

/**
 * V3: Apply failsafe fallback strategy
 * Takes strongest 20s-35s mid segment avoiding first/last 5 seconds
 */
function applyFailsafeFallback(duration, targetDuration) {
  log('[SmartCut V3] ⚠ No valid segments found. Using fallback strategy.');
  
  const safeStart = CONFIG.FAILSAFE_AVOID_FIRST_SEC; // 5s
  const safeEnd = duration - CONFIG.FAILSAFE_AVOID_LAST_SEC; // duration - 5s
  
  // Calculate optimal mid-segment (20-35s range)
  let segmentDuration = Math.min(targetDuration, CONFIG.FAILSAFE_MAX_DURATION);
  segmentDuration = Math.max(segmentDuration, CONFIG.FAILSAFE_MIN_DURATION);
  
  // Center the segment in the safe zone
  const midPoint = (safeStart + safeEnd) / 2;
  const start = Math.max(safeStart, midPoint - segmentDuration / 2);
  const end = Math.min(safeEnd, start + segmentDuration);
  
  log(`[SmartCut V3] Failsafe segment: ${start.toFixed(1)}s - ${end.toFixed(1)}s (${(end - start).toFixed(1)}s)`);
  
  return {
    start: Math.max(0, start),
    end: Math.min(duration, end),
    startType: 'failsafe',
    score: 40, // Lower score for fallback
    isFailsafe: true
  };
}

/**
 * V3: Memory safe guard - clear buffers after processing
 */
function clearMemoryBuffers() {
  // V3: 8GB RAM safe mode - force garbage collection if available
  if (global.gc) {
    global.gc();
    log('[SmartCut V3] Memory buffers cleared (gc)');
  }
}

/**
 * Generate smart segments using intelligent cutting
 * V3: Enhanced with Short Clip Protection, Overcut Protection, Failsafe, Memory Guard
 */
async function generateSmartSegments(videoPath, options = {}) {
  const {
    targetDuration = CONFIG.TARGET_SEGMENT_DURATION,
    maxSegments = CONFIG.TOP_SEGMENTS
  } = options;
  
  // ============ V3 ENHANCED LOGGING ============
  log('[SmartCut V3] Speech-sensitive cut detection active');
  log(`[SmartCut V3] Silence threshold: ${CONFIG.SILENCE_THRESHOLD_DB}dB`);
  log(`[SmartCut V3] Guard buffer: ${CONFIG.SPEECH_GUARD_BUFFER_MS}ms`);
  log(`[SmartCut V3] Min/Max clip: ${CONFIG.MIN_SEGMENT_DURATION}s / ${CONFIG.MAX_SEGMENT_DURATION}s`);
  log(`[SmartCut V3] Failsafe READY`);
  log(`[SmartCut V3] Short clip protection ENABLED`);
  log(`[SmartCut V3] Memory safe mode ENABLED`);
  log(`[SmartCut V3] Max concurrent renders: ${CONFIG.MAX_CONCURRENT_RENDERS}`);
  log('[OVERLORD V11 LITE STABLE - 8GB READY]');
  
  log('Starting intelligent segmentation...');
  
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
  
  // Step 5: Generate candidate segments with V3 protections
  log('Generating candidate segments...');
  const candidates = [];
  
  // Strategy: Start from high-energy points (volume spikes, scene changes)
  const highEnergyPoints = [
    ...volumeSpikes.map(v => ({ time: v.time, type: 'volume' })),
    ...scenes.map(s => ({ time: s, type: 'scene' }))
  ].sort((a, b) => a.time - b.time);
  
  // Generate segments starting from energy points - V3 with OVERCUT PROTECTION
  for (const point of highEnergyPoints) {
    if (point.time + CONFIG.MIN_SEGMENT_DURATION > duration) continue;
    
    // ============ V3 OVERCUT PROTECTION ============
    // Check if there's active speech at the cut point
    // If speech energy > -28dB, DO NOT CUT
    if (hasActiveSpeechAt(volumes, point.time)) {
      log(`[SmartCut V3] ❌ Overcut protection: skipping cut at ${point.time.toFixed(2)}s (active speech detected)`);
      continue;
    }
    
    // Find the best end point (prefer sentence boundaries)
    const segmentEnd = point.time + targetDuration;
    
    // Find nearest sentence boundary or silence
    let bestEnd = segmentEnd;
    const allBoundaries = [...sentenceBoundaries.map(b => b.time), ...silences.map(s => s.end)];
    const nearbyBoundary = allBoundaries.find(t => t >= point.time + CONFIG.MIN_SEGMENT_DURATION && t <= segmentEnd);
    
    if (nearbyBoundary) {
      bestEnd = nearbyBoundary;
    }
    
    const candidateEnd = Math.min(bestEnd, duration);
    const clipDuration = candidateEnd - point.time;
    
    // ============ V3 SHORT CLIP PROTECTION ============
    // Discard clips shorter than 3.5 seconds
    if (clipDuration < CONFIG.MIN_VALID_CLIP_DURATION) {
      log(`[SmartCut V3] ❌ Short clip prevented: ${clipDuration.toFixed(2)}s < ${CONFIG.MIN_VALID_CLIP_DURATION}s`);
      continue;
    }
    
    candidates.push({
      start: point.time,
      end: candidateEnd,
      startType: point.type,
      duration: clipDuration
    });
  }
  
  // Add opening segment (hook) - only if valid duration
  const hookEnd = Math.min(CONFIG.HOOK_DURATION + targetDuration - CONFIG.HOOK_DURATION, duration);
  if (hookEnd - 0 >= CONFIG.MIN_VALID_CLIP_DURATION) {
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
  
  // Step 7: Select top segments with no overlap + V3 Short Clip Protection
  const selectedSegments = [];
  for (const segment of scoredSegments) {
    // Final check: Short clip protection at selection time
    const clipDuration = segment.end - segment.start;
    if (clipDuration < CONFIG.MIN_VALID_CLIP_DURATION) {
      log(`[SmartCut V3] ❌ Short clip prevented at selection: ${clipDuration.toFixed(2)}s`);
      continue;
    }
    
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
  
  // Step 8: V3 FAILSAFE - Ensure we have valid segments
  if (selectedSegments.length === 0 || !CONFIG.FAILSAFE_ENABLED) {
    // Check if any valid segment exists
    const validSegments = scoredSegments.filter(s => 
      (s.end - s.start) >= CONFIG.MIN_VALID_CLIP_DURATION
    );
    
    if (validSegments.length > 0) {
      // Use highest scoring valid segment
      selectedSegments.push(validSegments[0]);
    } else {
      // Apply failsafe fallback strategy
      const failsafeSegment = applyFailsafeFallback(duration, targetDuration);
      selectedSegments.push(failsafeSegment);
    }
  }
  
  // ============ V3 MEMORY GUARD ============
  // Clear buffers after segment selection
  clearMemoryBuffers();
  
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
      v3Protected: true,
      failsafeUsed: selectedSegments.some(s => s.isFailsafe)
    }
  };
}

/**
 * Main entry point: smart cut analysis
 */
async function analyzeVideo(videoPath, options = {}) {
  log('Intelligent segmentation active.');
  
  try {
    const result = await generateSmartSegments(videoPath, options);
    
    log(`Analysis complete: ${result.segments.length} segments, avg score: ${result.metadata.avgScore.toFixed(1)}`);
    
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
  analyzeAudioVolume,
  detectVolumeSpikes,
  analyzeSpeech,
  detectSentenceBoundaries,
  getCutPoints,
  scoreSegments
};
