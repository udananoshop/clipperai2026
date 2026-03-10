/**
 * ClipperAi2026 Enterprise - Viral Hook Detector Service
 * Analyzes video transcripts to detect emotional spikes and strong opening hooks
 * Returns hook score (0-100) for viral potential
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Emotional keywords for spike detection
 */
const EMOTIONAL_TRIGGERS = {
  urgency: ['now', 'immediately', 'today', 'right now', 'stop', 'wait', 'don\'t miss', 'limited', 'hurry'],
  curiosity: ['secret', 'revealed', 'truth', 'hidden', 'surprising', 'shocking', 'mind-blowing', 'unbelievable', 'never guessed'],
  emotion: ['love', 'hate', 'amazing', 'incredible', 'awesome', 'terrible', 'worst', 'best', 'fantastic', 'obsessed'],
  action: ['watch', 'see', 'look', 'check', 'try', 'do it', 'start', 'begin', 'join', 'follow'],
  controversy: ['wrong', 'mistake', 'stop doing', 'never', 'always', 'everyone says', 'they lied', 'exposed'],
  numbers: ['100%', '1 million', '10x', '$0', 'free', 'discount', 'save', 'money', 'profit', 'results']
};

/**
 * Hook patterns that indicate viral potential
 */
const HOOK_PATTERNS = [
  { pattern: /^you (will|won't|need to|have to|should)/i, score: 25, type: 'command' },
  { pattern: /^(secret|truth|hidden|real)/i, score: 20, type: 'mystery' },
  { pattern: /^(this is|here's|let me)/i, score: 15, type: 'introduction' },
  { pattern: /^(don't|stop|never)/i, score: 20, type: 'warning' },
  { pattern: /^(want to|need to|looking for)/i, score: 15, type: 'question' },
  { pattern: /\?$/i, score: 10, type: 'question' },
  { pattern: /!$/i, score: 15, type: 'exclamation' },
  { pattern: /(\d+[\dkK]?[\s-]?(million|billion|percent|%))/i, score: 20, type: 'numbers' }
];

/**
 * ViralHookDetector Service
 */
class ViralHookDetector {
  constructor() {
    this.analysisCache = new Map();
  }

  /**
   * Analyze transcript for viral potential
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Hook analysis result
   */
  async analyzeHook(options) {
    const { 
      transcript, 
      videoId, 
      title, 
      description,
      duration = 60,
      sampleFirstSeconds = 5 
    } = options;

    const analysisId = uuidv4();
    logger.info(`[ViralHookDetector] Starting hook analysis ${analysisId}`);

    try {
      // Validate input
      if (!transcript && !title) {
        throw new Error('Either transcript or title is required');
      }

      const fullText = [title, description, transcript].filter(Boolean).join(' ');
      
      // Step 1: Analyze opening hook (first 5 seconds / first portion)
      const openingText = this._extractOpeningText(fullText, sampleFirstSeconds, duration);
      const hookAnalysis = this._analyzeOpeningHook(openingText);

      // Step 2: Detect emotional spikes throughout the content
      const emotionalSpikes = this._detectEmotionalSpikes(fullText);

      // Step 3: Calculate overall hook score
      const hookScore = this._calculateHookScore(hookAnalysis, emotionalSpikes, fullText);

      // Step 4: Generate recommendations
      const recommendations = this._generateRecommendations(hookAnalysis, emotionalSpikes, hookScore);

      const result = {
        id: analysisId,
        videoId,
        hookScore: Math.round(hookScore),
        grade: this._getGrade(hookScore),
        openingHook: {
          text: openingText.substring(0, 200),
          score: hookAnalysis.score,
          type: hookAnalysis.type,
          strength: hookAnalysis.strength
        },
        emotionalSpikes: emotionalSpikes.slice(0, 10),
        emotionalSpikeCount: emotionalSpikes.length,
        recommendations,
        analyzedAt: new Date().toISOString(),
        metrics: {
          wordCount: fullText.split(/\s+/).length,
          emotionalWordRatio: this._calculateEmotionalRatio(fullText),
          hookPatternMatches: hookAnalysis.patternMatches
        }
      };

      // Cache the result
      this.analysisCache.set(analysisId, result);
      logger.info(`[ViralHookDetector] Analysis ${analysisId} completed with score: ${hookScore}`);

      return result;
    } catch (error) {
      logger.error(`[ViralHookDetector] Analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Quick hook score check (lightweight)
   * @param {string} text - Text to analyze
   * @returns {Object} - Quick score result
   */
  async quickScore(text) {
    const hookAnalysis = this._analyzeOpeningHook(text);
    const emotionalSpikes = this._detectEmotionalSpikes(text);
    const hookScore = this._calculateHookScore(hookAnalysis, emotionalSpikes, text);

    return {
      hookScore: Math.round(hookScore),
      grade: this._getGrade(hookScore),
      type: hookAnalysis.type,
      strength: hookAnalysis.strength
    };
  }

  /**
   * Extract opening text based on duration
   * @param {string} text - Full text
   * @param {number} seconds - Seconds to extract
   * @param {number} totalDuration - Total video duration
   * @returns {string} - Opening text
   */
  _extractOpeningText(text, seconds, totalDuration) {
    const words = text.split(/\s+/);
    const estimatedWordsPerSecond = 2.5; // Average speaking rate
    const wordsToExtract = Math.min(
      Math.ceil(seconds * estimatedWordsPerSecond * (totalDuration / 60)),
      Math.ceil(words.length * 0.15) // Max 15% of content
    );
    return words.slice(0, wordsToExtract).join(' ');
  }

  /**
   * Analyze the opening hook
   * @param {string} text - Opening text
   * @returns {Object} - Hook analysis
   */
  _analyzeOpeningHook(text) {
    let totalScore = 0;
    const patternMatches = [];

    for (const hookPattern of HOOK_PATTERNS) {
      if (hookPattern.pattern.test(text)) {
        totalScore += hookPattern.score;
        patternMatches.push({
          type: hookPattern.type,
          score: hookPattern.score,
          matched: text.match(hookPattern.pattern)?.[0]
        });
      }
    }

    // Check for emotional triggers in opening
    const emotionalCount = this._countEmotionalWords(text);
    totalScore += emotionalCount * 5;

    // Determine hook type based on highest scoring pattern
    const bestMatch = patternMatches.sort((a, b) => b.score - a.score)[0];
    const type = bestMatch?.type || 'generic';
    const strength = totalScore >= 40 ? 'strong' : totalScore >= 20 ? 'moderate' : 'weak';

    return {
      score: Math.min(totalScore, 100),
      type,
      strength,
      patternMatches
    };
  }

  /**
   * Detect emotional spikes in the content
   * @param {string} text - Full text
   * @returns {Array} - Emotional spikes
   */
  _detectEmotionalSpikes(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const spikes = [];

    sentences.forEach((sentence, index) => {
      const emotionalCount = this._countEmotionalWords(sentence);
      const wordCount = sentence.split(/\s+/).length;
      const density = wordCount > 0 ? emotionalCount / wordCount : 0;

      if (emotionalCount >= 2 || density > 0.15) {
        const spikeType = this._classifyEmotionalType(sentence);
        spikes.push({
          sentence: sentence.trim().substring(0, 100),
          position: index,
          emotionalCount,
          density: Math.round(density * 100) / 100,
          type: spikeType,
          score: Math.min(emotionalCount * 10 + density * 50, 100)
        });
      }
    });

    // Sort by score descending
    return spikes.sort((a, b) => b.score - a.score);
  }

  /**
   * Count emotional words in text
   * @param {string} text - Text to analyze
   * @returns {number} - Count of emotional words
   */
  _countEmotionalWords(text) {
    const lowerText = text.toLowerCase();
    let count = 0;

    for (const [category, words] of Object.entries(EMOTIONAL_TRIGGERS)) {
      for (const word of words) {
        if (lowerText.includes(word)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Classify the type of emotional content
   * @param {string} text - Text to classify
   * @returns {string} - Emotional type
   */
  _classifyEmotionalType(text) {
    const lowerText = text.toLowerCase();
    
    if (EMOTIONAL_TRIGGERS.urgency.some(w => lowerText.includes(w))) return 'urgency';
    if (EMOTIONAL_TRIGGERS.curiosity.some(w => lowerText.includes(w))) return 'curiosity';
    if (EMOTIONAL_TRIGGERS.emotion.some(w => lowerText.includes(w))) return 'emotion';
    if (EMOTIONAL_TRIGGERS.action.some(w => lowerText.includes(w))) return 'action';
    if (EMOTIONAL_TRIGGERS.controversy.some(w => lowerText.includes(w))) return 'controversy';
    if (EMOTIONAL_TRIGGERS.numbers.some(w => lowerText.includes(w))) return 'numbers';
    
    return 'general';
  }

  /**
   * Calculate overall hook score
   * @param {Object} hookAnalysis - Opening hook analysis
   * @param {Array} emotionalSpikes - Emotional spikes
   * @param {string} text - Full text
   * @returns {number} - Hook score (0-100)
   */
  _calculateHookScore(hookAnalysis, emotionalSpikes, text) {
    // Weight components
    const openingWeight = 0.4;
    const spikesWeight = 0.35;
    const varietyWeight = 0.25;

    // Opening hook score (max 100)
    const openingScore = hookAnalysis.score;

    // Emotional spikes score (max 100)
    const spikeScore = Math.min(emotionalSpikes.length * 10, 100);

    // Variety score - different types of emotional content
    const types = new Set(emotionalSpikes.map(s => s.type));
    const varietyScore = Math.min(types.size * 15 + 25, 100);

    // Calculate weighted total
    const totalScore = 
      (openingScore * openingWeight) +
      (spikeScore * spikesWeight) +
      (varietyScore * varietyWeight);

    return Math.min(Math.round(totalScore), 100);
  }

  /**
   * Calculate emotional word ratio
   * @param {string} text - Text to analyze
   * @returns {number} - Ratio (0-1)
   */
  _calculateEmotionalRatio(text) {
    const words = text.split(/\s+/);
    const emotionalCount = this._countEmotionalWords(text);
    return words.length > 0 ? emotionalCount / words.length : 0;
  }

  /**
   * Get letter grade from score
   * @param {number} score - Hook score
   * @returns {string} - Letter grade
   */
  _getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations for improvement
   * @param {Object} hookAnalysis - Hook analysis
   * @param {Array} emotionalSpikes - Emotional spikes
   * @param {number} score - Overall score
   * @returns {Array} - Recommendations
   */
  _generateRecommendations(hookAnalysis, emotionalSpikes, score) {
    const recommendations = [];

    if (hookAnalysis.score < 30) {
      recommendations.push({
        priority: 'high',
        category: 'opening',
        message: 'Strengthen your opening hook - use urgency, curiosity, or numbers'
      });
    }

    if (emotionalSpikes.length < 3) {
      recommendations.push({
        priority: 'high',
        category: 'emotion',
        message: 'Add more emotional triggers throughout your content'
      });
    }

    const types = new Set(emotionalSpikes.map(s => s.type));
    if (types.size < 2) {
      recommendations.push({
        priority: 'medium',
        category: 'variety',
        message: 'Vary your emotional triggers - mix curiosity, urgency, and numbers'
      });
    }

    if (!hookAnalysis.patternMatches.find(m => m.type === 'question')) {
      recommendations.push({
        priority: 'medium',
        category: 'engagement',
        message: 'Add a question to your opening to increase engagement'
      });
    }

    if (score < 50) {
      recommendations.push({
        priority: 'high',
        category: 'overall',
        message: 'Consider reshooting with a stronger hook - first 5 seconds are critical'
      });
    }

    return recommendations;
  }

  /**
   * Get analysis result by ID
   * @param {string} analysisId - Analysis ID
   * @returns {Object|null} - Analysis result
   */
  getAnalysis(analysisId) {
    return this.analysisCache.get(analysisId) || null;
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
  }
}

// Export singleton instance
module.exports = new ViralHookDetector();
