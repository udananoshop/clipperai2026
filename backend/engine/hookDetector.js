// Hook Detector - Identifies engaging opening segments in videos
// Looks for keywords, patterns, and energy levels

// High-engagement hook keywords (YouTube/TikTok/Instagram)
const hookKeywords = [
  // Attention grabbers
  'wait', 'wow', 'OMG', 'unbelievable', 'secret', 'tips', 'trick',
  'hack', 'mistake', 'wrong', 'right', 'actually', 'finally',
  // Numbers and lists
  'top', 'best', 'worst', 'number', 'ways', 'reasons', 'tips',
  // Emotion triggers
  'love', 'hate', 'happy', 'sad', 'excited', 'scared', 'amazing',
  // Question starters
  'what', 'how', 'why', 'when', 'where', 'who',
  // Viral triggers
  'gone wrong', 'gone sexual', 'prank', 'challenge', 'viral'
];

// Energy indicators (volume spikes, fast speech)
const energyPatterns = [
  'music starts', 'beat drops', 'explosion', 'laughter', 'applause'
];

/**
 * Analyze video for hook segments
 * In a real implementation, this would use AI/audio analysis
 * For now, returns simulated hook candidates
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<Array>} - Array of potential hook timestamps
 */
const detectHooks = async (videoPath) => {
  // In production, this would:
  // 1. Extract audio
  // 2. Run speech-to-text (Whisper)
  // 3. Analyze for hook keywords
  // 4. Detect energy spikes
  
  // For demo, return mock hook candidates
  return [
    { time: 0, type: 'opening', confidence: 0.9 },
    { time: 30, type: 'mid', confidence: 0.6 },
    { time: 60, type: 'mid', confidence: 0.5 }
  ];
};

/**
 * Score a clip segment for hook potential
 * @param {number} startTime - Start time of clip
 * @param {number} duration - Duration of clip
 * @returns {number} - Hook score 0-1
 */
const scoreHook = (startTime, duration) => {
  // Opening hooks score highest
  if (startTime < 5) {
    return 0.95;
  }
  // Early hooks (first 30 seconds)
  if (startTime < 30) {
    return 0.8;
  }
  // Middle hooks
  if (startTime < 60) {
    return 0.5;
  }
  // Later hooks
  return 0.3;
};

/**
 * Find best hooks in video
 * @param {string} videoPath - Path to the video file
 * @param {number} maxHooks - Maximum number of hooks to find
 * @returns {Promise<Array>} - Sorted array of hook candidates
 */
const findBestHooks = async (videoPath, maxHooks = 5) => {
  const hooks = await detectHooks(videoPath);
  
  // Sort by confidence
  hooks.sort((a, b) => b.confidence - a.confidence);
  
  return hooks.slice(0, maxHooks);
};

module.exports = {
  detectHooks,
  scoreHook,
  findBestHooks,
  hookKeywords
};
