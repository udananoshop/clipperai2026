/**
 * Hashtag Generator Service
 * AI-Powered Viral Hashtag Generation
 * 
 * Generates optimized hashtags for multiple platforms:
 * - YouTube
 * - TikTok
 * - Instagram
 * - Facebook
 * 
 * Returns 10-20 viral hashtags based on video topic
 * 
 * Optimized for 8GB RAM - lightweight generation
 */

// ============================================================================
// VIRAL HASHTAG CATEGORIES
// ============================================================================

const hashtagCategories = {
  // Trending categories
  trending: {
    general: [
      '#viral', '#trending', '#fyp', '#foryou', '#explore', 
      '#viralvideo', '#trendingvideo', '#viralpost', '#explorepage',
      '#viraltiktok', '#trendingtiktok', '#foryoupage', '#fypage'
    ],
    youtube: [
      '#YouTube', '#YouTubeShorts', '#YTShorts', '#YouTubeCreator',
      '#Shorts', '#Trending', '#Viral', '#YouTubeIndia', '#YouTubeUSA'
    ],
    tiktok: [
      '#TikTok', '#TikTokTrending', '#TikTokViral', '#DanceChallenge',
      '#Comedy', '#Tutorial', '#LifeHacks', '#FoodTok', '#PetTok'
    ],
    instagram: [
      '#Instagram', '#Reels', '#InstagramReels', '#ExplorePage',
      '#InstaDaily', '#Instagrammer', '#InstaGood', '#PhotoOfTheDay'
    ],
    facebook: [
      '#Facebook', '#FBVideo', '#FacebookLive', '#FacebookWatch',
      '#ViralVideo', '#TrendingOnFB', '#FacebookPost'
    ]
  },
  
  // Content categories
  content: {
    entertainment: [
      '#entertainment', '#funny', '#comedy', '#funnyvideo', '#hilarious',
      '#laugh', '#jokes', '#memes', '#meme', '#funnymemes'
    ],
    education: [
      '#education', '#learn', '#tutorial', '#howto', '#tips',
      '#guide', '#lesson', '#school', '#knowledge', '#learning'
    ],
    lifestyle: [
      '#lifestyle', '#lifestyleblogger', '#dailylife', '#life',
      '#motivation', '#inspiration', '#goals', '#mindset', '#success'
    ],
    fashion: [
      '#fashion', '#fashionblogger', '#style', '#ootd', '#fashionstyle',
      '#streetstyle', '#fashionista', '#instafashion', '#outfit', '#clothes'
    ],
    fitness: [
      '#fitness', '#workout', '#gym', '#fit', '#fitnessmotivation',
      '#health', '#exercise', '#training', '#bodybuilding', '#fitfam'
    ],
    food: [
      '#food', '#foodie', '#foodporn', '#yummy', '#delicious',
      '#cooking', '#recipe', '#foodblogger', '#homemade', '#instafood'
    ],
    travel: [
      '#travel', '#travelgram', '#wanderlust', '#travelphotography',
      '#adventure', '#explore', '#vacation', '#traveling', '#trip', '#tourist'
    ],
    tech: [
      '#tech', '#technology', '#gadgets', '#innovation', '#technews',
      '#smartphone', '#computer', '#coding', '#programming', '#ai'
    ],
    gaming: [
      '#gaming', '#gamer', '#videogames', '#playstation', '#xbox',
      '#nintendo', '#gta', '#fortnite', '#minecraft', '#gaminglife'
    ],
    music: [
      '#music', '#musician', '#singer', '#song', '#rapper',
      '#hiphop', '#pop', '#dj', '#instamusic', '#newmusic'
    ]
  },
  
  // Niche-specific
  niche: {
    business: [
      '#business', '#entrepreneur', '#success', '#money', '#startup',
      '#marketing', '#branding', '#businessowner', '#hustle', '#wealth'
    ],
    parenting: [
      '#parenting', '#momlife', '#dadlife', '#baby', '#kids',
      '#motherhood', '#fatherhood', '#family', '#parentingtips', '#kidsfun'
    ],
    pets: [
      '#pets', '#dog', '#cat', '#puppy', '#kitten',
      '#petlife', '#petsofinstagram', '#doglover', '#catlover', '#petstagram'
    ],
    sports: [
      '#sports', '#football', '#basketball', '#soccer', '#nba',
      '#nfl', '#athlete', '#sportsnews', '#game', '#champion'
    ],
    news: [
      '#news', '#breakingnews', '#politics', '#worldnews', '#currentevents',
      '#journalism', '#media', '#update', '#headlines', '#breaking'
    ]
  },
  
  // Emotions
  emotions: [
    '#relatable', '#mood', '#feelings', '#emotions', '#moodswings',
    '#happymood', '#sad', '#love', '#hate', '#angry'
  ],
  
  // Time-based
  time: [
    '#2024', '#newyear', '#newyear2024', '#yearinreview',
    '#mondaymotivation', '#tuesdayvibes', '#weekendvibes', '#fridayfeeling'
  ]
};

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

const platformSettings = {
  youtube: {
    optimalCount: 15,
    maxCount: 30,
    priority: ['trending', 'content'],
    required: ['#Shorts', '#YouTube']
  },
  tiktok: {
    optimalCount: 8,
    maxCount: 25,
    priority: ['trending'],
    required: ['#fyp', '#FYP']
  },
  instagram: {
    optimalCount: 11,
    maxCount: 30,
    priority: ['trending', 'content'],
    required: ['#Reels', '#Instagram']
  },
  facebook: {
    optimalCount: 10,
    maxCount: 25,
    priority: ['trending'],
    required: ['#Facebook', '#ViralVideo']
  },
  twitter: {
    optimalCount: 5,
    maxCount: 10,
    priority: ['trending'],
    required: []
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Random item from array
 */
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Random items from array
 */
const randomItems = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Analyze topic and extract keywords
 */
const extractKeywords = (topic) => {
  if (!topic) return [];
  
  // Common topic keywords mapping
  const keywordMap = {
    'dance': ['dance', 'dancing', 'choreography', 'dancevideo'],
    'cooking': ['cooking', 'recipe', 'food', 'chef', 'kitchen'],
    'gaming': ['gaming', 'game', 'gamer', 'playthrough', 'gaming'],
    'tech': ['tech', 'technology', 'gadget', 'review', 'unboxing'],
    'fitness': ['fitness', 'workout', 'exercise', 'gym', 'health'],
    'music': ['music', 'song', 'singer', 'rap', 'beat'],
    'comedy': ['comedy', 'funny', 'jokes', 'humor', 'laugh'],
    'education': ['education', 'tutorial', 'learn', 'tips', 'howto'],
    'fashion': ['fashion', 'style', 'outfit', 'clothes', 'trendy'],
    'travel': ['travel', 'adventure', 'vacation', 'trip', 'explore'],
    'pets': ['pets', 'dog', 'cat', 'animal', 'cute'],
    'sports': ['sports', 'game', 'match', 'team', 'athlete'],
    'business': ['business', 'entrepreneur', 'money', 'startup', 'marketing'],
    'news': ['news', 'update', '#breaking', 'report', 'journalism'],
    'beauty': ['beauty', 'makeup', 'skincare', 'cosmetics', 'glam'],
    'lifestyle': ['lifestyle', 'life', 'daily', 'vlog', 'routine']
  };
  
  const lowerTopic = topic.toLowerCase();
  const keywords = [];
  
  for (const [key, words] of Object.entries(keywordMap)) {
    if (lowerTopic.includes(key)) {
      keywords.push(...words);
    }
  }
  
  // If no match, just use the topic itself
  if (keywords.length === 0) {
    keywords.push(...topic.split(/\s+/).filter(w => w.length > 2));
  }
  
  return [...new Set(keywords)]; // Remove duplicates
};

// ============================================================================
// HASHTAG GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate hashtags for YouTube
 */
function generateYouTubeHashtags(topic, count = 15) {
  const settings = platformSettings.youtube;
  const finalCount = Math.min(count || settings.optimalCount, settings.maxCount);
  
  const hashtags = new Set();
  
  // Add required hashtags
  for (const tag of settings.required) {
    hashtags.add(tag);
  }
  
  // Add trending hashtags
  for (const tag of hashtagCategories.trending.youtube) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  // Add topic-related hashtags
  const keywords = extractKeywords(topic);
  for (const keyword of keywords) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(`#${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
  }
  
  // Add general trending if needed
  for (const tag of hashtagCategories.trending.general) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  // Fill with content category
  for (const tags of Object.values(hashtagCategories.content)) {
    if (hashtags.size >= finalCount) break;
    for (const tag of randomItems(tags, 3)) {
      if (hashtags.size >= finalCount) break;
      hashtags.add(tag);
    }
  }
  
  return Array.from(hashtags).slice(0, finalCount);
}

/**
 * Generate hashtags for TikTok
 */
function generateTikTokHashtags(topic, count = 8) {
  const settings = platformSettings.tiktok;
  const finalCount = Math.min(count || settings.optimalCount, settings.maxCount);
  
  const hashtags = new Set();
  
  // Add required hashtags (FYP is essential for TikTok)
  for (const tag of settings.required) {
    hashtags.add(tag);
  }
  
  // Add trending TikTok hashtags
  for (const tag of hashtagCategories.trending.tiktok) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  // Add topic-related hashtags
  const keywords = extractKeywords(topic);
  for (const keyword of keywords.slice(0, 3)) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(`#${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
  }
  
  // Add general trending
  for (const tag of hashtagCategories.trending.general) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  // Add time-based hashtags
  for (const tag of hashtagCategories.time) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  return Array.from(hashtags).slice(0, finalCount);
}

/**
 * Generate hashtags for Instagram
 */
function generateInstagramHashtags(topic, count = 11) {
  const settings = platformSettings.instagram;
  const finalCount = Math.min(count || settings.optimalCount, settings.maxCount);
  
  const hashtags = new Set();
  
  // Add required hashtags
  for (const tag of settings.required) {
    hashtags.add(tag);
  }
  
  // Add trending Instagram hashtags
  for (const tag of hashtagCategories.trending.instagram) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  // Add topic-related hashtags
  const keywords = extractKeywords(topic);
  for (const keyword of keywords.slice(0, 4)) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(`#${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
  }
  
  // Add content category hashtags
  for (const category of Object.values(hashtagCategories.content)) {
    if (hashtags.size >= finalCount) break;
    for (const tag of randomItems(category, 2)) {
      if (hashtags.size >= finalCount) break;
      hashtags.add(tag);
    }
  }
  
  return Array.from(hashtags).slice(0, finalCount);
}

/**
 * Generate hashtags for Facebook
 */
function generateFacebookHashtags(topic, count = 10) {
  const settings = platformSettings.facebook;
  const finalCount = Math.min(count || settings.optimalCount, settings.maxCount);
  
  const hashtags = new Set();
  
  // Add required hashtags
  for (const tag of settings.required) {
    hashtags.add(tag);
  }
  
  // Add trending Facebook hashtags
  for (const tag of hashtagCategories.trending.facebook) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  // Add topic-related hashtags
  const keywords = extractKeywords(topic);
  for (const keyword of keywords.slice(0, 3)) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(`#${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
  }
  
  // Add general trending
  for (const tag of hashtagCategories.trending.general) {
    if (hashtags.size >= finalCount) break;
    hashtags.add(tag);
  }
  
  return Array.from(hashtags).slice(0, finalCount);
}

/**
 * Generate hashtags for all platforms
 */
function generateAllPlatformHashtags(topic, count = 15) {
  return {
    youtube: generateYouTubeHashtags(topic, count),
    tiktok: generateTikTokHashtags(topic, count),
    instagram: generateInstagramHashtags(topic, count),
    facebook: generateFacebookHashtags(topic, count)
  };
}

/**
 * Generate custom hashtags based on topic
 */
function generateCustomHashtags(topic, platform = 'all', count = 15) {
  if (platform === 'all') {
    return generateAllPlatformHashtags(topic, count);
  }
  
  switch (platform.toLowerCase()) {
    case 'youtube':
    case 'yt':
      return { hashtags: generateYouTubeHashtags(topic, count), platform: 'youtube' };
    case 'tiktok':
    case 'tt':
      return { hashtags: generateTikTokHashtags(topic, count), platform: 'tiktok' };
    case 'instagram':
    case 'ig':
      return { hashtags: generateInstagramHashtags(topic, count), platform: 'instagram' };
    case 'facebook':
    case 'fb':
      return { hashtags: generateFacebookHashtags(topic, count), platform: 'facebook' };
    default:
      return { hashtags: generateTikTokHashtags(topic, count), platform: 'tiktok' };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main generators
  generateYouTubeHashtags,
  generateTikTokHashtags,
  generateInstagramHashtags,
  generateFacebookHashtags,
  generateAllPlatformHashtags,
  generateCustomHashtags,
  
  // Utility
  extractKeywords,
  
  // Data
  hashtagCategories,
  platformSettings
};

