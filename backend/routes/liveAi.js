const express = require('express');
const router = express.Router();
const liveAiState = require('../services/liveAiState');

/**
 * GET /api/ai/live-status
 * OVERLORD - Get real-time AI processing status
 * Lightweight endpoint - no heavy operations
 */
router.get('/live-status', (req, res) => {
  try {
    const state = liveAiState.getLiveState();
    res.json({
      progress: state.progress,
      confidence: state.confidence,
      predictions: state.predictions,
      creditsUsed: state.creditsUsed,
      status: state.status,
      message: state.currentMessage
    });
  } catch (error) {
    res.json({
      progress: 0,
      confidence: 0,
      predictions: 0,
      creditsUsed: 0,
      status: "idle",
      message: "Ready for processing"
    });
  }
});

/**
 * POST /api/ai/live/start
 * OVERLORD - Start live processing (called when upload/pipeline starts)
 */
router.post('/live/start', (req, res) => {
  try {
    liveAiState.startProcessing();
    const state = liveAiState.getLiveState();
    res.json({
      success: true,
      status: state.status,
      message: "Live processing started"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/live/stop
 * OVERLORD - Stop live processing
 */
router.post('/live/stop', (req, res) => {
  try {
    liveAiState.stopProcessing();
    const state = liveAiState.getLiveState();
    res.json({
      success: true,
      status: state.status,
      message: "Live processing stopped"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
