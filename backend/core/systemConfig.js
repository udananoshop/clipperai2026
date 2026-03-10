/**
 * OVERLORD PRO MODE - Phase 1
 * Centralized Configuration Manager
 * 
 * Responsibilities:
 * - Detect environment (dev/production)
 * - Define system-wide configuration values
 * - Provide backward-compatible defaults
 * - Lightweight for low-spec systems (Ryzen 3, 8GB RAM)
 */

const logger = require('../utils/logger');

/**
 * Detect current environment
 * @returns {string} 'development' or 'production'
 */
function detectEnvironment() {
  const env = process.env.NODE_ENV?.toLowerCase();
  
  // Check for explicit production flag
  if (env === 'production') {
    return 'production';
  }
  
  // Check for development flag
  if (env === 'development' || !env) {
    return 'development';
  }
  
  // Default to development for safety
  return 'development';
}

/**
 * Get CPU-safe concurrency limit based on system specs
 * Optimized for Ryzen 3 (8GB RAM) - conservative defaults
 * @returns {number} Safe concurrent job limit
 */
function getSafeConcurrencyLimit() {
  const cpuCores = require('os').cpus().length;
  const totalMemMB = require('os').totalmem() / (1024 * 1024);
  
  // Conservative limits for low-spec systems
  if (totalMemMB < 6000) { // Less than 6GB RAM
    return 2;
  }
  if (totalMemMB < 12000) { // 6-12GB RAM
    return Math.min(cpuCores, 3);
  }
  // 12GB+ RAM
  return Math.min(cpuCores, 4);
}

/**
 * System Configuration Object
 */
const config = {
  // Environment
  ENV: detectEnvironment(),
  isDev: detectEnvironment() === 'development',
  isProd: detectEnvironment() === 'production',
  
  // OVERLORD PRO MODE - Feature flags
  ENABLE_PRO_MODE: process.env.ENABLE_PRO_MODE === 'true',
  
  // Safe mode - throttles system under load
  SAFE_MODE: process.env.SAFE_MODE !== 'false', // Default true for safety
  
  // Concurrency limits
  MAX_CONCURRENT_JOBS: parseInt(process.env.MAX_CONCURRENT_JOBS) || getSafeConcurrencyLimit(),
  
  // Execution timeout in milliseconds (default 5 minutes)
  EXECUTION_TIMEOUT: parseInt(process.env.EXECUTION_TIMEOUT_MS) || 300000,
  
  // Queue settings
  QUEUE_CHECK_INTERVAL: 5000,
  JOB_RETRY_DELAY: 2000,
  
  // Memory thresholds (percentage)
  MEMORY_WARNING_THRESHOLD: 80,
  MEMORY_CRITICAL_THRESHOLD: 90,
  
  // System info
  CPU_CORES: require('os').cpus().length,
  TOTAL_MEMORY_MB: Math.round(require('os').totalmem() / (1024 * 1024)),
  
// Feature flags for future scalability
  USE_SERVER_MODE: true, // Always true for Phase 1
  ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false',
  
  // Monetization Engine (Level 4)
  ENABLE_MONETIZATION_ENGINE: process.env.ENABLE_MONETIZATION_ENGINE === 'true',
  
  // Backward compatibility - use legacy behavior if PRO_MODE disabled
  LEGACY_MODE: process.env.ENABLE_PRO_MODE !== 'true'
};

// Log configuration on startup
function logConfig() {
  const mode = config.ENABLE_PRO_MODE ? 'OVERLORD PRO' : 'LEGACY';
  const safeMode = config.SAFE_MODE ? 'ENABLED' : 'DISABLED';
  
  console.log('═══════════════════════════════════════');
  console.log('  OVERLORD PRO MODE - Phase 1');
  console.log('═══════════════════════════════════════');
  console.log(`  Mode: ${mode}`);
  console.log(`  Environment: ${config.ENV}`);
  console.log(`  Safe Mode: ${safeMode}`);
  console.log(`  Max Concurrent Jobs: ${config.MAX_CONCURRENT_JOBS}`);
  console.log(`  Execution Timeout: ${config.EXECUTION_TIMEOUT}ms`);
  console.log(`  CPU Cores: ${config.CPU_CORES}`);
  console.log(`  Total Memory: ${config.TOTAL_MEMORY_MB}MB`);
  console.log('═══════════════════════════════════════');
  
  // Log to file
  logger.info('System configuration loaded', {
    mode,
    environment: config.ENV,
    safeMode: config.SAFE_MODE,
    maxConcurrentJobs: config.MAX_CONCURRENT_JOBS,
    cpuCores: config.CPU_CORES,
    totalMemoryMB: config.TOTAL_MEMORY_MB
  });
}

// Auto-log on module load if in production or PRO_MODE enabled
if (config.isProd || config.ENABLE_PRO_MODE) {
  logConfig();
}

/**
 * Get configuration value
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
function get(key, defaultValue) {
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Check if PRO mode is active
 * @returns {boolean}
 */
function isProModeEnabled() {
  return config.ENABLE_PRO_MODE;
}

/**
 * Check if safe mode is active
 * @returns {boolean}
 */
function isSafeModeEnabled() {
  return config.SAFE_MODE;
}

/**
 * Update configuration (runtime changes)
 * @param {string} key - Configuration key
 * @param {*} value - New value
 */
function set(key, value) {
  if (config.hasOwnProperty(key)) {
    config[key] = value;
    logger.info(`Configuration updated: ${key}`, { key, value });
  }
}

module.exports = {
  config,
  get,
  set,
  isProModeEnabled,
  isSafeModeEnabled,
  logConfig,
  detectEnvironment,
  getSafeConcurrencyLimit
};
