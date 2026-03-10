const axios = require('axios');

class TrendingService {
  constructor() {
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrls = {
      youtube: 'https://www.googleapis.com/youtube/v3'
    };
    // Cache configuration
    this.cache = {
      data: null,
      timestamp: 0
    };
    this.CACHE_DURATION = 600000; // 10 minutes
  }

  isCacheValid() {
    return this.cache.data && (Date.now() - this.cache.timestamp) < this.CACHE_DURATION;
  }

  async getYouTubeTrending(regionCode = 'US', maxResults = 10) {
    // Validate API key
    if (!this.youtubeApiKey) {
      console.error('❌ YOUTUBE_API_KEY is missing in environment variables');
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    // Check cache first
    if (this.isCacheValid()) {
      console.log('Cache HIT');
      return this.cache.data;
    }

    console.log('Cache MISS');

    try {
      const response = await axios.get(`${this.baseUrls.youtube}/videos`, {
        params: {
          part: 'snippet,statistics',
          chart: 'mostPopular',
          regionCode: regionCode || 'US',
          maxResults: maxResults || 10,
          key: this.youtubeApiKey
        }
      });

      // Log response status
      if (response.status !== 200) {
        console.error('❌ YouTube API error - unexpected status:', response.status);
        console.error('Response data:', response.data);
      }

      const trendingData = response.data.items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: parseInt(item.statistics.viewCount || 0),
        likeCount: parseInt(item.statistics.likeCount || 0),
        thumbnailUrl: item.snippet.thumbnails?.medium?.url,
        platform: 'youtube'
      }));

      // Update cache
      this.cache.data = trendingData;
      this.cache.timestamp = Date.now();
      console.log('Cache REFRESH');

      return trendingData;
    } catch (error) {
      // Detailed error logging
      if (error.response) {
        // Server responded with error status
        console.error('❌ YouTube API error:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // Request made but no response
        console.error('❌ No response received from YouTube API');
        console.error('Error request:', error.request);
      } else {
        // Error in request setup
        console.error('❌ Error setting up YouTube API request:', error.message);
      }
      console.error('Full error:', error);

      // Fallback to cache if available
      if (this.cache.data) {
        console.log('Cache FALLBACK');
        return this.cache.data;
      }

      throw new Error('Failed to fetch YouTube trending data');
    }
  }

  async getAnalyticsSummary(trendingData) {
    if (!trendingData || trendingData.length === 0) {
      return {
        totalViews: 0,
        averageViews: 0,
        topCategory: 'N/A',
        trendingTitles: []
      };
    }

    const totalViews = trendingData.reduce((sum, item) => sum + item.viewCount, 0);
    const averageViews = Math.round(totalViews / trendingData.length);

    // Simple category detection (in real implementation, use YouTube API categories)
    const categories = trendingData.map(item => this.categorizeTitle(item.title));
    const categoryCount = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const topCategory = Object.keys(categoryCount).reduce((a, b) =>
      categoryCount[a] > categoryCount[b] ? a : b
    );

    return {
      totalViews,
      averageViews,
      topCategory,
      trendingTitles: trendingData.slice(0, 5).map(item => item.title)
    };
  }

  categorizeTitle(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('music') || lowerTitle.includes('song')) return 'Music';
    if (lowerTitle.includes('gaming') || lowerTitle.includes('game')) return 'Gaming';
    if (lowerTitle.includes('news') || lowerTitle.includes('breaking')) return 'News';
    if (lowerTitle.includes('tutorial') || lowerTitle.includes('how to')) return 'Education';
    return 'Entertainment';
  }

  async getTrendingSuggestions(contentType, viralScore) {
    // Generate suggestions based on current trending and viral score
    const suggestions = [];

    if (viralScore > 70) {
      suggestions.push('High viral potential - consider immediate posting');
    }

    if (contentType === 'short') {
      suggestions.push('TikTok and Instagram Reels are optimal for short content');
    } else {
      suggestions.push('YouTube is best for long-form content');
    }

    return suggestions;
  }
}

module.exports = new TrendingService();
