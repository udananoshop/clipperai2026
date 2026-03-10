/**
 * OVERLORD Phase 5 - Simple Cache Utility
 * TTL-based in-memory cache
 * 
 * OVERLORD 8GB OPTIMIZATION PATCH - Cache Stabilizer
 * Tracks consecutive cache hits and triggers GC when > 5 hits
 */

// In-memory cache store
const cache = new Map();

// ============================================================================
// OVERLORD 8GB OPTIMIZATION PATCH - Cache Stabilizer
// ============================================================================

// Track consecutive cache hits
let consecutiveCacheHits = 0;
const CACHE_HIT_THRESHOLD = 5;

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  consecutiveHits: 0,
  gcCyclesTriggered: 0
};

/**
 * Trigger cache memory cleanup
 * Called when consecutive cache hits exceed threshold
 */
function triggerCacheCleanup() {
  console.log('[Optimization] Cache Memory Cleanup Triggered');
  
  // Force small GC cycle (request garbage collection)
  if (global.gc) {
    global.gc();
    console.log('[Optimization] GC cycle completed');
  }
  
  // Clear expired entries
  const cleaned = cleanup();
  console.log(`[Optimization] Cleaned ${cleaned} expired cache entries`);
  
  // Reset consecutive hits counter
  consecutiveCacheHits = 0;
  
  // Increment GC cycle counter
  cacheStats.gcCyclesTriggered++;
  
  return cleaned;
}

/**
 * Record a cache hit and check if cleanup is needed
 */
function recordCacheHit() {
  consecutiveCacheHits++;
  cacheStats.consecutiveHits = consecutiveCacheHits;
  cacheStats.hits++;
  
  // Check if we need to trigger cleanup
  if (consecutiveCacheHits > CACHE_HIT_THRESHOLD) {
    console.log(`[Optimization] Consecutive cache hits: ${consecutiveCacheHits} (threshold: ${CACHE_HIT_THRESHOLD})`);
    return triggerCacheCleanup();
  }
  
  return false;
}

/**
 * Record a cache miss
 */
function recordCacheMiss() {
  // Reset consecutive hits counter on miss
  consecutiveCacheHits = 0;
  cacheStats.consecutiveHits = 0;
  cacheStats.misses++;
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics including 8GB optimization stats
 */
function getOptimizationStats() {
  return {
    ...cacheStats,
    consecutiveHits: consecutiveCacheHits,
    cleanupThreshold: CACHE_HIT_THRESHOLD,
    needsCleanup: consecutiveCacheHits > CACHE_HIT_THRESHOLD
  };
}

// ============================================================================
// END OVERLORD 8GB OPTIMIZATION PATCH - Cache Stabilizer
// ============================================================================

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if expired/not found
 */
function get(key) {
  const item = cache.get(key);
  
  if (!item) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlMs - Time to live in milliseconds (default: 60000 = 1 min)
 */
function set(key, value, ttlMs = 60000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Cache] Set key: ${key}, TTL: ${ttlMs}ms`);
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 */
function del(key) {
  cache.delete(key);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Cache] Deleted key: ${key}`);
  }
}

/**
 * Clear all cache
 */
function clear() {
  cache.clear();
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Cache] Cleared all');
  }
}

/**
 * Get cache stats
 * @returns {Object} - Cache statistics
 */
function getStats() {
  let validCount = 0;
  let expiredCount = 0;
  const now = Date.now();
  
  for (const [key, item] of cache) {
    if (now > item.expiresAt) {
      expiredCount++;
    } else {
      validCount++;
    }
  }
  
  return {
    total: cache.size,
    valid: validCount,
    expired: expiredCount
  };
}

/**
 * Clean up expired entries
 */
function cleanup() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, item] of cache) {
    if (now > item.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (process.env.NODE_ENV !== 'production' && cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
  }
  
  return cleaned;
}

// Auto-cleanup every 5 minutes
setInterval(cleanup, 300000);

module.exports = {
  get,
  set,
  del,
  clear,
  getStats,
  cleanup,
  // OVERLORD 8GB OPTIMIZATION PATCH exports
  recordCacheHit,
  recordCacheMiss,
  getOptimizationStats,
  triggerCacheCleanup
};
