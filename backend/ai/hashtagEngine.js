/**
 * HASHTAG ENGINE
 * Generates optimized hashtags for clips
 * 
 * Structure per clip:
 * - 3 trending hashtags
 * - 3 niche hashtags
 * - 3 viral hashtags
 * - 1 branded hashtag (#ClipperAI)
 * 
 * Total: 10 hashtags per clip
 */

// Trending hashtags (high engagement, always popular)
const TRENDING_HASHTAGS = {
  tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#explore', '#viralvideo', '#trendingnow', '#foryoupage'],
  instagram: ['#explorepage', '#viral', '#trending', '#instagood', '#photooftheday', '#reels', '#instagram'],
  youtube: ['#shorts', '#viral', '#trending', '#youtubeshorts', '#fyp', '#explore', '#viralvideo'],
  facebook: ['#viral', '#trending', '#facebookreels', '#explore', '#fyp', '#viralvideo', '#trendingnow']
};

// Niche hashtags (topic-specific, lower competition)
const NICHE_HASHTAGS = {
  // Content types
  content: ['#tips', '#tutorial', '#howto', '#guide', '#learn', '#education', '#knowledge', '#skill'],
  entertainment: ['#funny', '#comedy', '#memes', '#funnymemes', '#lol', '#humor', '#comedyclips'],
  lifestyle: ['#lifestyle', '#life', '#daily', '#motivation', '#inspiration', '#goals', '#mindset'],
  gaming: ['#gaming', '#gamer', '#videogames', '#play', '#gamingcommunity', '#gamers'],
  music: ['#music', '#song', '#musician', '#beats', '#dj', '#rapper', '#singer'],
  fitness: ['#fitness', '#workout', '#gym', '#health', '#fit', '#training', '#motivation'],
  cooking: ['#cooking', '#food', '#recipe', '#chef', '#yummy', '#delicious', '#homemade'],
  beauty: ['#beauty', '#makeup', '#skincare', '#style', '#fashion', '#ootd', '#selfcare'],
  travel: ['#travel', '#adventure', '#explore', '#wanderlust', '#vacation', '#trip', '#travelgram'],
  tech: ['#tech', '#technology', '#innovation', '#gadgets', '#coding', '#programming', '#ai']
};

// Viral hashtags (boost reach)
const VIRAL_HASHTAGS = ['#mindblown', '#wow', '#insane', '#crazy', '#unbelievable', '#gamechanger', '#mustwatch', '#dontmissthis', '#viralhits', '#breaking'];

// Branded hashtag
const BRANDED_HASHTAG = '#ClipperAI';

// Platform-specific hashtag collections
const PLATFORM_HASHTAGS = {
  tiktok: {
    trending: ['#fyp', '#foryou', '#viral'],
    viral: ['#mindblown', '#wow', '#insane'],
    niche: ['#shorts', '#reels', '#clips']
  },
  instagram: {
    trending: ['#explorepage', '#viral', '#reels'],
    viral: ['#trendingnow', '#viralreels', '#explore'],
    niche: ['#instagram', '#photooftheday', '#instadaily']
  },
  youtube: {
    trending: ['#shorts', '#viral', '#trending'],
    viral: ['#youtubeshorts', '#viralvideo', '#fyp'],
    niche: ['#youtube', '#youtuber', '#youtubers']
  },
  facebook: {
    trending: ['#facebookreels', '#viral', '#trending'],
    viral: ['#fyp', '#viralpost', '#trendingnow'],
    niche: ['#facebook', '#fbvideo', '#fb reel']
  }
};

// Topic keyword mapping
const TOPIC_KEYWORDS = {
  dance: ['#dance', '#dancing', '#dancevideo', '#dancer', '#choreography'],
  comedy: ['#comedy', '#funny', '#comedian', '#humor', '#standup'],
  tutorial: ['#tutorial', '#howto', '#learn', '#tips', '#guide'],
  review: ['#review', '#unboxing', '#productreview', '#honestreview'],
  vlog: ['#vlog', '#vlogger', '#dailyvlog', '#lifestyle'],
  challenge: ['#challenge', '#challengeaccepted', '#viralchallenge'],
  recipe: ['#recipe', '#cooking', '#foodie', '#homemade', '#delicious'],
  fitness: ['#fitness', '#workout', '#gym', '#fit', '#health'],
  gaming: ['#gaming', '#gamer', '#videogames', '#letgameplay'],
  beauty: ['#beauty', '#makeup', '#skincare', '#mua', '#style'],
  sports: ['#sports', '#athlete', '#game', '#team', '#champion'],
  news: ['#news', '#breaking', '#update', '#headlines'],
  reaction: ['#reaction', '#react', '#meme', '#funnyvideo']
};

// Utility functions
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function shuffleArray(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

// Extract topic from metadata
function extractTopic(metadata = {}) {
  if (!metadata) return null;
  
  const text = `${metadata.title || ''} ${metadata.description || ''} ${metadata.tags || ''}`.toLowerCase();
  
  // Check each topic keyword
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.replace('#', ''))) {
        return topic;
      }
    }
  }
  
  return null;
}

// Get topic-specific hashtags
function getTopicHashtags(topic) {
  if (!topic || !TOPIC_KEYWORDS[topic]) {
    // Return random niche hashtags
    const allNiche = Object.values(NICHE_HASHTAGS).flat();
    return randomItems(allNiche, 3);
  }
  
  return TOPIC_KEYWORDS[topic].slice(0, 3);
}

/**
 * Generate 10 hashtags for a clip
 * 
 * @param {Object} options - Options object
 * @param {string} options.platform - Platform (tiktok, instagram, youtube, facebook)
 * @param {Object} options.metadata - Clip metadata
 * @param {number} options.viralScore - Viral score (0-100)
 * @returns {Object} Hashtag set with categories
 */
function generateHashtags(options = {}) {
  const { platform = 'tiktok', metadata = {}, viralScore = 50 } = options;
  
  // Get platform-specific collections
  const platformData = PLATFORM_HASHTAGS[platform] || PLATFORM_HASHTAGS.tiktok;
  
  // Extract topic from metadata
  const topic = extractTopic(metadata);
  
  // 1. Get 3 trending hashtags
  const trendingHashtags = randomItems(platformData.trending, 3);
  
  // 2. Get 3 niche hashtags (topic-specific or general)
  let nicheHashtags;
  if (topic && TOPIC_KEYWORDS[topic]) {
    nicheHashtags = randomItems(TOPIC_KEYWORDS[topic], 3);
  } else {
    // Get random niche hashtags
    const generalNiche = ['#tips', '#tricks', '#tutorial', '#guide', '#learn', '#education', '#viralcontent'];
    nicheHashtags = randomItems(generalNiche, 3);
  }
  
  // 3. Get 3 viral hashtags (boost for higher scores)
  let viralHashtags;
  if (viralScore >= 75) {
    // Use most viral hashtags for high scores
    viralHashtags = randomItems(VIRAL_HASHTAGS.slice(0, 5), 3);
  } else {
    viralHashtags = randomItems(VIRAL_HASHTAGS, 3);
  }
  
  // 4. Add branded hashtag
  const brandedHashtag = BRANDED_HASHTAG;
  
  // Combine all hashtags
  const allHashtags = [
    ...trendingHashtags,
    ...nicheHashtags,
    ...viralHashtags,
    brandedHashtag
  ];
  
  return {
    platform,
    topic: topic || 'general',
    viralScore,
    hashtags: {
      trending: trendingHashtags,
      niche: nicheHashtags,
      viral: viralHashtags,
      branded: [brandedHashtag],
      all: allHashtags
    },
    count: {
      total: allHashtags.length,
      trending: trendingHashtags.length,
      niche: nicheHashtags.length,
      viral: viralHashtags.length,
      branded: 1
    }
  };
}

/**
 * Generate hashtags in string format (ready to paste)
 * 
 * @param {Object} options - Options object
 * @returns {string} Hashtags as space-separated string
 */
function generateHashtagsString(options = {}) {
  const result = generateHashtags(options);
  return result.hashtags.all.join(' ');
}

/**
 * Generate platform-specific hashtag sets
 * 
 * @param {Object} options - Options object
 * @returns {Object} Hashtag sets for all platforms
 */
function generateMultiPlatformHashtags(options = {}) {
  const { metadata = {}, viralScore = 50 } = options;
  
  return {
    tiktok: generateHashtags({ ...options, platform: 'tiktok' }),
    instagram: generateHashtags({ ...options, platform: 'instagram' }),
    youtube: generateHashtags({ ...options, platform: 'youtube' }),
    facebook: generateHashtags({ ...options, platform: 'facebook' })
  };
}

/**
 * Get trending hashtags for a platform
 * 
 * @param {string} platform - Platform name
 * @param {number} count - Number of hashtags to return
 * @returns {Array} Trending hashtags
 */
function getTrendingHashtags(platform, count = 5) {
  const trending = TRENDING_HASHTAGS[platform] || TRENDING_HASHTAGS.tiktok;
  return randomItems(trending, count);
}

/**
 * Optimize hashtags based on engagement data
 * 
 * @param {Array} currentHashtags - Current hashtags
 * @param {number} engagement - Engagement score
 * @returns {Object} Optimized hashtags
 */
function optimizeHashtags(currentHashtags, engagement = 50) {
  // For high engagement, keep most hashtags
  // For low engagement, swap some for more viral ones
  
  if (engagement >= 70) {
    return {
      hashtags: currentHashtags,
      optimized: false,
      reason: 'High engagement - keeping current hashtags'
    };
  }
  
  // Replace some hashtags with more viral ones
  const optimized = [...currentHashtags];
  const viralCount = Math.floor(optimized.length * 0.3);
  
  for (let i = 0; i < viralCount; i++) {
    const replaceIndex = Math.floor(Math.random() * optimized.length);
    if (!optimized[replaceIndex].includes(BRANDED_HASHTAG)) {
      optimized[replaceIndex] = randomItem(VIRAL_HASHTAGS);
    }
  }
  
  return {
    hashtags: optimized,
    optimized: true,
    reason: `Replaced ${viralCount} hashtags with viral alternatives`
  };
}

/**
 * Get hashtag suggestions based on search
 * 
 * @param {string} query - Search query
 * @param {string} platform - Platform
 * @returns {Array} Suggested hashtags
 */
function getHashtagSuggestions(query, platform = 'tiktok') {
  const queryLower = query.toLowerCase();
  
  // Find matching topic
  for (const [topic, hashtags] of Object.entries(TOPIC_KEYWORDS)) {
    if (topic.includes(queryLower) || queryLower.includes(topic)) {
      return {
        topic,
        hashtags: hashtags.slice(0, 5),
        platform
      };
    }
  }
  
  // Return generic suggestions
  return {
    topic: 'general',
    hashtags: getTrendingHashtags(platform, 5),
    platform
  };
}

module.exports = {
  generateHashtags,
  generateHashtagsString,
  generateMultiPlatformHashtags,
  getTrendingHashtags,
  optimizeHashtags,
  getHashtagSuggestions,
  extractTopic,
  TRENDING_HASHTAGS,
  NICHE_HASHTAGS,
  VIRAL_HASHTAGS,
  BRANDED_HASHTAG,
  TOPIC_KEYWORDS,
  PLATFORM_HASHTAGS
};

