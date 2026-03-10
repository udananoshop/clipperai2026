/**
 * OVERLORD AI CORE
 * ClipperAI2026 - Central Intelligence System
 * 
 * The central AI brain that manages all platform automation:
 * - System Monitoring (CPU, RAM, active jobs)
 * - Job Orchestration (download, clip, publish queues)
 * - Viral Hunter Integration (30-minute triggers)
 * - Auto Clip Engine (post-download triggers)
 * - AI Decision Engine (viral score evaluation)
 * - System Dashboard API
 * - Safety Guard (resource protection)
 * - Logging System
 * 
 * Optimized for 8GB RAM systems
 * Limits: Max 2 downloads, Max 2 clip jobs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Lazy-loaded service dependencies
let viralHunterService = null;
let viralScheduler = null;
let autoClipTriggerService = null;
let decisionEngine = null;
let systemMonitor = null;
let resourceMonitor = null;
let systemDiagnostics = null;

const getViralHunterService = () => {
  if (!viralHunterService) {
    try { viralHunterService = require('../services/viralHunterService'); } catch (e) {}
  }
  return viralHunterService;
};

const getViralScheduler = () => {
  if (!viralScheduler) {
    try { viralScheduler = require('../services/viralScheduler'); } catch (e) {}
  }
  return viralScheduler;
};

const getAutoClipTriggerService = () => {
  if (!autoClipTriggerService) {
    try { autoClipTriggerService = require('../services/autoClipTriggerService'); } catch (e) {}
  }
  return autoClipTriggerService;
};

const getDecisionEngine = () => {
  if (!decisionEngine) {
    try { decisionEngine = require('../services/decisionEngine'); } catch (e) {}
  }
  return decisionEngine;
};

const getSystemMonitor = () => {
  if (!systemMonitor) {
    try { systemMonitor = require('../services/systemMonitor'); } catch (e) {}
  }
  return systemMonitor;
};

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try { resourceMonitor = require('./resourceMonitor'); } catch (e) {}
  }
  return resourceMonitor;
};

const getSystemDiagnostics = () => {
  if (!systemDiagnostics) {
    try { systemDiagnostics = require('./systemDiagnostics'); } catch (e) {}
  }
  return systemDiagnostics;
};

// ===================================================================
// CONFIGURATION
// ===================================================================

const CONFIG = {
  // Resource Limits for 8GB RAM systems
  MAX_DOWNLOADS: 2,
  MAX_CLIP_JOBS: 2,
  MAX_PUBLISH_JOBS: 2,
  
  // Safety Guard Thresholds
  RAM_CRITICAL_THRESHOLD: 85,  // Stop new jobs if RAM > 85%
  CPU_CRITICAL_THRESHOLD: 90,  // Stop new jobs if CPU > 90%
  RAM_WARNING_THRESHOLD: 75,   // Warn if RAM > 75%
  CPU_WARNING_THRESHOLD: 80,   // Warn if CPU > 80%
  
  // Queue Settings
  QUEUE_CHECK_INTERVAL: 5000,  // Check queues every 5 seconds
  VIRAL_HUNTER_INTERVAL: 30 * 60 * 1000,  // 30 minutes
  
  // Logging
  LOG_DIR: path.join(__dirname, '..', 'logs'),
  LOG_FILE: 'overlord.log',
  MAX_LOG_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_LOG_FILES: 5,
  
  // AI Decision Engine
  MIN_VIRAL_SCORE_THRESHOLD: 60,  // Only process videos with score >= 60
  MIN_ENGAGEMENT_SCORE: 50,      // Minimum engagement potential
  MIN_CLIP_QUALITY: 55           // Minimum clip quality score
};

// Ensure log directory exists
const LOG_PATH = path.join(CONFIG.LOG_DIR, CONFIG.LOG_FILE);
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

// ===================================================================
// OVERLORD STATE
// ===================================================================

const overlordState = {
  // System status
  status: 'initializing',  // initializing, online, throttled, paused, error
  startedAt: null,
  uptime: '0s',
  
  // Resource monitoring
  cpu: 0,
  ram: 0,
  systemRam: 0,
  
  // Job queues
  downloadQueue: [],
  clipQueue: [],
  publishQueue: [],
  activeJobs: {
    downloads: [],
    clips: [],
    publishes: []
  },
  
  // Safety guard
  safetyGuardActive: false,
  lastSafetyCheck: null,
  safetyThrottleCount: 0,
  
  // Viral Hunter
  viralHunterEnabled: true,
  viralHunterLastRun: null,
  viralHunterNextRun: null,
  
  // Statistics
  stats: {
    totalDownloads: 0,
    totalClips: 0,
    totalPublishes: 0,
    processedToday: 0,
    viralDetected: 0,
    clipsGenerated: 0,
    jobsThrottled: 0,
    errors: 0
  },
  
  // Activity log (in-memory, limited)
  recentActivity: [],
  maxActivityItems: 100
};

// ===================================================================
// LOGGING SYSTEM
// ===================================================================

/**
 * Log an event to overlord.log
 */
function log(level, category, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,  // info, warn, error, debug
    category,  // system, job, viral, decision, safety, queue
    message,
    data
  };
  
  // Console output
  const consoleMsg = `[OVERLORD ${timestamp}] [${level.toUpperCase()}] [${category}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  switch (level) {
    case 'error':
      console.error(consoleMsg);
      break;
    case 'warn':
      console.warn(consoleMsg);
      break;
    default:
      console.log(consoleMsg);
  }
  
  // File output
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_PATH, logLine, 'utf8');
    
    // Check file size and rotate if needed
    const stats = fs.statSync(LOG_PATH);
    if (stats.size > CONFIG.MAX_LOG_SIZE) {
      rotateLogs();
    }
  } catch (e) {
    console.error('[OVERLORD] Log write error:', e.message);
  }
  
  // Add to recent activity
  addActivity(logEntry);
}

/**
 * Rotate log files
 */
function rotateLogs() {
  try {
    for (let i = CONFIG.MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldFile = path.join(CONFIG.LOG_DIR, `overlord.log.${i}`);
      const newFile = path.join(CONFIG.LOG_DIR, `overlord.log.${i + 1}`);
      if (fs.existsSync(oldFile)) {
        if (fs.existsSync(newFile)) {
          fs.unlinkSync(newFile);
        }
        fs.renameSync(oldFile, newFile);
      }
    }
    
    // Archive current log
    if (fs.existsSync(LOG_PATH)) {
      const archiveFile = path.join(CONFIG.LOG_DIR, 'overlord.log.1');
      if (fs.existsSync(archiveFile)) {
        fs.unlinkSync(archiveFile);
      }
      fs.renameSync(LOG_PATH, archiveFile);
    }
    
    log('info', 'system', 'Log files rotated');
  } catch (e) {
    console.error('[OVERLORD] Log rotation error:', e.message);
  }
}

/**
 * Add entry to recent activity
 */
function addActivity(entry) {
  overlordState.recentActivity.push({
    ...entry,
    id: Date.now()
  });
  
  // Keep only last maxActivityItems
  if (overlordState.recentActivity.length > overlordState.maxActivityItems) {
    overlordState.recentActivity = overlordState.recentActivity.slice(-overlordState.maxActivityItems);
  }
}

// ===================================================================
// SYSTEM MONITORING
// ===================================================================

/**
 * Update system resource metrics
 */
function updateSystemMetrics() {
  try {
    // Get process-level metrics from resourceMonitor
    const rm = getResourceMonitor();
    if (rm) {
      overlordState.cpu = rm.getCPUUsage();
      overlordState.ram = rm.getMemoryUsage();
      overlordState.systemRam = rm.getSystemMemoryUsage();
    } else {
      // Fallback to basic os metrics
      const memUsage = process.memoryUsage();
      overlordState.ram = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      overlordState.systemRam = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
      
      const loadAvg = os.loadavg();
      const cpus = os.cpus().length;
      overlordState.cpu = Math.min(100, Math.round((loadAvg[0] / cpus) * 100));
    }
    
    // Update uptime
    if (overlordState.startedAt) {
      const elapsed = Date.now() - new Date(overlordState.startedAt).getTime();
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      overlordState.uptime = `${hours}h ${minutes}m`;
    }
    
    overlordState.lastSafetyCheck = new Date().toISOString();
    
  } catch (e) {
    log('error', 'system', 'Failed to update system metrics', { error: e.message });
  }
}

/**
 * Get current system health
 */
function getSystemHealth() {
  updateSystemMetrics();
  
  let health = 'healthy';
  const issues = [];
  
  // Check RAM
  if (overlordState.systemRam >= CONFIG.RAM_CRITICAL_THRESHOLD) {
    health = 'critical';
    issues.push('RAM critical');
  } else if (overlordState.systemRam >= CONFIG.RAM_WARNING_THRESHOLD) {
    health = health === 'healthy' ? 'warning' : health;
    issues.push('RAM warning');
  }
  
  // Check CPU
  if (overlordState.cpu >= CONFIG.CPU_CRITICAL_THRESHOLD) {
    health = 'critical';
    issues.push('CPU critical');
  } else if (overlordState.cpu >= CONFIG.CPU_WARNING_THRESHOLD) {
    health = health === 'healthy' ? 'warning' : health;
    issues.push('CPU warning');
  }
  
  return {
    health,
    cpu: overlordState.cpu,
    ram: overlordState.systemRam,
    processRam: overlordState.ram,
    issues,
    thresholds: {
      ramCritical: CONFIG.RAM_CRITICAL_THRESHOLD,
      cpuCritical: CONFIG.CPU_CRITICAL_THRESHOLD,
      ramWarning: CONFIG.RAM_WARNING_THRESHOLD,
      cpuWarning: CONFIG.CPU_WARNING_THRESHOLD
    }
  };
}

// ===================================================================
// SAFETY GUARD
// ===================================================================

/**
 * Check if new jobs should be allowed based on system resources
 */
function checkSafetyGuard() {
  updateSystemMetrics();
  
  const health = getSystemHealth();
  const shouldThrottle = 
    overlordState.systemRam > CONFIG.RAM_CRITICAL_THRESHOLD || 
    overlordState.cpu > CONFIG.CPU_CRITICAL_THRESHOLD;
  
  if (shouldThrottle && !overlordState.safetyGuardActive) {
    // Activate safety guard
    overlordState.safetyGuardActive = true;
    overlordState.status = 'throttled';
    overlordState.safetyThrottleCount++;
    overlordState.stats.jobsThrottled++;
    
    log('warn', 'safety', 'Safety guard ACTIVATED - resources critical', {
      ram: overlordState.systemRam,
      cpu: overlordState.cpu,
      throttleCount: overlordState.safetyThrottleCount
    });
    
    // Clear queues when safety guard is active
    clearQueues();
    
  } else if (!shouldThrottle && overlordState.safetyGuardActive) {
    // Deactivate safety guard
    overlordState.safetyGuardActive = false;
    overlordState.status = 'online';
    
    log('info', 'safety', 'Safety guard DEACTIVATED - resources normal', {
      ram: overlordState.systemRam,
      cpu: overlordState.cpu
    });
  }
  
  return {
    active: overlordState.safetyGuardActive,
    canAcceptJobs: !overlordState.safetyGuardActive,
    reason: shouldThrottle ? 'Resource threshold exceeded' : 'Resources normal',
    currentResources: {
      ram: overlordState.systemRam,
      cpu: overlordState.cpu
    }
  };
}

/**
 * Clear all queues (called when safety guard activates)
 */
function clearQueues() {
  const cleared = {
    downloads: overlordState.downloadQueue.length,
    clips: overlordState.clipQueue.length,
    publishes: overlordState.publishQueue.length
  };
  
  overlordState.downloadQueue = [];
  overlordState.clipQueue = [];
  overlordState.publishQueue = [];
  
  log('info', 'queue', 'Queues cleared due to safety guard', cleared);
  
  return cleared;
}

// ===================================================================
// JOB ORCHESTRATOR
// ===================================================================

/**
 * Add job to download queue
 */
function queueDownload(job) {
  if (checkSafetyGuard().canAcceptJobs === false) {
    log('warn', 'queue', 'Download rejected - safety guard active', { job });
    return { success: false, reason: 'Safety guard active' };
  }
  
  if (overlordState.activeJobs.downloads.length >= CONFIG.MAX_DOWNLOADS) {
    overlordState.downloadQueue.push(job);
    log('info', 'queue', 'Download queued', { 
      jobId: job.id, 
      queueSize: overlordState.downloadQueue.length 
    });
    return { success: true, queued: true };
  }
  
  // Start download immediately
  overlordState.activeJobs.downloads.push(job);
  overlordState.stats.totalDownloads++;
  
  log('info', 'job', 'Download started', { jobId: job.id, url: job.url });
  
  return { success: true, queued: false, jobId: job.id };
}

/**
 * Add job to clip queue
 */
function queueClip(job) {
  if (checkSafetyGuard().canAcceptJobs === false) {
    log('warn', 'queue', 'Clip job rejected - safety guard active', { job });
    return { success: false, reason: 'Safety guard active' };
  }
  
  if (overlordState.activeJobs.clips.length >= CONFIG.MAX_CLIP_JOBS) {
    overlordState.clipQueue.push(job);
    log('info', 'queue', 'Clip job queued', { 
      jobId: job.id, 
      queueSize: overlordState.clipQueue.length 
    });
    return { success: true, queued: true };
  }
  
  // Start clip job immediately
  overlordState.activeJobs.clips.push(job);
  overlordState.stats.totalClips++;
  overlordState.stats.processedToday++;
  
  log('info', 'job', 'Clip job started', { jobId: job.id, videoId: job.videoId });
  
  return { success: true, queued: false, jobId: job.id };
}

/**
 * Add job to publish queue
 */
function queuePublish(job) {
  if (checkSafetyGuard().canAcceptJobs === false) {
    log('warn', 'queue', 'Publish rejected - safety guard active', { job });
    return { success: false, reason: 'Safety guard active' };
  }
  
  if (overlordState.activeJobs.publishes.length >= CONFIG.MAX_PUBLISH_JOBS) {
    overlordState.publishQueue.push(job);
    log('info', 'queue', 'Publish queued', { 
      jobId: job.id, 
      queueSize: overlordState.publishQueue.length 
    });
    return { success: true, queued: true };
  }
  
  // Start publish immediately
  overlordState.activeJobs.publishes.push(job);
  overlordState.stats.totalPublishes++;
  
  log('info', 'job', 'Publish started', { jobId: job.id, platform: job.platform });
  
  return { success: true, queued: false, jobId: job.id };
}

/**
 * Complete a download job
 */
function completeDownload(jobId, result) {
  const index = overlordState.activeJobs.downloads.findIndex(j => j.id === jobId);
  if (index > -1) {
    overlordState.activeJobs.downloads.splice(index, 1);
    
    log('info', 'job', 'Download completed', { jobId, result });
    
    // Trigger auto-clip after download
    if (result.videoId) {
      triggerAutoClip(result.videoId, result);
    }
    
    // Process queue
    processQueue('downloads');
  }
}

/**
 * Complete a clip job
 */
function completeClip(jobId, result) {
  const index = overlordState.activeJobs.clips.findIndex(j => j.id === jobId);
  if (index > -1) {
    overlordState.activeJobs.clips.splice(index, 1);
    
    overlordState.stats.clipsGenerated++;
    log('info', 'job', 'Clip job completed', { jobId, clips: result.clips });
    
    // Process queue
    processQueue('clips');
  }
}

/**
 * Complete a publish job
 */
function completePublish(jobId, result) {
  const index = overlordState.activeJobs.publishes.findIndex(j => j.id === jobId);
  if (index > -1) {
    overlordState.activeJobs.publishes.splice(index, 1);
    
    log('info', 'job', 'Publish completed', { jobId, platform: result.platform });
    
    // Process queue
    processQueue('publishes');
  }
}

/**
 * Process pending queue items
 */
function processQueue(queueType) {
  let queue, active, max, startFn;
  
  switch (queueType) {
    case 'downloads':
      queue = overlordState.downloadQueue;
      active = overlordState.activeJobs.downloads;
      max = CONFIG.MAX_DOWNLOADS;
      break;
    case 'clips':
      queue = overlordState.clipQueue;
      active = overlordState.activeJobs.clips;
      max = CONFIG.MAX_CLIP_JOBS;
      break;
    case 'publishes':
      queue = overlordState.publishQueue;
      active = overlordState.activeJobs.publishes;
      max = CONFIG.MAX_PUBLISH_JOBS;
      break;
    default:
      return;
  }
  
  while (queue.length > 0 && active.length < max) {
    const job = queue.shift();
    active.push(job);
    overlordState.stats[`total${queueType.charAt(0).toUpperCase() + queueType.slice(1)}`]++;
    
    log('info', 'queue', `Processing queued ${queueType.slice(0, -1)} job`, { jobId: job.id });
  }
}

/**
 * Get queue status
 */
function getQueueStatus() {
  return {
    download: {
      active: overlordState.activeJobs.downloads.length,
      queued: overlordState.downloadQueue.length,
      max: CONFIG.MAX_DOWNLOADS,
      jobs: overlordState.activeJobs.downloads
    },
    clip: {
      active: overlordState.activeJobs.clips.length,
      queued: overlordState.clipQueue.length,
      max: CONFIG.MAX_CLIP_JOBS,
      jobs: overlordState.activeJobs.clips
    },
    publish: {
      active: overlordState.activeJobs.publishes.length,
      queued: overlordState.publishQueue.length,
      max: CONFIG.MAX_PUBLISH_JOBS,
      jobs: overlordState.activeJobs.publishes
    }
  };
}

// ===================================================================
// VIRAL HUNTER INTEGRATION
// ===================================================================

/**
 * Trigger Viral Hunter scan
 */
async function triggerViralHunter() {
  if (!overlordState.viralHunterEnabled) {
    log('info', 'viral', 'Viral Hunter is disabled');
    return { success: false, reason: 'Disabled' };
  }
  
  if (checkSafetyGuard().canAcceptJobs === false) {
    log('warn', 'viral', 'Viral Hunter skipped - safety guard active');
    return { success: false, reason: 'Safety guard active' };
  }
  
  log('info', 'viral', 'Starting Viral Hunter scan');
  
  try {
    const hunter = getViralHunterService();
    if (!hunter) {
      throw new Error('Viral Hunter service not available');
    }
    
    const candidates = await hunter.getTopCandidates(3);
    
    if (candidates.length === 0) {
      log('info', 'viral', 'No viral candidates found');
      return { success: true, candidates: 0 };
    }
    
    overlordState.stats.viralDetected += candidates.length;
    
    log('info', 'viral', 'Viral candidates found', { count: candidates.length });
    
    // Queue downloads for candidates
    for (const candidate of candidates) {
      // Use AI Decision Engine to evaluate
      const decision = evaluateVideo(candidate);
      
      if (decision.shouldProcess) {
        queueDownload({
          id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: candidate.url || candidate.id,
          platform: candidate.platform,
          viralScore: candidate.viralScore,
          decision
        });
      }
    }
    
    overlordState.viralHunterLastRun = new Date().toISOString();
    overlordState.viralHunterNextRun = new Date(Date.now() + CONFIG.VIRAL_HUNTER_INTERVAL).toISOString();
    
    return { success: true, candidates };
    
  } catch (e) {
    log('error', 'viral', 'Viral Hunter failed', { error: e.message });
    return { success: false, error: e.message };
  }
}

/**
 * Start Viral Hunter scheduler
 */
function startViralHunterScheduler() {
  log('info', 'viral', 'Starting Viral Hunter scheduler', { 
    interval: `${CONFIG.VIRAL_HUNTER_INTERVAL / 60000} minutes` 
  });
  
  // Run immediately
  triggerViralHunter();
  
  // Schedule recurring runs
  setInterval(() => {
    triggerViralHunter();
  }, CONFIG.VIRAL_HUNTER_INTERVAL);
}

/**
 * Enable/disable Viral Hunter
 */
function setViralHunterEnabled(enabled) {
  overlordState.viralHunterEnabled = enabled;
  log('info', 'viral', `Viral Hunter ${enabled ? 'enabled' : 'disabled'}`);
  return { enabled };
}

// ===================================================================
// AUTO CLIP ENGINE
// ===================================================================

/**
 * Trigger auto-clip after video download
 */
async function triggerAutoClip(videoId, downloadResult) {
  if (checkSafetyGuard().canAcceptJobs === false) {
    log('warn', 'job', 'Auto-clip skipped - safety guard active', { videoId });
    return { success: false, reason: 'Safety guard active' };
  }
  
  log('info', 'job', 'Triggering auto-clip', { videoId });
  
  try {
    const autoClip = getAutoClipTriggerService();
    if (!autoClip) {
      throw new Error('Auto Clip service not available');
    }
    
    const result = await autoClip.triggerAutoClip(videoId, {
      duration: 30
    });
    
    if (result.success) {
      overlordState.stats.clipsGenerated += result.clips ? Object.keys(result.clips).length : 0;
      log('info', 'job', 'Auto-clip completed', { 
        videoId, 
        clips: result.clips ? Object.keys(result.clips).length : 0 
      });
    }
    
    return result;
    
  } catch (e) {
    log('error', 'job', 'Auto-clip failed', { videoId, error: e.message });
    return { success: false, error: e.message };
  }
}

// ===================================================================
// AI DECISION ENGINE
// ===================================================================

/**
 * Evaluate video for processing using AI Decision Engine
 */
function evaluateVideo(video) {
  const decisionEngine = getDecisionEngine();
  
  // Build metrics from video data
  const metrics = {
    hookStrength: video.hookScore || video.hookStrength || 50,
    emotionalIntensity: video.emotionalScore || video.emotionalIntensity || 50,
    retentionScore: video.retentionScore || 50,
    engagementScore: video.engagementScore || video.engagement || 50,
    trendAlignment: video.viralScore || video.trendAlignment || 50
  };
  
  let decision;
  
  if (decisionEngine && decisionEngine.calculateDecision) {
    decision = decisionEngine.calculateDecision(metrics);
  } else {
    // Fallback simple decision logic
    const finalScore = (
      (metrics.hookStrength * 0.25) +
      (metrics.emotionalIntensity * 0.20) +
      (metrics.retentionScore * 0.25) +
      (metrics.engagementScore * 0.20) +
      (metrics.trendAlignment * 0.10)
    );
    
    decision = {
      finalScore: Math.round(finalScore),
      confidence: 50,
      priorityLevel: finalScore >= 75 ? 'high' : finalScore >= 50 ? 'medium' : 'low'
    };
  }
  
  // Determine if should process
  const shouldProcess = 
    decision.finalScore >= CONFIG.MIN_VIRAL_SCORE_THRESHOLD &&
    metrics.engagementScore >= CONFIG.MIN_ENGAGEMENT_SCORE;
  
  log('info', 'decision', 'Video evaluation complete', {
    videoId: video.id,
    score: decision.finalScore,
    shouldProcess
  });
  
  return {
    shouldProcess,
    viralScore: decision.finalScore,
    engagementPotential: metrics.engagementScore,
    clipQuality: decision.confidence,
    priority: decision.priorityLevel,
    decision
  };
}

// ===================================================================
// SYSTEM DASHBOARD API
// ===================================================================

/**
 * Get comprehensive system status for dashboard
 */
function getStatus() {
  checkSafetyGuard();  // Update safety status
  updateSystemMetrics();  // Update resource metrics
  
  const health = getSystemHealth();
  const queues = getQueueStatus();
  const safety = checkSafetyGuard();
  
  return {
    // Core status
    status: overlordState.status,
    startedAt: overlordState.startedAt,
    uptime: overlordState.uptime,
    
    // Active jobs
    activeJobs: {
      downloads: overlordState.activeJobs.downloads.length,
      clips: overlordState.activeJobs.clips.length,
      publishes: overlordState.activeJobs.publishes.length,
      total: overlordState.activeJobs.downloads.length + 
             overlordState.activeJobs.clips.length + 
             overlordState.activeJobs.publishes.length
    },
    
    // System health
    systemHealth: health,
    
    // Queue status
    queueSize: {
      downloads: overlordState.downloadQueue.length,
      clips: overlordState.clipQueue.length,
      publishes: overlordState.publishQueue.length,
      total: overlordState.downloadQueue.length + 
             overlordState.clipQueue.length + 
             overlordState.publishQueue.length
    },
    
    // Safety guard
    safetyGuard: {
      active: overlordState.safetyGuardActive,
      throttleCount: overlordState.safetyThrottleCount,
      canAcceptJobs: safety.canAcceptJobs,
      reason: safety.reason
    },
    
    // Viral Hunter
    viralHunter: {
      enabled: overlordState.viralHunterEnabled,
      lastRun: overlordState.viralHunterLastRun,
      nextRun: overlordState.viralHunterNextRun
    },
    
    // Statistics
    processedToday: overlordState.stats.processedToday,
    totalDownloads: overlordState.stats.totalDownloads,
    totalClips: overlordState.stats.totalClips,
    totalPublishes: overlordState.stats.totalPublishes,
    viralDetected: overlordState.stats.viralDetected,
    clipsGenerated: overlordState.stats.clipsGenerated,
    jobsThrottled: overlordState.stats.jobsThrottled,
    
    // Configuration
    config: {
      maxDownloads: CONFIG.MAX_DOWNLOADS,
      maxClipJobs: CONFIG.MAX_CLIP_JOBS,
      maxPublishJobs: CONFIG.MAX_PUBLISH_JOBS,
      ramThreshold: CONFIG.RAM_CRITICAL_THRESHOLD,
      cpuThreshold: CONFIG.CPU_CRITICAL_THRESHOLD,
      minViralScore: CONFIG.MIN_VIRAL_SCORE_THRESHOLD
    },
    
    // Recent activity
    recentActivity: overlordState.recentActivity.slice(-20),
    
    // Timestamps
    timestamp: new Date().toISOString()
  };
}

// ===================================================================
// INITIALIZATION
// ===================================================================

/**
 * Initialize OVERLORD AI CORE
 */
function initialize() {
  overlordState.status = 'online';
  overlordState.startedAt = new Date().toISOString();
  
  log('info', 'system', 'OVERLORD AI CORE initializing...', {
    version: '1.0.0',
    maxDownloads: CONFIG.MAX_DOWNLOADS,
    maxClipJobs: CONFIG.MAX_CLIP_JOBS,
    ramThreshold: CONFIG.RAM_CRITICAL_THRESHOLD,
    cpuThreshold: CONFIG.CPU_CRITICAL_THRESHOLD
  });
  
  // Start system monitoring loop
  setInterval(() => {
    checkSafetyGuard();
    updateSystemMetrics();
  }, CONFIG.QUEUE_CHECK_INTERVAL);
  
  // Start Viral Hunter scheduler
  startViralHunterScheduler();
  
  log('info', 'system', 'OVERLORD AI CORE online', {
    status: overlordState.status,
    uptime: overlordState.uptime
  });
  
  return {
    success: true,
    status: overlordState.status,
    startedAt: overlordState.startedAt
  };
}

/**
 * Reset daily stats
 */
function resetDailyStats() {
  overlordState.stats.processedToday = 0;
  log('info', 'system', 'Daily stats reset');
  return { success: true };
}

/**
 * Emergency stop - pause all operations
 */
function emergencyStop(reason = 'Manual emergency stop') {
  overlordState.status = 'paused';
  clearQueues();
  
  // Stop all active jobs (in a real implementation, you'd send SIGTERM to processes)
  overlordState.activeJobs.downloads = [];
  overlordState.activeJobs.clips = [];
  overlordState.activeJobs.publishes = [];
  
  overlordState.viralHunterEnabled = false;
  
  log('error', 'system', 'EMERGENCY STOP', { reason });
  
  return { success: true, reason };
}

/**
 * Resume from emergency stop
 */
function resume() {
  if (overlordState.status !== 'paused') {
    return { success: false, reason: 'Not in paused state' };
  }
  
  overlordState.status = 'online';
  overlordState.viralHunterEnabled = true;
  
  log('info', 'system', 'OVERLORD resumed from emergency stop');
  
  return { success: true, status: overlordState.status };
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Core
  initialize,
  getStatus,
  
  // System Monitoring
  getSystemHealth,
  updateSystemMetrics,
  
  // Safety Guard
  checkSafetyGuard,
  
  // Job Orchestrator
  queueDownload,
  queueClip,
  queuePublish,
  completeDownload,
  completeClip,
  completePublish,
  getQueueStatus,
  
  // Viral Hunter
  triggerViralHunter,
  startViralHunterScheduler,
  setViralHunterEnabled,
  
  // Auto Clip
  triggerAutoClip,
  
  // AI Decision Engine
  evaluateVideo,
  
  // Control
  emergencyStop,
  resume,
  resetDailyStats,
  
  // Logging
  log,
  
  // Configuration
  CONFIG,
  
  // State access
  getState: () => overlordState
};

// Auto-initialize when loaded
console.log('[OVERLORD] Module loaded, awaiting initialization...');

