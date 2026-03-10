/**
 * OVERLORD ELITE MODE - Phase 6
 * Intelligent Telemetry Layer
 * 
 * Lightweight telemetry tracking
 * Persists snapshot every 60 seconds
 */

const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

// Telemetry file path
const TELEMETRY_FILE = path.join(__dirname, '..', 'data', 'telemetry-snapshot.json');

// In-memory telemetry
const telemetry = {
  totalJobsProcessed: 0,
  totalJobsFailed: 0,
  averageExecutionTime: 0,
  peakConcurrencyReached: 0,
  lastOverloadTimestamp: null
};

// Execution time tracking
const executionTimes = [];
const MAX_EXECUTION_TIMES = 100;

// Last snapshot save time
let lastSnapshotTime = 0;
const SNAPSHOT_INTERVAL = 60000; // 60 seconds

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  const dataDir = path.dirname(TELEMETRY_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Safe JSON parse
 */
function safeParse(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Load telemetry from file
 */
function loadTelemetry() {
  ensureDataDir();
  
  try {
    if (fs.existsSync(TELEMETRY_FILE)) {
      const data = fs.readFileSync(TELEMETRY_FILE, 'utf8');
      const parsed = safeParse(data);
      if (parsed) {
        telemetry.totalJobsProcessed = parsed.totalJobsProcessed || 0;
        telemetry.totalJobsFailed = parsed.totalJobsFailed || 0;
        telemetry.averageExecutionTime = parsed.averageExecutionTime || 0;
        telemetry.peakConcurrencyReached = parsed.peakConcurrencyReached || 0;
        telemetry.lastOverloadTimestamp = parsed.lastOverloadTimestamp || null;
      }
    }
  } catch (err) {
    logger.warn('Failed to load telemetry', { error: err.message });
  }
  
  return telemetry;
}

/**
 * Save telemetry snapshot
 */
function saveTelemetry() {
  ensureDataDir();
  
  try {
    const data = JSON.stringify(telemetry, null, 2);
    fs.writeFileSync(TELEMETRY_FILE, data, 'utf8');
    console.log('[Telemetry] Snapshot saved');
    logger.info('Telemetry snapshot saved', telemetry);
  } catch (err) {
    logger.error('Failed to save telemetry', { error: err.message });
  }
}

/**
 * Record job completion
 * @param {number} executionTimeMs - Job execution time in ms
 * @param {boolean} success - Whether job succeeded
 */
function recordJobComplete(executionTimeMs, success = true) {
  // Update counters
  if (success) {
    telemetry.totalJobsProcessed++;
  } else {
    telemetry.totalJobsFailed++;
  }
  
  // Track execution time
  if (executionTimeMs > 0) {
    executionTimes.push(executionTimeMs);
    if (executionTimes.length > MAX_EXECUTION_TIMES) {
      executionTimes.shift();
    }
    
    // Calculate average
    if (executionTimes.length > 0) {
      const sum = executionTimes.reduce((a, b) => a + b, 0);
      telemetry.averageExecutionTime = Math.round(sum / executionTimes.length);
    }
  }
  
  // Check if snapshot interval passed
  const now = Date.now();
  if (now - lastSnapshotTime >= SNAPSHOT_INTERVAL) {
    lastSnapshotTime = now;
    saveTelemetry();
  }
}

/**
 * Update peak concurrency
 * @param {number} currentConcurrency - Current concurrency level
 */
function updatePeakConcurrency(currentConcurrency) {
  if (currentConcurrency > telemetry.peakConcurrencyReached) {
    telemetry.peakConcurrencyReached = currentConcurrency;
    console.log(`[Telemetry] Peak concurrency updated: ${currentConcurrency}`);
    logger.info('Peak concurrency updated', { peak: currentConcurrency });
  }
}

/**
 * Record overload event
 */
function recordOverload() {
  telemetry.lastOverloadTimestamp = new Date().toISOString();
}

/**
 * Get current telemetry
 */
function getTelemetry() {
  return { ...telemetry };
}

/**
 * Get telemetry summary
 */
function getSummary() {
  return {
    totalProcessed: telemetry.totalJobsProcessed,
    totalFailed: telemetry.totalJobsFailed,
    avgExecutionTime: telemetry.averageExecutionTime,
    peakConcurrency: telemetry.peakConcurrencyReached,
    lastOverload: telemetry.lastOverloadTimestamp,
    failureRate: telemetry.totalJobsProcessed > 0 
      ? (telemetry.totalJobsFailed / telemetry.totalJobsProcessed * 100).toFixed(2) + '%'
      : '0%'
  };
}

// Initialize on load
loadTelemetry();

module.exports = {
  recordJobComplete,
  updatePeakConcurrency,
  recordOverload,
  getTelemetry,
  getSummary,
  loadTelemetry,
  saveTelemetry
};
