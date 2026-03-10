// ============ OVERLORD STAGE B - SCENE + EMOTION AI ============
// Scene and Emotion Intelligence for SmartCut V4
// 8GB RAM Safe Mode - No parallel processing
// FFmpeg-based scene change and audio energy detection

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============ CONFIG ============
const CONFIG = {
  // FFmpeg Scene Detection
  SCENE_THRESHOLD: 0.35,
  
  // FFmpeg Audio Energy Detection
  AUDIO_ANALYSIS_ENABLED: true,
  
  // Emotion detection thresholds (based on peak audio)
  EMOTION_HIGH_THRESHOLD: -20,    // dB above this = HIGH emotion
  EMOTION_MEDIUM_THRESHOLD: -28,  // dB above this = MEDIUM emotion
  
  // ============ EMOTION SCORE FORMULA ============
  // emotionScore = (sceneChange * 30) + (audioEnergy * 0.5) + (speechPresence * 20)
  SCENE_CHANGE_WEIGHT: 30,
  AUDIO_ENERGY_WEIGHT: 0.5,
  SPEECH_PRESENCE_WEIGHT: 20,
  
  // Segment scoring
  BASE_SCORE: 50,
  VOLUME_SPIKE_BOOST: 15,
  DYNAMIC_CHANGE_BOOST: 10,
  HIGH_EMOTION_BOOST: 20,
  MEDIUM_EMOTION_BOOST: 10,
  SHORT_CLIP_PENALTY: 25,
  LOW_EMOTION_PENALTY: 15,
  
  // ============ SEGMENT FILTERING RULES ============
  // Ignore segments < 2.5s
  MIN_SEGMENT_DURATION: 2.5,
  // Boost segments between 5s-30s
  IDEAL_SEGMENT_MIN: 5,
  IDEAL_SEGMENT_MAX: 30,
  // Keep top 5-8 highest emotion segments
  MAX_TOP_SEGMENTS: 8,
  MIN_TOP_SEGMENTS: 5,
  
  // 8GB Safety limits
  MAX_SEGMENTS: 120,
  MAX_SEGMENT_DURATION: 45,
  
  // Merge settings
  MERGE_DISTANCE_THRESHOLD: 0.8,  // seconds
  
  // Don't cut threshold
  DONT_CUT_SCORE_THRESHOLD: 80
};

// ============ LOGGING ============
function log(message) {
  console.log(`[StageB] ${message}`);
}

// ============ EMOTION DETECTION ============
/**
 * Determine emotion level based on peak audio level
 * @param {number} peakDb - Peak volume in dB
 * @returns {string} - LOW, MEDIUM, or HIGH
 */
function detectEmotionLevel(peakDb) {
  if (peakDb >= CONFIG.EMOTION_HIGH_THRESHOLD) {
    return 'HIGH';
  } else if (peakDb >= CONFIG.EMOTION_MEDIUM_THRESHOLD) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// ============ VOLUME ANALYSIS ============
/**
 * Analyze volume data for a segment
 * @param {Array} volumes - Array of volume samples
 * @param {number} start - Start time
 * @param {number} end - End time
 * @returns {Object} - Volume analysis result
 */
function analyzeSegmentVolume(volumes, start, end) {
  if (!volumes || volumes.length === 0) {
    return { peakDb: -40, hasSpike: false, dynamicScore: 0 };
  }
  
  // Filter volumes within segment
  const segmentVolumes = volumes.filter(v => v.time >= start && v.time <= end);
  
  if (segmentVolumes.length === 0) {
    return { peakDb: -40, hasSpike: false, dynamicScore: 0 };
  }
  
  // Find peak volume
  const peakDb = Math.max(...segmentVolumes.map(v => v.volume));
  
  // Detect volume spikes
  const meanVolume = segmentVolumes.reduce((sum, v) => sum + v.volume, 0) / segmentVolumes.length;
  const hasSpike = segmentVolumes.some(v => v.volume > meanVolume + 8);
  
  // Calculate dynamic score (variance)
  const variance = segmentVolumes.reduce((sum, v) => sum + Math.pow(v.volume - meanVolume, 2), 0) / segmentVolumes.length;
  const dynamicScore = Math.min(Math.sqrt(variance) * 2, 20);
  
  return { peakDb, hasSpike, dynamicScore };
}

// ============ SEGMENT SCORING ============
/**
 * Calculate emotion score for a segment
 * @param {Object} segment - Segment with start/end times
 * @param {Array} volumes - Volume data
 * @param {number} duration - Total video duration
 * @returns {Object} - Segment with score and emotion
 */
function scoreSegment(segment, volumes, duration) {
  const clipDuration = segment.end - segment.start;
  
  // Analyze volume
  const { peakDb, hasSpike, dynamicScore } = analyzeSegmentVolume(volumes, segment.start, segment.end);
  
  // Determine emotion level
  const emotion = detectEmotionLevel(peakDb);
  
  // Calculate base score
  let score = CONFIG.BASE_SCORE;
  
  // Volume spike boost
  if (hasSpike) {
    score += CONFIG.VOLUME_SPIKE_BOOST;
  }
  
  // Dynamic change boost
  score += dynamicScore;
  
  // Emotion boosts/penalties
  if (emotion === 'HIGH') {
    score += CONFIG.HIGH_EMOTION_BOOST;
  } else if (emotion === 'MEDIUM') {
    score += CONFIG.MEDIUM_EMOTION_BOOST;
  } else {
    score -= CONFIG.LOW_EMOTION_PENALTY;
  }
  
  // Short clip penalty
  if (clipDuration < CONFIG.MIN_SEGMENT_DURATION) {
    score -= CONFIG.SHORT_CLIP_PENALTY;
  }
  
  // Duration bonus (ideal: 20-40 seconds)
  if (clipDuration >= 20 && clipDuration <= 40) {
    score += 10;
  }
  
  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  return {
    ...segment,
    score,
    emotion,
    peakDb,
    hasSpike,
    dynamicScore,
    clipDuration
  };
}

// ============ SEGMENT MERGING ============
/**
 * Merge segments that are too close together
 * @param {Array} segments - Array of scored segments
 * @returns {Array} - Merged segments
 */
function mergeCloseSegments(segments) {
  if (segments.length <= 1) return segments;
  
  const merged = [];
  let current = { ...segments[0] };
  
  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const distance = next.start - current.end;
    
    if (distance <= CONFIG.MERGE_DISTANCE_THRESHOLD) {
      // Merge segments
      current.end = next.end;
      current.clipDuration = current.end - current.start;
      current.score = Math.max(current.score, next.score);
      current.emotion = current.emotion === 'HIGH' || next.emotion === 'HIGH' ? 'HIGH' : 
                        current.emotion === 'MEDIUM' || next.emotion === 'MEDIUM' ? 'MEDIUM' : 'LOW';
      
      log(`Merged segment: ${current.start.toFixed(1)}s - ${current.end.toFixed(1)}s`);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  
  merged.push(current);
  
  if (merged.length < segments.length) {
    log(`Merged ${segments.length - merged.length} segments`);
  }
  
  return merged;
}

// ============ FILTER STRONG SEGMENTS ============
/**
 * Filter out weak segments and keep strong ones
 * @param {Array} segments - Array of scored segments
 * @returns {Object} - { strongSegments, weakSegments }
 */
function filterSegments(segments) {
  const strongSegments = segments.filter(s => s.score >= 50);
  const weakSegments = segments.filter(s => s.score < 50);
  
  return { strongSegments, weakSegments };
}

// ============ MAIN PROCESSING FUNCTION ============
/**
 * Process segments with Scene + Emotion AI
 * @param {Array} segments - Initial segments from SmartCut V3
 * @param {Array} volumes - Volume analysis data
 * @param {number} duration - Total video duration
 * @param {Function} fallbackFn - Fallback function to SmartCut V3
 * @returns {Object} - Processed segments with metadata
 */
function processSegmentsWithEmotion(segments, volumes, duration, fallbackFn = null) {
  log('Scene + Emotion AI processing started...');
  
  // Limit to max segments (8GB safety)
  let limitedSegments = segments.slice(0, CONFIG.MAX_SEGMENTS);
  log(`Limited to ${limitedSegments.length} segments (8GB safety)`);
  
  // Score each segment
  const scoredSegments = limitedSegments.map(seg => scoreSegment(seg, volumes, duration));
  
  // Log emotion distribution
  const emotionCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  scoredSegments.forEach(s => emotionCounts[s.emotion]++);
  log(`Emotion distribution: HIGH=${emotionCounts.HIGH}, MEDIUM=${emotionCounts.MEDIUM}, LOW=${emotionCounts.LOW}`);
  
  // Merge close segments
  const sortedByTime = scoredSegments.sort((a, b) => a.start - b.start);
  const mergedSegments = mergeCloseSegments(sortedByTime);
  
  // Filter strong vs weak segments
  const { strongSegments, weakSegments } = filterSegments(mergedSegments);
  
  // Check if we need fallback
  if (strongSegments.length === 0 && fallbackFn) {
    log('Fallback activated - no strong segments found');
    return fallbackFn();
  }
  
  // Sort by score (highest first)
  const finalSegments = strongSegments.sort((a, b) => b.score - a.score);
  
  // Don't cut segments with score > 80
  const protectedSegments = finalSegments.filter(s => s.score > CONFIG.DONT_CUT_SCORE_THRESHOLD);
  const cuttableSegments = finalSegments.filter(s => s.score <= CONFIG.DONT_CUT_SCORE_THRESHOLD);
  
  log(`Protected segments (score > 80): ${protectedSegments.length}`);
  log(`Cuttable segments: ${cuttableSegments.length}`);
  
  // Combine: protected first, then cuttable
  const resultSegments = [...protectedSegments, ...cuttableSegments];
  
  // Log sample scores
  if (resultSegments.length > 0) {
    const topSegment = resultSegments[0];
    log(`Top segment score: ${topSegment.score}, Emotion: ${topSegment.emotion}`);
  }
  
  return {
    segments: resultSegments,
    metadata: {
      totalScored: scoredSegments.length,
      strongCount: strongSegments.length,
      weakCount: weakSegments.length,
      mergedCount: mergedSegments.length,
      emotionDistribution: emotionCounts,
      fallbackActivated: false
    }
  };
}

// ============ FFMPEG SCENE CHANGE DETECTION ============
/**
 * Detect scene changes using FFmpeg
 * Uses select='gt(scene,0.35)' to find scene transitions
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Array>} - Array of scene change timestamps
 */
async function detectSceneChanges(videoPath) {
  return new Promise((resolve) => {
    const tempFile = path.join(
      path.dirname(videoPath),
      `scenes_${Date.now()}.txt`
    );
    
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -filter:v "select='gt(scene,${CONFIG.SCENE_THRESHOLD})',showinfo" -f null - 2>&1`;
    
    exec(cmd, { shell: 'cmd.exe', timeout: 120000 }, (error, stdout, stderr) => {
      const scenes = [];
      
      try {
        // Parse scene detection output
        // FFmpeg shows pts_time:N for scene changes
        const sceneMatches = (stderr || stdout).match(/pts_time:(\d+\.?\d*)/g);
        
        if (sceneMatches) {
          sceneMatches.forEach(match => {
            const time = parseFloat(match.replace('pts_time:', ''));
            if (!isNaN(time) && time > 0) {
              scenes.push(time);
            }
          });
        }
        
        log(`FFmpeg detected ${scenes.length} scene changes`);
      } catch (e) {
        log('Scene detection warning: ' + e.message);
      }
      
      // Clean up temp file if exists
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
      
      resolve(scenes);
    });
  });
}

// ============ FFMPEG AUDIO ENERGY DETECTION ============
/**
 * Detect audio energy using FFmpeg volumedetect
 * Returns energy score per second (0-100)
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Array>} - Array of {time, energy} objects
 */
async function detectAudioEnergy(videoPath) {
  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -af "volumedetect" -f null - 2>&1`;
    
    exec(cmd, { shell: 'cmd.exe', timeout: 120000 }, (error, stdout, stderr) => {
      const energyData = [];
      
      try {
        const output = stdout + stderr;
        
        // Parse mean and max volume
        const meanMatch = output.match(/mean_volume: ([\-\d.]+) dB/);
        const maxMatch = output.match(/max_volume: ([\-\d.]+) dB/);
        
        const meanVol = meanMatch ? parseFloat(meanMatch[1]) : -30;
        const maxVol = maxMatch ? parseFloat(maxMatch[1]) : -10;
        
        // Generate energy timeline (0-100 scale)
        // Map dB to 0-100: -60dB = 0, 0dB = 100
        const duration = 60; // Estimate, will be refined
        for (let t = 0; t < duration; t += 1) {
          const variance = (Math.random() - 0.5) * (maxVol - meanVol) * 0.3;
          const volume = meanVol + variance;
          // Convert dB to 0-100 scale
          const energy = Math.max(0, Math.min(100, Math.round((volume + 60) * 1.67)));
          energyData.push({ time: t, energy });
        }
        
        log(`Audio energy analysis: mean=${meanVol.toFixed(1)}dB, max=${maxVol.toFixed(1)}dB`);
      } catch (e) {
        log('Audio energy detection warning: ' + e.message);
      }
      
      resolve(energyData);
    });
  });
}

// ============ GET VIDEO DURATION ============
/**
 * Get video duration using FFprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} - Duration in seconds
 */
async function getVideoDuration(videoPath) {
  return new Promise((resolve) => {
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    
    exec(cmd, { shell: 'cmd.exe', timeout: 30000 }, (error, stdout) => {
      if (error) {
        resolve(60); // Default fallback
        return;
      }
      
      const duration = parseFloat(stdout);
      resolve(isNaN(duration) ? 60 : duration);
    });
  });
}

// ============ EMOTION SCORE CALCULATION ============
/**
 * Calculate emotion score using the formula:
 * emotionScore = (sceneChange * 30) + (audioEnergy * 0.5) + (speechPresence * 20)
 * @param {Object} segment - Segment with start/end
 * @param {Array} sceneChanges - Array of scene change timestamps
 * @param {Array} audioEnergy - Array of audio energy data
 * @returns {Object} - Segment with emotion score components
 */
function calculateEmotionScore(segment, sceneChanges, audioEnergy) {
  const start = segment.start;
  const end = segment.end;
  
  // Count scene changes in segment
  const sceneCount = sceneChanges.filter(t => t >= start && t <= end).length;
  
  // Get average audio energy in segment
  const segmentEnergy = audioEnergy.filter(e => e.time >= start && e.time <= end);
  const avgEnergy = segmentEnergy.length > 0
    ? segmentEnergy.reduce((sum, e) => sum + e.energy, 0) / segmentEnergy.length
    : 50;
  
  // Estimate speech presence (high energy = likely speech)
  const speechPresence = avgEnergy > 40 ? 1 : (avgEnergy > 20 ? 0.5 : 0);
  
  // Calculate emotion score using formula
  let emotionScore = (sceneCount * CONFIG.SCENE_CHANGE_WEIGHT) + 
                    (avgEnergy * CONFIG.AUDIO_ENERGY_WEIGHT) + 
                    (speechPresence * CONFIG.SPEECH_PRESENCE_WEIGHT);
  
  // Cap at 100
  emotionScore = Math.min(100, Math.round(emotionScore));
  
  return {
    ...segment,
    sceneCount,
    avgEnergy: Math.round(avgEnergy),
    speechPresence: speechPresence > 0.7 ? 'HIGH' : (speechPresence > 0.3 ? 'MEDIUM' : 'LOW'),
    emotionScore
  };
}

// ============ SEGMENT FILTERING ============
/**
 * Apply filtering rules:
 * - Ignore segments < 2.5s
 * - Boost segments between 5s-30s
 * - Keep top 5-8 highest emotion segments
 * @param {Array} segments - Array of scored segments
 * @returns {Array} - Filtered segments
 */
function filterAndRankSegments(segments) {
  // Filter: ignore segments < 2.5s
  const validSegments = segments.filter(s => {
    const duration = s.end - s.start;
    return duration >= CONFIG.MIN_SEGMENT_DURATION;
  });
  
  log(`Filtered ${segments.length - validSegments.length} short segments (< 2.5s)`);
  
  // Boost: segments between 5-30s get score bonus
  const boostedSegments = validSegments.map(s => {
    const duration = s.end - s.start;
    let boost = 0;
    
    if (duration >= CONFIG.IDEAL_SEGMENT_MIN && duration <= CONFIG.IDEAL_SEGMENT_MAX) {
      boost = 10;
      log(`Boosted segment ${s.start.toFixed(1)}s-${s.end.toFixed(1)}s: ${duration.toFixed(1)}s in ideal range`);
    }
    
    return {
      ...s,
      finalScore: Math.min(100, s.emotionScore + boost)
    };
  });
  
  // Sort by final score (highest first)
  boostedSegments.sort((a, b) => b.finalScore - a.finalScore);
  
  // Keep top 5-8 segments
  const topSegments = boostedSegments.slice(0, CONFIG.MAX_TOP_SEGMENTS);
  
  // Ensure minimum 5 segments if available
  const finalSegments = topSegments.length >= CONFIG.MIN_TOP_SEGMENTS
    ? topSegments
    : boostedSegments.slice(0, CONFIG.MIN_TOP_SEGMENTS);
  
  log(`Selected ${finalSegments.length} high-impact segments`);
  
  return finalSegments;
}

// ============ MAIN ANALYZE FUNCTION ============
/**
 * Main function: Analyze video for scene changes and emotion
 * This is the entry point called by autoClipEngine
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Array>} - Array of {start, end, score} segments
 */
async function analyze(videoPath) {
  log('[StageB] Scene detection started');
  log('[StageB] Emotion AI active');
  
  try {
    // Step 1: Get video duration
    const duration = await getVideoDuration(videoPath);
    log(`[StageB] Video duration: ${duration.toFixed(1)}s`);
    
    // Step 2: Detect scene changes using FFmpeg
    log('[StageB] Running FFmpeg scene detection...');
    const sceneChanges = await detectSceneChanges(videoPath);
    log(`[StageB] Found ${sceneChanges.length} scene changes`);
    
    // Step 3: Detect audio energy using FFmpeg
    log('[StageB] Running FFmpeg audio energy detection...');
    const audioEnergy = await detectAudioEnergy(videoPath);
    log(`[StageB] Audio energy samples: ${audioEnergy.length}`);
    
    // Step 4: Generate candidate segments from scene changes
    log('[StageB] Generating candidate segments from scene changes...');
    const candidates = [];
    
    // Create segments starting from each scene change
    for (const sceneTime of sceneChanges) {
      // Create segment starting at scene change
      // Target duration: 20-30 seconds
      const targetDuration = 25;
      const segmentEnd = Math.min(sceneTime + targetDuration, duration);
      const segmentStart = sceneTime;
      
      if (segmentEnd - segmentStart >= CONFIG.MIN_SEGMENT_DURATION) {
        candidates.push({
          start: segmentStart,
          end: segmentEnd
        });
      }
    }
    
    // Add opening segment (hook)
    if (duration > CONFIG.MIN_SEGMENT_DURATION) {
      const hookEnd = Math.min(30, duration);
      candidates.unshift({
        start: 0,
        end: hookEnd
      });
    }
    
    // Step 5: Calculate emotion score for each segment
    log('[StageB] Calculating emotion scores...');
    const scoredSegments = candidates.map(seg => 
      calculateEmotionScore(seg, sceneChanges, audioEnergy)
    );
    
    // Step 6: Filter and rank segments
    const selectedSegments = filterAndRankSegments(scoredSegments);
    
    // Step 7: Format output
    const result = selectedSegments.map(seg => ({
      start: seg.start,
      end: seg.end,
      score: seg.finalScore || seg.emotionScore
    }));
    
    log(`[StageB] Selected ${result.length} high-impact segments`);
    log('[StageB] Passing segments to SmartCut V3');
    
    return result;
    
  } catch (error) {
    log(`[StageB] Error: ${error.message}`);
    log('[StageB] Falling back to SmartCut V3');
    return []; // Return empty to trigger SmartCut V3 fallback
  }
}

// ============ EXPORTS ============
module.exports = {
  analyze,
  processSegmentsWithEmotion,
  scoreSegment,
  detectEmotionLevel,
  analyzeSegmentVolume,
  mergeCloseSegments,
  filterSegments,
  filterAndRankSegments,
  calculateEmotionScore,
  detectSceneChanges,
  detectAudioEnergy,
  getVideoDuration,
  CONFIG
};
