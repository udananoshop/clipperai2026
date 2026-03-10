/**
 * SELF-REPAIR AI ENGINE ROUTES
 * ClipperAI2026 - Self-Healing AI Module
 * 
 * API endpoints for self-repair operations
 */

const express = require('express');
const router = express.Router();
const selfRepairAgent = require('../ai/selfRepairAgent');

// =============================================================================
// ROUTES
// =============================================================================

// POST /api/self-repair/start - Start self-repair monitoring
router.post('/start', async (req, res) => {
  try {
    const result = selfRepairAgent.start();
    res.json({
      success: result.success,
      message: result.message,
      status: selfRepairAgent.getStatus()
    });
  } catch (error) {
    console.error('[SelfRepair Route] Start error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/self-repair/stop - Stop self-repair monitoring
router.post('/stop', async (req, res) => {
  try {
    const result = selfRepairAgent.stop();
    res.json({
      success: result.success,
      message: result.message,
      status: selfRepairAgent.getStatus()
    });
  } catch (error) {
    console.error('[SelfRepair Route] Stop error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/self-repair/status - Get self-repair status
router.get('/status', (req, res) => {
  try {
    const status = selfRepairAgent.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[SelfRepair Route] Status error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/self-repair/diagnose - Run system diagnosis
router.post('/diagnose', async (req, res) => {
  try {
    console.log('[SelfRepair Route] Running system diagnosis...');
    const diagnosis = await selfRepairAgent.diagnoseSystem();
    
    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    console.error('[SelfRepair Route] Diagnose error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/self-repair/fix-last - Fix last detected error
router.post('/fix-last', async (req, res) => {
  try {
    console.log('[SelfRepair Route] Attempting to fix last error...');
    const result = await selfRepairAgent.fixLastError();
    
    res.json({
      success: result.success,
      message: result.success ? 'Error fix attempted' : 'No errors to fix',
      data: result
    });
  } catch (error) {
    console.error('[SelfRepair Route] Fix error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/self-repair/patches - Get all patches
router.get('/patches', (req, res) => {
  try {
    const patches = selfRepairAgent.getPatches();
    res.json({
      success: true,
      data: patches
    });
  } catch (error) {
    console.error('[SelfRepair Route] Patches error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/self-repair/apply - Apply a specific patch
router.post('/apply', async (req, res) => {
  try {
    const { patchId } = req.body;
    
    if (!patchId) {
      return res.status(400).json({
        success: false,
        error: 'patchId is required'
      });
    }
    
    const patches = selfRepairAgent.getPatches();
    const patch = patches.applied.find(p => p.id === patchId) || 
                  patches.failed.find(p => p.id === patchId);
    
    if (!patch) {
      return res.status(404).json({
        success: false,
        error: 'Patch not found'
      });
    }
    
    const result = await selfRepairAgent.applyPatch(patch);
    
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('[SelfRepair Route] Apply error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/self-repair/rollback - Rollback last patch
router.post('/rollback', async (req, res) => {
  try {
    console.log('[SelfRepair Route] Rolling back last patch...');
    const result = await selfRepairAgent.rollbackLastPatch();
    
    res.json({
      success: result.success,
      message: result.success ? 'Patch rolled back' : 'Rollback failed',
      data: result
    });
  } catch (error) {
    console.error('[SelfRepair Route] Rollback error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/self-repair/patch/:id - Get specific patch details
router.get('/patch/:id', (req, res) => {
  try {
    const { id } = req.params;
    const patches = selfRepairAgent.getPatches();
    
    const patch = patches.applied.find(p => p.id === id) || 
                  patches.failed.find(p => p.id === id);
    
    if (!patch) {
      return res.status(404).json({
        success: false,
        error: 'Patch not found'
      });
    }
    
    res.json({
      success: true,
      data: patch
    });
  } catch (error) {
    console.error('[SelfRepair Route] Get patch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/self-repair/analyze - Analyze a specific error
router.post('/analyze', async (req, res) => {
  try {
    const { error, stack, context } = req.body;
    
    if (!error) {
      return res.status(400).json({
        success: false,
        error: 'Error object is required'
      });
    }
    
    const errorRecord = {
      message: error.message || error,
      stack: stack || '',
      errorType: error.errorType || error.type || 'Unknown',
      ...context
    };
    
    const analysis = await selfRepairAgent.analyzeError(errorRecord);
    const patch = await selfRepairAgent.createPatch(errorRecord, analysis);
    
    res.json({
      success: true,
      data: {
        error: errorRecord,
        analysis,
        patch
      }
    });
  } catch (error) {
    console.error('[SelfRepair Route] Analyze error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

router.get('/health', (req, res) => {
  const status = selfRepairAgent.getStatus();
  res.json({
    success: true,
    active: status.active,
    systemHealth: status.detectedErrors > 0 ? 'degraded' : 'healthy',
    stats: {
      scans: status.scanCount,
      repairs: status.repairCount,
      errors: status.detectedErrors,
      patches: status.appliedPatches
    }
  });
});

module.exports = router;

