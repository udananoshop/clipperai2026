const express = require('express');
const router = express.Router();
const renderProgress = require('../services/renderProgress');

// GET /api/render-progress/:id - Get render progress for video
router.get('/progress/:id', function(req, res) {
  try {
    const videoId = req.params.id;
    const percent = renderProgress.get(videoId);
    res.json({ percent: percent });
  } catch (error) {
    console.error('[Render API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
