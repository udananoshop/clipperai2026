/**
 * Auto Hashtag Intelligence
 * Generate optimized hashtags per platform
 */

const STOPWORDS = ['yang', 'dan', 'di', 'ke', 'dari', 'dengan', 'untuk', 'pada', 'adalah', 'ini', 'itu', 'atau', 'akan', 'sudah', 'ada', 'bisa', 'tidak', 'juga', 'maka', 'karena', 'lebih', 'sangat', 'sekali', 'the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'be', 'are', 'was'];

const TIKTOK_BROAD = ['#fyp', '#viral', '#trending', '#foryou', '#foryoupage', '#explore', '#viralvideo', '#viralindonesia', '#viralbanget', '#trendingnow'];
const TIKTOK_NICHE = ['#tips', '#trik', '#tutorial', '#caramudah', '#pintar', '#bisnis', '#uang', '#sukses', '#belajar', '#edukasi'];
const TIKTOK_TRENDING = ['#fyp', '#viral'];

const YOUTUBE_SEO = ['tutorial', 'tips', 'cara', 'panduan', 'guide', 'how to', 'tips and tricks', 'pelajaran', 'belajar', 'edukasi'];
const YOUTUBE_TOPIC = ['indonesia', 'viral', 'trending', 'populer', '2024', 'terbaru', 'terhits', 'best', 'top', 'recommended'];

const INSTAGRAM_NICHE = ['#tips', '#trik', '#tutorial', '#bisnis', '#uang', '#sukses', '#motivasi', '#inspirasi', '#edukasi', '#belajar'];
const INSTAGRAM_MEDIUM = ['#viral', '#trending', '#popular', '#hits', '#terkini', '#update', '#new', '#fashion', '#lifestyle', '#food'];

const FACEBOOK_TOPIC = ['tips', 'tutorial', 'panduan', 'caramudah', 'bisnis', 'uang', 'sukses', 'motivasi', 'edukasi', 'belajar'];

function extractKeywords(text = '') {
  if (!text) return [];
  
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleaned.split(' ');
  
  const filtered = words.filter(w => w.length > 2 && !STOPWORDS.includes(w));
  
  const freq = {};
  filtered.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });
  
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sorted;
}

function generatePlatformHashtags(text, platform = 'tiktok') {
  const keywords = extractKeywords(text);
  
  if (platform === 'tiktok') {
    const broad = TIKTOK_BROAD.slice(0, 3).map(t => t.startsWith('#') ? t : '#' + t);
    const niche = keywords.slice(0, 3).map(k => '#' + k);
    const trending = TIKTOK_TRENDING.slice(0, 2);
    
    return {
      platform: 'tiktok',
      hashtags: [...broad, ...niche, ...trending].slice(0, 8)
    };
  }
  
  if (platform === 'youtube') {
    const seo = keywords.slice(0, 5).map(k => k);
    const topic = YOUTUBE_TOPIC.slice(0, 3);
    
    return {
      platform: 'youtube',
      hashtags: [...seo, ...topic].map(t => t.startsWith('#') ? t : '#' + t).slice(0, 8)
    };
  }
  
  if (platform === 'instagram') {
    const niche = INSTAGRAM_NICHE.slice(0, 10).map(t => t.startsWith('#') ? t : '#' + t);
    const medium = keywords.slice(0, 5).map(k => '#' + k);
    
    return {
      platform: 'instagram',
      hashtags: [...niche, ...medium].slice(0, 15)
    };
  }
  
  if (platform === 'facebook') {
    const topic = FACEBOOK_TOPIC.slice(0, 5).map(t => t.startsWith('#') ? t : '#' + t);
    
    return {
      platform: 'facebook',
      hashtags: topic
    };
  }
  
  return { platform, hashtags: [] };
}

module.exports = {
  extractKeywords,
  generatePlatformHashtags,
  STOPWORDS
};
