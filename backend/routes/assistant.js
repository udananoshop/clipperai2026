/**
 * AI ASSISTANT ROUTES
 * ClipperAI2026 Auto Content Factory
 * 
 * API endpoints for the AI Assistant Command System
 */

const express = require('express');
const router = express.Router();
const assistant = require('../ai/assistant');

// =============================================================================
// ROUTES
// =============================================================================

// POST /api/assistant/command - Process a command
router.post('/command', async (req, res) => {
  try {
    const { command, input } = req.body;
    
    if (!command && !input) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }
    
    const cmd = command || input;
    console.log('[Assistant Route] Processing:', cmd);
    
    const result = await assistant.processCommand(cmd);
    
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/assistant/status - Get assistant status
router.get('/status', (req, res) => {
  try {
    const status = assistant.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[Assistant Route] Status error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/assistant/commands - Get available commands
router.get('/commands', (req, res) => {
  try {
    const status = assistant.getStatus();
    res.json({
      success: true,
      data: {
        commands: status.commands,
        count: status.commands.length
      }
    });
  } catch (error) {
    console.error('[Assistant Route] Commands error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/scan - Quick scan command
router.post('/scan', async (req, res) => {
  try {
    const result = await assistant.processCommand('scan viral videos');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Scan error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/trending - Quick trending command
router.post('/trending', async (req, res) => {
  try {
    const result = await assistant.processCommand('scan trending');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Trending error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/health - Quick health check
router.post('/health', async (req, res) => {
  try {
    const result = await assistant.processCommand('show system health');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Health error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/stats - Quick stats
router.post('/stats', async (req, res) => {
  try {
    const result = await assistant.processCommand('stats');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Stats error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/memory - Quick memory check
router.post('/memory', async (req, res) => {
  try {
    const result = await assistant.processCommand('optimize memory');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Memory error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/pause - Pause AI processing
router.post('/pause', async (req, res) => {
  try {
    const result = await assistant.processCommand('pause');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Pause error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/resume - Resume AI processing
router.post('/resume', async (req, res) => {
  try {
    const result = await assistant.processCommand('resume');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Resume error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/assistant/generate - Generate clips
router.post('/generate', async (req, res) => {
  try {
    const result = await assistant.processCommand('generate clips');
    res.json(result);
  } catch (error) {
    console.error('[Assistant Route] Generate error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/assistant/ping - Health check endpoint
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

