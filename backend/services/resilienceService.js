/**
 * ClipperAi2026 - OVERLORD Phase 6: Resilience & Self-Healing Service
 * Automatic failure recovery and intelligent retry system
 */

const logger = require('../utils/logger');

const failureCounts = new Map();
const circuitBreakers = new Map();

const CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
  FAILURE_THRESHOLD: 5,
  CIRCUIT_RESET_TIMEOUT_MS: 60000
};

function shouldRetry(job) {
  const jobId = job?.id || job?.jobId || 'unknown';
  const jobType = job?.jobType || job?.type || 'default';
  const retryCount = parseInt(job?.retry_count || job?.retryCount || 0);
  
  if (isCircuitOpen(jobType)) {
    logger.warn('[Resilience] Circuit open for job type:', jobType);
    return { shouldRetry: false, reason: 'circuit_open', degraded: true };
  }
  
  if (retryCount >= CONFIG.MAX_RETRIES) {
    return { shouldRetry: false, reason: 'max_retries_exceeded', degraded: true };
  }
  
  const errorMsg = (job?.error_message || job?.errorMessage || '').toLowerCase();
  const nonRetryable = ['invalid_input', 'authentication_failed', 'quota_exceeded', 'unsupported_format'];
  
  if (nonRetryable.some(e => errorMsg.includes(e))) {
    return { shouldRetry: false, reason: 'non_retryable_error', degraded: true };
  }
  
  return { shouldRetry: true, reason: 'retry_allowed', remainingRetries: CONFIG.MAX_RETRIES - retryCount };
}

function applyBackoffStrategy(job) {
  const retryCount = parseInt(job?.retry_count || job?.retryCount || 0);
  let backoff = CONFIG.INITIAL_BACKOFF_MS * Math.pow(CONFIG.BACKOFF_MULTIPLIER, retryCount);
  backoff = Math.min(backoff, CONFIG.MAX_BACKOFF_MS);
  const jitter = backoff * 0.1 * (Math.random() * 2 - 1);
  const finalBackoff = Math.round(backoff + jitter);
  logger.info('[Resilience] Backoff applied', { jobId: job?.id, retryCount, backoffMs: finalBackoff });
  return finalBackoff;
}

function trackFailurePattern(jobType) {
  const type = jobType || 'default';
  const currentCount = failureCounts.get(type) || 0;
  const newCount = currentCount + 1;
  failureCounts.set(type, newCount);
  if (newCount >= CONFIG.FAILURE_THRESHOLD) {
    openCircuit(type);
  }
  return { jobType: type, consecutiveFailures: newCount, circuitOpen: isCircuitOpen(type) };
}

function resetFailureCount(jobType) {
  const type = jobType || 'default';
  failureCounts.set(type, 0);
  if (isCircuitOpen(type)) closeCircuit(type);
}

function getFailureStats() {
  const stats = {};
  for (const [type, count] of failureCounts.entries()) {
    stats[type] = { consecutiveFailures: count, circuitOpen: isCircuitOpen(type) };
  }
  return stats;
}

function isCircuitOpen(jobType) {
  const type = jobType || 'default';
  const circuit = circuitBreakers.get(type);
  if (!circuit) return false;
  if (circuit.open && Date.now() > circuit.resetAt) {
    circuitBreakers.set(type, { open: false, openedAt: null, resetAt: null });
    return false;
  }
  return circuit.open;
}

function openCircuit(jobType) {
  const type = jobType || 'default';
  circuitBreakers.set(type, {
    open: true,
    openedAt: Date.now(),
    resetAt: Date.now() + CONFIG.CIRCUIT_RESET_TIMEOUT_MS
  });
  logger.warn('[Resilience] Circuit opened for type:', type);
}

function closeCircuit(jobType) {
  const type = jobType || 'default';
  circuitBreakers.set(type, { open: false, openedAt: null, resetAt: null });
  logger.info('[Resilience] Circuit closed for type:', type);
}

function getCircuitStatus() {
  const status = {};
  for (const [type, circuit] of circuitBreakers.entries()) {
    status[type] = { open: circuit.open, openedAt: circuit.openedAt, resetAt: circuit.resetAt };
  }
  return status;
}

function getConfig() {
  return { ...CONFIG };
}

function resetAll() {
  failureCounts.clear();
  circuitBreakers.clear();
  logger.info('[Resilience] All tracking reset');
}

module.exports = {
  shouldRetry,
  applyBackoffStrategy,
  trackFailurePattern,
  resetFailureCount,
  getFailureStats,
  isCircuitOpen,
  openCircuit,
  closeCircuit,
  getCircuitStatus,
  getConfig,
  resetAll,
  CONFIG
};
