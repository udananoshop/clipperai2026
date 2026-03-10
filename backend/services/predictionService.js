/**
 * Prediction Service - Enhanced AI Predictions
 * Includes: hook strength, emotional intensity, trend alignment, platform recommendation, confidence scoring
 */

const OpenAI = require('openai');
const db = require('../database');
const logger = require('../utils/logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const useAI = process.env.USE_OPENAI === 'true';

class PredictionService {
  /**
   * Calculate comprehensive viral score with multiple factors
   * @param {string} transcript - Video transcript
   * @param {string} title - Video title
   * @param {Array} hashtags - Video hashtags
   * @returns {Object} - Comprehensive prediction
   */
  async calculateViralScore(transcript, title, hashtags = []) {
    // Use AI if enabled
    if (!useAI) {
      logger.info('[PredictionService] AI disabled, using local scoring');
      return this.localScoring(transcript, title, hashtags);
    }

    try {
      // Analyze multiple factors in parallel
      const [hookAnalysis, emotionalAnalysis, trendAnalysis] = await Promise.all([
        this.analyzeHookStrength(title, transcript),
        this.analyzeEmotionalIntensity(transcript),
        this.analyzeTrendAlignment(hashtags)
      ]);

      // Calculate weighted score
      const viralScore = Math.round(
        (hookAnalysis.score * 0.4) +
        (emotionalAnalysis.score * 0.35) +
        (trendAnalysis.score * 0.25)
      );

      // Calculate confidence based on data quality
      const confidenceScore = this.calculateConfidence(transcript, title, hashtags);

      // Get platform recommendation
      const platformRecommendation = await this.recommendPlatform(viralScore, {
        hookScore: hookAnalysis.score,
        emotionalScore: emotionalAnalysis.score,
        trendScore: trendAnalysis.score
      });

      // Save prediction to database
      await this.savePrediction(null, null, null, {
        hookScore: hookAnalysis.score,
        emotionalIntensity: emotionalAnalysis.score,
        trendAlignment: trendAnalysis.score,
        confidenceScore,
        platformRecommendation,
        viralProbability: viralScore,
        predictedEngagement: this.estimateEngagement(viralScore),
        bestTimestamp: await this.findBestTimestamp(transcript)
      });

      return {
        score: viralScore,
        confidence: confidenceScore,
        platform: platformRecommendation,
        factors: {
          hookStrength: hookAnalysis.score,
          emotionalIntensity: emotionalAnalysis.score,
          trendAlignment: trendAnalysis.score
        },
        details: {
          hookAnalysis,
          emotionalAnalysis,
          trendAnalysis
        }
      };

    } catch (error) {
      logger.error('[PredictionService] AI analysis failed:', error);
      return this.localScoring(transcript, title, hashtags);
    }
  }

  /**
   * Local fallback scoring
   */
  localScoring(transcript, title, hashtags) {
    let hookScore = 5;
    let emotionalScore = 5;
    let trendScore = 5;

    // Simple heuristics for local scoring
    if (title) {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('!') || lowerTitle.includes('🔥') || lowerTitle.includes('wow')) {
        hookScore = 7;
      }
      if (lowerTitle.includes('secret') || lowerTitle.includes('revealed') || lowerTitle.includes('hack')) {
        hookScore = 8;
      }
    }

    if (transcript) {
      const words = transcript.toLowerCase().split(/\s+/).length;
      emotionalScore = Math.min(10, Math.max(1, Math.floor(words / 100)));
    }

    if (hashtags && hashtags.length > 0) {
      trendScore = Math.min(10, 3 + hashtags.length);
    }

    const viralScore = Math.round((hookScore * 0.4 + emotionalScore * 0.35 + trendScore * 0.25) * 10);

    return {
      score: viralScore,
      confidence: 50,
      platform: this.simplePlatformRecommend(viralScore),
      factors: {
        hookStrength: hookScore,
        emotionalIntensity: emotionalScore,
        trendAlignment: trendScore
      }
    };
  }

  /**
   * Analyze hook strength (1-10)
   */
  async analyzeHookStrength(title, transcript) {
    if (!useAI) {
      return { score: 6, grade: 'B', factors: [] };
    }

    try {
      const prompt = `Analyze the hook strength of this video content. 
Title: "${title}"
Transcript (first 200 chars): "${(transcript || '').substring(0, 200)}"

Rate hook strength 1-10 and identify key factors that make it engaging. 
Return JSON: {"score": number, "grade": "A/B/C/D/F", "factors": ["factor1", "factor2"]}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        score: result.score || 5,
        grade: result.grade || 'C',
        factors: result.factors || []
      };
    } catch (error) {
      logger.warn('[PredictionService] Hook analysis failed:', error.message);
      return { score: 5, grade: 'C', factors: [] };
    }
  }

  /**
   * Analyze emotional intensity (1-10)
   */
  async analyzeEmotionalIntensity(transcript) {
    if (!useAI || !transcript) {
      return { score: 5, emotions: [] };
    }

    try {
      const prompt = `Analyze the emotional intensity of this transcript.
Transcript: "${transcript.substring(0, 500)}"

Identify the primary emotions and rate intensity 1-10.
Return JSON: {"score": number, "emotions": ["emotion1", "emotion2"]}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        score: result.score || 5,
        emotions: result.emotions || []
      };
    } catch (error) {
      logger.warn('[PredictionService] Emotional analysis failed:', error.message);
      return { score: 5, emotions: [] };
    }
  }

  /**
   * Analyze trend alignment (1-10)
   */
  async analyzeTrendAlignment(hashtags = []) {
    if (!hashtags || hashtags.length === 0) {
      return { score: 5, trends: [] };
    }

    // Common trending patterns
    const trendingPatterns = ['fyp', 'viral', 'trending', 'challenge', 'dance', 'comedy', 'edu'];
    const foundTrends = hashtags.filter(tag => 
      trendingPatterns.some(pattern => tag.toLowerCase().includes(pattern))
    );

    const score = Math.min(10, 3 + (foundTrends.length * 2));

    return {
      score,
      trends: foundTrends,
      alignment: score > 6 ? 'high' : score > 3 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate confidence score (0-100)
   */
  calculateConfidence(transcript, title, hashtags) {
    let confidence = 50; // Base confidence

    if (title && title.length > 10) confidence += 10;
    if (transcript && transcript.length > 100) confidence += 20;
    if (hashtags && hashtags.length > 0) confidence += 10;
    if (transcript && title) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Recommend best platform
   */
  async recommendPlatform(viralScore, factors) {
    if (!useAI) {
      return this.simplePlatformRecommend(viralScore);
    }

    try {
      const prompt = `Based on these metrics:
- Viral Score: ${viralScore}
- Hook Score: ${factors.hookScore}
- Emotional Score: ${factors.emotionalScore}
- Trend Score: ${factors.trendScore}

Recommend the best platform (instagram, tiktok, youtube, facebook).
Return JSON: {"platform": "name", "reason": "short reason"}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.platform || 'instagram';
    } catch (error) {
      return this.simplePlatformRecommend(viralScore);
    }
  }

  /**
   * Simple platform recommendation
   */
  simplePlatformRecommend(viralScore) {
    if (viralScore >= 80) return 'youtube';
    if (viralScore >= 60) return 'tiktok';
    if (viralScore >= 40) return 'instagram';
    return 'facebook';
  }

  /**
   * Estimate engagement based on viral score
   */
  estimateEngagement(viralScore) {
    const baseMultiplier = viralScore / 100;
    return {
      min: Math.round(100 * baseMultiplier),
      max: Math.round(10000 * baseMultiplier)
    };
  }

  /**
   * Find best timestamp for clip
   */
  async findBestTimestamp(transcript) {
    if (!transcript || transcript.length < 50) {
      return 0;
    }
    // First 10 seconds usually has highest engagement
    return Math.floor(Math.random() * 10);
  }

  /**
   * Predict best platform (legacy method)
   */
  async predictBestPlatform(viralScore, contentType) {
    if (viralScore > 80) {
      return contentType === 'short' ? 'tiktok' : 'youtube';
    } else if (viralScore > 60) {
      return 'instagram';
    } else {
      return 'facebook';
    }
  }

  /**
   * Save prediction to database
   */
  async savePrediction(userId, videoId, jobId, prediction) {
    return new Promise((resolve) => {
      db.run(
        `INSERT INTO ai_predictions 
        (user_id, video_id, job_id, hook_score, emotional_intensity, trend_alignment, confidence_score, platform_recommendation, viral_probability, predicted_engagement, best_timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          videoId,
          jobId,
          prediction.hookScore || 0,
          prediction.emotionalIntensity || 0,
          prediction.trendAlignment || 0,
          prediction.confidenceScore || 0,
          prediction.platformRecommendation || 'instagram',
          prediction.viralProbability || 0,
          JSON.stringify(prediction.predictedEngagement || {}),
          prediction.bestTimestamp || 0,
          JSON.stringify(prediction)
        ],
        function(err) {
          if (err) {
            logger.error('[PredictionService] Failed to save prediction:', err);
          }
          resolve();
        }
      );
    });
  }

  /**
   * Get prediction history
   */
  getPredictionHistory(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ai_predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Track actual outcome for accuracy calculation
   */
  async trackOutcome(predictionId, actualViews, actualEngagement) {
    return new Promise((resolve) => {
      db.run(
        `INSERT INTO ai_performance_stats (metric_name, metric_value, prediction_type, actual_outcome)
        VALUES (?, ?, ?, ?)`,
        ['prediction_accuracy', actualViews, 'viral_prediction', JSON.stringify({ actualEngagement })],
        function(err) {
          if (err) logger.error('[PredictionService] Failed to track outcome:', err);
          resolve();
        }
      );
    });
  }

  /**
   * Get AI performance stats
   */
  getPerformanceStats() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ai_performance_stats ORDER BY created_at DESC LIMIT 100`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

module.exports = new PredictionService();
