/**
 * OVERLORD ELITE MODE – Level 4
 * Monetization Optimization Engine
 * 
 * Features:
 * - Hook Analyzer
 * - A/B Title Generator
 * - Monetization Score Engine
 * - Platform Optimization
 * - CTA Generator
 */

const systemConfig = require('../core/systemConfig');

// Check if monetization engine is enabled
const isEnabled = () => {
  return process.env.ENABLE_MONETIZATION_ENGINE === 'true' || 
         (systemConfig && systemConfig.config && systemConfig.config.ENABLE_MONETIZATION_ENGINE);
};

// Keyword dictionaries
const EMOTIONAL_WORDS = [
  'amazing', 'shocking', 'incredible', 'unbelievable', 'secret', 'revealed',
  'truth', 'never', 'always', 'worst', 'best', 'ultimate', 'hack', 'trick',
  'mista ke', 'rahasia', 'sang at', 'luar biasa', 'mengagumkan', 'gila',
  'wow', 'gimana', 'kenapa', 'apa', 'siapa', 'bilang', 'jangan'
];

const POWER_WORDS = [
  'ultimate', 'essential', 'critical', 'powerful', 'proven', 'guaranteed',
  'exclusive', 'premium', 'elite', 'master', 'expert', 'pro', 'success'
];

const CURIOSITY_TRIGGERS = [
  'what', 'why', 'how', 'secret', 'revealed', 'truth', 'gimana', 'kenapa', 'apa'
];

/**
 * Hook Analyzer
 * Analyzes the first 3 seconds hook strength
 */
function analyzeHook(scriptText = '') {
  if (!scriptText) {
    return {
      hookStrength: 0,
      emotionalTriggerScore: 0,
      curiosityGapScore: 0,
      improvementSuggestion: 'Add a strong hook to capture attention'
    };
  }

  const lowerText = scriptText.toLowerCase();
  const words = lowerText.split(/\s+/);
  const firstSentence = words.slice(0, 20).join(' ');
  
  // Calculate scores
  let emotionalScore = 0;
  let curiosityScore = 0;
  let hookType = 'none';

  // Check for question
  if (firstSentence.includes('?') || firstSentence.startsWith('what') || 
      firstSentence.startsWith('why') || firstSentence.startsWith('how') ||
      firstSentence.startsWith('gimana') || firstSentence.startsWith('kenapa')) {
    curiosityScore += 40;
    hookType = 'question';
  }

  // Check for bold claim
  const boldClaimPatterns = [
    /never\s+\w+/i, /always\s+\w+/i, /worst\s+\w+/i, /best\s+\w+/i,
    /100%\s*/i, /guaranteed/i, /secret/i
  ];
  if (boldClaimPatterns.some(p => p.test(firstSentence))) {
    curiosityScore += 30;
    hookType = 'bold_claim';
  }

  // Check for shocking stat
  const statPattern = /\d+%/;
  if (statPattern.test(firstSentence)) {
    curiosityScore += 25;
    hookType = 'stat';
  }

  // Emotional words detection
  const emotionalMatches = EMOTIONAL_WORDS.filter(word => lowerText.includes(word));
  emotionalScore = Math.min(100, emotionalMatches.length * 20);

  // Calculate overall hook strength
  const hookStrength = Math.min(100, Math.round((curiosityScore * 0.6) + (emotionalScore * 0.4)));

  // Generate improvement suggestion
  let suggestion = 'Good hook!';
  if (hookStrength < 50) {
    suggestion = 'Start with a question or shocking statement to grab attention in first 3 seconds';
  } else if (hookStrength < 75) {
    suggestion = 'Add more emotional triggers and power words';
  }

  return {
    hookStrength,
    emotionalTriggerScore: emotionalScore,
    curiosityGapScore: curiosityScore,
    hookType,
    improvementSuggestion: suggestion
  };
}

/**
 * A/B Title Generator
 * Generates two title variants for A/B testing
 */
function generateABTitles(topic = '', keywords = []) {
  const topicLower = (topic || '').toLowerCase();
  const keywordList = Array.isArray(keywords) ? keywords : [];
  
  // Number variants for variety
  const numbers = [7, 5, 3, 10, 8, 6];
  const randomNum = numbers[Math.floor(Math.random() * numbers.length)];
  
  // Build variant A - Number list format
  const variantA = keywordList.length > 0 
    ? `${randomNum} ${keywordList[0]} Mistakes You're Making`
    : `${randomNum} Things Killing Your ${topic || 'Success'}`;
  
  // Build variant B - Emotional/Clickbait format
  const variantB = keywordList.length > 1
    ? `You Won't Believe These ${randomNum} ${keywordList[1]} Hacks`
    : `The Ultimate ${topic || 'Guide'} Nobody Tells You`;
  
  // Calculate clickbait scores (0-100)
  const clickbaitA = calculateClickbaitScore(variantA);
  const clickbaitB = calculateClickbaitScore(variantB);

  return {
    variantA,
    variantB,
    clickbaitScoreA: clickbaitA,
    clickbaitScoreB: clickbaitB
  };
}

function calculateClickbaitScore(title) {
  const lower = title.toLowerCase();
  let score = 50; // Base score

  // Add points for clickbait elements
  if (/\d+/.test(title)) score += 15; // Numbers
  if (/won't believe|never|ultimate|secret|revealed/i.test(title)) score += 20;
  if (/mistake|killing|stop|avoid/i.test(title)) score += 10;
  if (title.length < 50) score += 5; // Short titles

  return Math.min(100, score);
}

/**
 * Monetization Score Engine
 * Calculates monetization potential (0-100)
 */
function calculateMonetizationScore(data = {}) {
  const { hookStrength = 50, topic = '', keywords = [], platform = 'youtube', trends = [] } = data;
  
  // Base score from hook
  let score = hookStrength * 0.35;
  
  // Keyword intensity (0-20 points)
  const keywordIntensity = Math.min(20, (keywords.length || 0) * 4);
  score += keywordIntensity;
  
  // Trend alignment (0-15 points)
  let trendScore = 0;
  if (trends && trends.length > 0) {
    trendScore = Math.min(15, trends.length * 5);
  }
  score += trendScore;
  
  // Platform factor
  const platformMultipliers = {
    youtube: 1.0,
    tiktok: 1.1,
    reels: 1.05,
    instagram: 0.9,
    facebook: 0.85
  };
  const multiplier = platformMultipliers[platform] || 1.0;
  score = score * multiplier;
  
  // Engagement potential (0-15 points)
  const engagementPotential = Math.min(15, Math.round(hookStrength * 0.15));
  score += engagementPotential;
  
  // Final score
  const finalScore = Math.min(100, Math.round(score));
  
  // RPM potential
  let rpmPotential = 'LOW';
  if (finalScore >= 75) rpmPotential = 'HIGH';
  else if (finalScore >= 50) rpmPotential = 'MEDIUM';

  return {
    monetizationScore: finalScore,
    rpmPotential,
    factors: {
      hookContribution: Math.round(hookStrength * 0.35),
      keywordIntensity,
      trendAlignment: trendScore,
      engagementPotential
    }
  };
}

/**
 * Platform Optimization
 * Optimizes content for specific platform
 */
function optimizeForPlatform(platform = 'youtube', content = {}) {
  const { title = '', description = '', hashtags = [], hook = '' } = content;
  
  const platformConfigs = {
    youtube: {
      seoTitle: title.length > 60 ? title.substring(0, 57) + '...' : title,
      description: description || `Learn more about ${title}. Subscribe for more content!`,
      hashtagCount: 10,
      hookLength: 'long',
      strategy: 'SEO optimized with detailed description'
    },
    tiktok: {
      seoTitle: title.length > 80 ? title.substring(0, 77) + '...' : title,
      description: description || `${hashtags.slice(0, 3).join(' ')} #fyp #viral`,
      hashtagCount: 4,
      hookLength: 'short',
      strategy: 'Short punchy hook, viral hashtags'
    },
    reels: {
      seoTitle: title,
      description: description || `${hashtags.slice(0, 5).join(' ')} #reels #trending`,
      hashtagCount: 8,
      hookLength: 'medium',
      strategy: 'Aesthetic style, minimal text'
    },
    instagram: {
      seoTitle: title,
      description: description || `${hashtags.slice(0, 10).join(' ')}`,
      hashtagCount: 15,
      hookLength: 'medium',
      strategy: 'Visual focused, maximum hashtags'
    },
    facebook: {
      seoTitle: title,
      description: description || `${title} Read more!`,
      hashtagCount: 3,
      hookLength: 'long',
      strategy: 'Engagement focused'
    }
  };

  const config = platformConfigs[platform] || platformConfigs.youtube;
  
  return {
    ...config,
    platform,
    suggestedHashtags: generatePlatformHashtags(platform)
  };
}

function generatePlatformHashtags(platform) {
  const baseHashtags = {
    youtube: ['#YouTube', '#Shorts', '#Learn', '#Tips', '#Tutorial', '#Education', '#HowTo', '#Guide', '#TipsAndTricks', '#MustWatch'],
    tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#tiktok', '#viraltrend'],
    reels: ['#reels', '#trending', '#viral', '#reelsinstagram', '#explorepage'],
    instagram: ['#instagram', '#reels', '#trending', '#viral', '#explore', '#instagood', '#photooftheday', '#picoftheday', '#instadaily', '#instagram'],
    facebook: ['#facebook', '#viral', '#trending', '#fyp']
  };
  
  return baseHashtags[platform] || baseHashtags.youtube;
}

/**
 * CTA Generator
 * Generates platform-specific call-to-action
 */
function generateSmartCTA(platform = 'youtube') {
  const ctaTemplates = {
    youtube: [
      'Subscribe for more AI content 🚀',
      'Like and subscribe for daily tips!',
      'Don\'t forget to subscribe and hit the bell! 🔔',
      'Subscribe for more amazing content!'
    ],
    tiktok: [
      'Follow for daily hacks ⚡',
      'Follow for more! 🔥',
      'Save this for later! 💾',
      'Follow for daily tips ⚡'
    ],
    reels: [
      'Save this before it disappears 🔥',
      'Follow for more! ✨',
      'Share with friends! 📤',
      'Save this for later 🔥'
    ],
    instagram: [
      'Follow for more updates! ✨',
      'Double tap ❤️ to save',
      'Share with your friends! 📤',
      'Follow for daily content!'
    ],
    facebook: [
      'Like and follow for more! 👍',
      'Share with friends! 📤',
      'Turn on notifications! 🔔',
      'Like our page for more!'
    ]
  };

  const templates = ctaTemplates[platform] || ctaTemplates.youtube;
  const selectedCTA = templates[Math.floor(Math.random() * templates.length)];

  return {
    cta: selectedCTA,
    platform,
    placement: 'end_card'
  };
}

// Log startup status
if (isEnabled()) {
  console.log('[EliteMode] Level 4 Monetization Engine ENABLED');
  console.log('[Monetization] Hook Analyzer READY');
  console.log('[Monetization] AB Title Generator READY');
  console.log('[Monetization] Monetization Scoring ACTIVE');
}

module.exports = {
  isEnabled,
  analyzeHook,
  generateABTitles,
  calculateMonetizationScore,
  optimizeForPlatform,
  generateSmartCTA,
  EMOTIONAL_WORDS,
  POWER_WORDS
};
