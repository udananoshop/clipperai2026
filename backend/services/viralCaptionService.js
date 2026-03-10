/**
 * Viral Caption Generator Service
 * AI-Powered Caption Generation for Multiple Platforms
 * 
 * Generates optimized captions for:
 * - YouTube Shorts
 * - TikTok
 * - Instagram Reels
 * 
 * Optimized for 8GB RAM - lightweight generation
 */

// ============================================================================
// VIRAL CAPTION TEMPLATES
// ============================================================================

const captionTemplates = {
  // YouTube Shorts captions
  youtube_shorts: {
    hooks: [
      "You won't believe this...",
      "This changed everything for me!",
      "Wait for it...",
      "Here's the truth about...",
      "POV: When you finally...",
      "Stop scrolling! This is important!",
      "I wish I knew this sooner!",
      "This is going viral for a reason!",
      "Full story below 👇",
      "Not clickbait - here's the proof!"
    ],
    bodies: [
      "This is absolutely mind-blowing. Save this for later!",
      "The secret nobody tells you about.",
      "This is the real deal. Don't sleep on it!",
      "Here's exactly what happened and why it matters.",
      "The algorithm is loving this content. Here's why:",
      "Breakdown incoming - this is worth your time.",
      "This went viral for good reason. Here's the inside story.",
      "The details that nobody is talking about."
    ],
    ctas: [
      "Follow for more! 🔥",
      "Like & subscribe!",
      "Drop a ❤️ if this helped!",
      "Share with someone who needs to see this!",
      "Comment your thoughts below!",
      "Turn on notifications! 🔔"
    ]
  },
  
  // TikTok captions
  tiktok: {
    hooks: [
      "Wait for the end 🔥",
      "POV: 🧠",
      "Reply to @user",
      "This hack changed my life ✨",
      "Nobody talks about this 😱",
      "3 things you need to know...",
      "FYP #fyp #viral",
      "Storytime! 📖",
      "Tutorial time! Let's go 🚀",
      "Unpopular opinion but..."
    ],
    bodies: [
      "Full video on my page! 👆",
      "Save this for later! 📌",
      "This took hours to make, please appreciate! 💯",
      "Not me spending 6 hours on this 😅",
      "The algorithm is wild for this one",
      "Wait until you see what happens next...",
      "This is your sign ☝️",
      "Replying to the comments!"
    ],
    ctas: [
      "Follow for more! 🫡",
      "Like 1000x for part 2! 💕",
      "Duet this! Let's gooo 🔥",
      "Share to your story! 📱",
      "Comment what you want next! 💬",
      "Turn on post notifications! 🔔"
    ]
  },
  
  // Instagram Reels captions
  instagram: {
    hooks: [
      "This is your sign ✨",
      "Save this for later! 📌",
      "The secret you've been looking for...",
      "POV: When the creativity hits just right",
      "Not me being vulnerable like this 😅",
      "Here's the truth... 💯",
      "Wait for it... 🤯",
      "This is your daily dose of inspiration!",
      "Storytime incoming... 📖",
      "Let's talk about it 👇"
    ],
    bodies: [
      "This content is worth your time, trust me!",
      "The algorithm is real for this one.",
      "Full story in the comments below.",
      "Save this so you don't forget!",
      "This is exactly what I needed to see today.",
      "The tea ☕ - let me spill",
      "This hit different, didn't it?",
      "Replying to all your comments!"
    ],
    ctas: [
      "Follow for daily content! ✨",
      "Double tap if you agree! ❤️",
      "Share with your bestie! 💕",
      "Turn on notifications! 🔔",
      "Save this post! 📌",
      "Comment your thoughts! 💬"
    ]
  }
};

// ============================================================================
// EMOTION WORDS
// ============================================================================

const emotionWords = {
  positive: ['amazing', 'incredible', 'unbelievable', 'awesome', 'fantastic', 'mind-blowing', 'inspiring', 'life-changing', 'game-changer', 'essential'],
  negative: ['shocking', 'unexpected', 'controversial', 'surprising', 'crazy', 'wild', 'insane', 'hard-to-believe'],
  urgent: ['immediately', 'now', 'today', 'hurry', 'limited', 'fast', 'quick', 'instant']
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
 * Capitalize first letter
 */
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Generate random emojis
 */
const randomEmojis = (count) => {
  const emojiSets = {
    tiktok: ['🔥', '✨', '💯', '💕', '😱', '🤯', '🚀', '💪', '🫡', '👀'],
    youtube: ['🔥', '❤️', '👍', '🔔', '📌', '💯', '✨', '👏', '🙌'],
    instagram: ['✨', '❤️', '💕', '🔥', '📌', '💯', '🙌', '👏', '🔔', '👆']
  };
  
  const emojis = emojiSets.youtube; // Default
  const selected = randomItems(emojis, count);
  return selected.join('');
};

// ============================================================================
// CAPTION GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate YouTube Shorts caption
 */
function generateYouTubeShortsCaption(options = {}) {
  const { includeEmojis = true, includeCTA = true, length = 'medium' } = options;
  
  const templates = captionTemplates.youtube_shorts;
  
  let hook = randomItem(templates.hooks);
  let body = randomItem(templates.bodies);
  let cta = includeCTA ? randomItem(templates.ctas) : '';
  
  // Add emojis if enabled
  if (includeEmojis) {
    hook = `${hook} ${randomEmojis(2)}`;
    body = `${body} ${randomEmojis(1)}`;
  }
  
  // Adjust length
  if (length === 'short') {
    body = body.split('.')[0] + '.';
  } else if (length === 'long') {
    body = `${body} ${randomItem(templates.bodies)}`;
  }
  
  const caption = includeCTA 
    ? `${hook}\n\n${body}\n\n${cta}`
    : `${hook}\n\n${body}`;
  
  return {
    platform: 'youtube_shorts',
    caption,
    hook,
    body,
    cta,
    suggestions: {
      hashtags: ['#Shorts', '#Viral', '#Trending', '#FYP'],
      keywords: hook.split(' ').filter(w => w.length > 3)
    }
  };
}

/**
 * Generate TikTok caption
 */
function generateTikTokCaption(options = {}) {
  const { includeEmojis = true, includeCTA = true, length = 'medium', fyp = true } = options;
  
  const templates = captionTemplates.tiktok;
  
  let hook = randomItem(templates.hooks);
  let body = randomItem(templates.bodies);
  let cta = includeCTA ? randomItem(templates.ctas) : '';
  
  // Add FYP if enabled
  if (fyp) {
    hook = `#FYP ${hook}`;
  }
  
  // Add emojis if enabled
  if (includeEmojis) {
    hook = `${hook} ${randomEmojis(2)}`;
    body = `${body} ${randomEmojis(1)}`;
  }
  
  // Adjust length
  if (length === 'short') {
    body = body.split('.')[0] + '.';
  } else if (length === 'long') {
    body = `${body} ${randomItem(templates.bodies)}`;
  }
  
  const caption = includeCTA 
    ? `${hook}\n\n${body}\n\n${cta}`
    : `${hook}\n\n${body}`;
  
  return {
    platform: 'tiktok',
    caption,
    hook,
    body,
    cta,
    suggestions: {
      hashtags: ['#FYP', '#foryou', '#viral', '#trending', '#foryoupage'],
      keywords: hook.split(' ').filter(w => w.length > 2 && !w.startsWith('#'))
    }
  };
}

/**
 * Generate Instagram Reels caption
 */
function generateInstagramCaption(options = {}) {
  const { includeEmojis = true, includeCTA = true, length = 'medium' } = options;
  
  const templates = captionTemplates.instagram;
  
  let hook = randomItem(templates.hooks);
  let body = randomItem(templates.bodies);
  let cta = includeCTA ? randomItem(templates.ctas) : '';
  
  // Add emojis if enabled
  if (includeEmojis) {
    hook = `${hook} ${randomEmojis(2)}`;
    body = `${body} ${randomEmojis(1)}`;
  }
  
  // Adjust length
  if (length === 'short') {
    body = body.split('.')[0] + '.';
  } else if (length === 'long') {
    body = `${body} ${randomItem(templates.bodies)}`;
  }
  
  const caption = includeCTA 
    ? `${hook}\n.\n.\n${body}\n.\n.\n${cta}`
    : `${hook}\n.\n.\n${body}`;
  
  return {
    platform: 'instagram',
    caption,
    hook,
    body,
    cta,
    suggestions: {
      hashtags: ['#Reels', '#Viral', '#Trending', '#ExplorePage', '#Instagram'],
      keywords: hook.split(' ').filter(w => w.length > 3)
    }
  };
}

/**
 * Generate multiple captions for different platforms
 */
function generateMultiPlatformCaptions(options = {}) {
  return {
    youtube_shorts: generateYouTubeShortsCaption(options),
    tiktok: generateTikTokCaption(options),
    instagram: generateInstagramCaption(options)
  };
}

/**
 * Generate custom caption based on topic
 */
function generateCustomCaption(topic, platform = 'tiktok', options = {}) {
  const { includeEmojis = true, includeCTA = true } = options;
  
  const templates = captionTemplates[platform] || captionTemplates.tiktok;
  
  // Generate topic-specific hook
  const hooks = [
    `This is everything about ${topic} you need to know!`,
    `The complete guide to ${topic} (2024)`,
    `${capitalize(topic)} explained in 60 seconds`,
    `Why ${topic} is trending right now`,
    `Everything I wish I knew about ${topic} earlier`,
    `The ${topic} tips nobody tells you`,
    `How to master ${topic} - complete guide`,
    `${topic} 101: Everything you need to know`
  ];
  
  let hook = randomItem(hooks);
  let body = randomItem(templates.bodies);
  let cta = includeCTA ? randomItem(templates.ctas) : '';
  
  // Add emojis if enabled
  if (includeEmojis) {
    hook = `${hook} ${randomEmojis(2)}`;
  }
  
  const caption = includeCTA 
    ? `${hook}\n\n${body}\n\n${cta}`
    : `${hook}\n\n${body}`;
  
  return {
    platform,
    topic,
    caption,
    hook,
    body,
    cta,
    suggestions: {
      hashtags: generateHashtagsForTopic(topic),
      keywords: [topic]
    }
  };
}

/**
 * Generate hashtags for a topic
 */
function generateHashtagsForTopic(topic) {
  const baseHashtags = [
    '#viral', '#trending', '#fyp', '#foryou', '#explore',
    '#viralvideo', '#trendingvideo', '#viralpost'
  ];
  
  // Add topic-based hashtags
  const topicHashtags = [
    `#${topic.replace(/\s+/g, '')}`,
    `#${topic.replace(/\s+/g, '')}Tips`,
    `#${topic.replace(/\s+/g, '')}2024`,
    `#${topic.replace(/\s+/g, '')}Tutorial`
  ];
  
  return [...topicHashtags, ...baseHashtags].slice(0, 10);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main generators
  generateYouTubeShortsCaption,
  generateTikTokCaption,
  generateInstagramCaption,
  generateMultiPlatformCaptions,
  generateCustomCaption,
  
  // Utility
  generateHashtagsForTopic,
  
  // Templates (for customization)
  captionTemplates,
  emotionWords
};

