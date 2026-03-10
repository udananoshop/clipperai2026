/**
 * AI TITLE GENERATOR
 * Generates optimized viral titles for clips
 * 
 * Rules:
 * - Max title length: 80 characters
 * - Include curiosity hook
 * - Platform optimized
 * 
 * @input clip metadata, viralScore, platform
 * @output 5 optimized viral titles
 */

const viralScoreEngine = require('./viralScoreEngine');

// Title templates by category
const TITLE_TEMPLATES = {
  // Curiosity hooks
  curiosity: [
    "You Won't Believe What Happened Next",
    "This Scene Broke the Internet",
    "The Moment Everything Changed",
    "What Nobody Tells You About",
    "This Is Going Viral for a Reason",
    "Wait Until You See This",
    "The Secret Nobody Knows",
    "This Changed Everything",
    "You Need to See This",
    "This Is Insane"
  ],
  
  // Shock/Drama
  shock: [
    "This Went WRONG in the Worst Way",
    "The Aftermath Was Shocking",
    "Nobody Expected This",
    "This Is Breaking the Internet",
    "The Most Insane Thing You'll See Today",
    "This Is Too Real",
    "The Untold Story",
    "This Exposed Everything",
    "The Truth About",
    "This Is Heartbreaking"
  ],
  
  // Educational
  educational: [
    "How to Master This in Minutes",
    "The Ultimate Guide to",
    "Everything You Need to Know About",
    "Here's How Professionals Do It",
    "The Step-by-Step Tutorial",
    "Learn This Before It's Gone",
    "The Complete Breakdown",
    "Secrets the Pros Don't Tell You",
    "Master This Skill Today",
    "The Hidden Technique"
  ],
  
  // Entertainment
  entertainment: [
    "Best compilation",
    "Ultimate Funny Moments",
    "When This Happened We Can't Stop Laughing",
    "The Most Epic Fail",
    "This Is Comedy Gold",
    "The Funniest Thing You'll See",
    "Ultimate Reaction Compilation",
    "When It Goes Wrong It Goes Wrong",
    "This Made Everyone ROFL",
    "The Most Entertaining"
  ],
  
  // Trending
  trending: [
    "Trending Now:",
    "Going Viral Right Now",
    "The Most Talked About",
    "Breaking:",
    "This Is Making Headlines",
    "Viral Sensation",
    "Internet's Favorite",
    "The Hottest Take",
    "Everyone Is Watching This",
    "This Is the Future"
  ]
};

// Platform-specific modifiers
const PLATFORM_MODIFIERS = {
  tiktok: {
    prefixes: ['🔥', '⚡', '💀', '🤯', '✨', '🚨', '💯', '👀'],
    suffixes: ['#viral', '#fyp', '#trending'],
    style: 'short'
  },
  instagram: {
    prefixes: ['✨', '💫', '📌', '💜', '🔮', '⭐'],
    suffixes: ['#reels', '#explorepage', '#viral'],
    style: 'medium'
  },
  youtube: {
    prefixes: ['📹', '🎬', '▶️', '🎥', '🆕'],
    suffixes: ['#shorts', '#viral', '#trending'],
    style: 'long'
  },
  facebook: {
    prefixes: ['📱', '🎯', '💡', '🔥'],
    suffixes: ['#reels', '#viral', '#trending'],
    style: 'medium'
  }
};

// Topic extractors
function extractTopic(metadata) {
  if (!metadata) return 'This';
  
  const title = metadata.title || '';
  const description = metadata.description || '';
  const combined = `${title} ${description}`.toLowerCase();
  
  // Extract key topics
  const topics = [];
  
  // Common content keywords
  const keywords = ['dance', 'music', 'comedy', 'tutorial', 'review', 'vlog', 
    'challenge', 'recipe', 'fitness', 'gaming', 'beauty', 'fashion', 
    'sports', 'news', 'reaction', 'reaction', 'compilation', 'highlights'];
  
  for (const keyword of keywords) {
    if (combined.includes(keyword)) {
      topics.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  }
  
  return topics.length > 0 ? topics[0] : 'This';
}

// Generate curiosity hook
function generateCuriosityHook(viralScore, platform) {
  const templates = TITLE_TEMPLATES.curiosity;
  const mod = PLATFORM_MODIFIERS[platform] || PLATFORM_MODIFIERS.youtube;
  
  // Higher viral scores get more shocking templates
  let template = templates[Math.floor(Math.random() * templates.length)];
  
  // Add platform-specific prefix for high scores
  if (viralScore >= 75 && mod.prefixes.length > 0) {
    const prefix = mod.prefixes[Math.floor(Math.random() * mod.prefixes.length)];
    template = `${prefix} ${template}`;
  }
  
  return template;
}

// Generate shock hook
function generateShockHook(viralScore, platform) {
  const templates = TITLE_TEMPLATES.shock;
  const mod = PLATFORM_MODIFIERS[platform] || PLATFORM_MODIFIERS.youtube;
  
  let template = templates[Math.floor(Math.random() * templates.length)];
  
  if (viralScore >= 80 && mod.prefixes.length > 0) {
    const prefix = mod.prefixes[Math.floor(Math.random() * mod.prefixes.length)];
    template = `${prefix} ${template}`;
  }
  
  return template;
}

// Generate educational hook
function generateEducationalHook(viralScore, platform, topic) {
  const templates = TITLE_TEMPLATES.educational;
  let template = templates[Math.floor(Math.random() * templates.length)];
  
  // Replace placeholder with topic
  template = template.replace('{topic}', topic);
  
  return template;
}

// Generate entertainment hook
function generateEntertainmentHook(viralScore, platform) {
  const templates = TITLE_TEMPLATES.entertainment;
  const mod = PLATFORM_MODIFIERS[platform] || PLATFORM_MODIFIERS.youtube;
  
  let template = templates[Math.floor(Math.random() * templates.length)];
  
  if (mod.prefixes.length > 0) {
    const prefix = mod.prefixes[Math.floor(Math.random() * mod.prefixes.length)];
    template = `${prefix} ${template}`;
  }
  
  return template;
}

// Generate trending hook
function generateTrendingHook(viralScore, platform) {
  const templates = TITLE_TEMPLATES.trending;
  const mod = PLATFORM_MODIFIERS[platform] || PLATFORM_MODIFIERS.youtube;
  
  let template = templates[Math.floor(Math.random() * templates.length)];
  
  // Add platform-specific prefix
  if (mod.prefixes.length > 0) {
    const prefix = mod.prefixes[Math.floor(Math.random() * mod.prefixes.length)];
    template = `${prefix} ${template}`;
  }
  
  return template;
}

// Truncate title to max length
function truncateTitle(title, maxLength = 80) {
  if (title.length <= maxLength) return title;
  
  // Try to truncate at word boundary
  const truncated = title.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.5) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Main function: Generate 5 optimized viral titles
 * 
 * @param {Object} options - Options object
 * @param {Object} options.metadata - Clip metadata (title, description, etc.)
 * @param {number} options.viralScore - Viral score (0-100)
 * @param {string} options.platform - Platform (tiktok, instagram, youtube, facebook)
 * @returns {Array} Array of 5 title objects
 */
function generateTitles(options = {}) {
  const { metadata = {}, viralScore = 50, platform = 'youtube' } = options;
  
  // Validate platform
  const validPlatform = ['tiktok', 'instagram', 'youtube', 'facebook'].includes(platform) 
    ? platform 
    : 'youtube';
  
  // Extract topic from metadata
  const topic = extractTopic(metadata);
  
  // Generate 5 unique titles
  const titles = [
    {
      id: 1,
      title: truncateTitle(generateCuriosityHook(viralScore, validPlatform)),
      category: 'curiosity',
      hook: 'curiosity',
      viralScore
    },
    {
      id: 2,
      title: truncateTitle(generateShockHook(viralScore, validPlatform)),
      category: 'shock',
      hook: 'shock',
      viralScore
    },
    {
      id: 3,
      title: truncateTitle(generateEducationalHook(viralScore, validPlatform, topic)),
      category: 'educational',
      hook: 'educational',
      viralScore
    },
    {
      id: 4,
      title: truncateTitle(generateEntertainmentHook(viralScore, validPlatform)),
      category: 'entertainment',
      hook: 'entertainment',
      viralScore
    },
    {
      id: 5,
      title: truncateTitle(generateTrendingHook(viralScore, validPlatform)),
      category: 'trending',
      hook: 'trending',
      viralScore
    }
  ];
  
  // Add platform-specific suffix to some titles
  const mod = PLATFORM_MODIFIERS[validPlatform];
  if (mod && mod.suffixes && viralScore >= 70) {
    titles.forEach((t, i) => {
      if (i % 2 === 0 && mod.suffixes.length > 0) {
        const suffix = mod.suffixes[Math.floor(Math.random() * mod.suffixes.length)];
        const newTitle = truncateTitle(`${t.title} ${suffix}`);
        if (newTitle.length <= 80) {
          t.title = newTitle;
        }
      }
    });
  }
  
  return titles;
}

/**
 * Generate titles with specific category focus
 * 
 * @param {Object} options - Options object
 * @param {string} options.category - Preferred category
 * @param {Object} options.metadata - Clip metadata
 * @param {number} options.viralScore - Viral score
 * @param {string} options.platform - Platform
 * @returns {Array} Array of title objects
 */
function generateTitlesWithCategory(options = {}) {
  const { metadata = {}, viralScore = 50, platform = 'youtube', category = 'all' } = options;
  
  let titles = generateTitles({ metadata, viralScore, platform });
  
  if (category !== 'all') {
    // Prioritize selected category
    const categoryTitle = titles.find(t => t.category === category);
    if (categoryTitle) {
      titles = [categoryTitle, ...titles.filter(t => t.category !== category)];
    }
  }
  
  return titles;
}

/**
 * Get platform-specific title recommendations
 * 
 * @param {number} viralScore - Viral score
 * @param {string} platform - Platform
 * @returns {Array} Platform-optimized titles
 */
function getPlatformRecommendations(viralScore, platform) {
  const mod = PLATFORM_MODIFIERS[platform] || PLATFORM_MODIFIERS.youtube;
  
  let templates;
  switch (mod.style) {
    case 'short':
      templates = TITLE_TEMPLATES.curiosity.concat(TITLE_TEMPLATES.shock);
      break;
    case 'medium':
      templates = TITLE_TEMPLATES.curiosity.concat(TITLE_TEMPLATES.entertainment);
      break;
    case 'long':
      templates = TITLE_TEMPLATES.educational.concat(TITLE_TEMPLATES.trending);
      break;
    default:
      templates = TITLE_TEMPLATES.curiosity;
  }
  
  return templates.slice(0, 5).map((title, i) => ({
    id: i + 1,
    title: truncateTitle(title),
    category: 'recommended',
    hook: 'platform_optimized',
    viralScore
  }));
}

module.exports = {
  generateTitles,
  generateTitlesWithCategory,
  getPlatformRecommendations,
  extractTopic,
  truncateTitle,
  TITLE_TEMPLATES,
  PLATFORM_MODIFIERS
};

