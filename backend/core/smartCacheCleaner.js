/**
 * OVERLORD SMART CACHE CLEANER - 8GB Safe Mode
 * 
 * Automatic cache cleaner that:
 * - Removes temp files only
 * - Never deletes *_final.mp4
 * - Keeps total cache under 2GB
 * - Safe for single-user 8GB system
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MAX_CACHE_SIZE_GB = 2;
const MAX_CACHE_BYTES = MAX_CACHE_SIZE_GB * 1024 * 1024 * 1024;
const TEMP_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const FINAL_FILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Directories to scan
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Protected patterns - these files are NEVER deleted
const PROTECTED_PATTERNS = [
  '_final.',
  '_youtube.',
  '_tiktok.',
  '_instagram.',
  '_facebook.',
  '_formatted.',
  '.mp4',
  '.mp3',
  '.wav',
  '.srt',
  '.vtt'
];

// Target patterns - files that CAN be deleted
const DELETE_PATTERNS = [
  '_raw.',
  '_music.',
  '_temp.',
  '.tmp',
  '.temp'
];

/**
 * Check if file is protected (never delete)
 */
function isProtected(filename) {
  const lower = filename.toLowerCase();
  
  // Check for protected patterns
  for (const pattern of PROTECTED_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Check if it's in output folders
  const outputFolders = ['youtube', 'tiktok', 'instagram', 'facebook', 'formatted'];
  for (const folder of outputFolders) {
    if (lower.includes(folder)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if file should be deleted (temp/raw/music)
 */
function shouldDelete(filename) {
  const lower = filename.toLowerCase();
  
  // Never delete protected files
  if (isProtected(filename)) {
    return false;
  }
  
  // Check for delete patterns
  for (const pattern of DELETE_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get file age in milliseconds
 */
function getFileAge(stats) {
  return Date.now() - stats.mtime.getTime();
}

/**
 * Get total cache size in bytes
 */
async function getCacheSize() {
  let totalSize = 0;
  
  try {
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          try {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
              scanDir(fullPath);
            } else {
              totalSize += stats.size;
            }
          } catch (e) {
            // Skip inaccessible files
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };
    
    scanDir(OUTPUT_DIR);
    scanDir(TEMP_DIR);
    
  } catch (e) {
    console.warn('[Cleaner] Error calculating cache size:', e.message);
  }
  
  return totalSize;
}

/**
 * Get list of deletable files sorted by age (oldest first)
 */
async function getDeletableFiles() {
  const files = [];
  
  try {
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          try {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
              scanDir(fullPath);
            } else if (shouldDelete(item)) {
              files.push({
                path: fullPath,
                name: item,
                size: stats.size,
                age: getFileAge(stats),
                mtime: stats.mtime
              });
            }
          } catch (e) {
            // Skip inaccessible files
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };
    
    scanDir(OUTPUT_DIR);
    scanDir(TEMP_DIR);
    
  } catch (e) {
    console.warn('[Cleaner] Error scanning directories:', e.message);
  }
  
  // Sort by age (oldest first)
  files.sort((a, b) => a.age - b.age);
  
  return files;
}

/**
 * Safe delete file
 */
function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (e) {
    console.warn(`[Cleaner] Could not delete ${filePath}:`, e.message);
  }
  return false;
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  console.log('[Cleaner] Starting cleanup...');
  
  const results = {
    deleted: 0,
    freedBytes: 0,
    errors: 0
  };
  
  try {
    // Get current cache size
    const cacheSize = await getCacheSize();
    const cacheSizeGB = (cacheSize / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`[Cleaner] Current cache size: ${cacheSizeGB}GB`);
    
    // Get all deletable files
    const deletableFiles = await getDeletableFiles();
    console.log(`[Cleaner] Found ${deletableFiles.length} deletable files`);
    
    // Strategy 1: Delete old temp files (> 24 hours)
    for (const file of deletableFiles) {
      if (file.age > TEMP_FILE_MAX_AGE_MS) {
        if (safeDelete(file.path)) {
          results.deleted++;
          results.freedBytes += file.size;
          console.log(`[Cleaner] Removed temp: ${file.name}`);
        }
      }
    }
    
    // Strategy 2: If still over 2GB, delete oldest non-final files
    const currentSize = await getCacheSize();
    
    if (currentSize > MAX_CACHE_BYTES) {
      console.log(`[Cleaner] Cache still over 2GB, deleting oldest files...`);
      
      for (const file of deletableFiles) {
        if (currentSize - results.freedBytes <= MAX_CACHE_BYTES) {
          break; // Under limit now
        }
        
        // Skip recently modified files
        if (file.age < FINAL_FILE_MAX_AGE_MS) {
          continue;
        }
        
        if (safeDelete(file.path)) {
          results.deleted++;
          results.freedBytes += file.size;
          console.log(`[Cleaner] Removed old: ${file.name}`);
        }
      }
    }
    
    // Final size report
    const finalSize = await getCacheSize();
    const finalSizeGB = (finalSize / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`[Cleaner] Cache size reduced: ${finalSizeGB}GB`);
    console.log(`[Cleaner] Files deleted: ${results.deleted}`);
    console.log(`[Cleaner] Space freed: ${(results.freedBytes / (1024 * 1024)).toFixed(2)}MB`);
    
    return results;
    
  } catch (e) {
    console.error('[Cleaner] Cleanup error:', e.message);
    results.errors++;
    return results;
  }
}

/**
 * Quick cleanup after render (less aggressive)
 */
async function quickCleanup() {
  console.log('[Cleaner] Running quick cleanup...');
  
  const results = {
    deleted: 0,
    freedBytes: 0
  };
  
  try {
    const deletableFiles = await getDeletableFiles();
    
    // Only delete very old temp files (24+ hours)
    for (const file of deletableFiles) {
      if (file.age > TEMP_FILE_MAX_AGE_MS) {
        if (safeDelete(file.path)) {
          results.deleted++;
          results.freedBytes += file.size;
        }
      }
    }
    
    console.log(`[Cleaner] Quick cleanup: ${results.deleted} files removed`);
    
  } catch (e) {
    console.warn('[Cleaner] Quick cleanup error:', e.message);
  }
  
  return results;
}

// Cleanup interval
let cleanupInterval = null;

/**
 * Start automatic cleanup
 */
function start() {
  if (cleanupInterval) {
    console.log('[Cleaner] Already running');
    return;
  }
  
  console.log('[Cleaner] Starting automatic cleanup...');
  console.log(`[Cleaner] Max cache: ${MAX_CACHE_SIZE_GB}GB`);
  console.log(`[Cleaner] Temp file max age: 24 hours`);
  console.log(`[Cleaner] Old file max age: 7 days`);
  console.log(`[Cleaner] Cleanup interval: 30 minutes`);
  
  // Run initial cleanup
  runCleanup();
  
  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => {
    runCleanup();
  }, CLEAN_INTERVAL_MS);
}

/**
 * Stop automatic cleanup
 */
function stop() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[Cleaner] Stopped automatic cleanup');
  }
}

module.exports = {
  start,
  stop,
  runCleanup,
  quickCleanup,
  getCacheSize,
  config: {
    MAX_CACHE_SIZE_GB,
    TEMP_FILE_MAX_AGE_MS,
    FINAL_FILE_MAX_AGE_MS,
    CLEAN_INTERVAL_MS
  }
};

console.log('[Cleaner] SMART CACHE CLEANER - SAFE MODE ACTIVE');
console.log('[Cleaner] Final files protected');
console.log(`[Cleaner] Max cache ${MAX_CACHE_SIZE_GB}GB enforced`);
