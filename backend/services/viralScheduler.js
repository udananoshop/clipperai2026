/**
 * VIRAL SCHEDULER SERVICE
 * Orchestrates the viral content discovery workflow
 * 
 * Runs every 30 minutes:
 * 1. Scan trending videos from various sources
 * 2. Pick top 3 viral candidates
 * 3. Send to downloader
 * 4. Trigger auto-clip engine after download
 * 
 * Constraints:
 * - Max 2 concurrent downloads
 * - Max 2 concurrent clip jobs
 */

const viralHunterService = require('./viralHunterService');
const viralDownloaderService = require('./viralDownloaderService');
const autoClipTriggerService = require('./autoClipTriggerService');
const prisma = require('../prisma/client');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  scanInterval: 30 * 60 * 1000, // 30 minutes
  topCandidatesCount: 3,
  maxClipJobs: 2,
  enabled: true
};

// Scheduler state
let schedulerInterval = null;
let isRunning = false;
let lastRun = null;
let runHistory = [];

// Clip job queue
const clipJobQueue = [];
const activeClipJobs = new Map();

/**
 * Check if we can start a new clip job
 */
function canStartClipJob() {
  return activeClipJobs.size < CONFIG.maxClipJobs;
}

/**
 * Process clip job queue
 */
async function processClipQueue() {
  while (clipJobQueue.length > 0 && canStartClipJob()) {
    const job = clipJobQueue.shift();
    await executeClipJob(job);
  }
}

/**
 * Execute a clip job
 */
async function executeClipJob(job) {
  const { videoPath, videoId, downloadId, resolve, reject } = job;
  
  try {
    console.log(`[ViralScheduler] Starting clip job for: ${videoPath}`);
    
    activeClipJobs.set(downloadId, {
      status: 'processing',
      startTime: Date.now(),
      videoPath
    });
    
    // Trigger auto-clip
    const result = await autoClipTriggerService.triggerAutoClip(videoId, {
      duration: 30
    });
    
    // Update database
    try {
      await prisma.viralDownload.update({
        where: { id: downloadId },
        data: {
          status: 'clipped',
          clipJobId: result.jobId,
          clipsGenerated: result.clips ? Object.keys(result.clips).length : 0,
          clippedAt: new Date()
        }
      });
    } catch (e) {
      console.log('[ViralScheduler] ViralDownload model not available, skipping DB update');
    }
    
    activeClipJobs.delete(downloadId);
    
    console.log(`[ViralScheduler] Clip job complete for: ${videoPath}`);
    
    if (resolve) resolve(result);
    
    // Process next in queue
    await processClipQueue();
    
  } catch (error) {
    console.error(`[ViralScheduler] Clip job failed:`, error.message);
    
    try {
      await prisma.viralDownload.update({
        where: { id: downloadId },
        data: {
          status: 'clip_failed',
          error: error.message
        }
      });
    } catch (e) {
      console.log('[ViralScheduler] ViralDownload model not available');
    }
    
    activeClipJobs.delete(downloadId);
    
    if (reject) reject(error);
    
    await processClipQueue();
  }
}

/**
 * Queue a clip job
 */
function queueClipJob(videoPath, videoId, downloadId) {
  return new Promise((resolve, reject) => {
    const job = { videoPath, videoId, downloadId, resolve, reject };
    
    if (canStartClipJob()) {
      executeClipJob(job);
    } else {
      console.log(`[ViralScheduler] Queueing clip job (Queue: ${clipJobQueue.length + 1})`);
      clipJobQueue.push(job);
    }
  });
}

/**
 * Process a single downloaded video - register in DB and trigger clip
 */
async function processDownloadedVideo(downloadResult, candidates) {
  const { id, filePath, filename, url } = downloadResult;
  
  // Find the original candidate
  const candidate = candidates.find(c => c.id === id);
  
  // Try to create database record
  let videoId = null;
  try {
    // First create video entry
    const video = await prisma.video.create({
      data: {
        title: filename.replace(/\.[^/.]+$/, ''),
        filename: filename,
        platform: 'viral',
        userId: 1, // Default admin user
        viralScore: candidate?.viralScore || 70,
        status: 'completed'
      }
    });
    videoId = video.id;
    
    // Create download record
    await prisma.viralDownload.create({
      data: {
        videoId: video.id,
        sourceUrl: url,
        sourcePlatform: candidate?.platform || 'unknown',
        viralScore: candidate?.viralScore || 70,
        status: 'downloaded',
        downloadedAt: new Date(),
        filePath: filePath
      }
    });
    
    console.log(`[ViralScheduler] Created DB records for: ${filename}`);
  } catch (e) {
    console.log('[ViralScheduler] DB models not available, skipping DB registration');
    // Generate a pseudo-ID for tracking
    videoId = Date.now();
  }
  
  // Trigger clip generation
  await queueClipJob(filePath, videoId, id);
  
  return { videoId, filePath };
}

/**
 * Main scheduler run function
 */
async function runScheduler() {
  if (!CONFIG.enabled) {
    console.log('[ViralScheduler] Scheduler is disabled');
    return;
  }
  
  if (isRunning) {
    console.log('[ViralScheduler] Previous run still in progress, skipping...');
    return;
  }
  
  isRunning = true;
  const runStartTime = Date.now();
  
  console.log('===========================================');
  console.log('[ViralScheduler] Starting scheduled run...');
  console.log('===========================================');
  
  try {
    // Step 1: Scan trending sources
    console.log('[ViralScheduler] Step 1: Scanning trending sources...');
    const candidates = await viralHunterService.getTopCandidates(CONFIG.topCandidatesCount);
    
    if (candidates.length === 0) {
      console.log('[ViralScheduler] No viral candidates found');
      isRunning = false;
      return;
    }
    
    console.log(`[ViralScheduler] Found ${candidates.length} candidates`);
    
    // Step 2: Download top candidates
    console.log('[ViralScheduler] Step 2: Downloading candidates...');
    
    // Create YouTube URLs from candidates
    const downloadUrls = candidates.map(c => {
      if (c.platform === 'youtube' && c.id) {
        return `https://www.youtube.com/watch?v=${c.id}`;
      }
      // For demo, we'll skip actual downloads if no valid URL
      return null;
    }).filter(Boolean);
    
    // For demo, create mock downloads if no real URLs
    let downloadResults = [];
    
    if (downloadUrls.length > 0) {
      // Try to download real videos
      downloadResults = await viralDownloaderService.downloadMultiple(downloadUrls);
    } else {
      // Create mock results for demonstration
      console.log('[ViralScheduler] Creating mock downloads for demonstration...');
      downloadResults = candidates.map((c, i) => ({
        success: true,
        id: c.id,
        filename: `viral_${c.id}_${Date.now()}.mp4`,
        url: c.title,
        viralScore: c.viralScore
      }));
    }
    
    // Step 3: Process successful downloads
    console.log('[ViralScheduler] Step 3: Processing downloads...');
    
    const successfulDownloads = downloadResults.filter(d => d.success);
    
    for (const downloadResult of successfulDownloads) {
      await processDownloadedVideo(downloadResult, candidates);
    }
    
    // Record run in history
    const runDuration = Date.now() - runStartTime;
    const runRecord = {
      timestamp: new Date().toISOString(),
      candidatesFound: candidates.length,
      downloadsAttempted: downloadResults.length,
      downloadsSuccessful: successfulDownloads.length,
      duration: runDuration,
      status: 'completed'
    };
    
    runHistory.unshift(runRecord);
    if (runHistory.length > 50) runHistory.pop();
    
    lastRun = new Date();
    
    console.log('===========================================');
    console.log(`[ViralScheduler] Run complete in ${runDuration}ms`);
    console.log(`[ViralScheduler] Candidates: ${candidates.length}`);
    console.log(`[ViralScheduler] Downloads: ${successfulDownloads.length}/${downloadResults.length}`);
    console.log('===========================================');
    
  } catch (error) {
    console.error('[ViralScheduler] Run failed:', error);
    
    runHistory.unshift({
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
      duration: Date.now() - runStartTime
    });
  }
  
  isRunning = false;
}

/**
 * Start the scheduler
 */
function start() {
  if (schedulerInterval) {
    console.log('[ViralScheduler] Already running');
    return;
  }
  
  console.log('[ViralScheduler] Starting scheduler...');
  console.log(`[ViralScheduler] Scan interval: ${CONFIG.scanInterval / 60000} minutes`);
  
  // Run immediately on start
  runScheduler();
  
  // Set up interval
  schedulerInterval = setInterval(runScheduler, CONFIG.scanInterval);
  
  console.log('[ViralScheduler] Scheduler started');
}

/**
 * Stop the scheduler
 */
function stop() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[ViralScheduler] Scheduler stopped');
  }
}

/**
 * Manually trigger a run
 */
async function triggerRun() {
  await runScheduler();
}

/**
 * Get scheduler status
 */
function getStatus() {
  return {
    enabled: CONFIG.enabled,
    running: isRunning,
    lastRun: lastRun ? lastRun.toISOString() : null,
    interval: CONFIG.scanInterval,
    topCandidatesCount: CONFIG.topCandidatesCount,
    maxClipJobs: CONFIG.maxClipJobs,
    activeClipJobs: activeClipJobs.size,
    queuedClipJobs: clipJobQueue.length,
    downloaderStatus: viralDownloaderService.getStatus(),
    hunterStatus: viralHunterService.getStatus(),
    runHistory: runHistory.slice(0, 10)
  };
}

/**
 * Update configuration
 */
function updateConfig(newConfig) {
  Object.assign(CONFIG, newConfig);
  console.log('[ViralScheduler] Configuration updated');
}

/**
 * Enable/disable scheduler
 */
function setEnabled(enabled) {
  CONFIG.enabled = enabled;
  console.log(`[ViralScheduler] Scheduler ${enabled ? 'enabled' : 'disabled'}`);
}

module.exports = {
  start,
  stop,
  triggerRun,
  getStatus,
  updateConfig,
  setEnabled,
  runScheduler,
  CONFIG
};

