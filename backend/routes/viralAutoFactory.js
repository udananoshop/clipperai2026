/**
 * Viral Auto Factory API Routes
 * Control the automated content generation pipeline
 */

const express = require('express');
const router = express.Router();

// Lazy load the viralAutoFactory to avoid startup errors
let viralAutoFactory = null;

function getViralAutoFactory() {
  if (!viralAutoFactory) {
    try {
      viralAutoFactory = require('../services/viralAutoFactory');
    } catch (e) {
      console.error('[ViralAutoFactory] Failed to load service:', e.message);
      return null;
    }
  }
  return viralAutoFactory;
}

// Initialize on first request
router.use(async (req, res, next) => {
  const factory = getViralAutoFactory();
  if (!factory) {
    return res.status(500).json({ success: false, error: 'ViralAutoFactory not available' });
  }
  next();
});

// GET /api/viral-auto-factory/status - Get current status
router.get('/status', async (req, res) => {
  try {
    const factory = getViralAutoFactory();
    if (!factory) {
      return res.json({ success: false, error: 'Service not available' });
    }
    const status = factory.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('[ViralAutoFactory] Status error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// GET /api/viral-auto-factory/metrics - Get metrics
router.get('/metrics', async (req, res) => {
  try {
    const factory = getViralAutoFactory();
    if (!factory) {
      return res.json({ success: false, error: 'Service not available' });
    }
    const metrics = factory.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('[ViralAutoFactory] Metrics error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// POST /api/viral-auto-factory/start - Start the auto factory
router.post('/start', async (req, res) => {
  try {
    const factory = getViralAutoFactory();
    if (!factory) {
      return res.json({ success: false, error: 'Service not available' });
    }
    const result = factory.start();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[ViralAutoFactory] Start error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// POST /api/viral-auto-factory/stop - Stop the auto factory
router.post('/stop', async (req, res) => {
  try {
    const factory = getViralAutoFactory();
    if (!factory) {
      return res.json({ success: false, error: 'Service not available' });
    }
    const result = factory.stop();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[ViralAutoFactory] Stop error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// POST /api/viral-auto-factory/trigger - Trigger manual discovery
router.post('/trigger', async (req, res) => {
  try {
    const factory = getViralAutoFactory();
    if (!factory) {
      return res.json({ success: false, error: 'Service not available' });
    }
    await factory.runAutoDiscovery();
    res.json({ success: true, message: 'Discovery triggered' });
  } catch (error) {
    console.error('[ViralAutoFactory] Trigger error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
</parameter>
</create_file>
