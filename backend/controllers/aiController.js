const aiService = require('../services/aiService');
const predictionService = require('../services/predictionService');
const hashtagService = require('../services/hashtagService');
const trendingService = require('../services/trendingService');

class AIController {
  async generateCaption(req, res) {
    try {
      const { text, language, platform } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      const caption = await aiService.generateCaption(text, language, platform);

      res.json({
        success: true,
        data: { caption }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async analyzeTranscript(req, res) {
    try {
      const { transcript } = req.body;

      if (!transcript) {
        return res.status(400).json({
          success: false,
          error: 'Transcript is required'
        });
      }

      const analysis = await aiService.analyzeTranscript(transcript);

      res.json({
        success: true,
        data: { analysis }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async predictViralScore(req, res) {
    try {
      const { transcript, title, hashtags } = req.body;

      if (!transcript && !title) {
        return res.status(400).json({
          success: false,
          error: 'Transcript or title is required'
        });
      }

      const result = await predictionService.calculateViralScore(
        transcript || '',
        title || '',
        hashtags || []
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async generateHashtags(req, res) {
    try {
      const { content, platform, language } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      const hashtags = await hashtagService.generateHashtags(content, platform, language);

      res.json({
        success: true,
        data: { hashtags }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getTrending(req, res) {
    try {
      const { platform, region } = req.query;

      let trendingData;
      if (platform === 'youtube') {
        trendingData = await trendingService.getYouTubeTrending(region || 'US');
      } else {
        return res.status(400).json({
          success: false,
          error: 'Platform not supported'
        });
      }

      const analytics = await trendingService.getAnalyticsSummary(trendingData);

      res.json({
        success: true,
        data: {
          trending: trendingData,
          analytics
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getTrendingSuggestions(req, res) {
    try {
      const { viralScore, contentType } = req.body;

      const suggestions = await trendingService.getTrendingSuggestions(contentType, viralScore);

      res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AIController();
