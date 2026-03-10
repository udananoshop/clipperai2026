/**
 * Content Intelligence Service
 * Unified service for content analysis
 */

let smartHookEngine = null;
let subtitleProEngine = null;
let viralTitleEngine = null;
let hashtagEngine = null;
let platformOptimizer = null;
let brandingEngine = null;
let musicMoodEngine = null;
let monetizationOptimizationService = null;

try {
  smartHookEngine = require('../content-intelligence/smartHookEngine');
} catch (err) {
  console.warn('[ContentAI] smartHookEngine not available');
}

try {
  subtitleProEngine = require('../content-intelligence/subtitleProEngine');
} catch (err) {
  console.warn('[ContentAI] subtitleProEngine not available');
}

try {
  viralTitleEngine = require('../content-intelligence/viralTitleEngine');
} catch (err) {
  console.warn('[ContentAI] viralTitleEngine not available');
}

try {
  hashtagEngine = require('../content-intelligence/hashtagEngine');
} catch (err) {
  console.warn('[ContentAI] hashtagEngine not available');
}

try {
  platformOptimizer = require('../content-intelligence/platformOptimizer');
} catch (err) {
  console.warn('[ContentAI] platformOptimizer not available');
}

try {
  brandingEngine = require('../content-intelligence/brandingEngine');
} catch (err) {
  console.warn('[ContentAI] brandingEngine not available');
}

try {
  musicMoodEngine = require('../content-intelligence/musicMoodEngine');
} catch (err) {
  console.warn('[ContentAI] musicMoodEngine not available');
}

try {
  monetizationOptimizationService = require('./monetizationOptimizationService');
} catch (err) {
  console.warn('[ContentAI] monetizationOptimizationService not available');
}

function analyzeHooks(segments = []) {
  if (!smartHookEngine) {
    return { error: 'smartHookEngine not available' };
  }
  return smartHookEngine.detectTopHooks(segments);
}

function generateStyledSubtitles(transcript = '') {
  if (!subtitleProEngine) {
    return { error: 'subtitleProEngine not available' };
  }
  return subtitleProEngine.generateAnimatedSubtitle(transcript);
}

function generateViralTitles(topic = '') {
  if (!viralTitleEngine) {
    return { error: 'viralTitleEngine not available' };
  }
  return viralTitleEngine.generateTitlePack(topic);
}

function generateHashtags(text = '', platform = 'tiktok') {
  if (!hashtagEngine) {
    return { error: 'hashtagEngine not available' };
  }
  return hashtagEngine.generatePlatformHashtags(text, platform);
}

function getPlatformOptimization(platform = 'tiktok') {
  if (!platformOptimizer) {
    return { error: 'platformOptimizer not available' };
  }
  return platformOptimizer.getPlatformConfig(platform);
}

function generateBranding(channelName = '', aspectRatio = '9:16') {
  if (!brandingEngine) {
    return { error: 'brandingEngine not available' };
  }
  return brandingEngine.getWatermarkConfig(channelName, aspectRatio);
}

function generateMusicIntelligence(text = '') {
  if (!musicMoodEngine) {
    return { error: 'musicMoodEngine not available' };
  }
  return musicMoodEngine.generateMusicIntelligence(text);
}

// Monetization functions
function analyzeHook(scriptText = '') {
  if (!monetizationOptimizationService) {
    return { error: 'monetizationOptimizationService not available' };
  }
  return monetizationOptimizationService.analyzeHook(scriptText);
}

function generateABTitles(topic = '', keywords = []) {
  if (!monetizationOptimizationService) {
    return { error: 'monetizationOptimizationService not available' };
  }
  return monetizationOptimizationService.generateABTitles(topic, keywords);
}

function calculateMonetizationScore(data = {}) {
  if (!monetizationOptimizationService) {
    return { error: 'monetizationOptimizationService not available' };
  }
  return monetizationOptimizationService.calculateMonetizationScore(data);
}

function optimizeForPlatform(platform = 'youtube', content = {}) {
  if (!monetizationOptimizationService) {
    return { error: 'monetizationOptimizationService not available' };
  }
  return monetizationOptimizationService.optimizeForPlatform(platform, content);
}

function generateSmartCTA(platform = 'youtube') {
  if (!monetizationOptimizationService) {
    return { error: 'monetizationOptimizationService not available' };
  }
  return monetizationOptimizationService.generateSmartCTA(platform);
}

function isMonetizationEnabled() {
  if (!monetizationOptimizationService) {
    return false;
  }
  return monetizationOptimizationService.isEnabled();
}

function analyzeContent(payload = {}) {
  const { segments = [], transcript = '', topic = '' } = payload;
  
  const hooks = analyzeHooks(segments);
  const subtitles = generateStyledSubtitles(transcript);
  const titles = generateViralTitles(topic);
  
  // Add monetization data if enabled
  let monetization = null;
  if (isMonetizationEnabled()) {
    const hookAnalysis = analyzeHook(transcript || topic);
    const monetizationData = calculateMonetizationScore({
      hookStrength: hookAnalysis.hookStrength || 50,
      topic,
      keywords: []
    });
    monetization = {
      hookAnalysis,
      ...monetizationData
    };
  }
  
  return {
    hooks,
    subtitles,
    titles,
    monetization,
    timestamp: new Date().toISOString()
  };
}

function boostContent(payload = {}) {
  const { text = '', platform = 'tiktok', channelName = '', aspectRatio = '9:16' } = payload;
  
  const hashtags = generateHashtags(text, platform);
  const platformConfig = getPlatformOptimization(platform);
  const branding = generateBranding(channelName, aspectRatio);
  
  // Add monetization data if enabled
  let monetization = null;
  if (isMonetizationEnabled()) {
    const hookAnalysis = analyzeHook(text);
    const abTitles = generateABTitles(text, hashtags?.keywords || []);
    const cta = generateSmartCTA(platform);
    const platformOpt = optimizeForPlatform(platform, { title: abTitles.variantA, hashtags: hashtags?.hashtags || [] });
    
    monetization = {
      hookAnalysis,
      abTitles,
      cta,
      platformOptimization: platformOpt,
      monetizationScore: calculateMonetizationScore({
        hookStrength: hookAnalysis?.hookStrength || 50,
        topic: text,
        platform
      })
    };
  }
  
  return {
    hashtags,
    platformConfig,
    branding,
    monetization,
    timestamp: new Date().toISOString()
  };
}

console.log('[ContentAI] Phase 3 Music Mood Engine Loaded');
if (isMonetizationEnabled()) {
  console.log('[ContentAI] Level 4 Monetization Engine ENABLED');
}

module.exports = {
  analyzeHooks,
  generateStyledSubtitles,
  generateViralTitles,
  generateHashtags,
  getPlatformOptimization,
  generateBranding,
  generateMusicIntelligence,
  analyzeHook,
  generateABTitles,
  calculateMonetizationScore,
  optimizeForPlatform,
  generateSmartCTA,
  isMonetizationEnabled,
  analyzeContent,
  boostContent
};
