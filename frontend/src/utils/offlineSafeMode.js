// ============================================
// OFFLINE SAFE MODE - ClipperAI2026
// Provides fallback data when APIs fail
// ============================================

import { LIGHT_MODE } from './apiSafeCall';

// ============================================
// OFFLINE STATE MANAGEMENT
// ============================================

let isOffline = false;
let lastOfflineTime = null;

export const getOfflineState = () => isOffline;
export const setOfflineState = (value) => {
  isOffline = value;
  if (value) {
    lastOfflineTime = new Date().toISOString();
  }
};
export const getLastOfflineTime = () => lastOfflineTime;

// ============================================
// OFFLINE BADGE COMPONENT
// ============================================

export const OfflineBadge = ({ show = true }) => {
  if (!show || !isOffline) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg backdrop-blur-sm">
      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
      <span className="text-xs font-medium text-amber-300">Offline Mode Active</span>
    </div>
  );
};

// ============================================
// PREDICTION FALLBACK
// ============================================

export const PREDICTION_FALLBACK = {
  score: 74,
  engagement: "High",
  improvementTips: [
    "Add a stronger hook in the first 3 seconds",
    "Include relevant hashtags for better reach",
    "Add a call-to-action at the end",
    "Optimize title for SEO",
    "Consider adding subtitles for accessibility"
  ],
  isOffline: true,
  timestamp: new Date().toISOString()
};

// ============================================
// RESEARCH FALLBACK (Heuristic Analysis)
// ============================================

export const getResearchFallback = (content = "") => {
  const wordCount = content?.split(/\s+/).filter(w => w).length || 0;
  const charCount = content?.length || 0;
  
  return {
    overallScore: 72,
    metrics: {
      hookStrength: Math.min(95, 60 + Math.floor(Math.random() * 20)),
      retention: Math.min(95, 65 + Math.floor(Math.random() * 20)),
      emotional: Math.min(95, 55 + Math.floor(Math.random() * 25)),
      shareability: Math.min(95, 70 + Math.floor(Math.random() * 20))
    },
    content: {
      mainTopic: 'Content Analysis',
      targetAudience: 'General',
      category: 'Trending',
      tone: 'Engaging',
      sentiment: 'Positive'
    },
    keywords: [
      { word: 'trending', density: 2 },
      { word: 'viral', density: 3 },
      { word: 'content', density: 2 }
    ],
    hashtags: ['#trending', '#viral', '#content', '#fyp'],
    suggestions: [
      { type: 'hook', text: 'Start with an attention-grabbing statement', category: 'Hook' },
      { type: 'cta', text: 'Add "Like and follow for more!"', category: 'CTA' },
      { type: 'title', text: 'Use numbers and power words in title', category: 'Title' }
    ],
    prediction: {
      reach: 75000,
      bestTime: '6:00 PM',
      platformRanking: [
        { platform: 'TikTok', score: 85 },
        { platform: 'YouTube Shorts', score: 80 },
        { platform: 'Instagram Reels', score: 75 }
      ]
    },
    meta: { wordCount, charCount, readingTime: Math.ceil(wordCount / 200) },
    isOffline: true,
    timestamp: new Date().toISOString()
  };
};

// ============================================
// TRENDING FALLBACK (Cached Mock Data)
// ============================================

export const TRENDING_FALLBACK = [
  { id: 1, title: 'This Amazing Trick Will Change Everything!', channelTitle: 'Tech Creator', viewCount: 1500000, likeCount: 85000, category: 'Technology', viralScore: 85 },
  { id: 2, title: "You Won't Believe What Happened Next", channelTitle: 'Viral Trends', viewCount: 980000, likeCount: 62000, category: 'Entertainment', viralScore: 78 },
  { id: 3, title: 'The Secret Nobody Tells You', channelTitle: 'Life Hacks', viewCount: 750000, likeCount: 45000, category: 'Lifestyle', viralScore: 72 },
  { id: 4, title: '10 Things Experts Want You To Know', channelTitle: 'Knowledge Hub', viewCount: 620000, likeCount: 38000, category: 'Education', viralScore: 68 },
  { id: 5, title: 'How I Made $10K in One Month', channelTitle: 'Money Tips', viewCount: 540000, likeCount: 32000, category: 'Business', viralScore: 75 },
  { id: 6, title: 'Ultimate Setup Tour 2024', channelTitle: 'Gamer Pro', viewCount: 890000, likeCount: 55000, category: 'Gaming', viralScore: 82 }
];

export const TRENDING_ANALYTICS_FALLBACK = {
  totalViews: 4500000,
  averageViews: 890000,
  engagement: '12.5%',
  topCategory: 'Technology',
  trendingTitles: ['Amazing trick', 'Secret revealed', 'Money tips', 'Life hack', 'Tutorial'],
  isOffline: true,
  timestamp: new Date().toISOString()
};

// ============================================
// SAFE API WRAPPER WITH OFFLINE FALLBACK
// ============================================

export async function safeCallWithOffline(fn, fallbackData, setState = null) {
  try {
    if (setState) {
      setState(prev => ({ ...prev, loading: true, error: null, isOffline: false }));
    }
    const result = await fn();
    setOfflineState(false);
    if (setState) {
      setState(prev => ({ ...prev, loading: false, data: result, isOffline: false }));
    }
    return result;
  } catch (err) {
    console.warn('API failed, using offline fallback:', err.message);
    setOfflineState(true);
    if (setState) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        data: fallbackData, 
        error: null, 
        isOffline: true 
      }));
    }
    return fallbackData;
  }
}

// ============================================
// LIGHT MODE AWARE STYLES
// ============================================

export const offlineStyles = LIGHT_MODE ? {
  animation: 'none',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  backdropFilter: 'none',
} : {
  animation: 'allowed',
  boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
  backdropFilter: 'blur(20px)',
};

export default {
  getOfflineState,
  setOfflineState,
  OfflineBadge,
  PREDICTION_FALLBACK,
  getResearchFallback,
  TRENDING_FALLBACK,
  TRENDING_ANALYTICS_FALLBACK,
  safeCallWithOffline,
  offlineStyles
};
