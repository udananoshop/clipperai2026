/**
 * AI Script Generator (Lightweight)
 * ClipperAI2026 - GOD LEVEL AI GROWTH ENGINE
 * 
 * Features:
 * - Reuses analyticsService data (RAM optimized)
 * - Generates short script outlines for videos
 * - Lightweight - no heavy AI models
 * - Template-based generation
 * 
 * Example output:
 * Video Script Outline:
 * 
 * Hook:
 * "Did you know this AI tool can edit videos automatically?"
 * 
 * Content:
 * Explain the AI tool in 3 steps.
 * 
 * Call To Action:
 * "Follow for more AI tools."
 */

let analyticsService = null;
let viralPredictionService = null;

// Lazy load dependencies
const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[ScriptGenerator] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try {
      viralPredictionService = require('./viralPredictionService');
    } catch (e) {
      console.error('[ScriptGenerator] Viral Prediction service not available:', e.message);
    }
  }
  return viralPredictionService;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const scriptCache = {
  data: {},
  timestamps: {},

  get(key) {
    const timestamp = this.timestamps[key];
    const now = Date.now();
    if (timestamp && (now - timestamp) < CACHE_TTL) {
      return this.data[key];
    }
    return null;
  },

  set(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  }
};

// ============================================================================
// SCRIPT TEMPLATES
// ============================================================================

// Hook templates
const HOOK_TEMPLATES = {
  question: [
    'Did you know {topic}?',
    'What if I told you about {topic}?',
    'Have you heard about {topic}?',
    'What\'s the best way to {topic}?',
    'Do you want to learn about {topic}?'
  ],
  statement: [
    'This is the {adjective} {topic}!',
    'You need to see this {topic}!',
    'This changed my life: {topic}',
    'The ultimate guide to {topic}',
    'Here\'s everything about {topic}'
  ],
  surprise: [
    'Wait until you see this {topic}!',
    'You won\'t believe this {topic}!',
    'This is insane: {topic}',
    'Mind-blowing {topic}!',
    'I can\'t believe this {topic}!'
  ],
  promise: [
    'Learn {topic} in 3 minutes!',
    'This {topic} will change everything!',
    'Get results with {topic}!',
    'Master {topic} today!',
    'The {topic} hack you need!'
  ]
};

// Content section templates
const CONTENT_STEPS = [
  [
    'First, explain the basics of {topic}',
    'Start with the most important point about {topic}',
    'Begin with why {topic} matters'
  ],
  [
    'Second, show how {topic} works in practice',
    'Demonstrate {topic} with a real example',
    'Break down {topic} step by step'
  ],
  [
    'Finally, share the best tips for {topic}',
    'Add your personal experience with {topic}',
    'Conclusion: {topic} is a game-changer'
  ]
];

// Call to action templates
const CTA_TEMPLATES = {
  indonesian: [
    'Follow untuk tips lebih banyak!',
    'Like dan share jika berguna!',
    'Komentar jika punya pertanyaan!',
    'Jangan lupa subscribe!',
    'Follow untuk konten berikutnya!'
  ],
  english: [
    'Follow for more tips!',
    'Like and share if useful!',
    'Comment if you have questions!',
    'Don\'t forget to subscribe!',
    'Follow for next content!'
  ]
};

// ============================================================================
// ANALYZE CONTENT TYPE
// ============================================================================

/**
 * Get content type from analytics
 */
const getContentType = async () => {
  const cacheKey = 'content_type';
  const cached = scriptCache.get(cacheKey);
  if (cached) return cached;

  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return 'Short Clip';
    }

    const prediction = await viralService.predictViralPotential();
    const result = prediction.recommendedFormat || 'Short Clip';
    scriptCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ScriptGenerator] Content type error:', error.message);
    return 'Short Clip';
  }
};

/**
 * Get trending topic for script
 */
const getTrendingTopic = async () => {
  const cacheKey = 'trending_topic';
  const cached = scriptCache.get(cacheKey);
  if (cached) return cached;

  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return 'AI Tools';
    }

    const insights = await viralService.getViralInsights();
    
    if (insights.topPerforming && insights.topPerforming.length > 0) {
      const topClip = insights.topPerforming[0];
      const topic = extractTopicFromTitle(topClip.title);
      scriptCache.set(cacheKey, topic);
      return topic;
    }

    scriptCache.set(cacheKey, 'AI Tools');
    return 'AI Tools';
  } catch (error) {
    console.error('[ScriptGenerator] Trending topic error:', error.message);
    return 'AI Tools';
  }
};

// ============================================================================
// SCRIPT GENERATION
// ============================================================================

/**
 * Generate video script outline
 */
const generateScriptOutline = async (topic = null, language = 'english') => {
  const topicKey = topic || 'default';
  const cacheKey = `script_${topicKey}_${language}`;
  const cached = scriptCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get content type and trending topic
    const [contentType, trendingTopic] = await Promise.all([
      getContentType(),
      getTrendingTopic()
    ]);

    const finalTopic = topic || trendingTopic;
    const adjective = getAdjectiveForTopic(finalTopic);

    // Generate script sections
    const hook = generateHook(finalTopic, adjective, language);
    const content = generateContent(finalTopic, language);
    const cta = generateCTA(language);

    const result = {
      topic: finalTopic,
      format: contentType,
      hook,
      content,
      cta,
      duration: estimateDuration(contentType),
      tips: generateTips(contentType, language),
      timestamp: new Date().toISOString()
    };

    scriptCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ScriptGenerator] Generate script error:', error.message);
    return getDefaultScript(language);
  }
};

/**
 * Generate hook
 */
const generateHook = (topic, adjective, language) => {
  const hookTypes = ['question', 'statement', 'surprise', 'promise'];
  const selectedType = hookTypes[Math.floor(Math.random() * hookTypes.length)];
  const templates = HOOK_TEMPLATES[selectedType];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  let hook = template
    .replace('{topic}', topic)
    .replace('{adjective}', adjective);

  return {
    type: selectedType,
    text: hook,
    duration: '3-5 seconds',
    tips: language === 'indonesian' 
      ? 'Buka dengan hook yang menarik perhatian!'
      : 'Open with an attention-grabbing hook!'
  };
};

/**
 * Generate content outline
 */
const generateContent = (topic, language) => {
  const steps = [];
  
  CONTENT_STEPS.forEach((stepTemplates, index) => {
    const template = stepTemplates[Math.floor(Math.random() * stepTemplates.length)];
    const stepContent = template.replace('{topic}', topic);
    
    steps.push({
      step: index + 1,
      title: getStepTitle(index, language),
      content: stepContent,
      duration: getStepDuration(index)
    });
  });

  return {
    structure: '3-Point Breakdown',
    totalDuration: '45-60 seconds',
    steps
  };
};

/**
 * Generate call to action
 */
const generateCTA = (language) => {
  const templates = CTA_TEMPLATES[language] || CTA_TEMPLATES.english;
  const text = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    text,
    duration: '5-10 seconds',
    placement: 'End of video',
    tips: language === 'indonesian'
      ? 'CTA yang kuat meningkatkan engagement!'
      : 'Strong CTA increases engagement!'
  };
};

/**
 * Get step title
 */
const getStepTitle = (index, language) => {
  const titles = language === 'indonesian'
    ? ['Langkah 1: Mulai', 'Langkah 2: Aksi', 'Langkah 3: Hasil']
    : ['Step 1: Start', 'Step 2: Action', 'Step 3: Result'];
  
  return titles[index] || `Step ${index + 1}`;
};

/**
 * Get step duration
 */
const getStepDuration = (index) => {
  const durations = ['15-20 seconds', '20-25 seconds', '15-20 seconds'];
  return durations[index] || '15-20 seconds';
};

/**
 * Estimate video duration based on format
 */
const estimateDuration = (format) => {
  if (format.toLowerCase().includes('short') || format.toLowerCase().includes('clip')) {
    return '60-90 seconds';
  } else if (format.toLowerCase().includes('tutorial')) {
    return '3-5 minutes';
  }
  return '60-90 seconds';
};

/**
 * Get adjective for topic
 */
const getAdjectiveForTopic = (topic) => {
  const adjectives = ['amazing', 'incredible', 'ultimate', 'best', 'powerful'];
  return adjectives[Math.floor(Math.random() * adjectives.length)];
};

/**
 * Extract topic from title
 */
const extractTopicFromTitle = (title) => {
  if (!title) return 'AI Tools';
  
  // Remove common words
  const words = title.split(' ')
    .filter(w => w.length > 3 && !['about', 'with', 'this', 'that', 'from'].includes(w.toLowerCase()));
  
  return words.length > 0 ? words.slice(0, 3).join(' ') : 'AI Tools';
};

/**
 * Generate format-specific tips
 */
const generateTips = (format, language) => {
  const tips = language === 'indonesian'
    ? [
        'Gunakan subtitle untuk engagement lebih baik',
        'Tambahkan musik yang sesuai mood',
        'Keep it simple dan fokus pada satu pesan',
        'Gunakan format 9:16 untuk short clips'
      ]
    : [
        'Use subtitles for better engagement',
        'Add music that matches the mood',
        'Keep it simple and focus on one message',
        'Use 9:16 format for short clips'
      ];

  return tips.slice(0, 3);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDefaultScript = (language) => ({
  topic: 'AI Tools',
  format: 'Short Clip',
  hook: {
    type: 'question',
    text: language === 'indonesian' 
      ? 'Tahukan kamu tentang AI Tools?' 
      : 'Did you know about AI Tools?',
    duration: '3-5 seconds',
    tips: language === 'indonesian'
      ? 'Buka dengan hook yang menarik!'
      : 'Open with an attention-grabbing hook!'
  },
  content: {
    structure: '3-Point Breakdown',
    totalDuration: '45-60 seconds',
    steps: [
      { step: 1, title: language === 'indonesian' ? 'Langkah 1' : 'Step 1', content: 'Start with the basics', duration: '15-20 seconds' },
      { step: 2, title: language === 'indonesian' ? 'Langkah 2' : 'Step 2', content: 'Show how it works', duration: '20-25 seconds' },
      { step: 3, title: language === 'indonesian' ? 'Langkah 3' : 'Step 3', content: 'Share the results', duration: '15-20 seconds' }
    ]
  },
  cta: {
    text: language === 'indonesian' ? 'Follow untuk lebih banyak!' : 'Follow for more!',
    duration: '5-10 seconds',
    placement: 'End of video',
    tips: 'Strong CTA increases engagement!'
  },
  duration: '60-90 seconds',
  tips: [
    'Use subtitles',
    'Add music',
    'Keep it simple'
  ],
  timestamp: new Date().toISOString()
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateScriptOutline,
  getContentType,
  getTrendingTopic,
  scriptCache
};

