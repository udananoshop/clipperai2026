/**
 * VIRAL DOWNLOADER SERVICE
 * Downloads viral videos using yt-dlp
 * 
 * Constraints:
 * - Max 2 concurrent downloads
 * - Save to: backend/downloads/viral/
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  maxConcurrentDownloads: 2,
  outputDir: path.join(__dirname, '..', 'downloads', 'viral'),
  timeout: 300000, // 5 minutes
  ytDlpPath: process.env.YTDLP_PATH || 'yt-dlp'
};

// Queue management
const downloadQueue = [];
const activeDownloads = new Map();

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Check if we can start a new download
 */
function canStartDownload() {
  return activeDownloads.size < CONFIG.maxConcurrentDownloads;
}

/**
 * Get the next pending download from queue
 */
function getNextFromQueue() {
  if (downloadQueue.length > 0 && canStartDownload()) {
    return downloadQueue.shift();
  }
  return null;
}

/**
 * Process the download queue
 */
function processQueue() {
  while (canStartDownload()) {
    const next = getNextFromQueue();
    if (!next) break;
    
    const { id, url, options, resolve, reject } = next;
    executeDownload(id, url, options).then(resolve).catch(reject);
  }
}

/**
 * Execute the actual download using yt-dlp
 */
function executeDownload(id, url, options = {}) {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(CONFIG.outputDir, '%(title)s_%(id)s.%(ext)s');
    
    const args = [
      '-f', 'bestvideo+bestaudio',
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--no-warnings',
      '--no-check-certificate',
      '--socket-timeout', '30',
      url
    ];
    
    console.log(`[ViralDownloader] Starting download: ${url}`);
    console.log(`[ViralDownloader] Active downloads: ${activeDownloads.size + 1}/${CONFIG.maxConcurrentDownloads}`);
    
    const startTime = Date.now();
    
    const proc = spawn(CONFIG.ytDlpPath, args, {
      shell: 'cmd.exe',
      env: { ...process.env }
    });
    
    activeDownloads.set(id, {
      process: proc,
      startTime,
      url,
      status: 'downloading'
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Timeout handler
    const timeout = setTimeout(() => {
      proc.kill();
      activeDownloads.delete(id);
      
      reject(new Error('Download timeout'));
      processQueue();
    }, CONFIG.timeout);
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      activeDownloads.delete(id);
      
      const duration = Date.now() - startTime;
      
      if (code !== 0) {
        console.error(`[ViralDownloader] Download failed with code ${code}: ${stderr}`);
        
        // Check for specific errors
        if (stderr.includes('private') || stderr.includes('Private')) {
          reject(new Error('PRIVATE_VIDEO'));
        } else if (stderr.includes('unsupported') || stderr.includes('Unsupported')) {
          reject(new Error('UNSUPPORTED_URL'));
        } else if (stderr.includes('login') || stderr.includes('Login')) {
          reject(new Error('LOGIN_REQUIRED'));
        } else {
          reject(new Error('DOWNLOAD_FAILED'));
        }
        return;
      }
      
      // Find the downloaded file
      try {
        const files = fs.readdirSync(CONFIG.outputDir);
        const latestFile = files
          .filter(f => f.endsWith('.mp4'))
          .sort((a, b) => {
            const statA = fs.statSync(path.join(CONFIG.outputDir, a));
            const statB = fs.statSync(path.join(CONFIG.outputDir, b));
            return statB.mtime - statA.mtime;
          })[0];
        
        if (latestFile) {
          const filePath = path.join(CONFIG.outputDir, latestFile);
          const stats = fs.statSync(filePath);
          
          console.log(`[ViralDownloader] Download complete: ${latestFile} (${duration}ms)`);
          
          resolve({
            success: true,
            id: id,
            filePath: filePath,
            filename: latestFile,
            size: stats.size,
            duration: duration,
            url: url
          });
        } else {
          reject(new Error('FILE_NOT_FOUND'));
        }
      } catch (err) {
        console.error('[ViralDownloader] File detection error:', err);
        reject(err);
      }
      
      processQueue();
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      activeDownloads.delete(id);
      
      console.error('[ViralDownloader] Process error:', err.message);
      
      if (err.message.includes('ENOENT')) {
        reject(new Error('YTDLP_NOT_FOUND'));
      } else {
        reject(err);
      }
      
      processQueue();
    });
  });
}

/**
 * Queue a video for download
 */
function queueDownload(url, options = {}) {
  return new Promise((resolve, reject) => {
    const id = 'viral_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    if (canStartDownload()) {
      // Start immediately
      executeDownload(id, url, options).then(resolve).catch(reject);
    } else {
      // Add to queue
      console.log(`[ViralDownloader] Queueing download: ${url} (Queue size: ${downloadQueue.length + 1})`);
      downloadQueue.push({ id, url, options, resolve, reject });
    }
  });
}

/**
 * Download multiple videos sequentially
 */
async function downloadMultiple(urls, options = {}) {
  const results = [];
  
  for (const url of urls) {
    try {
      const result = await queueDownload(url, options);
      results.push(result);
    } catch (error) {
      console.error(`[ViralDownloader] Failed to download ${url}:`, error.message);
      results.push({
        success: false,
        url: url,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get current download status
 */
function getStatus() {
  return {
    active: activeDownloads.size,
    queued: downloadQueue.length,
    maxConcurrent: CONFIG.maxConcurrentDownloads,
    activeDownloads: Array.from(activeDownloads.entries()).map(([id, data]) => ({
      id,
      url: data.url,
      status: data.status,
      duration: Date.now() - data.startTime
    }))
  };
}

/**
 * Cancel a download (if possible)
 */
function cancelDownload(id) {
  if (activeDownloads.has(id)) {
    const download = activeDownloads.get(id);
    download.process.kill();
    activeDownloads.delete(id);
    console.log(`[ViralDownloader] Cancelled download: ${id}`);
    return true;
  }
  
  // Check queue
  const queueIndex = downloadQueue.findIndex(d => d.id === id);
  if (queueIndex !== -1) {
    downloadQueue.splice(queueIndex, 1);
    console.log(`[ViralDownloader] Removed from queue: ${id}`);
    return true;
  }
  
  return false;
}

/**
 * Clear all queued downloads
 */
function clearQueue() {
  downloadQueue.length = 0;
  console.log('[ViralDownloader] Queue cleared');
}

/**
 * Get output directory path
 */
function getOutputDir() {
  return CONFIG.outputDir;
}

module.exports = {
  queueDownload,
  downloadMultiple,
  getStatus,
  cancelDownload,
  clearQueue,
  getOutputDir,
  CONFIG
};

