/**
 * Content Factory Service
 * Overlord AI Core - Content Generation Engine
 * 
 * Generates content ideas, captions, hashtags, and scripts
 * Optimized for 8GB RAM - uses existing services
 */

// Lazy-loaded dependencies
let analyticsService = null;
let viralPredictionService = null;
let growthStrategyService = null;
let hashtagService = null;

const getAnalyticsService = () => {
  if (!analyticsService) {
    try { analyticsService = require('./analyticsService'); } catch (e) {}
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try { viralPredictionService = require('./viralPredictionService'); } catch (e) {}
  }
  return viralPredictionService;
};

const getGrowthStrategyService = () => {
  if (!growthStrategyService) {
    try { growthStrategyService = require('./growthStrategyService'); } catch (e) {}
  }
  return growthStrategyService;
};

const getHashtagService = () => {
  if (!hashtagService) {
    try { hashtagService = require('./hashtagService'); } catch (e) {}
  }
  return hashtagService;
};

// ============================================================================
// CACHE - 60 second TTL for RAM optimization
// ============================================================================
const CACHE_TTL = 60000;
const contentCache = {
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
// CONTENT IDEA GENERATION
// ============================================================================

/**
 * Generate video content ideas
 * @param {number} count - Number of ideas to generate
 * @param {string} language - Language preference
 */
async function generateContentIdeas(count = 10, language = 'en') {
  const cacheKey = `ideas_${count}_${language}`;
  const cached = contentCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get viral prediction data to inform ideas
    const viralService = getViralPredictionService();
    const strategyService = getGrowthStrategyService();
    
    let viralData = null;
    let strategyData = null;

    try {
      viralData = await viralService?.predictViralPotential();
    } catch (e) {}

    try {
      strategyData = await strategyService?.generateGrowthStrategy(language);
    } catch (e) {}

    // Generate ideas based on trends
    const ideas = generateIdeasBasedOnTrends(count, language, viralData, strategyData);

    const result = {
      ideas,
      count: ideas.length,
      basedOn: {
        viralPrediction: viralData?.viralProbability || 'N/A',
        recommendedFormat: strategyData?.recommendedContentType || 'Short Clip'
      },
      timestamp: new Date().toISOString()
    };

    contentCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentFactory] Generate ideas error:', error.message);
    return generateDefaultIdeas(count, language);
  }
}

/**
 * Generate ideas based on trends
 */
function generateIdeasBasedOnTrends(count, language, viralData, strategyData) {
  const niches = [
    'AI Tools & Technology',
    'Productivity Tips',
    'Life Hacks',
    'Business & Marketing',
    'Social Media Growth',
    'Tutorial & How-To',
    'Behind the Scenes',
    'Q&A Sessions',
    'Product Reviews',
    'Trending Topics'
  ];

  const hooks = {
    en: [
      'This changed everything...',
      'You need to see this!',
      'Nobody talks about this...',
      'The secret revealed...',
      'Stop doing this!',
      'How to (in 2024)',
      'This is wild...',
      'Game changer alert!',
      'You\'ll never guess...',
      'The truth about...'
    ],
    id: [
      'Ini mengubah segalanya...',
      'Kamu harus lihat ini!',
      'Tak ada yang bicara tentang ini...',
      'Rahasia terungkap...',
      'Berhenti melakukan ini!',
      'Cara (di 2024)',
      'Ini gila...',
      'Peringatan perubahan game!',
      'Kamu tidak akan pernah menebak...',
      'Fakta tentang...'
    ]
  };

  const templates = {
    en: [
      '{hook} {niche} that will blow your mind',
      'How I mastered {niche} in 30 days',
      '{niche} tips nobody tells you',
      'The ultimate {niche} guide',
      '{niche} mistake that costs you followers',
      'Why {niche} is trending in 2024',
      '{niche} vs traditional methods - which is better?',
      'I tried {niche} for a week - here\'s what happened',
      '5 {niche} strategies that actually work',
      'The {niche} algorithm explained'
    ],
    id: [
      '{hook} {niche} yang akan membuatmu terkejut',
      'Bagaimana saya menguasai {niche} dalam 30 hari',
      'Tips {niche} yang tak told anyone',
      'Panduan utama {niche}',
      'Kesalahan {niche} yang membuatmu kehilangan followers',
      'Mengapa {niche} trending di 2024',
      '{niche} vs metode tradisional - mana yang lebih baik?',
      'Saya mencoba {niche} selama seminggu - inilah yang terjadi',
      '5 strategi {niche} yang benar-benar bekerja',
      'Algoritma {niche} dijelaskan'
    ]
  };

  const lang = language === 'id' ? 'id' : 'en';
  const ideas = [];

  for (let i = 0; i < count; i++) {
    const niche = niches[Math.floor(Math.random() * niches.length)];
    const hook = hooks[lang][Math.floor(Math.random() * hooks[lang].length)];
    let template = templates[lang][Math.floor(Math.random() * templates[lang].length)];
    
    template = template.replace('{hook}', hook).replace('{niche}', niche);

    ideas.push({
      id: i + 1,
      title: template,
      niche,
      hook,
      platforms: ['youtube', 'tiktok', 'instagram'].slice(0, Math.floor(Math.random() * 3) + 1)
    });
  }

  return ideas;
}

/**
 * Generate default ideas when services fail
 */
function generateDefaultIdeas(count, language) {
  const defaultIdeas = [
    { id: 1, title: '10 AI Tools That Will Change Your Life', niche: 'AI Tools' },
    { id: 2, title: 'How to Grow Your Channel Fast', niche: 'Growth' },
    { id: 3, title: 'Behind the Scenes of Content Creation', niche: 'BTS' },
    { id: 4, title: 'Productivity Tips for Creators', niche: 'Productivity' },
    { id: 5, title: 'Q&A: Answering Your Questions', niche: 'Q&A' }
  ];
  
  return defaultIdeas.slice(0, count).map((idea, i) => ({
    ...idea,
    id: i + 1,
    platforms: ['youtube', 'tiktok', 'instagram']
  }));
}

// ============================================================================
// CAPTION GENERATION
// ============================================================================

/**
 * Generate viral caption
 * @param {string} style - Caption style (viral, default, professional)
 * @param {string} language - Language preference
 */
async function generateCaption(style = 'viral', language = 'en') {
  const cacheKey = `caption_${style}_${language}`;
  const cached = contentCache.get(cacheKey);
  if (cached) return cached;

  try {
    const templates = getCaptionTemplates(style, language);
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const result = {
      caption: selectedTemplate,
      style,
      length: selectedTemplate.length,
      hashtags: await generateHashtags(5, language),
      timestamp: new Date().toISOString()
    };

    contentCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentFactory] Generate caption error:', error.message);
    return {
      caption: 'Check out this amazing content! #viral #trending',
      style,
      hashtags: ['#viral', '#trending'],
      error: error.message
    };
  }
}

/**
 * Get caption templates by style
 */
function getCaptionTemplates(style, language) {
  const templates = {
    viral: {
      en: [
        '🔥 This is INSANE! You need to see this!\n\nDouble tap if you agree! 💪\n\n#viral #trending #mustwatch',
        'POV: When you discover this secret... 🤯\n\nTag someone who needs to see this!\n\n#viral #trending #pov',
        'Wait for the end... 🎬\n\nThis changed everything for me!\n\n#viral #mustwatch #trending',
        'Drop a "🔥" if you learned something new!\n\nShare with your friends!\n\n#viral #education #trending'
      ],
      id: {
        0: '🔥 Ini GILA! Kamu harus lihat ini!\n\n_DOUBLE TAP_ kalau setuju! 💪\n\n#viral #trending #wajibnonton',
        1: 'POV: Saat kamu menemukan rahasia ini... 🤯\n\n_Tag_ seseorang yang perlu melihat ini!\n\n#viral #trending #pov',
        2: 'Tunggu sampai akhir... 🎬\n\nIni mengubah segalanya untukku!\n\n#viral #wajibnonton #trending',
        3: 'Drop "🔥" kalau kamu belajar sesuatu yang baru!\n\n_Bagi_ ke temanmu!\n\n#viral #edukasi #trending'
      }
    },
    default: {
      en: [
        'Check out this content! Let me know what you think in the comments.\n\n#content #video #creator',
        'Here\'s a new video for you. Hope you enjoy it!\n\n#newvideo #content',
        'Content drop! 🎬 What do you want to see next?\n\n#content #community'
      ],
      id: [
        'Lihat konten ini! Beri tahu pendapatmu di kolom komentar.\n\n#konten #video #creator',
        'Ini video baru untukmu. Hope you enjoy it!\n\n#video baru #konten',
        'Konten baru! 🎬 Apa yang ingin kamu lihat selanjutnya?\n\n#konten #komunitas'
      ]
    },
    professional: {
      en: [
        'In this video, we explore the topic of [TOPIC]. Let me know your thoughts below.\n\n#education #tutorial #learning',
        'Welcome back! Today\'s video covers [TOPIC]. Don\'t forget to like and subscribe!\n\n#content #educational',
        'Deep dive into [TOPIC]. What are your experiences? Share in the comments.\n\n#insights #knowledge'
      ],
      id: [
        'Dalam video ini, kita akan mengeksplorasi topik [TOPIK]. Beri tahu pendapatmu di bawah.\n\n#edukasi #tutorial #belajar',
        'Selamat datang kembali! Video hari ini mencakup [TOPIK]. Jangan lupa like dan subscribe!\n\n#konten #edukatif',
        'Mendalami [TOPIK]. Apa pengalamanmu? _Share_ di kolom komentar.\n\n#wawasan #pengetahuan'
      ]
    }
  };

  const lang = language === 'id' ? 'id' : 'en';
  return templates[style]?.[lang] || templates.default[lang];
}

// ============================================================================
// HASHTAG GENERATION
// ============================================================================

/**
 * Generate hashtags
 * @param {number} count - Number of hashtags
 * @param {string} language - Language preference
 */
async function generateHashtags(count = 15, language = 'en') {
  const cacheKey = `hashtags_${count}_${language}`;
  const cached = contentCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Try to use the hashtag service
    const hashtagSvc = getHashtagService();
    if (hashtagSvc) {
      const hashtags = await hashtagSvc.generateHashtags('', 'youtube', language);
      const result = hashtags.slice(0, count);
      contentCache.set(cacheKey, result);
      return result;
    }
  } catch (e) {
    console.log('[ContentFactory] Hashtag service unavailable, using fallback');
  }

  // Fallback hashtags
  const fallback = getFallbackHashtags(count, language);
  contentCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Get fallback hashtags
 */
function getFallbackHashtags(count, language) {
  const hashtags = {
    en: [
      '#viral', '#trending', '#youtube', '#tiktok', '#instagram',
      '#content', '#creator', '#video', '#fyp', '#foryou',
      '#shorts', '#reels', '#viralvideo', '#trendingnow', '#explore'
    ],
    id: [
      '#viral', '#trending', '#youtube', '#tiktok', '#instagram',
      '#konten', '#creator', '#video', '#fyp', '#foryou',
      '#shorts', '#reels', '#videoviral', '#trending', '#eksplor'
    ]
  };

  const lang = language === 'id' ? 'id' : 'en';
  return hashtags[lang].slice(0, count);
}

// ============================================================================
// SCRIPT GENERATION
// ============================================================================

/**
 * Generate video script
 * @param {string} topic - Video topic
 * @param {number} duration - Duration in seconds
 * @param {string} language - Language preference
 */
async function generateScript(topic = 'general', duration = 60, language = 'en') {
  const cacheKey = `script_${topic}_${duration}_${language}`;
  const cached = contentCache.get(cacheKey);
  if (cached) return cached;

  try {
    const script = generateScriptContent(topic, duration, language);
    
    const result = {
      script,
      topic,
      duration,
      estimatedDuration: calculateDuration(script),
      timestamp: new Date().toISOString()
    };

    contentCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ContentFactory] Generate script error:', error.message);
    return {
      script: 'Welcome to my channel! Today we will discuss ' + topic,
      topic,
      error: error.message
    };
  }
}

/**
 * Generate script content
 */
function generateScriptContent(topic, duration, language) {
  const lang = language === 'id' ? 'id' : 'en';
  
  const openings = {
    en: [
      "Hey everyone! Welcome back to the channel.",
      "What's up everyone! So excited to have you here.",
      "Hello everyone! Let's dive into today's topic.",
      "Hey guys! Ready to learn something new today?"
    ],
    id: [
      'Hey semuanya! Selamat datang di channel.',
      'Apa kabar semuanya! Senang bisa hadir di sini.',
      'Hello semuanya! Mari kita masuk ke topik hari ini.',
      'Hey guys! Siap belajar sesuatu yang baru hari ini?'
    ]
  };

  const transitions = {
    en: [
      "Now, let's talk about...",
      "So here's the thing...",
      "Here's what you need to know...",
      "Let me break this down for you..."
    ],
    id: [
      'Sekarang, mari kita bahas...',
      'Jadi begini nih...',
      'Ini yang perlu kamu tahu...',
      'Biar aku jelaskan...'
    ]
  };

  const closings = {
    en: [
      "That's it for today! Don't forget to like and subscribe!",
      "Thanks for watching! See you in the next one!",
      "If you enjoyed this, drop a like and share it!",
      "Let me know in the comments what you think!"
    ],
    id: [
      'Sekian untuk hari ini! Jangan lupa like dan subscribe!',
      'Terima kasih sudah menonton! Sampai jumpa di video berikutnya!',
      'Kalau suka, berikan like dan share ya!',
      'Beri tahu aku di kolom komentar pendapatmu!'
    ]
  };

  const opening = openings[lang][Math.floor(Math.random() * openings[lang].length)];
  const transition = transitions[lang][Math.floor(Math.random() * transitions[lang].length)];
  const closing = closings[lang][Math.floor(Math.random() * closings[lang].length)];

  // Generate main content based on duration
  const mainPoints = Math.ceil(duration / 15); // Approximate 15 seconds per point
  let mainContent = '';
  
  const contentTemplates = {
    en: [
      `${topic} is really important because it helps you grow your audience.`,
      `The first thing you need to know about ${topic} is...`,
      `Here's a tip: consistency is key when it comes to ${topic}.`,
      `Many people get this wrong about ${topic}, but actually...`,
      `The best strategy for ${topic} is to focus on quality.`
    ],
    id: [
      `${topic} sangat penting karena membantu kamu menambah audience.`,
      `Hal pertama yang perlu kamu tahu tentang ${topic} adalah...`,
      `Tips: konsistensi adalah kunci dalam ${topic}.`,
      `Banyak orang salah tentang ${topic}, tapi sebenarnya...`,
      `Strategi terbaik untuk ${topic} adalah fokus pada kualitas.`
    ]
  };

  for (let i = 0; i < mainPoints; i++) {
    const template = contentTemplates[lang][Math.floor(Math.random() * contentTemplates[lang].length)];
    mainContent += `\n\nPoint ${i + 1}: ${template}`;
  }

  return `${opening}\n\n${transition}\n\n${mainContent}\n\n${closing}`;
}

/**
 * Calculate estimated duration of script
 */
function calculateDuration(script) {
  const wordsPerMinute = 150; // Average speaking rate
  const wordCount = script.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute * 60);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateContentIdeas,
  generateCaption,
  generateHashtags,
  generateScript,
  contentCache
};

