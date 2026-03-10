/**
 * AI CAPTION GENERATOR
 * Generates optimized captions for multiple platforms
 * 
 * Platform-specific length limits:
 * - TikTok: 150 characters
 * - Instagram: 300 characters
 * - YouTube Shorts: 200 characters
 * - Facebook: 250 characters
 * 
 * Includes:
 * - Hook
 * - Emotion trigger
 * - Engagement question
 */

const viralScoreEngine = require('./viralScoreEngine');

// Caption length limits per platform
const PLATFORM_LIMITS = {
  tiktok: 150,
  instagram: 300,
  youtube: 200,
  facebook: 250
};

// Hook templates
const HOOK_TEMPLATES = {
  tiktok: [
    "Wait for the end 🔥",
    "POV: 🧠",
    "Reply to @user",
    "This hack changed my life ✨",
    "Nobody talks about this 😱",
    "3 things you need to know...",
    "FYP #fyp #viral",
    "Storytime! 📖",
    "Tutorial time! Let's go 🚀",
    "Unpopular opinion but...",
    "This is your sign ☝️",
    "Don't scroll past this! ⚠️",
    "I had to share this 💯",
    "Saving this for later 📌"
  ],
  instagram: [
    "This is your sign ✨",
    "Save this for later! 📌",
    "The secret you've been looking for...",
    "POV: When the creativity hits just right",
    "Not me being vulnerable like this 😅",
    "Here's the truth... 💯",
    "Wait for it... 🤯",
    "This is your daily dose of inspiration!",
    "Storytime incoming... 📖",
    "Let's talk about it 👇",
    "You needed to see this 💜",
    "Replying to comments! 💬"
  ],
  youtube: [
    "You won't believe this...",
    "This changed everything for me!",
    "Wait for it...",
    "Here's the truth about...",
    "POV: When you finally...",
    "Stop scrolling! This is important!",
    "I wish I knew this sooner!",
    "This is going viral for a reason!",
    "Full story below 👇",
    "Not clickbait - here's the proof!",
    "The algorithm is loving this! 🔥"
  ],
  facebook: [
    "You need to see this! 👀",
    "This is blowing up! 🔥",
    "Everyone is talking about this!",
    "This changed my perspective!",
    "Read until the end! 📖",
    "This is a must-watch! 🎬",
    "The truth revealed! 💯",
    "Don't miss this! ⚠️",
    "Viral for a reason! 🚀",
    "Save and share! 📌"
  ]
};

// Emotion triggers
const EMOTION_TRIGGERS = {
  positive: [
    "This is absolutely mind-blowing!",
    "Life-changing content right here!",
    "This made my day! ☀️",
    "Pure gold content! 💯",
    "This is everything! ✨",
    "Saving this forever! 💕",
    "This hits different! ❤️",
    "Absolute fire! 🔥"
  ],
  negative: [
    "This is shocking! 😱",
    "I can't believe this! 🤯",
    "This caught me off guard!",
    "Wait, what?! 😳",
    "This is wild! 🐺",
    "I was NOT expecting that!",
    "My mind is blown! 💥",
    "This is intense! ⚡"
  ],
  urgent: [
    "You need to see this NOW! ⏰",
    "Time-sensitive content! ⚠️",
    "Limited time only! 🕐",
    "This is going fast! 🚀",
    "Don't sleep on this! 💤",
    "Watch before it's gone! 📱",
    "Act fast! 🎯",
    "Hurry up! ⏳"
  ],
  curiosity: [
    "The secret nobody tells you about...",
    "Here's what really happened...",
    "The truth behind this...",
    "This changes everything...",
    "You won't believe your eyes...",
    "The real story is different...",
    "This is the inside scoop...",
    "What they don't want you to know..."
  ]
};

// Engagement questions
const ENGAGEMENT_QUESTIONS = {
  tiktok: [
    "Follow for more! 🫡",
    "Like 1000x for part 2! 💕",
    "Duet this! Let's gooo 🔥",
    "Share to your story! 📱",
    "Comment what you want next! 💬",
    "Turn on post notifications! 🔔",
    "Tag someone who needs to see this! 🏷️",
    "Save this for later! 📌"
  ],
  instagram: [
    "Follow for daily content! ✨",
    "Double tap if you agree! ❤️",
    "Share with your bestie! 💕",
    "Turn on notifications! 🔔",
    "Save this post! 📌",
    "Comment your thoughts! 💬",
    "Tag a friend! 👯",
    "Like & save! 💜"
  ],
  youtube: [
    "Follow for more! 🔥",
    "Like & subscribe! 👍",
    "Drop a ❤️ if this helped!",
    "Share with someone who needs to see this!",
    "Comment your thoughts below!",
    "Turn on notifications! 🔔",
    "Subscribe for more viral content!",
    "Like if you agree! 💯"
  ],
  facebook: [
    "Like if you agree! 👍",
    "Share with friends! 📤",
    "Comment your thoughts! 💬",
    "Tag someone who needs to see this!",
    "Follow for more! 🔥",
    "Save this for later! 📌",
    "Like and share! ❤️",
    "Join the conversation! 💭"
  ]
};

// Utility functions
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomEmojis(count, platform = 'tiktok') {
  const emojiSets = {
    tiktok: ['🔥', '✨', '💯', '💕', '😱', '🤯', '🚀', '💪', '🫡', '👀'],
    youtube: ['🔥', '❤️', '👍', '🔔', '📌', '💯', '✨', '👏', '🙌'],
    instagram: ['✨', '❤️', '💕', '🔥', '📌', '💯', '🙌', '👏', '🔔', '👆'],
    facebook: ['🔥', '👍', '❤️', '📌', '💯', '👏', '🙌', '✨']
  };
  
  const emojis = emojiSets[platform] || emojiSets.youtube;
  const selected = randomItems(emojis, count);
  return selected.join('');
}

// Detect emotion type based on viral score
function getEmotionType(viralScore) {
  if (viralScore >= 80) return 'urgent';
  if (viralScore >= 65) return 'negative';
  if (viralScore >= 50) return 'curiosity';
  return 'positive';
}

// Generate caption for specific platform
function generateCaption(options = {}) {
  const {
    platform = 'tiktok',
    viralScore = 50,
    includeHook = true,
    includeEmotion = true,
    includeCTA = true,
    customTopic = null
  } = options;
  
  // Get platform limits
  const maxLength = PLATFORM_LIMITS[platform] || 150;
  
  // Get platform templates
  const hooks = HOOK_TEMPLATES[platform] || HOOK_TEMPLATES.tiktok;
  const emotionType = getEmotionType(viralScore);
  const emotions = EMOTION_TRIGGERS[emotionType] || EMOTION_TRIGGERS.positive;
  const ctas = ENGAGEMENT_QUESTIONS[platform] || ENGAGEMENT_TEMPLATES.tiktok;
  
  // Build caption parts
  let hook = includeHook ? randomItem(hooks) : '';
  let emotion = includeEmotion ? randomItem(emotions) : '';
  let cta = includeCTA ? randomItem(ctas) : '';
  
  // Add topic-based hook if provided
  if (customTopic) {
    const topicHooks = [
      `Everything about ${customTopic} you need to know!`,
      `The complete guide to ${customTopic}!`,
      `${customTopic} explained in 60 seconds!`,
      `Why ${customTopic} is trending right now!`,
      `All about ${customTopic} - viral compilation!`
    ];
    if (includeHook) {
      hook = randomItem(topicHooks);
    }
  }
  
  // Add emojis based on viral score
  if (viralScore >= 70) {
    hook = `${hook} ${randomEmojis(2, platform)}`;
    emotion = `${emotion} ${randomEmojis(1, platform)}`;
  }
  
  // Combine caption based on platform format
  let caption = '';
  let remainingLength = maxLength;
  
  if (platform === 'instagram') {
    // Instagram format: hook → dots → body → dots → CTA
    caption = `${hook}\n.\n.\n${emotion}\n.\n.\n${cta}`;
  } else if (platform === 'youtube') {
    // YouTube format: hook → body → CTA → hashtags
    const hashtags = ['#Shorts', '#Viral', '#Trending'].map(t => ` ${t}`).join('');
    caption = `${hook}\n\n${emotion}\n\n${cta}${hashtags}`;
  } else {
    // TikTok/Facebook format: hook → body → CTA
    caption = `${hook}\n\n${emotion}\n\n${cta}`;
  }
  
  // Truncate if exceeds limit
  if (caption.length > maxLength) {
    // Try to fit within limit by removing parts
    const maxHookLength = Math.floor(maxLength * 0.3);
    const maxEmotionLength = Math.floor(maxLength * 0.4);
    const maxCTALength = maxLength - maxHookLength - maxEmotionLength - 4; // 4 for newlines
    
    hook = hook.substring(0, maxHookLength - 3) + '...';
    emotion = emotion.substring(0, maxEmotionLength - 3) + '...';
    cta = cta.substring(0, maxCTALength - 3) + '...';
    
    if (platform === 'instagram') {
      caption = `${hook}\n.\n.\n${emotion}\n.\n.\n${cta}`;
    } else {
      caption = `${hook}\n\n${emotion}\n\n${cta}`;
    }
  }
  
  // Generate suggestions
  const suggestions = {
    hashtags: generateHashtags(platform, customTopic),
    keywords: extractKeywords(hook + ' ' + emotion),
    nextPart: `Part ${Math.floor(Math.random() * 5) + 2} incoming...`
  };
  
  return {
    platform,
    caption,
    length: caption.length,
    maxLength,
    hook: hook.replace(/\n/g, ' '),
    emotion: emotion.replace(/\n/g, ' '),
    cta: cta.replace(/\n/g, ' '),
    emotionType,
    suggestions
  };
}

// Generate hashtags for platform
function generateHashtags(platform, topic = null) {
  const baseHashtags = {
    tiktok: ['#FYP', '#foryou', '#viral', '#trending', '#foryoupage', '#explore', '#viralvideo'],
    instagram: ['#Reels', '#Viral', '#Trending', '#ExplorePage', '#Instagram', '#viralreels'],
    youtube: ['#Shorts', '#Viral', '#Trending', '#FYP', '#youtubeshorts'],
    facebook: ['#Reels', '#Viral', '#Trending', '#FacebookReels', '#viralvideo']
  };
  
  let hashtags = [...(baseHashtags[platform] || baseHashtags.tiktok)];
  
  // Add topic-based hashtag if provided
  if (topic) {
    const topicTag = `#${topic.replace(/\s+/g, '')}`;
    hashtags.unshift(topicTag);
  }
  
  return hashtags.slice(0, 8);
}

// Extract keywords from text
function extractKeywords(text = '') {
  if (!text) return [];
  
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleaned.split(' ')
    .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'were', 'they', 'their'].includes(w));
  
  return [...new Set(words)].slice(0, 5);
}

/**
 * Generate captions for all platforms
 */
function generateMultiPlatformCaptions(options = {}) {
  const { viralScore = 50, customTopic = null } = options;
  
  return {
    tiktok: generateCaption({ ...options, platform: 'tiktok' }),
    instagram: generateCaption({ ...options, platform: 'instagram' }),
    youtube: generateCaption({ ...options, platform: 'youtube' }),
    facebook: generateCaption({ ...options, platform: 'facebook' })
  };
}

/**
 * Get caption preview with character count
 */
function getCaptionPreview(options = {}) {
  const { platform = 'tiktok', viralScore = 50 } = options;
  const caption = generateCaption({ ...options, platform });
  
  return {
    platform,
    preview: caption.caption,
    characterCount: caption.length,
    characterLimit: caption.maxLength,
    isWithinLimit: caption.length <= caption.maxLength,
    remainingChars: caption.maxLength - caption.length
  };
}

/**
 * Optimize caption for engagement
 */
function optimizeForEngagement(caption, platform) {
  const maxLength = PLATFORM_LIMITS[platform] || 150;
  const viralScore = 70; // Default high engagement
  
  // Add more engaging elements
  let optimized = caption;
  
  // Add urgency for high engagement
  if (viralScore >= 75 && !optimized.includes('🔥')) {
    optimized = `🔥 ${optimized}`;
  }
  
  // Add question for engagement
  if (!optimized.includes('?')) {
    optimized = `${optimized} What's your take?`;
  }
  
  // Truncate if needed
  if (optimized.length > maxLength) {
    optimized = optimized.substring(0, maxLength - 3) + '...';
  }
  
  return optimized;
}

module.exports = {
  generateCaption,
  generateMultiPlatformCaptions,
  getCaptionPreview,
  optimizeForEngagement,
  generateHashtags,
  extractKeywords,
  PLATFORM_LIMITS,
  HOOK_TEMPLATES,
  EMOTION_TRIGGERS,
  ENGAGEMENT_QUESTIONS
};

