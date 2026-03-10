/**

 * VIRAL AUTO CONTENT FACTORY
 * Fully automated pipeline from viral discovery to clip generation
 * 
 * Workflow:
 * 1. Auto Discovery - Scan trending sources every 30 minutes
 * 2. Auto Download - Download videos with viral score > 70
 * 3. Auto Clip Generation - Trigger autoClipEngine
 * 4. Auto Platform Clips - Generate for TikTok, YouTube, Instagram, Facebook
 * 5. Queue System - Max 2 concurrent jobs (8GB RAM safe)
 * 6. Dashboard Integration - Real-time metrics
 * 
 * Constraints:
 * - Do NOT modify existing clip generation logic
 * - Only extend the pipeline
 * - Safe for 8GB RAM systems
 */

const viralHunterService = require('./viralHunterService');
const viralDownloaderService = require('./viralDownloaderService');
const autoClipEngine = require('../engine/autoClipEngine');
const prisma = require('../prisma/client');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const CONFIG = {
  SCAN_INTERVAL: 30 * 60 * 1000,
  VIRAL_SCORE_THRESHOLD: 70,
  MAX_CONCURRENT_JOBS: 2,
  MAX_QUEUE_SIZE: 10,
  MEMORY_CHECK_INTERVAL: 10000,
  PAUSE_THRESHOLD: 85,
  OUTPUT_DIR: path.join(__dirname, '..', 'output')
};

let isRunning = false;
let scanInterval = null;
let memoryCheckInterval = null;
let isPaused = false;

let metrics = {
  discovered: 0,
  downloaded: 0,
  clipsGenerated: 0,
  activeJobs: 0,
  queueSize: 0,
  lastScan: null,
  lastDownload: null,
  lastClipGenerated: null,
  totalRuns: 0,
  errors: []
};

const autoClipQueue = [];
const activeJobs = new Map();

async function initialize() {
  console.log('[ViralAutoFactory] Initializing...');
  const outputDirs = ['youtube', 'tiktok', 'instagram', 'facebook'];
  outputDirs.forEach(dir => {
    const fullPath = path.join(CONFIG.OUTPUT_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  startMemoryMonitor();
  console.log('[ViralAutoFactory] Initialized successfully');
  return { success: true };
}

function getMemoryUsage() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return ((totalMem - freeMem) / totalMem) * 100;
  } catch {
    return 50;
  }
}

function startMemoryMonitor() {
  memoryCheckInterval = setInterval(() => {
    const memUsage = getMemoryUsage();
    if (memUsage >= CONFIG.PAUSE_THRESHOLD && !isPaused) {
      isPaused = true;
      console.log('[ViralAutoFactory] PAUSED - Memory high:', memUsage.toFixed(1) + '%');
    } else if (memUsage < CONFIG.PAUSE_THRESHOLD - 10 && isPaused) {
      isPaused = false;
      console.log('[ViralAutoFactory] RESUMED - Memory OK:', memUsage.toFixed(1) + '%');
    }
  }, CONFIG.MEMORY_CHECK_INTERVAL);
}

function start() {
  if (isRunning) return { success: false, message: 'Already running' };
  isRunning = true;
  isPaused = false;
  runAutoDiscovery();
  scanInterval = setInterval(() => { if (!isPaused) runAutoDiscovery(); }, CONFIG.SCAN_INTERVAL);
  processQueueLoop();
  console.log('[ViralAutoFactory] Started - scanning every 30 minutes');
  return { success: true, message: 'Auto factory started' };
}

function stop() {
  isRunning = false;
  if (scanInterval) clearInterval(scanInterval);
  if (memoryCheckInterval) clearInterval(memoryCheckInterval);
  console.log('[ViralAutoFactory] Stopped');
  return { success: true, message: 'Auto factory stopped' };
}

async function runAutoDiscovery() {
  if (isPaused) { console.log('[ViralAutoFactory] Paused - skipping discovery'); return; }
  console.log('[ViralAutoFactory] Running auto discovery...');
  metrics.totalRuns++;
  metrics.lastScan = new Date().toISOString();
  try {
    const candidates = await viralHunterService.scanTrendingSources();
    metrics.discovered = candidates.length;
    console.log('[ViralAutoFactory] Found ' + candidates.length + ' candidates');
    const highValue = candidates.filter(c => c.viralScore >= CONFIG.VIRAL_SCORE_THRESHOLD);
    console.log('[ViralAutoFactory] ' + highValue.length + ' above threshold');
    for (const candidate of highValue) { await queueAutoDownload(candidate); }
  } catch (error) {
    console.error('[ViralAutoFactory] Discovery error:', error.message);
    metrics.errors.push({ time: new Date().toISOString(), error: error.message });
  }
}

async function queueAutoDownload(candidate) {
  try {
    console.log('[ViralAutoFactory] Queueing: ' + candidate.title);
    let videoUrl = '';
    if (candidate.platform === 'youtube' && candidate.id) videoUrl = 'https://youtube.com/watch?v=' + candidate.id;
    if (!videoUrl) return;
    const result = await viralDownloaderService.queueDownload(videoUrl, { candidate: candidate });
    if (result.success) {
      metrics.downloaded++;
      metrics.lastDownload = new Date().toISOString();
      console.log('[ViralAutoFactory] Downloaded: ' + result.filename);
      await queueAutoClipGeneration(result, candidate);
    }
  } catch (error) {
    console.error('[ViralAutoFactory] Download error:', error.message);
    metrics.errors.push({ time: new Date().toISOString(), error: error.message });
  }
}

async function queueAutoClipGeneration(downloadResult, candidate) {
  const job = {
    id: 'auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    videoPath: downloadResult.filePath,
    filename: downloadResult.filename,
    candidate: candidate,
    status: 'queued',
    addedAt: new Date().toISOString()
  };
  if (autoClipQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
    console.log('[ViralAutoFactory] Queue full'); return;
  }
  autoClipQueue.push(job);
  metrics.queueSize = autoClipQueue.length;
  console.log('[ViralAutoFactory] Queued: ' + job.id);
}

function processQueueLoop() {
  if (!isRunning) return;
  setTimeout(async () => { await processNextJob(); processQueueLoop(); }, 5000);
}

async function processNextJob() {
  if (!isRunning || isPaused) return;
  if (activeJobs.size >= CONFIG.MAX_CONCURRENT_JOBS) return;
  if (autoClipQueue.length === 0) return;
  const job = autoClipQueue.shift();
  metrics.queueSize = autoClipQueue.length;
  metrics.activeJobs = activeJobs.size + 1;
  activeJobs.set(job.id, { ...job, status: 'processing', startedAt: new Date().toISOString() });
  console.log('[ViralAutoFactory] Processing: ' + job.id);
  try {
    const result = await autoClipEngine.generateClips(job.videoPath, { jobId: job.id, platforms: ['youtube', 'tiktok', 'instagram', 'facebook'] });
    if (result.success) {
      metrics.clipsGenerated += Object.keys(result.clips || {}).length;
      metrics.lastClipGenerated = new Date().toISOString();
      console.log('[ViralAutoFactory] Generated clips');
      await saveClipsToDatabase(result, job);
    }
  } catch (error) {
    console.error('[ViralAutoFactory] Error:', error.message);
    metrics.errors.push({ time: new Date().toISOString(), error: error.message });
  }
  activeJobs.delete(job.id);
  metrics.activeJobs = activeJobs.size;
}

async function saveClipsToDatabase(result, job) {
  try {
    const platforms = Object.keys(result.clips || {});
    for (const platform of platforms) {
      const clipPath = result.clips[platform];
      const viralScore = result.viralScores ? result.viralScores[platform] : 70;
      await prisma.video.create({
        data: {
          title: (job.candidate ? job.candidate.title : job.filename) + ' - ' + platform,
          filename: path.basename(clipPath),
          path: clipPath,
          platform: platform,
          status: 'completed',
          userId: 1,
          viralScore: viralScore
        }
      });
    }
  } catch (error) {
    console.error('[ViralAutoFactory] DB save error:', error.message);
  }
}

function getMetrics() {
  return { ...metrics, memoryUsage: getMemoryUsage(), isRunning: isRunning, isPaused: isPaused };
}

function getStatus() {
  return { 
    running: isRunning, 
    paused: isPaused, 
    memoryUsage: getMemoryUsage(), 
    memoryThreshold: CONFIG.PAUSE_THRESHOLD, 
    queueSize: autoClipQueue.length, 
    activeJobs: activeJobs.size, 
    maxConcurrent: CONFIG.MAX_CONCURRENT_JOBS 
  };
}

module.exports = { initialize, start, stop, getMetrics, getStatus, runAutoDiscovery, CONFIG, getMemoryUsage };
