const express = require('express');
const router = express.Router();
const predictionService = require('../services/predictionService');

/**
 * POST /api/prediction/history
 * Save lightweight prediction to history
 * No background processing, single lightweight insert
 */
router.post('/history', async (req, res) => {
  try {
    const { title, platform, score, category, duration, hookStrength } = req.body;
    
    if (!title || !platform || score === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'title, platform, and score are required' 
      });
    }

    await predictionService.saveToHistory(title, platform, score, category, duration, hookStrength);
    
    res.json({ 
      success: true, 
      message: 'Prediction saved to history' 
    });
  } catch (error) {
    console.error('Save prediction history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/prediction/history
 * Get prediction history (lightweight - title, platform, score, timestamp)
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await predictionService.getHistory(limit);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get prediction history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
