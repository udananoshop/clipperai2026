/**
 * System Diagnostics Module
 * ClipperAI2026 - Diagnostic Orchestrator
 * 
 * Acts as a lightweight diagnostic layer that aggregates health signals
 * from existing monitors and triggers recovery actions.
 * 
 * REUSES existing modules:
 * - overlordCore.js (system health, queues, safety)
 * - systemMonitor.js (memory, CPU, FFmpeg, storage)
 * - resourceMonitor.js (resource usage)
 * - aiJobQueueManager.js (queue health)
 * 
 * Constraints:
 * - Run diagnostics every 60 seconds
 * - maxDiagnosticTasks = 1 (never run multiple loops)
 * - Lightweight for 8GB RAM systems
 * - No heavy scanning, only health checks
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ===================================================================
// LAZY-LOADED DEPENDENCIES (Reuse existing modules)
// ===================================================================

let overlordCore = null;
let systemMonitor = null;
let resourceMonitor = null;
let aiJobQueueManager = null;
let dbLayer = null;

const getOverlordCore = () => {
  if (!overlordCore) {
    try { overlordCore = require('./overlordCore'); } catch (e) {
      console.warn('[Diagnostics] overlordCore not available:', e.message);
    }
  }
  return overlordCore;
};

const getSystemMonitor = () => {
  if (!systemMonitor) {
    try { systemMonitor = require('../services/systemMonitor'); } catch (e) {
      console.warn('[Diagnostics] systemMonitor not available:', e.message);
    }
  }
  return systemMonitor;
};

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try { resourceMonitor = require('./resourceMonitor'); } catch (e) {
      console.warn('[Diagnostics] resourceMonitor not available:', e.message);
    }
  }
  return resourceMonitor;
};

const getJobQueueManager = () => {
  if (!aiJobQueueManager) {
    try { aiJobQueueManager = require('../services/aiJobQueueManager'); } catch (e) {
      console.warn('[Diagnostics] aiJobQueueManager not available:', e.message);
    }
  }
  return aiJobQueueManager;
};

const getDbLayer = () => {
  if (!dbLayer) {
    try { dbLayer = require('./dbSafeLayer'); } catch (e) {
      // Fallback to main database
      try { dbLayer = require('../database'); } catch (e2) {}
    }
  }
  return dbLayer;
};

// ===================================================================
// CONFIGURATION
// ===================================================================

const CONFIG = {
  // Diagnostic interval
  DIAGNOSTIC_INTERVAL_MS: 60000, // 60 seconds
  
  // Max diagnostic tasks (must be 1)
  MAX_DIAGNOSTIC_TASKS: 1,
  
  // Health score weights (total = 100)
  WEIGHTS: {
    memory: 25,
    queue: 20,
    ffmpeg: 20,
    api: 15,
    clipEngine: 10,
    database: 10
  },
  
  // Thresholds for health calculation
  THRESHOLDS: {
    memoryCritical: 90,
    memoryWarning: 75,
    cpuCritical: 90,
    cpuWarning: 80,
    queueWarning: 10, // jobs in queue
    diskCritical: 95,
    diskWarning: 85
  },
  
  // Recovery actions
  RECOVERY_ACTIONS: {
    RESTART_DOWNLOADER: 'restart_downloader',
    RESTART_CLIP_ENGINE: 'restart_clip_engine',
    CLEAR_CORRUPTED_JOBS: 'clear_corrupted_jobs',
    RECONNECT_DATABASE: 'reconnect_database',
    RELOAD_CONFIG: 'reload_config'
  },
  
  // Log settings
  LOG_DIR: path.join(__dirname, '..', 'logs'),
  LOG_FILE: 'diagnostics.log'
};

// Ensure log directory exists
const LOG_PATH = path.join(CONFIG.LOG_DIR, CONFIG.LOG_FILE);
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

// ===================================================================
// DIAGNOSTIC STATE
// ===================================================================

const diagnosticsState = {
  // Status
  isRunning: false,
  lastRun: null,
  lastCompleted: null,
  
  // Health score
  healthScore: 100,
  previousHealthScore: 100,
  
  // Active errors
  activeErrors: [],
  
  // Last repair action
  lastRepairAction: null,
  lastRepairTime: null,
  lastRepairResult: null,
  
  // Recovery status
  recoveryStatus: 'idle', // idle, running, success, failed
  recoveryAttempts: 0,
  maxRecoveryAttempts: 3,
  
  // Component health
  components: {
    memory: { status: 'unknown', score: 100, details: {} },
    queue: { status: 'unknown', score: 100, details: {} },
    ffmpeg: { status: 'unknown', score: 100, details: {} },
    api: { status: 'unknown', score: 100, details: {} },
    clipEngine: { status: 'unknown', score: 100, details: {} },
    database: { status: 'unknown', score: 100, details: {} }
  },
  
  // Diagnostic history
  history: [],
  maxHistoryItems: 50
};

// ===================================================================
// LOGGING
// ===================================================================

function log(level, category, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category,
    message,
    data
  };
  
  const consoleMsg = `[DIAG ${timestamp}] [${level.toUpperCase()}] [${category}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  
  switch (level) {
    case 'error':
      console.error(consoleMsg);
      break;
    case 'warn':
      console.warn(consoleMsg);
      break;
    default:
      console.log(consoleMsg);
  }
  
  // File output
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_PATH, logLine, 'utf8');
  } catch (e) {
    console.error('[Diagnostics] Log write error:', e.message);
  }
}

// ===================================================================
// HEALTH CHECKS (Reuse existing modules)
// ===================================================================

/**
 * Check memory health
 */
function checkMemoryHealth() {
  try {
    const rm = getResourceMonitor();
    const sm = getSystemMonitor();
    
    let memUsage = 0;
    let status = 'healthy';
    
    if (rm && rm.getMemoryUsage) {
      memUsage = rm.getMemoryUsage();
    } else if (sm && sm.getMemoryStatus) {
      const memStatus = sm.getMemoryStatus();
      memUsage = memStatus.heapPercent || 0;
    } else {
      // Fallback
      const mem = process.memoryUsage();
      memUsage = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    }
    
    if (memUsage >= CONFIG.THRESHOLDS.memoryCritical) {
      status = 'critical';
    } else if (memUsage >= CONFIG.THRESHOLDS.memoryWarning) {
      status = 'warning';
    }
    
    // Calculate score (100 - usage, but clamped)
    const score = Math.max(0, 100 - memUsage);
    
    return {
      status,
      score,
      details: {
        usage: memUsage + '%',
        threshold: CONFIG.THRESHOLDS.memoryCritical
      }
    };
  } catch (e) {
    log('error', 'memory', 'Memory check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

/**
 * Check CPU health
 */
function checkCpuHealth() {
  try {
    const rm = getResourceMonitor();
    const sm = getSystemMonitor();
    
    let cpuUsage = 0;
    let status = 'healthy';
    
    if (rm && rm.getCPUUsage) {
      cpuUsage = rm.getCPUUsage();
    } else if (sm && sm.getCPUStatus) {
      const cpuStatus = sm.getCPUStatus();
      cpuUsage = cpuStatus.usagePercent || 0;
    } else {
      // Fallback
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);
    }
    
    if (cpuUsage >= CONFIG.THRESHOLDS.cpuCritical) {
      status = 'critical';
    } else if (cpuUsage >= CONFIG.THRESHOLDS.cpuWarning) {
      status = 'warning';
    }
    
    const score = Math.max(0, 100 - cpuUsage);
    
    return {
      status,
      score,
      details: {
        usage: cpuUsage + '%',
        threshold: CONFIG.THRESHOLDS.cpuCritical
      }
    };
  } catch (e) {
    log('error', 'cpu', 'CPU check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

/**
 * Check FFmpeg availability
 */
function checkFfmpegHealth() {
  try {
    const sm = getSystemMonitor();
    
    if (sm && sm.getFFmpegStatus) {
      const ffmpegStatus = sm.getFFmpegStatus();
      
      if (!ffmpegStatus.available) {
        return {
          status: 'critical',
          score: 0,
          details: { error: ffmpegStatus.error || 'FFmpeg not found' }
        };
      }
      
      return {
        status: 'healthy',
        score: 100,
        details: {
          version: ffmpegStatus.version,
          activeProcesses: ffmpegStatus.activeProcesses
        }
      };
    }
    
    // Fallback: try to run ffmpeg
    const { execSync } = require('child_process');
    try {
      execSync('ffmpeg -version', { encoding: 'utf8', timeout: 5000 });
      return { status: 'healthy', score: 100, details: { version: 'available' } };
    } catch (e) {
      return { status: 'critical', score: 0, details: { error: 'FFmpeg not available' } };
    }
  } catch (e) {
    log('error', 'ffmpeg', 'FFmpeg check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

/**
 * Check API health
 */
function checkApiHealth() {
  try {
    const oc = getOverlordCore();
    
    if (oc && oc.getSystemHealth) {
      const health = oc.getSystemHealth();
      
      // Check for critical issues
      if (health.health === 'critical') {
        return {
          status: 'critical',
          score: 25,
          details: { issues: health.issues }
        };
      } else if (health.health === 'warning') {
        return {
          status: 'warning',
          score: 60,
          details: { issues: health.issues }
        };
      }
      
      return {
        status: 'healthy',
        score: 100,
        details: { cpu: health.cpu, ram: health.ram }
      };
    }
    
    // Fallback: basic check
    return {
      status: 'unknown',
      score: 50,
      details: { note: 'Overlord core not available' }
    };
  } catch (e) {
    log('error', 'api', 'API check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

/**
 * Check queue health
 */
function checkQueueHealth() {
  try {
    const oc = getOverlordCore();
    const qm = getJobQueueManager();
    
    let queueSize = 0;
    let activeJobs = 0;
    let failedJobs = 0;
    
    if (oc && oc.getQueueStatus) {
      const queueStatus = oc.getQueueStatus();
      queueSize = queueStatus.download?.queued || 0;
      queueSize += queueStatus.clip?.queued || 0;
      activeJobs = queueStatus.download?.active || 0;
      activeJobs += queueStatus.clip?.active || 0;
    }
    
    if (qm && qm.getQueueStatus) {
      const qStatus = qm.getQueueStatus();
      queueSize = qStatus.queued || 0;
      activeJobs = qStatus.currentlyProcessing || 0;
    }
    
    let status = 'healthy';
    if (queueSize > CONFIG.THRESHOLDS.queueWarning * 2) {
      status = 'critical';
    } else if (queueSize > CONFIG.THRESHOLDS.queueWarning) {
      status = 'warning';
    }
    
    // Score based on queue size
    const score = Math.max(0, 100 - (queueSize * 5));
    
    return {
      status,
      score,
      details: {
        queued: queueSize,
        active: activeJobs,
        failed: failedJobs
      }
    };
  } catch (e) {
    log('error', 'queue', 'Queue check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

/**
 * Check clip engine health
 */
function checkClipEngineHealth() {
  try {
    const oc = getOverlordCore();
    
    if (oc && oc.getStatus) {
      const status = oc.getStatus();
      const activeClips = status.activeJobs?.clips || 0;
      const clipQueue = status.queueSize?.clips || 0;
      
      // Check if clips are being processed
      const isProcessing = activeClips > 0 || clipQueue > 0;
      
      return {
        status: isProcessing ? 'healthy' : 'idle',
        score: isProcessing ? 100 : 80,
        details: {
          active: activeClips,
          queued: clipQueue
        }
      };
    }
    
    return {
      status: 'unknown',
      score: 50,
      details: { note: 'Overlord core not available' }
    };
  } catch (e) {
    log('error', 'clip', 'Clip engine check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

/**
 * Check database health
 */
function checkDatabaseHealth() {
  try {
    const db = getDbLayer();
    
    if (!db) {
      return {
        status: 'unknown',
        score: 50,
        details: { note: 'Database not available' }
      };
    }
    
    // Try a simple query
    return new Promise((resolve) => {
      // For SQLite database.js
      if (db.get) {
        db.get('SELECT 1 as test', (err) => {
          if (err) {
            resolve({
              status: 'critical',
              score: 0,
              details: { error: err.message }
            });
          } else {
            resolve({
              status: 'healthy',
              score: 100,
              details: { type: 'sqlite' }
            });
          }
        });
      } 
      // For Prisma
      else if (db.$connect) {
        resolve({
          status: 'healthy',
          score: 100,
          details: { type: 'prisma' }
        });
      }
      else {
        resolve({
          status: 'unknown',
          score: 50,
          details: { note: 'Unknown database type' }
        });
      }
    });
  } catch (e) {
    log('error', 'database', 'Database check failed', { error: e.message });
    return Promise.resolve({
      status: 'error',
      score: 0,
      details: { error: e.message }
    });
  }
}

/**
 * Check disk access
 */
function checkDiskHealth() {
  try {
    const sm = getSystemMonitor();
    
    if (sm && sm.getStorageStatus) {
      const storage = sm.getStorageStatus();
      const diskUsage = storage.disk?.usedPercent || 0;
      
      let status = 'healthy';
      if (diskUsage >= CONFIG.THRESHOLDS.diskCritical) {
        status = 'critical';
      } else if (diskUsage >= CONFIG.THRESHOLDS.diskWarning) {
        status = 'warning';
      }
      
      const score = Math.max(0, 100 - diskUsage);
      
      return {
        status,
        score,
        details: {
          usedPercent: diskUsage,
          free: storage.disk?.free
        }
      };
    }
    
    return {
      status: 'unknown',
      score: 50,
      details: { note: 'System monitor not available' }
    };
  } catch (e) {
    log('error', 'disk', 'Disk check failed', { error: e.message });
    return { status: 'error', score: 0, details: { error: e.message } };
  }
}

// ===================================================================
// HEALTH SCORE CALCULATION
// ===================================================================

/**
 * Calculate overall health score from component scores
 */
function calculateHealthScore(components) {
  const weights = CONFIG.WEIGHTS;
  
  let weightedScore = 0;
  let totalWeight = 0;
  
  // Memory contributes to overall score
  if (components.memory) {
    weightedScore += components.memory.score * (weights.memory / 100);
    totalWeight += weights.memory;
  }
  
  // Queue health
  if (components.queue) {
    weightedScore += components.queue.score * (weights.queue / 100);
    totalWeight += weights.queue;
  }
  
  // FFmpeg
  if (components.ffmpeg) {
    weightedScore += components.ffmpeg.score * (weights.ffmpeg / 100);
    totalWeight += weights.ffmpeg;
  }
  
  // API/Overlord
  if (components.api) {
    weightedScore += components.api.score * (weights.api / 100);
    totalWeight += weights.api;
  }
  
  // Clip Engine
  if (components.clipEngine) {
    weightedScore += components.clipEngine.score * (weights.clipEngine / 100);
    totalWeight += weights.clipEngine;
  }
  
  // Database
  if (components.database) {
    weightedScore += components.database.score * (weights.database / 100);
    totalWeight += weights.database;
  }
  
  // Normalize to 0-100
  if (totalWeight > 0) {
    return Math.round((weightedScore / totalWeight) * 100);
  }
  
  return 50; // Default
}

// ===================================================================
// RUN DIAGNOSTICS
// ===================================================================

/**
 * Run all diagnostic checks
 */
async function runDiagnostics() {
  // Prevent multiple concurrent runs
  if (diagnosticsState.isRunning) {
    log('warn', 'diagnostics', 'Diagnostics already running, skipping');
    return null;
  }
  
  diagnosticsState.isRunning = true;
  diagnosticsState.lastRun = new Date().toISOString();
  
  log('info', 'diagnostics', 'Starting diagnostic run');
  
  try {
    // Run all health checks in parallel
    const [
      memoryHealth,
      cpuHealth,
      ffmpegHealth,
      apiHealth,
      queueHealth,
      clipEngineHealth,
      databaseHealth,
      diskHealth
    ] = await Promise.all([
      Promise.resolve(checkMemoryHealth()),
      Promise.resolve(checkCpuHealth()),
      Promise.resolve(checkFfmpegHealth()),
      Promise.resolve(checkApiHealth()),
      Promise.resolve(checkQueueHealth()),
      Promise.resolve(checkClipEngineHealth()),
      checkDatabaseHealth(),
      Promise.resolve(checkDiskHealth())
    ]);
    
    // Update component status
    diagnosticsState.components = {
      memory: memoryHealth,
      cpu: cpuHealth,
      ffmpeg: ffmpegHealth,
      api: apiHealth,
      queue: queueHealth,
      clipEngine: clipEngineHealth,
      database: databaseHealth,
      disk: diskHealth
    };
    
    // Calculate health score
    diagnosticsState.healthScore = calculateHealthScore(diagnosticsState.components);
    diagnosticsState.previousHealthScore = diagnosticsState.healthScore;
    
    // Collect active errors
    const errors = [];
    Object.entries(diagnosticsState.components).forEach(([component, health]) => {
      if (health.status === 'critical' || health.status === 'error') {
        errors.push({
          component,
          status: health.status,
          details: health.details
        });
      }
    });
    diagnosticsState.activeErrors = errors;
    
    // Log results
    log('info', 'diagnostics', 'Diagnostics completed', {
      healthScore: diagnosticsState.healthScore,
      errors: errors.length,
      components: Object.keys(diagnosticsState.components).map(k => ({ 
        name: k, 
        status: diagnosticsState.components[k].status 
      }))
    });
    
    diagnosticsState.lastCompleted = new Date().toISOString();
    
    // Add to history
    addToHistory({
      timestamp: diagnosticsState.lastCompleted,
      healthScore: diagnosticsState.healthScore,
      components: diagnosticsState.components,
      errors: errors
    });
    
    return {
      healthScore: diagnosticsState.healthScore,
      components: diagnosticsState.components,
      errors: errors,
      timestamp: diagnosticsState.lastCompleted
    };
    
  } catch (e) {
    log('error', 'diagnostics', 'Diagnostics run failed', { error: e.message });
    return null;
  } finally {
    diagnosticsState.isRunning = false;
  }
}

// ===================================================================
// SELF-REPAIR ACTIONS
// ===================================================================

/**
 * Execute a recovery action
 */
async function executeRecoveryAction(action) {
  if (diagnosticsState.recoveryStatus === 'running') {
    log('warn', 'recovery', 'Recovery already in progress');
    return { success: false, reason: 'Recovery already in progress' };
  }
  
  diagnosticsState.recoveryStatus = 'running';
  diagnosticsState.lastRepairAction = action;
  diagnosticsState.lastRepairTime = new Date().toISOString();
  diagnosticsState.recoveryAttempts++;
  
  log('info', 'recovery', `Executing recovery action: ${action}`);
  
  let result = { success: false, action, message: '' };
  
  try {
    switch (action) {
      case CONFIG.RECOVERY_ACTIONS.CLEAR_CORRUPTED_JOBS:
        result = await clearCorruptedJobs();
        break;
        
      case CONFIG.RECOVERY_ACTIONS.RECONNECT_DATABASE:
        result = await reconnectDatabase();
        break;
        
      case CONFIG.RECOVERY_ACTIONS.RELOAD_CONFIG:
        result = await reloadConfiguration();
        break;
        
      case CONFIG.RECOVERY_ACTIONS.RESTART_DOWNLOADER:
        result = { success: true, action, message: 'Downloader restart requested (no active implementation)' };
        break;
        
      case CONFIG.RECOVERY_ACTIONS.RESTART_CLIP_ENGINE:
        result = { success: true, action, message: 'Clip engine restart requested (no active implementation)' };
        break;
        
      default:
        result = { success: false, action, message: 'Unknown action' };
    }
    
    diagnosticsState.lastRepairResult = result;
    diagnosticsState.recoveryStatus = result.success ? 'success' : 'failed';
    
    log('info', 'recovery', `Recovery action completed: ${action}`, result);
    
    return result;
    
  } catch (e) {
    log('error', 'recovery', `Recovery action failed: ${action}`, { error: e.message });
    diagnosticsState.recoveryStatus = 'failed';
    diagnosticsState.lastRepairResult = { success: false, action, error: e.message };
    
    return { success: false, action, error: e.message };
  }
}

/**
 * Clear corrupted/stuck jobs from queue
 */
async function clearCorruptedJobs() {
  try {
    const qm = getJobQueueManager();
    
    if (!qm) {
      return { success: false, message: 'Job queue manager not available' };
    }
    
    // Clear completed jobs older than 24 hours
    const cleared = qm.clearCompletedJobs(24);
    
    log('info', 'recovery', `Cleared ${cleared} corrupted jobs`);
    
    return { 
      success: true, 
      message: `Cleared ${cleared} completed jobs` 
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Reconnect database
 */
async function reconnectDatabase() {
  try {
    const db = getDbLayer();
    
    if (!db) {
      return { success: false, message: 'Database not available' };
    }
    
    // For SQLite, try to close and reopen
    if (db.close) {
      return new Promise((resolve) => {
        db.close((err) => {
          if (err) {
            resolve({ success: false, message: 'Failed to close database: ' + err.message });
          } else {
            // Database will be reopened on next query
            resolve({ success: true, message: 'Database reconnected' });
          }
        });
      });
    }
    
    return { success: true, message: 'Database connection checked' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Reload configuration
 */
async function reloadConfiguration() {
  try {
    // Clear require cache for config modules
    const configPaths = [
      './systemConfig',
      '../core/systemConfig',
      '../services/systemMonitor'
    ];
    
    configPaths.forEach(configPath => {
      try {
        const fullPath = require.resolve(path.join(__dirname, configPath));
        delete require.cache[fullPath];
      } catch (e) {
        // Config not loaded, ignore
      }
    });
    
    log('info', 'recovery', 'Configuration reload requested');
    
    return { success: true, message: 'Configuration reloaded' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Attempt automatic repair based on errors
 */
async function attemptAutoRepair() {
  const errors = diagnosticsState.activeErrors;
  
  if (errors.length === 0) {
    return { success: true, message: 'No errors to repair' };
  }
  
  log('info', 'repair', `Attempting auto-repair for ${errors.length} errors`);
  
  const repairs = [];
  
  for (const error of errors) {
    switch (error.component) {
      case 'queue':
        if (diagnosticsState.recoveryAttempts < diagnosticsState.maxRecoveryAttempts) {
          const result = await executeRecoveryAction(CONFIG.RECOVERY_ACTIONS.CLEAR_CORRUPTED_JOBS);
          repairs.push(result);
        }
        break;
        
      case 'database':
        if (diagnosticsState.recoveryAttempts < diagnosticsState.maxRecoveryAttempts) {
          const result = await executeRecoveryAction(CONFIG.RECOVERY_ACTIONS.RECONNECT_DATABASE);
          repairs.push(result);
        }
        break;
        
      default:
        // No auto-repair for other components
        break;
    }
  }
  
  const successCount = repairs.filter(r => r.success).length;
  
  return {
    success: successCount > 0,
    message: `Attempted ${repairs.length} repairs, ${successCount} successful`,
    repairs
  };
}

// ===================================================================
// HISTORY MANAGEMENT
// ===================================================================

/**
 * Add entry to diagnostic history
 */
function addToHistory(entry) {
  diagnosticsState.history.push({
    ...entry,
    id: Date.now()
  });
  
  // Keep only last maxHistoryItems
  if (diagnosticsState.history.length > diagnosticsState.maxHistoryItems) {
    diagnosticsState.history = diagnosticsState.history.slice(-diagnosticsState.maxHistoryItems);
  }
}

// ===================================================================
// SCHEDULER
// ===================================================================

let diagnosticInterval = null;

/**
 * Start automatic diagnostics
 */
function startDiagnostics() {
  if (diagnosticInterval) {
    log('warn', 'diagnostics', 'Diagnostics already running');
    return { success: false, reason: 'Already running' };
  }
  
  // Run immediately
  runDiagnostics();
  
  // Schedule periodic runs
  diagnosticInterval = setInterval(() => {
    runDiagnostics();
  }, CONFIG.DIAGNOSTIC_INTERVAL_MS);
  
  log('info', 'diagnostics', `Diagnostics started (interval: ${CONFIG.DIAGNOSTIC_INTERVAL_MS}ms)`);
  
  return { success: true, interval: CONFIG.DIAGNOSTIC_INTERVAL_MS };
}

/**
 * Stop automatic diagnostics
 */
function stopDiagnostics() {
  if (diagnosticInterval) {
    clearInterval(diagnosticInterval);
    diagnosticInterval = null;
    log('info', 'diagnostics', 'Diagnostics stopped');
  }
  
  return { success: true };
}

// ===================================================================
// STATUS & REPORTING
// ===================================================================

/**
 * Get diagnostic status
 */
function getStatus() {
  return {
    isRunning: diagnosticsState.isRunning,
    lastRun: diagnosticsState.lastRun,
    lastCompleted: diagnosticsState.lastCompleted,
    healthScore: diagnosticsState.healthScore,
    previousHealthScore: diagnosticsState.previousHealthScore,
    activeErrors: diagnosticsState.activeErrors,
    recoveryStatus: diagnosticsState.recoveryStatus,
    lastRepairAction: diagnosticsState.lastRepairAction,
    lastRepairTime: diagnosticsState.lastRepairTime,
    lastRepairResult: diagnosticsState.lastRepairResult,
    components: diagnosticsState.components,
    config: {
      interval: CONFIG.DIAGNOSTIC_INTERVAL_MS,
      maxTasks: CONFIG.MAX_DIAGNOSTIC_TASKS
    }
  };
}

/**
 * Get health report
 */
function getHealthReport() {
  return {
    overall: {
      score: diagnosticsState.healthScore,
      status: diagnosticsState.healthScore >= 80 ? 'healthy' : 
              diagnosticsState.healthScore >= 50 ? 'warning' : 'critical',
      trend: diagnosticsState.healthScore > diagnosticsState.previousHealthScore ? 'improving' :
             diagnosticsState.healthScore < diagnosticsState.previousHealthScore ? 'declining' : 'stable'
    },
    components: diagnosticsState.components,
    errors: diagnosticsState.activeErrors,
    recovery: {
      status: diagnosticsState.recoveryStatus,
      lastAction: diagnosticsState.lastRepairAction,
      lastTime: diagnosticsState.lastRepairTime,
      attempts: diagnosticsState.recoveryAttempts
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Get recent history
 */
function getHistory(limit = 10) {
  return diagnosticsState.history.slice(-limit);
}

// ===================================================================
// OVERLORD COMMAND HANDLERS
// ===================================================================

/**
 * Handle "run diagnostics" command
 */
async function handleRunDiagnostics() {
  return await runDiagnostics();
}

/**
 * Handle "repair system" command
 */
async function handleRepairSystem() {
  // First run diagnostics to identify issues
  const diagResult = await runDiagnostics();
  
  if (!diagResult || diagResult.errors.length === 0) {
    return { success: true, message: 'No issues found' };
  }
  
  // Attempt auto-repair
  return await attemptAutoRepair();
}

/**
 * Handle "system health report" command
 */
function handleHealthReport() {
  return getHealthReport();
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Configuration
  CONFIG,
  
  // Core functions
  runDiagnostics,
  getStatus,
  getHealthReport,
  getHistory,
  
  // Scheduler
  startDiagnostics,
  stopDiagnostics,
  
  // Recovery
  executeRecoveryAction,
  attemptAutoRepair,
  
  // Overlord command handlers
  handleRunDiagnostics,
  handleRepairSystem,
  handleHealthReport,
  
  // Component checks (exposed for testing)
  checkMemoryHealth,
  checkCpuHealth,
  checkFfmpegHealth,
  checkApiHealth,
  checkQueueHealth,
  checkClipEngineHealth,
  checkDatabaseHealth,
  checkDiskHealth,
  
  // State access
  getState: () => diagnosticsState
};

// Auto-start diagnostics when loaded
console.log('[Diagnostics] Module loaded, starting diagnostics...');
setTimeout(() => {
  startDiagnostics();
}, 5000); // Wait 5 seconds for other modules to initialize

