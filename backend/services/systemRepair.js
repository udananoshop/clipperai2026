/**
 * System Repair Service
 * OVERLORD AI DIRECTOR - Auto Repair Engine
 * 
 * Functions:
 * - scanUploads()
 * - rebuildVideoIndex()
 * - cleanTempFiles()
 * - restartFFmpegJobs()
 * - refreshCache()
 * 
 * Optimized for 8GB RAM - lightweight operations
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Lazy-loaded dependencies
let prisma = null;
let storageSync = null;
let hybridReindex = null;

const getPrisma = () => {
  if (!prisma) {
    try { prisma = require('../prisma/client'); } catch (e) {}
  }
  return prisma;
};

const getStorageSync = () => {
  if (!storageSync) {
    try { storageSync = require('./storageSyncService'); } catch (e) {}
  }
  return storageSync;
};

const getHybridReindex = () => {
  if (!hybridReindex) {
    try { hybridReindex = require('./hybridReindexService'); } catch (e) {}
  }
  return hybridReindex;
};

// Configuration
const CONFIG = {
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  OUTPUT_DIR: process.env.OUTPUT_DIR || path.join(__dirname, '..', 'output'),
  CACHE_DIR: process.env.CACHE_DIR || path.join(__dirname, '..', 'cache'),
  TEMP_DIR: process.env.TEMP_DIR || path.join(__dirname, '..', 'temp'),
  MAX_TEMP_SIZE_MB: 500
};

/**
 * Scan uploads directory and check against database
 */
async function scanUploads() {
  const results = {
    success: true,
    scanned: 0,
    missing: [],
    orphans: [],
    fixed: 0,
    timestamp: new Date().toISOString()
  };

  try {
    const db = getPrisma();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    // Get all videos from database
    const dbVideos = await db.video.findMany({
      select: { id: true, filename: true, path: true }
    });

    // Scan physical uploads directory
    let physicalFiles = [];
    
    if (fs.existsSync(CONFIG.UPLOAD_DIR)) {
      physicalFiles = fs.readdirSync(CONFIG.UPLOAD_DIR)
        .filter(f => f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.avi') || f.endsWith('.mkv'));
    }

    const physicalSet = new Set(physicalFiles);
    const dbFileSet = new Set(dbVideos.map(v => v.filename).filter(Boolean));

    // Find missing files (in DB but not on disk)
    for (const video of dbVideos) {
      if (video.filename && !physicalSet.has(video.filename)) {
        results.missing.push({
          id: video.id,
          filename: video.filename
        });
      }
    }

    // Find orphan files (on disk but not in DB)
    for (const file of physicalFiles) {
      if (!dbFileSet.has(file)) {
        results.orphans.push(file);
      }
    }

    results.scanned = physicalFiles.length;

    return results;

  } catch (error) {
    console.error('[SystemRepair] scanUploads error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Rebuild video index from physical files
 */
async function rebuildVideoIndex() {
  const results = {
    success: true,
    indexed: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  try {
    const db = getPrisma();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    // Scan uploads directory
    if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
      return { success: false, error: 'Uploads directory not found' };
    }

    const files = fs.readdirSync(CONFIG.UPLOAD_DIR)
      .filter(f => f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.avi') || f.endsWith('.mkv'));

    // Get existing database entries
    const existingVideos = await db.video.findMany({
      select: { filename: true }
    });
    const existingSet = new Set(existingVideos.map(v => v.filename));

    // Index new files
    for (const file of files) {
      try {
        if (!existingSet.has(file)) {
          const filePath = path.join(CONFIG.UPLOAD_DIR, file);
          const stat = fs.statSync(filePath);
          
          await db.video.create({
            data: {
              title: file.replace(/\.[^/.]+$/, ''),
              filename: file,
              size: stat.size,
              platform: 'youtube', // default
              status: 'uploaded'
            }
          });
          
          results.indexed++;
        }
      } catch (err) {
        results.errors.push({ file, error: err.message });
      }
    }

    return results;

  } catch (error) {
    console.error('[SystemRepair] rebuildVideoIndex error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Clean temporary files
 */
async function cleanTempFiles() {
  const results = {
    success: true,
    cleaned: 0,
    freed: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  try {
    const dirs = [CONFIG.TEMP_DIR, CONFIG.CACHE_DIR];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        try {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          // Only delete files older than 1 hour
          const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
          
          if (ageHours > 1) {
            fs.unlinkSync(filePath);
            results.cleaned++;
            results.freed += stat.size;
          }
        } catch (err) {
          results.errors.push({ file, error: err.message });
        }
      }
    }

    results.freed = Math.round(results.freed / (1024 * 1024) * 100) / 100 + 'MB';

    return results;

  } catch (error) {
    console.error('[SystemRepair] cleanTempFiles error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Restart FFmpeg jobs
 */
async function restartFFmpegJobs() {
  const results = {
    success: true,
    killed: 0,
    restarted: 0,
    timestamp: new Date().toISOString()
  };

  try {
    // Kill any hung FFmpeg processes
    const { execSync } = require('child_process');
    
    try {
      // Windows: kill ffmpeg processes
      execSync('taskkill /F /IM ffmpeg.exe', { encoding: 'utf8' });
      results.killed = 1;
    } catch (e) {
      // No FFmpeg processes running
    }

    // Also try to kill ffprobe
    try {
      execSync('taskkill /F /IM ffprobe.exe', { encoding: 'utf8' });
    } catch (e) {
      // No ffprobe processes
    }

    return results;

  } catch (error) {
    console.error('[SystemRepair] restartFFmpegJobs error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Refresh cache
 */
async function refreshCache() {
  const results = {
    success: true,
    cleared: false,
    timestamp: new Date().toISOString()
  };

  try {
    const storageSync = getStorageSync();
    
    if (storageSync?.clearCache) {
      const result = storageSync.clearCache();
      results.cleared = result.success;
    } else {
      // Manual cache clear
      if (fs.existsSync(CONFIG.CACHE_DIR)) {
        const files = fs.readdirSync(CONFIG.CACHE_DIR);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(CONFIG.CACHE_DIR, file));
          } catch (e) {}
        }
        results.cleared = true;
      }
    }

    return results;

  } catch (error) {
    console.error('[SystemRepair] refreshCache error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run full system repair
 */
async function runFullRepair() {
  const results = {
    success: true,
    operations: {},
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Scan uploads
    results.operations.scanUploads = await scanUploads();
    
    // 2. Clean temp files
    results.operations.cleanTempFiles = await cleanTempFiles();
    
    // 3. Refresh cache
    results.operations.refreshCache = await refreshCache();
    
    // 4. Kill hung FFmpeg processes
    results.operations.restartFFmpegJobs = await restartFFmpegJobs();

    // Determine overall success
    results.success = Object.values(results.operations).every(op => op.success !== false);

    return results;

  } catch (error) {
    console.error('[SystemRepair] runFullRepair error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Quick repair - lightweight operations
 */
async function quickRepair() {
  const results = {
    success: true,
    operations: {},
    timestamp: new Date().toISOString()
  };

  try {
    // Quick repair: clean temp files only
    results.operations.cleanTempFiles = await cleanTempFiles();
    results.operations.refreshCache = await refreshCache();

    return results;

  } catch (error) {
    console.error('[SystemRepair] quickRepair error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get repair suggestions based on system state
 */
async function getRepairSuggestions() {
  const suggestions = [];
  
  try {
    // Check temp files
    if (fs.existsSync(CONFIG.TEMP_DIR)) {
      const files = fs.readdirSync(CONFIG.TEMP_DIR);
      if (files.length > 10) {
        suggestions.push({
          action: 'cleanTempFiles',
          reason: `${files.length} temp files found`,
          priority: 'medium'
        });
      }
    }
    
    // Check uploads
    const scanResults = await scanUploads();
    if (scanResults.missing?.length > 0) {
      suggestions.push({
        action: 'scanUploads',
        reason: `${scanResults.missing.length} missing video files detected`,
        priority: 'high'
      });
    }
    
    if (scanResults.orphans?.length > 0) {
      suggestions.push({
        action: 'rebuildVideoIndex',
        reason: `${scanResults.orphans.length} orphan files found`,
        priority: 'low'
      });
    }
    
  } catch (error) {
    console.error('[SystemRepair] getRepairSuggestions error:', error.message);
  }
  
  return suggestions;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  scanUploads,
  rebuildVideoIndex,
  cleanTempFiles,
  restartFFmpegJobs,
  refreshCache,
  runFullRepair,
  quickRepair,
  getRepairSuggestions,
  CONFIG
};

