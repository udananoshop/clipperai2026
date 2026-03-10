/**
 * Music Mood Engine
 * Generate music profile for video clip based on content emotion
 */

const MOOD_KEYWORDS = {
  motivational: ['money', 'success', 'win', 'business', 'sukses', 'uang', 'duit', 'profit', 'growth', 'million', '富裕', '成功', '赚钱', 'business', 'entrepreneur'],
  emotional: ['sad', 'broken', 'loss', 'sedih', 'rusak', 'hilang', 'kecewa', 'pati', 'shed tears', 'heartbreak', '悲伤', '失败', '失落'],
  energetic: ['funny', 'crazy', 'wow', 'gila', 'lucu', 'kocak', 'heboh', 'viral', 'trending', '搞笑', '疯狂', '惊喜'],
  chill: ['calm', 'focus', 'study', 'tenang', 'fokus', 'belajar', 'edukasi', 'tutorial', 'pelajari', '学习', '安静', '专注']
};

const MUSIC_PROFILES = {
  motivational: {
    bpm: 120,
    energyLevel: 'high',
    genre: 'corporate_electro',
    transitionStyle: 'fast_cut',
    beatDropAt: 5
  },
  emotional: {
    bpm: 85,
    energyLevel: 'low',
    genre: 'piano_ambient',
    transitionStyle: 'smooth_fade',
    beatDropAt: 12
  },
  energetic: {
    bpm: 140,
    energyLevel: 'very_high',
    genre: 'trap_hype',
    transitionStyle: 'flash_cut',
    beatDropAt: 3
  },
  chill: {
    bpm: 95,
    energyLevel: 'medium_low',
    genre: 'lofi',
    transitionStyle: 'slow_zoom',
    beatDropAt: 8
  },
  neutral: {
    bpm: 100,
    energyLevel: 'medium',
    genre: 'minimal',
    transitionStyle: 'standard_cut',
    beatDropAt: 6
  }
};

const TRANSITION_HINTS = {
  motivational: ['zoom_in', 'quick_cut', 'beat_sync'],
  emotional: ['fade_black', 'slow_pan'],
  energetic: ['flash', 'shake', 'fast_zoom'],
  chill: ['blur_in', 'slow_zoom'],
  neutral: ['cut']
};

function detectMood(text = '') {
  if (!text) return 'neutral';
  
  const lowerText = text.toLowerCase();
  
  if (MOOD_KEYWORDS.motivational.some(kw => lowerText.includes(kw))) {
    return 'motivational';
  }
  
  if (MOOD_KEYWORDS.emotional.some(kw => lowerText.includes(kw))) {
    return 'emotional';
  }
  
  if (MOOD_KEYWORDS.energetic.some(kw => lowerText.includes(kw))) {
    return 'energetic';
  }
  
  if (MOOD_KEYWORDS.chill.some(kw => lowerText.includes(kw))) {
    return 'chill';
  }
  
  return 'neutral';
}

function generateMusicProfile(mood = 'neutral') {
  return MUSIC_PROFILES[mood] || MUSIC_PROFILES.neutral;
}

function generateTransitionHints(profile = {}) {
  const genre = profile.genre || 'minimal';
  
  if (genre.includes('corporate') || genre.includes('electro')) {
    return TRANSITION_HINTS.motivational;
  }
  
  if (genre.includes('piano') || genre.includes('ambient')) {
    return TRANSITION_HINTS.emotional;
  }
  
  if (genre.includes('trap') || genre.includes('hype')) {
    return TRANSITION_HINTS.energetic;
  }
  
  if (genre.includes('lofi')) {
    return TRANSITION_HINTS.chill;
  }
  
  return TRANSITION_HINTS.neutral;
}

function generateMusicIntelligence(text = '') {
  const mood = detectMood(text);
  const musicProfile = generateMusicProfile(mood);
  const transitions = generateTransitionHints(musicProfile);
  
  return {
    mood,
    musicProfile,
    transitions
  };
}

module.exports = {
  detectMood,
  generateMusicProfile,
  generateTransitionHints,
  generateMusicIntelligence,
  MOOD_KEYWORDS,
  MUSIC_PROFILES,
  TRANSITION_HINTS
};
