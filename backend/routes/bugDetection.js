/**
 * Bug Detection API Routes
 * Endpoints for retrieving bug detection data
 * Lightweight implementation for 8GB RAM optimization
 */

const express = require('express');
const router = express.Router();

// Lazy load bug detection service
let bugDetectionService = null;
const getBugDetectionService = () => {
  if (!bugDetectionService) {
    bugDetectionService = require('../services/bugDetectionService');
  }
  return bugDetectionService;
};

/**
 * GET /api/bugs - Get all detected errors
 * Returns array of detected bugs (max 10)
 */
router.get('/', (req, res) => {
  try {
    const bugs = getBugDetectionService().getDetectedErrors();
    res.json({
      success: true,
      data: bugs,
      count: bugs.length,
      maxErrors: getBugDetectionService().MAX_ERRORS
    });
  } catch (error) {
    console.error('[BugDetection] Error getting bugs:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bugs'
    });
  }
});

/**
 * GET /api/bugs/latest - Get latest detected error
 * Returns the most recent bug or null if none
 */
router.get('/latest', (req, res) => {
  try {
    const latest = getBugDetectionService().getLatestError();
    res.json({
      success: true,
      data: latest
    });
  } catch (error) {
    console.error('[BugDetection] Error getting latest bug:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve latest bug'
    });
  }
});

/**
 * GET /api/bugs/count - Get error count
 * Returns the number of detected errors
 */
router.get('/count', (req, res) => {
  try {
    const count = getBugDetectionService().getErrorCount();
    res.json({
      success: true,
      count,
      maxErrors: getBugDetectionService().MAX_ERRORS
    });
  } catch (error) {
    console.error('[BugDetection] Error getting count:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve count'
    });
  }
});

/**
 * GET /api/bugs/summary - Get diagnostic summary for AI chat
 * Returns a summary of recent bugs for the AI chat
 */
router.get('/summary', (req, res) => {
  try {
    const summary = getBugDetectionService().getDiagnosticSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[BugDetection] Error getting summary:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve summary'
    });
  }
});

/**
 * GET /api/bugs/type/:type - Get errors by type
 * Returns bugs filtered by error type
 */
router.get('/type/:type', (req, res) => {
  try {
    const { type } = req.params;
    const bugs = getBugDetectionService().getErrorsByType(type);
    res.json({
      success: true,
      data: bugs,
      count: bugs.length
    });
  } catch (error) {
    console.error('[BugDetection] Error getting bugs by type:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bugs by type'
    });
  }
});

/**
 * GET /api/bugs/file/:file - Get errors by file
 * Returns bugs filtered by file name
 */
router.get('/file/:file', (req, res) => {
  try {
    const { file } = req.params;
    const bugs = getBugDetectionService().getErrorsByFile(file);
    res.json({
      success: true,
      data: bugs,
      count: bugs.length
    });
  } catch (error) {
    console.error('[BugDetection] Error getting bugs by file:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bugs by file'
    });
  }
});

/**
 * DELETE /api/bugs - Clear all detected errors
 * Clears the error cache
 */
router.delete('/', (req, res) => {
  try {
    getBugDetectionService().clearErrors();
    res.json({
      success: true,
      message: 'Bug cache cleared'
    });
  } catch (error) {
    console.error('[BugDetection] Error clearing bugs:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear bugs'
    });
  }
});

/**
 * POST /api/bugs/detect - Manually trigger bug detection
 * Allows manual testing of bug detection
 */
router.post('/detect', (req, res) => {
  try {
    const { error, context } = req.body;
    
    if (!error) {
      return res.status(400).json({
        success: false,
        error: 'Error object is required'
      });
    }

    const bug = getBugDetectionService().detectBug(error, context || {});
    res.json({
      success: true,
      data: bug
    });
  } catch (err) {
    console.error('[BugDetection] Error detecting bug:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to detect bug'
    });
  }
});

module.exports = router;

