/**
 * System Monitor Service
 * OVERLORD AI DIRECTOR - System Monitoring Module
 * 
 * Monitors:
 * - Memory usage
 * - CPU load
 * - FFmpeg activity
 * - File storage
 * - Upload directory
 * - Output directory
 * - Cache status
 * 
 * Optimized for 8GB RAM - lightweight monitoring
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Lazy-loaded dependencies
let resourceMonitor = null;
let downloader = null;
let autoClipEngine = null;

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try { resourceMonitor = require('../core/resourceMonitor'); } catch (e) {}
  }
  return resourceMonitor;
};

const getDownloader = () => {
  if (!downloader) {
    try { downloader = require('./downloader'); } catch (e) {}
  }
  return downloader;
};

const getAutoClipEngine = () => {
  if (!autoClipEngine) {
    try { autoClipEngine = require('../engine/autoClipEngine'); } catch (e) {}
  }
  return autoClipEngine;
};

// Configuration
const CONFIG = {
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  OUTPUT_DIR: process.env.OUTPUT_DIR || path.join(__dirname, '..', 'output'),
  CACHE_DIR: process.env.CACHE_DIR || path.join(__dirname, '..', 'cache'),
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  MAX_STORAGE_GB: 50, // Max storage warning threshold in GB
  MEMORY_WARNING_THRESHOLD: 80,
  MEMORY_CRITICAL_THRESHOLD: 92
};

/**
 * Get memory usage
 */
function getMemoryStatus() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  const heapUsedPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  const systemUsedPercent = Math.round((usedMem / totalMem) * 100);
  
  return {
    heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)) + 'MB',
    heapPercent: heapUsedPercent,
    systemUsed: Math.round(usedMem / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
    systemTotal: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
    systemPercent: systemUsedPercent,
    status: heapUsedPercent >= CONFIG.MEMORY_CRITICAL_THRESHOLD ? 'critical' : 
            heapUsedPercent >= CONFIG.MEMORY_WARNING_THRESHOLD ? 'warning' : 'normal'
  };
}

/**
 * Get CPU usage
 */
function getCPUStatus() {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  
  // Calculate average CPU usage
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idlePercent = totalIdle / totalTick * 100;
  const usedPercent = 100 - idlePercent;
  
  return {
    cores: cpus.length,
    loadAverage: {
      '1min': Math.round(loadAvg[0] * 100) / 100,
      '5min': Math.round(loadAvg[1] * 100) / 100,
      '15min': Math.round(loadAvg[2] * 100) / 100
    },
    usagePercent: Math.round(usedPercent),
    model: cpus[0]?.model || 'Unknown',
    status: usedPercent >= 85 ? 'critical' : usedPercent >= 70 ? 'warning' : 'normal'
  };
}

/**
 * Check FFmpeg status
 */
function getFFmpegStatus() {
  try {
    // Check if FFmpeg is available
    const { execSync } = require('child_process');
    const version = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 5000 })
      .split('\n')[0]
      .replace('ffmpeg version ', '');
    
    // Check for running FFmpeg processes
    const { exec } = require('child_process');
    let ffmpegProcesses = 0;
    
    try {
      exec('tasklist /FI "IMAGENAME eq ffmpeg.exe" /NH', (error, stdout) => {
        if (!error && stdout) {
          ffmpegProcesses = stdout.split('\n').filter(line => line.includes('ffmpeg')).length;
        }
      });
    } catch (e) {
      // On non-Windows, this might fail
      ffmpegProcesses = 0;
    }
    
    return {
      available: true,
      version,
      activeProcesses: ffmpegProcesses,
      status: 'running'
    };
  } catch (error) {
    return {
      available: false,
      version: null,
      activeProcesses: 0,
      status: 'not_found',
      error: 'FFmpeg not found in PATH'
    };
  }
}

/**
 * Get storage info for a directory
 */
function getDirectorySize(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return { exists: false, size: 0, files: 0 };
    }
    
    let totalSize = 0;
    let fileCount = 0;
    
    const countDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          try {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              countDir(itemPath);
            } else {
              totalSize += stat.size;
              fileCount++;
            }
          } catch (e) {
            // Skip inaccessible files
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };
    
    countDir(dirPath);
    
    return {
      exists: true,
      size: Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
      sizeBytes: totalSize,
      files: fileCount,
      path: dirPath
    };
  } catch (error) {
    return { exists: false, size: 0, files: 0, error: error.message };
  }
}

/**
 * Get storage status
 */
function getStorageStatus() {
  const uploads = getDirectorySize(CONFIG.UPLOAD_DIR);
  const output = getDirectorySize(CONFIG.OUTPUT_DIR);
  
  // Get disk info
  let diskFree = 0;
  let diskTotal = 0;
  
  try {
    // For Windows
    const { execSync } = require('child_process');
    const diskInfo = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8', timeout: 5000 });
    const lines = diskInfo.trim().split('\n');
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/);
      if (parts.length >= 3) {
        diskFree = parseInt(parts[1]) || 0;
        diskTotal = parseInt(parts[2]) || 0;
      }
    }
  } catch (e) {
    // Fallback - estimate from total memory
    diskTotal = 100 * 1024 * 1024 * 1024; // Assume 100GB
    diskFree = diskTotal - (os.totalmem() - os.freemem());
  }
  
  const diskUsedPercent = diskTotal > 0 ? Math.round((diskTotal - diskFree) / diskTotal * 100) : 0;
  
  return {
    uploads,
    output,
    disk: {
      free: Math.round(diskFree / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
      total: Math.round(diskTotal / (1024 * 1024 * 1024) * 100) / 100 + 'GB',
      usedPercent: diskUsedPercent,
      status: diskUsedPercent >= 95 ? 'critical' : diskUsedPercent >= 85 ? 'warning' : 'normal'
    },
    totalSize: (uploads.sizeBytes || 0) + (output.sizeBytes || 0)
  };
}

/**
 * Get cache status
 */
function getCacheStatus() {
  const cacheDir = CONFIG.CACHE_DIR;
  let cacheSize = 0;
  let cacheFiles = 0;
  
  try {
    if (fs.existsSync(cacheDir)) {
      const items = fs.readdirSync(cacheDir);
      for (const item of items) {
        const itemPath = path.join(cacheDir, item);
        try {
          const stat = fs.statSync(itemPath);
          if (stat.isFile()) {
            cacheSize += stat.size;
            cacheFiles++;
          }
        } catch (e) {}
      }
    }
  } catch (error) {
    // Cache dir doesn't exist
  }
  
  return {
    exists: fs.existsSync(cacheDir),
    size: Math.round(cacheSize / (1024 * 1024) * 100) / 100 + 'MB',
    files: cacheFiles,
    canClean: cacheFiles > 0
  };
}

/**
 * Get upload directory status
 */
function getUploadStatus() {
  return getDirectorySize(CONFIG.UPLOAD_DIR);
}

/**
 * Get output directory status
 */
function getOutputStatus() {
  return getDirectorySize(CONFIG.OUTPUT_DIR);
}

/**
 * Get downloader status
 */
function getDownloaderStatus() {
  const dl = getDownloader();
  
  if (!dl) {
    return {
      available: false,
      active: 0,
      queued: 0,
      status: 'unavailable'
    };
  }
  
  // Try to get downloader state if available
  let active = 0;
  let queued = 0;
  
  try {
    if (dl.getState) {
      const state = dl.getState();
      active = state?.activeDownloads || 0;
      queued = state?.queuedDownloads || 0;
    }
  } catch (e) {
    // Downloader might not have getState
  }
  
  return {
    available: true,
    active,
    queued,
    status: active > 0 ? 'downloading' : 'idle'
  };
}

/**
 * Get clip engine status
 */
function getClipEngineStatus() {
  const engine = getAutoClipEngine();
  
  if (!engine) {
    return {
      available: false,
      active: 0,
      status: 'unavailable'
    };
  }
  
  return {
    available: true,
    active: 0, // Would need to check actual engine state
    status: 'ready'
  };
}

/**
 * Get overall server health
 */
function getServerHealth() {
  const memory = getMemoryStatus();
  const cpu = getCPUStatus();
  const ffmpeg = getFFmpegStatus();
  const storage = getStorageStatus();
  
  // Determine overall health
  let health = 'healthy';
  const issues = [];
  
  if (memory.status === 'critical') {
    health = 'critical';
    issues.push('Memory critical');
  } else if (memory.status === 'warning') {
    health = health === 'healthy' ? 'warning' : health;
    issues.push('Memory warning');
  }
  
  if (cpu.status === 'critical') {
    health = 'critical';
    issues.push('CPU critical');
  } else if (cpu.status === 'warning') {
    health = health === 'healthy' ? 'warning' : health;
    issues.push('CPU warning');
  }
  
  if (!ffmpeg.available) {
    issues.push('FFmpeg not found');
  }
  
  if (storage.disk.status === 'critical') {
    health = 'critical';
    issues.push('Disk critical');
  } else if (storage.disk.status === 'warning') {
    health = health === 'healthy' ? 'warning' : health;
    issues.push('Disk warning');
  }
  
  return {
    overall: health,
    memory,
    cpu,
    ffmpeg,
    storage,
    issues,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get compact status for quick checks
 */
function getQuickStatus() {
  const health = getServerHealth();
  
  return {
    status: health.overall,
    memory: health.memory.status,
    cpu: health.cpu.status,
    disk: health.storage.disk.status,
    ffmpeg: health.ffmpeg.status,
    issues: health.issues,
    timestamp: health.timestamp
  };
}

/**
 * Get suggestions based on current status
 */
function getSuggestions() {
  const health = getServerHealth();
  const suggestions = [];
  
  if (health.memory.status === 'critical') {
    suggestions.push({
      priority: 'high',
      action: 'Free up memory',
      details: 'Consider clearing temp files or restarting the server'
    });
  }
  
  if (health.storage.disk.status === 'warning') {
    suggestions.push({
      priority: 'medium',
      action: 'Clean up storage',
      details: 'Output directory is getting full. Consider archiving old files.'
    });
  }
  
  if (!health.ffmpeg.available) {
    suggestions.push({
      priority: 'high',
      action: 'Install FFmpeg',
      details: 'FFmpeg is required for video processing'
    });
  }
  
  if (health.storage.uploads.exists && health.storage.uploads.files === 0) {
    suggestions.push({
      priority: 'low',
      action: 'Scan uploads',
      details: 'No files found in uploads folder - consider rescanning'
    });
  }
  
  return suggestions;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getMemoryStatus,
  getCPUStatus,
  getFFmpegStatus,
  getStorageStatus,
  getCacheStatus,
  getUploadStatus,
  getOutputStatus,
  getDownloaderStatus,
  getClipEngineStatus,
  getServerHealth,
  getQuickStatus,
  getSuggestions,
  CONFIG
};

