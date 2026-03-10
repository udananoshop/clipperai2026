/**
 * AI Content Idea Generator
 * ClipperAI2026 - GOD LEVEL AI GROWTH ENGINE
 * 
 * Features:
 * - Reuses analyticsService data (RAM optimized)
 * - Reuses viralPredictionService data
 * - Generates content ideas based on trends
 * - Lightweight - no heavy AI libraries
 * 
 * Example output:
 * Content Ideas Today:
 * 1. "Top 5 AI Tools for Small Businesses"
 * 2. "How to Go Viral on TikTok using AI"
 * 3. "Automated Video Editing with AI"
 */

let analyticsService = null;
let viralPredictionService = null;

// Lazy load dependencies
const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[ContentIdeas] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try {
      viralPredictionService = require('./viralPredictionService');
    } catch (e) {
      console.error('[ContentIdeas] Viral Prediction service not available:', e.message);
    }
  }
  return viralPredictionService;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const ideasCache = {
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
// CONTENT IDEA TEMPLATES
// ============================================================================

// Trending topics for content generation
const TRENDING_TOPICS = {
  ai_tools: [
    'AI Tools for Small Businesses',
    'Best AI Tools for Content Creators',
    'Free AI Tools You Need to Try',
    'AI Tools That Save Hours of Work',
    'How to Use AI for Video Editing'
  ],
  productivity: [
    'Productivity Hacks for 2024',
    'How to 10x Your Productivity',
    'Morning Routine for Success',
    'Time Management Tips',
    'How to Stay Focused All Day'
  ],
  tech_tips: [
    'Tech Tips Everyone Should Know',
    'Hidden Features You Didnt Know',
    'How to Speed Up Your Device',
    'Tech Hacks for Beginners',
    'Must-Have Tech Accessories'
  ],
  social_media: [
    'How to Go Viral on TikTok',
    'Instagram Reels Tips',
    'YouTube Shorts Strategy',
    'Social Media Growth Hacks',
    'How to Build Your Online Presence'
  ],
  business: [
    'How to Start Your Business',
    'Business Tips for Beginners',
    'How to Make Money Online',
    'Side Hustle Ideas',
    'Passive Income Ideas'
  ],
  automation: [
    'Automate Your Workflow',
    'AI Automation Tools',
    'How to Save Time with Automation',
    'Productivity Automation Tips',
    'Smart Home Automation Guide'
  ]
};

// Content format prefixes
const FORMAT_PREFIXES = [
  'Top 5',
  'Top 10',
  'How to',
  'Why You Should',
  'The Ultimate Guide to',
  'Secrets of',
  'Best of',
  'Ultimate',
  'Complete Guide to',
  '7 Ways to'
];

// ============================================================================
// ANALYZE TRENDS
// ============================================================================

/**
 * Get trending topics from analytics
 */
const getTrendingTopics = async () => {
  const cacheKey = 'trending_topics';
  const cached = ideasCache.get(cacheKey);
  if (cached) return cached;

  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return getDefaultTrendingTopics();
    }

    const insights = await viralService.getViralInsights();
    
    // Extract topics from top performing content
    const topics = [];
    
    if (insights.topPerforming && insights.topPerforming.length > 0) {
      insights.topPerforming.forEach(clip => {
        if (clip.title) {
          topics.push(clip.title);
        }
      });
    }

    // If not enough topics, add defaults
    while (topics.length < 3) {
      const randomTopic = getRandomItem(Object.values(TRENDING_TOPICS).flat());
      if (!topics.includes(randomTopic)) {
        topics.push(randomTopic);
      }
    }

    const result = topics.slice(0, 5);
    ideasCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentIdeas] Trending topics error:', error.message);
    return getDefaultTrendingTopics();
  }
};

/**
 * Get best performing platforms
 */
const getBestPlatforms = async () => {
  const cacheKey = 'best_platforms';
  const cached = ideasCache.get(cacheKey);
  if (cached) return cached;

  try {
    const analytics = getAnalyticsService();
    if (!analytics) {
      return ['YouTube', 'TikTok'];
    }

    const summary = await analytics.getSummary('30d');
    const platforms = summary.platforms || {};
    
    // Sort by count
    const sorted = Object.entries(platforms)
      .sort(([,a], [,b]) => (b.count || 0) - (a.count || 0))
      .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));

    const result = sorted.length > 0 ? sorted : ['YouTube', 'TikTok'];
    ideasCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentIdeas] Best platforms error:', error.message);
    return ['YouTube', 'TikTok'];
  }
};

/**
 * Get viral score trends
 */
const getViralTrends = async () => {
  const cacheKey = 'viral_trends';
  const cached = ideasCache.get(cacheKey);
  if (cached) return cached;

  try {
    const analytics = getAnalyticsService();
    if (!analytics) {
      return { trend: 'neutral', direction: 'stable' };
    }

    const trend = await analytics.getViralScoreTrend();
    
    if (trend.length < 2) {
      return { trend: 'neutral', direction: 'stable' };
    }

    const recent = trend[trend.length - 1].score || 0;
    const older = trend[0].score || 0;
    const diff = recent - older;

    let direction = 'stable';
    if (diff > 10) direction = 'up';
    else if (diff < -10) direction = 'down';

    const result = { trend: diff > 0 ? 'positive' : (diff < 0 ? 'negative' : 'neutral'), direction };
    ideasCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentIdeas] Viral trends error:', error.message);
    return { trend: 'neutral', direction: 'stable' };
  }
};

// ============================================================================
// GENERATE CONTENT IDEAS
// ============================================================================

/**
 * Generate content ideas based on analytics trends
 */
const generateContentIdeas = async (count = 5, language = 'english') => {
  const cacheKey = `content_ideas_${count}_${language}`;
  const cached = ideasCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Gather trend data in parallel
    const [topics, platforms, viralTrends] = await Promise.all([
      getTrendingTopics(),
      getBestPlatforms(),
      getViralTrends()
    ]);

    const ideas = [];
    const usedIdeas = new Set();

    // Generate ideas based on trends
    for (let i = 0; i < count; i++) {
      const idea = generateSingleIdea(topics, platforms, viralTrends, i, language, usedIdeas);
      ideas.push(idea);
      usedIdeas.add(idea.title);
    }

    const result = {
      ideas,
      meta: {
        count: ideas.length,
        generatedAt: new Date().toISOString(),
        basedOn: {
          trendingTopics: topics.slice(0, 3),
          bestPlatforms: platforms.slice(0, 2),
          viralTrend: viralTrends.direction
        }
      }
    };

    ideasCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentIdeas] Generate ideas error:', error.message);
    return getDefaultIdeas(count, language);
  }
};

/**
 * Generate a single content idea
 */
const generateSingleIdea = (topics, platforms, viralTrends, index, language, usedIdeas) => {
  // Pick a format prefix
  const prefix = FORMAT_PREFIXES[index % FORMAT_PREFIXES.length];
  
  // Pick a topic
  let topic;
  if (topics.length > 0 && index < topics.length) {
    topic = extractCoreTopic(topics[index]);
  } else {
    topic = getRandomItem(getRandomItem(Object.values(TRENDING_TOPICS)));
  }

  // Adjust based on viral trend
  if (viralTrends.direction === 'up') {
    topic = 'Trending: ' + topic;
  }

  // Format the idea
  const title = `${prefix} ${topic}`;
  
  // Generate description
  const description = generateDescription(topic, platforms[0], language);
  
  // Estimate potential
  const potential = estimateViralPotential(viralTrends, index);

  return {
    id: index + 1,
    title,
    description,
    suggestedPlatform: platforms[index % platforms.length] || 'TikTok',
    estimatedPotential: potential,
    hashtags: generateHashtags(topic, language),
    hook: generateHook(topic, language)
  };
};

/**
 * Extract core topic from title
 */
const extractCoreTopic = (title) => {
  if (!title) return 'AI Tools';
  
  // Remove common words and get the core
  const words = title.split(' ').filter(w => w.length > 3);
  return words.length > 0 ? words.slice(0, 3).join(' ') : 'AI Tools';
};

/**
 * Generate description for content
 */
const generateDescription = (topic, platform, language) => {
  if (language === 'indonesian') {
    return `Video tentang ${topic} yang wajib ditonton! ${platform === 'TikTok' ? 'Langsung viral!' : 'Jangan sampai lupa subscribe!'}`;
  }
  return `A must-watch video about ${topic}! ${platform === 'TikTok' ? 'Could go viral!' : 'Don\'t forget to subscribe!'}';
};

/**
 * Estimate viral potential
 */
const estimateViralPotential = (viralTrends, index) => {
  let base = 60;
  
  if (viralTrends.direction === 'up') base += 15;
  else if (viralTrends.direction === 'down') base -= 10;
  
  // First ideas have higher potential
  if (index === 0) base += 10;
  else if (index === 1) base += 5;
  
  return Math.min(95, Math.max(30, base + Math.floor(Math.random() * 15)));
};

/**
 * Generate hashtags
 */
const generateHashtags = (topic, language) => {
  const core = topic.split(' ').slice(0, 2).join('');
  const baseHashtags = language === 'indonesian'
    ? ['#FYP', '#Viral', '#Trending']
    : ['#fyp', '#viral', '#trending'];
  
  return [
    ...baseHashtags,
    '#' + core.replace(/[^a-zA-Z]/g, ''),
    '#ContentCreator'
  ];
};

/**
 * Generate hook for content
 */
const generateHook = (topic, language) => {
  const hooks = language === 'indonesian'
    ? [
        `Tahukah kamu tentang ${topic}?`,
        `Ini rahasia ${topic} yang wajib kamu tahu!`,
        `Jangan sampai tertinggal!`,
        `Wah, kamu harus lihat ini!`,
        `Siapa yang mau tahu tentang ${topic}?`
      ]
    : [
        `Did you know about ${topic}?`,
        `This secret about ${topic} will blow your mind!`,
        `Don\'t miss this!`,
        `You need to see this!`,
        `Who wants to learn about ${topic}?`
      ];
  
  return hooks[Math.floor(Math.random() * hooks.length)];
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const getDefaultTrendingTopics = () => [
  'AI Tools for Content Creation',
  'Productivity Hacks',
  'Social Media Growth'
];

const getDefaultIdeas = (count, language) => {
  const ideas = [];
  for (let i = 0; i < count; i++) {
    ideas.push({
      id: i + 1,
      title: FORMAT_PREFIXES[i % FORMAT_PREFIXES.length] + ' ' + getDefaultTrendingTopics()[i % 3],
      description: language === 'indonesian' 
        ? 'Ide konten yang menarik untuk audiens Anda' 
        : 'Engaging content idea for your audience',
      suggestedPlatform: 'TikTok',
      estimatedPotential: 60 + (i * 5),
      hashtags: ['#fyp', '#viral', '#trending'],
      hook: language === 'indonesian' ? 'Tahukan kamu?' : 'Did you know?'
    });
  }
  return { ideas, meta: { count, generatedAt: new Date().toISOString() } };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateContentIdeas,
  getTrendingTopics,
  getBestPlatforms,
  getViralTrends,
  ideasCache
};

