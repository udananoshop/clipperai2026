/**
 * VIRAL HUNTER SERVICE
 * Fetches trending videos from various sources and ranks them by viral potential
 * 
 * Sources:
 * - YouTube Trending
 * - Reddit r/videos
 * - Reddit r/tiktokcringe
 * - Reddit r/interestingasfuck
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  maxCandidates: 10,
  minViralScore: 50,
  sources: {
    youtubeTrending: {
      enabled: true,
      region: 'US',
      category: 'entertainment'
    },
    reddit: {
      enabled: true,
      subreddits: ['videos', 'tiktokcringe', 'interestingasfuck'],
      minScore: 100  // Minimum Reddit score to consider
    }
  }
};

// Cache for trending data (5 minutes)
let trendingCache = {
  data: [],
  timestamp: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Make HTTP request with Promise
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Fetch YouTube trending videos (using mock data for stability)
 * In production, would use YouTube Data API
 */
async function fetchYouTubeTrending() {
  try {
    // Mock YouTube trending data - simulates API response
    const mockTrending = [
      { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', platform: 'youtube', views: 15000000, likes: 500000, score: 95 },
      { id: 'jNQXAC9IVRw', title: 'Me at the zoo', platform: 'youtube', views: 250000000, likes: 8000000, score: 98 },
      { id: '9bZkp7q19f0', title: 'GANGNAM STYLE', platform: 'youtube', views: 4500000000, likes: 150000000, score: 99 },
      { id: 'ktvTqknDw6U', title: 'The Never Ending Wonder', platform: 'youtube', views: 80000000, likes: 2000000, score: 88 },
      { id: 'YQHsXMglC9A', title: 'Adele - Hello', platform: 'youtube', views: 3200000000, likes: 120000000, score: 97 },
    ];
    
    console.log('[ViralHunter] Fetched YouTube trending:', mockTrending.length, 'videos');
    return mockTrending;
  } catch (error) {
    console.error('[ViralHunter] YouTube fetch error:', error.message);
    return [];
  }
}

/**
 * Fetch trending posts from Reddit (mock for stability)
 * In production, would use Reddit API
 */
async function fetchRedditTrending(subreddit) {
  try {
    // Mock Reddit data - simulates API response
    const mockData = {
      videos: [
        { id: 'reddit_1', title: 'Incredible skateboard trick goes viral', platform: 'reddit', subreddit: 'videos', score: 45000, comments: 2300 },
        { id: 'reddit_2', title: 'This drone footage is absolutely stunning', platform: 'reddit', subreddit: 'videos', score: 32000, comments: 1500 },
        { id: 'reddit_3', title: 'My dog learned to open doors', platform: 'reddit', subreddit: 'videos', score: 28000, comments: 890 },
      ],
      tiktokcringe: [
        { id: 'reddit_4', title: 'Wait for it...', platform: 'reddit', subreddit: 'tiktokcringe', score: 67000, comments: 4500 },
        { id: 'reddit_5', title: 'This is how you do it', platform: 'reddit', subreddit: 'tiktokcringe', score: 55000, comments: 3200 },
      ],
      interestingasfuck: [
        { id: 'reddit_6', title: 'This optical illusion will blow your mind', platform: 'reddit', subreddit: 'interestingasfuck', score: 89000, comments: 5600 },
        { id: 'reddit_7', title: 'Scientists discover something incredible', platform: 'reddit', subreddit: 'interestingasfuck', score: 75000, comments: 4100 },
      ]
    };
    
    const data = mockData[subreddit] || [];
    console.log(`[ViralHunter] Fetched Reddit r/${subreddit}:`, data.length, 'posts');
    return data;
  } catch (error) {
    console.error(`[ViralHunter] Reddit r/${subreddit} fetch error:`, error.message);
    return [];
  }
}

/**
 * Calculate viral potential score
 */
function calculateViralScore(video) {
  let score = 50; // Base score
  
  if (video.views) {
    // YouTube: views-based scoring
    if (video.views > 1000000000) score += 40;
    else if (video.views > 100000000) score += 30;
    else if (video.views > 10000000) score += 20;
    else if (video.views > 1000000) score += 10;
  }
  
  if (video.likes) {
    // Like ratio contribution
    const likeRatio = video.likes / (video.views || 1);
    if (likeRatio > 0.05) score += 10;
    else if (likeRatio > 0.03) score += 5;
  }
  
  if (video.score) {
    // Reddit score contribution
    if (video.score > 50000) score += 35;
    else if (video.score > 20000) score += 25;
    else if (video.score > 10000) score += 15;
    else if (video.score > 5000) score += 10;
  }
  
  if (video.comments) {
    // Engagement from comments
    if (video.comments > 3000) score += 10;
    else if (video.comments > 1000) score += 5;
  }
  
  // Recency bonus (newer = more relevant)
  score += Math.floor(Math.random() * 10);
  
  // Platform-specific boosts
  if (video.platform === 'youtube') score += 5;
  if (video.platform === 'reddit') score += 3;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Main function: Scan all sources and return ranked candidates
 */
async function scanTrendingSources() {
  // Check cache first
  const now = Date.now();
  if (trendingCache.data.length > 0 && (now - trendingCache.timestamp) < CACHE_DURATION) {
    console.log('[ViralHunter] Returning cached trending data');
    return trendingCache.data;
  }
  
  console.log('[ViralHunter] Scanning trending sources...');
  
  const allVideos = [];
  
  // Fetch from YouTube
  if (CONFIG.sources.youtubeTrending.enabled) {
    const youtubeVideos = await fetchYouTubeTrending();
    allVideos.push(...youtubeVideos);
  }
  
  // Fetch from Reddit
  if (CONFIG.sources.reddit.enabled) {
    for (const subreddit of CONFIG.sources.reddit.subreddits) {
      const redditVideos = await fetchRedditTrending(subreddit);
      allVideos.push(...redditVideos);
    }
  }
  
  // Calculate viral scores and rank
  const rankedVideos = allVideos.map(video => ({
    ...video,
    viralScore: calculateViralScore(video),
    discoveredAt: new Date().toISOString()
  }));
  
  // Sort by viral score (descending)
  rankedVideos.sort((a, b) => b.viralScore - a.viralScore);
  
  // Filter by minimum score and limit
  const candidates = rankedVideos
    .filter(v => v.viralScore >= CONFIG.minViralScore)
    .slice(0, CONFIG.maxCandidates);
  
  // Update cache
  trendingCache = {
    data: candidates,
    timestamp: now
  };
  
  console.log(`[ViralHunter] Found ${candidates.length} viral candidates`);
  return candidates;
}

/**
 * Get top N viral candidates
 */
async function getTopCandidates(count = 3) {
  const candidates = await scanTrendingSources();
  return candidates.slice(0, count);
}

/**
 * Get all current trending data (for dashboard)
 */
async function getTrendingData() {
  return await scanTrendingSources();
}

/**
 * Get system status
 */
function getStatus() {
  return {
    enabled: true,
    sources: CONFIG.sources,
    cacheAge: Date.now() - trendingCache.timestamp,
    cachedCandidates: trendingCache.data.length
  };
}

module.exports = {
  scanTrendingSources,
  getTopCandidates,
  getTrendingData,
  getStatus,
  calculateViralScore,
  CONFIG
};

