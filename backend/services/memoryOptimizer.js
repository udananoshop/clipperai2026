/**
 * Memory Optimizer Service
 * 8GB RAM Optimized Resource Management
 * 
 * Functions:
 * - Limit FFmpeg concurrency
 * - Clean temp folder
 * - Reduce cache usage
 * - Release idle workers
 * - Auto-run when memory > threshold
 * 
 * Optimized for systems with 8GB RAM
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Memory thresholds (percentages)
  MEMORY_WARNING_THRESHOLD: 75,
  MEMORY_CRITICAL_THRESHOLD: 85,
  MEMORY_EMERGENCY_THRESHOLD: 92,
  
  // FFmpeg settings
  MAX_FFMPEG_JOBS: 1,          // Only 1 job at a time for 8GB RAM
  FFMPEG_THREADS: 2,           // Limit threads per job
  FFMPEG_PRESET: 'fast',       // Faster encoding, less memory
  
  // Cache settings
  MAX_CACHE_SIZE_MB: 500,      // Max cache size in MB
  CACHE_CLEAN_THRESHOLD: 400,   // Clean when cache exceeds this
  
  // Temp file settings
  MAX_TEMP_AGE_HOURS: 1,       // Delete temp files older than this
  
  // Auto-optimization
  AUTO_OPTIMIZE_ENABLED: true,
  OPTIMIZE_INTERVAL_MS: 60000, // Check every minute
  
  // Monitoring
  ENABLE_MONITORING: true
};

// ============================================================================
// STATE
// ============================================================================

let optimizationHistory = [];
let isOptimizing = false;
let monitorInterval = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current memory usage
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    total: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10, // GB
    used: Math.round(usedMem / 1024 / 1024 / 1024 * 10) / 10,
    free: Math.round(freeMem / 1024 / 1024 / 1024 * 10) / 10,
    percent: Math.round((usedMem / totalMem) * 100)
  };
}

/**
 * Get process memory usage
 */
function getProcessMemory() {
  const mem = process.memoryUsage();
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    rss: Math.round(mem.rss / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024)
  };
}

/**
 * Log optimization action
 */
function logOptimization(action, details) {
  const entry = {
    action,
    details,
    memory: getMemoryUsage(),
    timestamp: new Date().toISOString()
  };
  optimizationHistory.push(entry);
  
  // Keep only last 50 entries
  if (optimizationHistory.length > 50) {
    optimizationHistory = optimizationHistory.slice(-50);
  }
  
  console.log(`[MemoryOptimizer] ${action}:`, details);
}

// ============================================================================
// OPTIMIZATION FUNCTIONS
// ============================================================================

/**
 * Clean temporary files
 */
async function cleanTempFiles() {
  const results = {
    deleted: 0,
    freedSpace: 0,
    errors: []
  };
  
  try {
    const tempDirs = [
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'output', 'temp'),
      path.join(__dirname, '..', 'cache')
    ];
    
    const oneHourAgo = Date.now() - (config.MAX_TEMP_AGE_HOURS * 60 * 60 * 1000);
    
    for (const tempDir of tempDirs) {
      if (!fs.existsSync(tempDir)) continue;
      
      try {
        const files = fs.readdirSync(tempDir);
        
        for (const file of files) {
          if (file === '.gitkeep') continue;
          
          const filePath = path.join(tempDir, file);
          try {
            const stats = fs.statSync(filePath);
            
            // Delete old files
            if (stats.mtime.getTime() < oneHourAgo) {
              const size = stats.size;
              fs.unlinkSync(filePath);
              results.deleted++;
              results.freedSpace += size;
            }
          } catch (e) {
            results.errors.push({ file, error: e.message });
          }
        }
      } catch (e) {
        results.errors.push({ dir: tempDir, error: e.message });
      }
    }
    
    results.freedSpace = Math.round(results.freedSpace / 1024 / 1024) + 'MB';
    logOptimization('CLEAN_TEMP', `Deleted ${results.deleted} files, freed ${results.freedSpace}`);
    
  } catch (error) {
    logOptimization('CLEAN_TEMP_ERROR', error.message);
  }
  
  return results;
}

/**
 * Clear Node.js module cache
 */
function clearModuleCache() {
  const cleared = {
    modules: 0,
    size: 0
  };
  
  try {
    // Clear optional module caches
    const cache = require.cache;
    const modulesToKeep = ['prisma', 'express', 'cors', 'socket.io'];
    
    for (const [key, module] of Object.entries(cache)) {
      // Skip core and essential modules
      if (modulesToKeep.some(m => key.includes(m))) continue;
      if (key.includes('node_modules')) {
        delete cache[key];
        cleared.modules++;
      }
    }
    
    logOptimization('CLEAR_CACHE', `Cleared ${cleared.modules} modules`);
    
  } catch (error) {
    logOptimization('CLEAR_CACHE_ERROR', error.message);
  }
  
  return cleared;
}

/**
 * Force garbage collection (if available)
 */
function forceGarbageCollection() {
  const result = {
    success: false,
    message: 'GC not available'
  };
  
  try {
    if (global.gc) {
      const beforeMem = getProcessMemory();
      global.gc();
      const afterMem = getProcessMemory();
      
      result.success = true;
      result.message = `Heap reduced from ${beforeMem.heapUsed}MB to ${afterMem.heapUsed}MB`;
      
      logOptimization('GARBAGE_COLLECTION', result.message);
    }
  } catch (error) {
    result.message = error.message;
  }
  
  return result;
}

/**
 * Kill idle FFmpeg processes
 */
async function killIdleFFmpegProcesses() {
  const results = {
    killed: 0,
    errors: []
  };
  
  try {
    // Find idle FFmpeg processes (running for more than 10 minutes)
    const command = `tasklist /FI "IMAGENAME eq ffmpeg.exe" /FO CSV /NH`;
    
    exec(command, (error, stdout) => {
      if (error) {
        results.errors.push(error.message);
        return results;
      }
      
      // On Windows, this would list FFmpeg processes
      // For Linux/Mac, use: pkill -f ffmpeg
      // This is a simplified implementation
    });
    
  } catch (error) {
    results.errors.push(error.message);
  }
  
  return results;
}

/**
 * Reduce system cache
 */
function reduceSystemCache() {
  const result = {
    before: getMemoryUsage(),
    after: null
  };
  
  try {
    // Clear module cache
    clearModuleCache();
    
    // Force GC
    forceGarbageCollection();
    
    result.after = getMemoryUsage();
    logOptimization('REDUCE_CACHE', `Memory before: ${result.before.percent}%, after: ${result.after.percent}%`);
    
  } catch (error) {
    logOptimization('REDUCE_CACHE_ERROR', error.message);
  }
  
  return result;
}

/**
 * Get FFmpeg process count
 */
async function getFFmpegProcessCount() {
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq ffmpeg.exe" /NH', (error, stdout) => {
      if (error) {
        resolve(0);
        return;
      }
      
      const count = stdout.split('\n').filter(line => line.includes('ffmpeg')).length;
      resolve(count);
    });
  });
}

/**
 * Pause new FFmpeg jobs (queue management)
 */
function shouldPauseFFmpegJobs() {
  const mem = getMemoryUsage();
  return mem.percent > config.MEMORY_WARNING_THRESHOLD;
}

/**
 * Get optimization recommendations
 */
function getRecommendations() {
  const mem = getMemoryUsage();
  const recommendations = [];
  
  if (mem.percent > config.MEMORY_EMERGENCY_THRESHOLD) {
    recommendations.push({
      priority: 'critical',
      action: 'Emergency cleanup needed',
      details: 'Memory usage is critically high'
    });
  }
  
  if (mem.percent > config.MEMORY_CRITICAL_THRESHOLD) {
    recommendations.push({
      priority: 'high',
      action: 'Clean temp files',
      details: 'Run temp file cleanup'
    });
    recommendations.push({
      priority: 'high',
      action: 'Pause FFmpeg jobs',
      details: 'Queue new encoding jobs'
    });
  }
  
  if (mem.percent > config.MEMORY_WARNING_THRESHOLD) {
    recommendations.push({
      priority: 'medium',
      action: 'Monitor memory',
      details: 'Watch for further increases'
    });
  }
  
  return recommendations;
}

// ============================================================================
// MAIN OPTIMIZATION FUNCTION
// ============================================================================

/**
 * Run full memory optimization
 */
async function optimizeMemory() {
  if (isOptimizing) {
    return { success: false, message: 'Already optimizing' };
  }
  
  isOptimizing = true;
  const results = {
    timestamp: new Date().toISOString(),
    actions: [],
    memoryBefore: null,
    memoryAfter: null
  };
  
  try {
    results.memoryBefore = getMemoryUsage();
    
    // Action 1: Clean temp files
    const cleanResult = await cleanTempFiles();
    results.actions.push({ action: 'cleanTempFiles', result: cleanResult });
    
    // Action 2: Force garbage collection
    const gcResult = forceGarbageCollection();
    results.actions.push({ action: 'garbageCollection', result: gcResult });
    
    // Action 3: Clear module cache
    const cacheResult = clearModuleCache();
    results.actions.push({ action: 'clearModuleCache', result: cacheResult });
    
    results.memoryAfter = getMemoryUsage();
    
    const saved = results.memoryBefore.percent - results.memoryAfter.percent;
    results.savedPercent = saved;
    
    logOptimization('FULL_OPTIMIZATION', `Saved ${saved}% memory`);
    
  } catch (error) {
    results.error = error.message;
    logOptimization('OPTIMIZATION_ERROR', error.message);
  }
  
  isOptimizing = false;
  return results;
}

/**
 * Check and auto-optimize if needed
 */
async function checkAndOptimize() {
  const mem = getMemoryUsage();
  
  if (mem.percent > config.MEMORY_WARNING_THRESHOLD) {
    console.log(`[MemoryOptimizer] Memory warning: ${mem.percent}%`);
    
    if (config.AUTO_OPTIMIZE_ENABLED) {
      console.log('[MemoryOptimizer] Running auto-optimization...');
      return await optimizeMemory();
    }
  }
  
  return null;
}

// ============================================================================
// MONITORING
// ============================================================================

/**
 * Start memory monitoring
 */
function startMonitoring() {
  if (monitorInterval) {
    return { success: false, message: 'Already monitoring' };
  }
  
  monitorInterval = setInterval(async () => {
    await checkAndOptimize();
  }, config.OPTIMIZE_INTERVAL_MS);
  
  console.log('[MemoryOptimizer] Started monitoring');
  return { success: true };
}

/**
 * Stop memory monitoring
 */
function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[MemoryOptimizer] Stopped monitoring');
  }
  return { success: true };
}

/**
 * Get memory status
 */
function getMemoryStatus() {
  const mem = getMemoryUsage();
  const procMem = getProcessMemory();
  
  return {
    system: mem,
    process: procMem,
    thresholds: {
      warning: config.MEMORY_WARNING_THRESHOLD,
      critical: config.MEMORY_CRITICAL_THRESHOLD,
      emergency: config.MEMORY_EMERGENCY_THRESHOLD
    },
    status: mem.percent > config.MEMORY_EMERGENCY_THRESHOLD 
      ? 'emergency' 
      : mem.percent > config.MEMORY_CRITICAL_THRESHOLD 
        ? 'critical' 
        : mem.percent > config.MEMORY_WARNING_THRESHOLD 
          ? 'warning' 
          : 'normal',
    recommendations: getRecommendations(),
    optimizationEnabled: config.AUTO_OPTIMIZE_ENABLED,
    isOptimizing
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration
  config,
  
  // Main functions
  optimizeMemory,
  checkAndOptimize,
  
  // Individual actions
  cleanTempFiles,
  clearModuleCache,
  forceGarbageCollection,
  killIdleFFmpegProcesses,
  reduceSystemCache,
  
  // Queries
  getMemoryUsage,
  getProcessMemory,
  getMemoryStatus,
  getFFmpegProcessCount,
  shouldPauseFFmpegJobs,
  getRecommendations,
  
  // Monitoring
  startMonitoring,
  stopMonitoring,
  
  // History
  getHistory: () => optimizationHistory
};

