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
   */
  async calculateViralScore(transcript, title, hashtags = []) {
    if (!useAI) {
      logger.info('[PredictionService] AI disabled, using local scoring');
      return this.localScoring(transcript, title, hashtags);
    }

    try {
      const [hookAnalysis, emotionalAnalysis, trendAnalysis] = await Promise.all([
        this.analyzeHookStrength(title, transcript),
        this.analyzeEmotionalIntensity(transcript),
        this.analyzeTrendAlignment(hashtags)
      ]);

      const viralScore = Math.round(
        (hookAnalysis.score * 0.4) +
        (emotionalAnalysis.score * 0.35) +
        (trendAnalysis.score * 0.25)
      );

      const confidenceScore = this.calculateConfidence(transcript, title, hashtags);
      const platformRecommendation = await this.recommendPlatform(viralScore, {
        hookScore: hookAnalysis.score,
        emotionalScore: emotionalAnalysis.score,
        trendScore: trendAnalysis.score
      });

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
        details: { hookAnalysis, emotionalAnalysis, trendAnalysis }
      };

    } catch (error) {
      logger.error('[PredictionService] AI analysis failed:', error);
      return this.localScoring(transcript, title, hashtags);
    }
  }

  localScoring(transcript, title, hashtags) {
    let hookScore = 5;
    let emotionalScore = 5;
    let trendScore = 5;

    if (title) {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('!') || lowerTitle.includes('🔥') || lowerTitle.includes('wow')) hookScore = 7;
      if (lowerTitle.includes('secret') || lowerTitle.includes('revealed') || lowerTitle.includes('hack')) hookScore = 8;
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
      factors: { hookStrength: hookScore, emotionalIntensity: emotionalScore, trendAlignment: trendScore }
    };
  }

  async analyzeHookStrength(title, transcript) {
    if (!useAI) return { score: 6, grade: 'B', factors: [] };
    try {
      const prompt = `Analyze the hook strength of this video content. 
Title: "${title}"
Transcript (first 200 chars): "${(transcript || '').substring(0, 200)}"
Rate hook strength 1-10 and identify key factors. 
Return JSON: {"score": number, "grade": "A/B/C/D/F", "factors": ["factor1", "factor2"]}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return { score: result.score || 5, grade: result.grade || 'C', factors: result.factors || [] };
    } catch (error) {
      logger.warn('[PredictionService] Hook analysis failed:', error.message);
      return { score: 5, grade: 'C', factors: [] };
    }
  }

  async analyzeEmotionalIntensity(transcript) {
    if (!useAI || !transcript) return { score: 5, emotions: [] };
    try {
      const prompt = `Analyze the emotional intensity of this transcript.
Transcript: "${transcript.substring(0, 500)}"
Identify primary emotions and rate intensity 1-10.
Return JSON: {"score": number, "emotions": ["emotion1", "emotion2"]}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return { score: result.score || 5, emotions: result.emotions || [] };
    } catch (error) {
      logger.warn('[PredictionService] Emotional analysis failed:', error.message);
      return { score: 5, emotions: [] };
    }
  }

  async analyzeTrendAlignment(hashtags = []) {
    if (!hashtags || hashtags.length === 0) return { score: 5, trends: [] };
    const trendingPatterns = ['fyp', 'viral', 'trending', 'challenge', 'dance', 'comedy', 'edu'];
    const foundTrends = hashtags.filter(tag => trendingPatterns.some(pattern => tag.toLowerCase().includes(pattern)));
    const score = Math.min(10, 3 + (foundTrends.length * 2));
    return { score, trends: foundTrends, alignment: score > 6 ? 'high' : score > 3 ? 'medium' : 'low' };
  }

  calculateConfidence(transcript, title, hashtags) {
    let confidence = 50;
    if (title && title.length > 10) confidence += 10;
    if (transcript && transcript.length > 100) confidence += 20;
    if (hashtags && hashtags.length > 0) confidence += 10;
    if (transcript && title) confidence += 10;
    return Math.min(100, confidence);
  }

  async recommendPlatform(viralScore, factors) {
    if (!useAI) return this.simplePlatformRecommend(viralScore);
    try {
      const prompt = `Based on Viral Score: ${viralScore}, Hook: ${factors.hookScore}, Emotional: ${factors.emotionalScore}, Trend: ${factors.trendScore}. Recommend platform (instagram, tiktok, youtube, facebook). Return JSON: {"platform": "name", "reason": "short reason"}`;

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

  simplePlatformRecommend(viralScore) {
    if (viralScore >= 80) return 'youtube';
    if (viralScore >= 60) return 'tiktok';
    if (viralScore >= 40) return 'instagram';
    return 'facebook';
  }

  estimateEngagement(viralScore) {
    const baseMultiplier = viralScore / 100;
    return { min: Math.round(100 * baseMultiplier), max: Math.round(10000 * baseMultiplier) };
  }

  async findBestTimestamp(transcript) {
    if (!transcript || transcript.length < 50) return 0;
    return Math.floor(Math.random() * 10);
  }

  async predictBestPlatform(viralScore, contentType) {
    if (viralScore > 80) return contentType === 'short' ? 'tiktok' : 'youtube';
    else if (viralScore > 60) return 'instagram';
    else return 'facebook';
  }

  async savePrediction(userId, videoId, jobId, prediction) {
    return new Promise((resolve) => {
      db.run(
        `INSERT INTO ai_predictions (user_id, video_id, job_id, hook_score, emotional_intensity, trend_alignment, confidence_score, platform_recommendation, viral_probability, predicted_engagement, best_timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, videoId, jobId, prediction.hookScore || 0, prediction.emotionalIntensity || 0, prediction.trendAlignment || 0, prediction.confidenceScore || 0, prediction.platformRecommendation || 'instagram', prediction.viralProbability || 0, JSON.stringify(prediction.predictedEngagement || {}), prediction.bestTimestamp || 0, JSON.stringify(prediction)],
        function(err) {
          if (err) logger.error('[PredictionService] Failed to save prediction:', err);
          resolve();
        }
      );
    });
  }

  getPredictionHistory(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ai_predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [userId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async trackOutcome(predictionId, actualViews, actualEngagement) {
    return new Promise((resolve) => {
      db.run(`INSERT INTO ai_performance_stats (metric_name, metric_value, prediction_type, actual_outcome) VALUES (?, ?, ?, ?)`,
        ['prediction_accuracy', actualViews, 'viral_prediction', JSON.stringify({ actualEngagement })],
        function(err) { if (err) logger.error('[PredictionService] Failed to track outcome:', err); resolve(); }
      );
    });
  }

  getPerformanceStats() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ai_performance_stats ORDER BY created_at DESC LIMIT 100`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // OVERLORD 9.5 - LIGHTWEIGHT PREDICTION HISTORY

  saveToHistory(title, platform, score, category, duration, hookStrength) {
    return new Promise((resolve) => {
      db.run(
        `INSERT INTO prediction_history (title, platform, score, category, duration, hook_strength, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [title, platform, score, category || null, duration || null, hookStrength || null],
        function(err) {
          if (err) logger.error('[PredictionService] Failed to save prediction history:', err);
          resolve();
        }
      );
    });
  }

  getHistory(limit = 20) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, platform, score, category, duration, hook_strength, created_at 
         FROM prediction_history ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

module.exports = new PredictionService();
