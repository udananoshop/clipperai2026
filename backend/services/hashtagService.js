const aiService = require('./aiService');

const useAI = process.env.USE_OPENAI === 'true';

class HashtagService {
  async generateHashtags(content, platform = 'youtube', language = 'en') {

    // 🔥 Jika AI dimatikan
    if (!useAI) {
      console.log("AI disabled, using fallback hashtags");
      return this.getFallbackHashtags(platform, language);
    }

    try {
      // 🔥 Coba pakai AI
      const aiHashtags = await aiService.generateHashtags(content, platform, language);

      const popularHashtags = this.getPopularHashtags(platform, language);

      const combined = [...aiHashtags, ...popularHashtags];

      return [...new Set(combined)].slice(0, 15);

    } catch (error) {
      console.log("AI failed, fallback hashtags used");
      return this.getFallbackHashtags(platform, language);
    }
  }

  getPopularHashtags(platform, language) {
    const hashtags = {
      youtube: {
        en: ['#viral', '#trending', '#youtube', '#video', '#content'],
        id: ['#viral', '#trending', '#youtube', '#video', '#konten']
      },
      tiktok: {
        en: ['#fyp', '#viral', '#tiktok', '#dance', '#music'],
        id: ['#fyp', '#viral', '#tiktok', '#tari', '#musik']
      },
      instagram: {
        en: ['#instagood', '#photooftheday', '#beautiful', '#love', '#fashion'],
        id: ['#instagood', '#photooftheday', '#cantik', '#cinta', '#fashion']
      },
      facebook: {
        en: ['#facebook', '#social', '#community', '#share', '#life'],
        id: ['#facebook', '#sosial', '#komunitas', '#bagikan', '#hidup']
      }
    };

    return hashtags[platform]?.[language] || hashtags.youtube.en;
  }

  getFallbackHashtags(platform, language) {
    return this.getPopularHashtags(platform, language);
  }
}

module.exports = new HashtagService();
