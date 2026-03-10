/**
 * OVERLORD ELITE MODE - Phase 5
 * Self-Learning Concurrency Memory Service
 * 
 * Persists safe concurrency memory locally
 * Uses fs module only - no DB
 */

const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

// File path for persistence
const MEMORY_FILE_PATH = path.join(__dirname, '..', 'data', 'concurrency-memory.json');

// Default memory state
const defaultMemory = {
  lastSafeConcurrency: 2,
  lastCrashDetected: false,
  timestamp: ''
};

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  const dataDir = path.dirname(MEMORY_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Safe JSON parse with fallback
 * @param {string} data - JSON string
 * @returns {Object} Parsed object or default
 */
function safeParse(data) {
  try {
    const parsed = JSON.parse(data);
    // Validate structure
    if (typeof parsed.lastSafeConcurrency === 'number' &&
        typeof parsed.lastCrashDetected === 'boolean') {
      return parsed;
    }
  } catch (err) {
    // Parse failed
  }
  return { ...defaultMemory };
}

/**
 * Load concurrency memory from file
 * @returns {Object} Memory state
 */
function loadMemory() {
  ensureDataDir();
  
  try {
    if (fs.existsSync(MEMORY_FILE_PATH)) {
      const data = fs.readFileSync(MEMORY_FILE_PATH, 'utf8');
      return safeParse(data);
    }
  } catch (err) {
    logger.warn('Failed to load concurrency memory', { error: err.message });
  }
  
  return { ...defaultMemory };
}

/**
 * Save concurrency memory to file
 * @param {Object} memory - Memory state to save
 */
function saveMemory(memory) {
  ensureDataDir();
  
  try {
    const data = JSON.stringify(memory, null, 2);
    fs.writeFileSync(MEMORY_FILE_PATH, data, 'utf8');
  } catch (err) {
    logger.error('Failed to save concurrency memory', { error: err.message });
  }
}

/**
 * Get last safe concurrency value
 * @returns {number} Last safe concurrency
 */
function getLastSafeConcurrency() {
  const memory = loadMemory();
  return memory.lastSafeConcurrency;
}

/**
 * Mark crash detected and reduce concurrency
 * Call this on forced shutdown or unhandled exception
 */
function markCrashDetected() {
  const memory = loadMemory();
  
  memory.lastCrashDetected = true;
  memory.lastSafeConcurrency = Math.max(1, memory.lastSafeConcurrency - 1);
  memory.timestamp = new Date().toISOString();
  
  saveMemory(memory);
  
  console.log(`[ConcurrencyMemory] Crash marked, reduced safe concurrency to ${memory.lastSafeConcurrency}`);
  logger.warn('Crash detected - reduced safe concurrency', {
    lastSafeConcurrency: memory.lastSafeConcurrency
  });
}

/**
 * Mark clean shutdown
 * Call this on graceful shutdown
 */
function markCleanShutdown() {
  const memory = loadMemory();
  
  memory.lastCrashDetected = false;
  memory.timestamp = new Date().toISOString();
  
  saveMemory(memory);
}

/**
 * Update safe concurrency value
 * @param {number} value - New safe concurrency value
 */
function updateSafeConcurrency(value) {
  const memory = loadMemory();
  
  memory.lastSafeConcurrency = Math.max(1, value);
  memory.timestamp = new Date().toISOString();
  
  saveMemory(memory);
}

/**
 * Get current memory state
 * @returns {Object} Memory state
 */
function getState() {
  return loadMemory();
}

/**
 * Initialize on startup
 * Returns the initial concurrency to use
 * @param {number} defaultConcurrency - Default if no memory
 * @returns {number} Initial concurrency
 */
function initialize(defaultConcurrency = 3) {
  const memory = loadMemory();
  
  // If last crash was detected, reduce default
  if (memory.lastCrashDetected) {
    console.log(`[ConcurrencyMemory] Previous crash detected, using reduced concurrency: ${memory.lastSafeConcurrency}`);
    logger.warn('Starting with reduced concurrency after previous crash', {
      lastSafeConcurrency: memory.lastSafeConcurrency
    });
    return memory.lastSafeConcurrency;
  }
  
  // Use saved value if valid
  if (memory.lastSafeConcurrency > 0) {
    console.log(`[ConcurrencyMemory] Loaded safe concurrency: ${memory.lastSafeConcurrency}`);
    return memory.lastSafeConcurrency;
  }
  
  return defaultConcurrency;
}

module.exports = {
  getLastSafeConcurrency,
  markCrashDetected,
  markCleanShutdown,
  updateSafeConcurrency,
  getState,
  initialize,
  MEMORY_FILE_PATH
};
