/**
 * AUTONOMOUS CONTENT LOOP
 * Full Autonomous Content Factory Pipeline
 * 
 * Orchestrates existing services to create a fully automated content generation system:
 * - ViralHunter scan → Download → Clip Generation → AI Metadata → Queue → Schedule
 * 
 * Constraints (8GB RAM):
 * - maxConcurrentDownloads = 2
 * - maxClipProcessing = 1
 * - maxAITasks = 2
 * - cooldown between cycles = 30 minutes
 * 
 * Safety:
 * - Pause if memory > 85%
 * - Resume when memory < 70%
 */

// Lazy-loaded service dependencies
let viralHunterService = null;
let viralDownloaderService = null;
let viralClipFactory = null;
let titleGenerator = null;
let captionGenerator = null;
let hashtagEngine = null;
let contentQueue = null;
let postScheduler = null;
let resourceMonitor = null;

// Service getters (lazy loading to avoid circular dependencies)
const getViralHunterService = () => {
  if (!viralHunterService) {
    try { viralHunterService = require('../services/viralHunterService'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load viralHunterService:', e.message);
    }
  }
  return viralHunterService;
};

const getViralDownloaderService = () => {
  if (!viralDownloaderService) {
    try { viralDownloaderService = require('../services/viralDownloaderService'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load viralDownloaderService:', e.message);
    }
  }
  return viralDownloaderService;
};

const getViralClipFactory = () => {
  if (!viralClipFactory) {
    try { viralClipFactory = require('../services/viralClipFactory'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load viralClipFactory:', e.message);
    }
  }
  return viralClipFactory;
};

const getTitleGenerator = () => {
  if (!titleGenerator) {
    try { titleGenerator = require('../ai/titleGenerator'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load titleGenerator:', e.message);
    }
  }
  return titleGenerator;
};

const getCaptionGenerator = () => {
  if (!captionGenerator) {
    try { captionGenerator = require('../ai/captionGenerator'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load captionGenerator:', e.message);
    }
  }
  return captionGenerator;
};

const getHashtagEngine = () => {
  if (!hashtagEngine) {
    try { hashtagEngine = require('../ai/hashtagEngine'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load hashtagEngine:', e.message);
    }
  }
  return hashtagEngine;
};

const getContentQueue = () => {
  if (!contentQueue) {
    try { contentQueue = require('../services/contentQueue'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load contentQueue:', e.message);
    }
  }
  return contentQueue;
};

const getPostScheduler = () => {
  if (!postScheduler) {
    try { postScheduler = require('../services/postScheduler'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load postScheduler:', e.message);
    }
  }
  return postScheduler;
};

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try { resourceMonitor = require('./resourceMonitor'); } catch (e) {
      console.error('[AutonomousLoop] Failed to load resourceMonitor:', e.message);
    }
  }
  return resourceMonitor;
};

// ============================================================================
// CONFIGURATION (8GB RAM Safe)
// ============================================================================

const CONFIG = {
  // Concurrency limits
  maxConcurrentDownloads: 2,
  maxClipProcessing: 1,
  maxAITasks: 2,
  
  // Cycle timing
  cooldownBetweenCycles: 30 * 60 * 1000, // 30 minutes
  
  // Memory thresholds
  memoryPauseThreshold: 85,
  memoryResumeThreshold: 70,
  
  // Viral score threshold
  minViralScore: 70,
  
  // Max candidates to process per cycle
  maxCandidatesPerCycle: 2,
  
  // Platforms to target
  platforms: ['tiktok', 'instagram', 'youtube', 'facebook']
};

// ============================================================================
// STATE
// ============================================================================

const loopState = {
  // Control flags
  isRunning: false,
  isPaused: false,
  isStopping: false,
  
  // Timing
  startedAt: null,
  lastCycleAt: null,
  nextCycleAt: null,
  pausedAt: null,
  
  // Counters
  cyclesCompleted: 0,
  videosDiscovered: 0,
  videosDownloaded: 0,
  clipsGenerated: 0,
  clipsQueued: 0,
  postsScheduled: 0,
  errorsEncountered: 0,
  
  // Current cycle data
  currentCycle: null,
  
  // History
  cycleHistory: [],
  
  // Active jobs tracking
  activeJobs: {
    downloads: [],
    clips: [],
    aiTasks: []
  },
  
  // Pause reason
  pauseReason: null
};

// ============================================================================
// MEMORY SAFETY
// ============================================================================

/**
 * Check if memory is safe to continue processing
 * @returns {Object} Safety status
 */
function checkMemorySafety() {
  const monitor = getResourceMonitor();
  
  if (!monitor) {
    return { safe: true, usage: 0, reason: 'Monitor not available' };
  }
  
  const systemMem = monitor.getSystemMemoryUsage();
  const isPaused = loopState.isPaused;
  
  // Check if we need to pause
  if (!isPaused && systemMem >= CONFIG.memoryPauseThreshold) {
    loopState.isPaused = true;
    loopState.pausedAt = new Date().toISOString();
    loopState.pauseReason = `Memory critical: ${systemMem}%`;
    
    console.log(`[AutonomousLoop] ⏸️ PAUSED - Memory at ${systemMem}%`);
    
    return {
      safe: false,
      paused: true,
      usage: systemMem,
      reason: `Memory at ${systemMem}%, pausing operations`
    };
  }
  
  // Check if we can resume
  if (isPaused && systemMem < CONFIG.memoryResumeThreshold) {
    loopState.isPaused = false;
    loopState.pauseReason = null;
    
    console.log(`[AutonomousLoop] ▶️ RESUMED - Memory at ${systemMem}%`);
    
    return {
      safe: true,
      resumed: true,
      usage: systemMem,
      reason: `Memory at ${systemMem}%, resuming operations`
    };
  }
  
  return {
    safe: systemMem < CONFIG.memoryPauseThreshold,
    paused: isPaused,
    usage: systemMem,
    reason: isPaused ? loopState.pauseReason : 'Normal operations'
  };
}

/**
 * Check if we can start a new job based on concurrency limits
 * @param {string} jobType - Type of job (download, clip, ai)
 * @returns {boolean} Whether job can be started
 */
function canStartJob(jobType) {
  const limits = {
    download: CONFIG.maxConcurrentDownloads,
    clip: CONFIG.maxClipProcessing,
    ai: CONFIG.maxAITasks
  };
  
  const current = loopState.activeJobs[jobType + 's'] || [];
  const max = limits[jobType] || 1;
  
  return current.length < max;
}

/**
 * Add job to active tracking
 * @param {string} jobType - Type of job
 * @param {string} jobId - Job identifier
 */
function addJob(jobType, jobId) {
  const key = jobType + 's';
  if (!loopState.activeJobs[key]) {
    loopState.activeJobs[key] = [];
  }
  loopState.activeJobs[key].push({
    id: jobId,
    startedAt: Date.now()
  });
}

/**
 * Remove job from active tracking
 * @param {string} jobType - Type of job
 * @param {string} jobId - Job identifier
 */
function removeJob(jobType, jobId) {
  const key = jobType + 's';
  if (loopState.activeJobs[key]) {
    loopState.activeJobs[key] = loopState.activeJobs[key].filter(j => j.id !== jobId);
  }
}

// ============================================================================
// MAIN CYCLE EXECUTION
// ============================================================================

/**
 * Execute one full automation cycle
 * @returns {Object} Cycle result
 */
async function executeCycle() {
  const cycleStartTime = Date.now();
  const cycleId = `cycle_${cycleStartTime}`;
  
  console.log(`[AutonomousLoop] 🚀 Starting cycle ${cycleId}`);
  
  const cycleResult = {
    cycleId,
    startTime: new Date().toISOString(),
    stages: {},
    success: false,
    error: null,
    stats: {
      discovered: 0,
      downloaded: 0,
      clipsGenerated: 0,
      clipsQueued: 0,
      postsScheduled: 0
    }
  };
  
  try {
    // Check memory safety before starting
    const safety = checkMemorySafety();
    if (!safety.safe && safety.paused) {
      throw new Error(`Cycle paused: ${safety.reason}`);
    }
    
    // Stage 1: Scan viral sources
    console.log('[AutonomousLoop] 📡 Stage 1: Scanning viral sources...');
    const hunter = getViralHunterService();
    
    if (!hunter || !hunter.getTopCandidates) {
      throw new Error('ViralHunter service not available');
    }
    
    const candidates = await hunter.getTopCandidates(CONFIG.maxCandidatesPerCycle);
    
    // Filter by viral score
    const highScoreCandidates = candidates.filter(c => c.viralScore >= CONFIG.minViralScore);
    
    cycleResult.stats.discovered = highScoreCandidates.length;
    cycleResult.stages.scan = {
      success: true,
      totalFound: candidates.length,
      highScore: highScoreCandidates.length,
      candidates: highScoreCandidates.map(c => ({
        id: c.id,
        title: c.title,
        platform: c.platform,
        viralScore: c.viralScore
      }))
    };
    
    loopState.videosDiscovered += highScoreCandidates.length;
    
    console.log(`[AutonomousLoop] Found ${highScoreCandidates.length} high-score candidates`);
    
    // Stage 2 & 3: Download and process each candidate
    const downloader = getViralDownloaderService();
    const clipFactory = getViralClipFactory();
    
    for (const candidate of highScoreCandidates) {
      // Check memory safety before each download
      const memCheck = checkMemorySafety();
      if (!memCheck.safe && memCheck.paused) {
        console.log('[AutonomousLoop] ⏸️ Pausing due to memory, ending cycle early');
        break;
      }
      
      // Check if we can start download
      if (!canStartJob('download')) {
        console.log('[AutonomousLoop] Download limit reached, waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (!canStartJob('download')) continue;
      }
      
      const downloadId = `dl_${candidate.id}_${Date.now()}`;
      
      try {
        console.log(`[AutonomousLoop] ⬇️ Downloading: ${candidate.title}`);
        addJob('download', downloadId);
        
        // Download the video
        const downloadResult = await downloader.queueDownload(candidate.url || `https://youtube.com/watch?v=${candidate.id}`);
        
        removeJob('download', downloadId);
        
        if (!downloadResult.success) {
          console.error(`[AutonomousLoop] Download failed: ${downloadResult.error}`);
          loopState.errorsEncountered++;
          continue;
        }
        
        cycleResult.stats.downloaded++;
        loopState.videosDownloaded++;
        
        // Stage 4: Generate clips
        if (!canStartJob('clip')) {
          console.log('[AutonomousLoop] Clip processing limit reached');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        const clipId = `clip_${candidate.id}_${Date.now()}`;
        
        console.log(`[AutonomousLoop] ✂️ Generating clips for: ${candidate.title}`);
        addJob('clip', clipId);
        
        const clipResult = await clipFactory.generateViralClips(
          { videoPath: downloadResult.filePath },
          { count: 10, platform: 'tiktok' }
        );
        
        removeJob('clip', clipId);
        
        if (!clipResult.success) {
          console.error(`[AutonomousLoop] Clip generation failed: ${clipResult.error}`);
          loopState.errorsEncountered++;
          continue;
        }
        
        const generatedClips = clipResult.clips || [];
        cycleResult.stats.clipsGenerated += generatedClips.length;
        loopState.clipsGenerated += generatedClips.length;
        
        console.log(`[AutonomousLoop] Generated ${generatedClips.length} clips`);
        
        // Stage 5: Generate AI metadata (title, caption, hashtags)
        const titleGen = getTitleGenerator();
        const captionGen = getCaptionGenerator();
        const hashtagGen = getHashtagEngine();
        
        for (const clip of generatedClips) {
          // Check memory safety
          const memCheck = checkMemorySafety();
          if (!memCheck.safe && memCheck.paused) break;
          
          if (!canStartJob('ai')) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          const aiTaskId = `ai_${clip.id}_${Date.now()}`;
          
          try {
            addJob('ai', aiTaskId);
            
            // Generate title
            const titles = titleGen ? titleGen.generateTitles({
              metadata: { title: candidate.title },
              viralScore: candidate.viralScore,
              platform: 'tiktok'
            }) : [{ title: candidate.title }];
            
            // Generate caption
            const caption = captionGen ? captionGen.generateCaption({
              platform: 'tiktok',
              viralScore: candidate.viralScore,
              customTopic: candidate.title
            }) : { caption: 'Check out this viral content!' };
            
            // Generate hashtags
            const hashtags = hashtagGen ? hashtagGen.generateHashtags({
              platform: 'tiktok',
              metadata: { title: candidate.title },
              viralScore: candidate.viralScore
            }) : { hashtags: { all: ['#viral', '#trending', '#fyp'] } };
            
            // Add AI metadata to clip
            clip.generatedTitle = titles[0]?.title || candidate.title;
            clip.generatedCaption = caption.caption || '';
            clip.generatedHashtags = hashtags.hashtags?.all || [];
            
            removeJob('ai', aiTaskId);
            
          } catch (aiError) {
            console.error(`[AutonomousLoop] AI generation error: ${aiError.message}`);
            removeJob('ai', aiTaskId);
            loopState.errorsEncountered++;
          }
        }
        
        // Stage 6: Push to content queue
        const queue = getContentQueue();
        const scheduler = getPostScheduler();
        
        for (const clip of generatedClips) {
          try {
            // Add to content queue
            if (queue && queue.addToQueue) {
              const queueItem = queue.addToQueue({
                clipId: clip.id,
                title: clip.generatedTitle || clip.title || 'Viral Clip',
                platform: 'tiktok',
                status: 'pending',
                metadata: {
                  viralScore: candidate.viralScore,
                  sourceVideo: candidate.id,
                  generatedCaption: clip.generatedCaption,
                  generatedHashtags: clip.generatedHashtags
                }
              });
              
              cycleResult.stats.clipsQueued++;
              loopState.clipsQueued++;
              
              // Stage 7: Schedule posts
              if (scheduler && scheduler.schedulePost) {
                const scheduledPosts = scheduler.scheduleMultiPlatform({
                  clipId: clip.id,
                  title: clip.generatedTitle || clip.title,
                  caption: clip.generatedCaption || '',
                  hashtags: clip.generatedHashtags || [],
                  platforms: CONFIG.platforms
                });
                
                cycleResult.stats.postsScheduled += scheduledPosts.length;
                loopState.postsScheduled += scheduledPosts.length;
              }
            }
          } catch (queueError) {
            console.error(`[AutonomousLoop] Queue error: ${queueError.message}`);
            loopState.errorsEncountered++;
          }
        }
        
      } catch (processError) {
        console.error(`[AutonomousLoop] Processing error: ${processError.message}`);
        removeJob('download', downloadId);
        loopState.errorsEncountered++;
      }
    }
    
    // Mark cycle as complete
    cycleResult.success = true;
    cycleResult.endTime = new Date().toISOString();
    cycleResult.duration = Date.now() - cycleStartTime;
    
    loopState.cyclesCompleted++;
    loopState.lastCycleAt = cycleResult.endTime;
    loopState.nextCycleAt = new Date(Date.now() + CONFIG.cooldownBetweenCycles).toISOString();
    
    console.log(`[AutonomousLoop] ✅ Cycle ${cycleId} completed in ${cycleResult.duration}ms`);
    console.log(`[AutonomousLoop] 📊 Stats: ${cycleResult.stats.clipsQueued} queued, ${cycleResult.stats.postsScheduled} scheduled`);
    
  } catch (error) {
    cycleResult.success = false;
    cycleResult.error = error.message;
    cycleResult.endTime = new Date().toISOString();
    cycleResult.duration = Date.now() - cycleStartTime;
    
    loopState.errorsEncountered++;
    
    console.error(`[AutonomousLoop] ❌ Cycle ${cycleId} failed: ${error.message}`);
  }
  
  // Add to history
  loopState.cycleHistory.push(cycleResult);
  
  // Keep only last 50 cycles in history
  if (loopState.cycleHistory.length > 50) {
    loopState.cycleHistory = loopState.cycleHistory.slice(-50);
  }
  
  loopState.currentCycle = null;
  
  return cycleResult;
}

// ============================================================================
// MAIN LOOP CONTROL
// ============================================================================

/**
 * Start the autonomous content loop
 * @returns {Object} Start result
 */
async function startLoop() {
  if (loopState.isRunning) {
    return {
      success: false,
      reason: 'Loop is already running',
      state: getStatus()
    };
  }
  
  console.log('[AutonomousLoop] 🔄 Starting autonomous content loop...');
  
  loopState.isRunning = true;
  loopState.isStopping = false;
  loopState.startedAt = new Date().toISOString();
  loopState.nextCycleAt = new Date(Date.now() + 10000).toISOString(); // First cycle in 10 seconds
  
  // Start the loop
  runLoop();
  
  return {
    success: true,
    message: 'Autonomous content loop started',
    state: getStatus()
  };
}

/**
 * Stop the autonomous content loop
 * @returns {Object} Stop result
 */
async function stopLoop() {
  if (!loopState.isRunning) {
    return {
      success: false,
      reason: 'Loop is not running',
      state: getStatus()
    };
  }
  
  console.log('[AutonomousLoop] 🛑 Stopping autonomous content loop...');
  
  loopState.isStopping = true;
  loopState.isRunning = false;
  
  // Wait for current cycle to finish
  if (loopState.currentCycle) {
    console.log('[AutonomousLoop] Waiting for current cycle to finish...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return {
    success: true,
    message: 'Autonomous content loop stopped',
    state: getStatus()
  };
}

/**
 * Run the main loop (internal)
 */
async function runLoop() {
  if (!loopState.isRunning || loopState.isStopping) {
    return;
  }
  
  // Check if paused due to memory
  const safety = checkMemorySafety();
  
  if (safety.paused) {
    console.log(`[AutonomousLoop] ⏸️ Loop paused: ${safety.reason}`);
    
    // Schedule next check
    setTimeout(runLoop, 30000); // Check every 30 seconds
    return;
  }
  
  // Execute cycle
  loopState.currentCycle = await executeCycle();
  
  // Schedule next cycle
  if (loopState.isRunning && !loopState.isStopping) {
    loopState.nextCycleAt = new Date(Date.now() + CONFIG.cooldownBetweenCycles).toISOString();
    
    console.log(`[AutonomousLoop] ⏰ Next cycle scheduled: ${loopState.nextCycleAt}`);
    
    // Wait for cooldown period
    setTimeout(runLoop, CONFIG.cooldownBetweenCycles);
  }
}

/**
 * Get current status
 * @returns {Object} Status object
 */
function getStatus() {
  const safety = checkMemorySafety();
  
  return {
    // Control status
    isRunning: loopState.isRunning,
    isPaused: loopState.isPaused,
    isStopping: loopState.isStopping,
    
    // Timing
    startedAt: loopState.startedAt,
    lastCycleAt: loopState.lastCycleAt,
    nextCycleAt: loopState.nextCycleAt,
    pausedAt: loopState.pausedAt,
    pauseReason: loopState.pauseReason,
    
    // Statistics
    cyclesCompleted: loopState.cyclesCompleted,
    videosDiscovered: loopState.videosDiscovered,
    videosDownloaded: loopState.videosDownloaded,
    clipsGenerated: loopState.clipsGenerated,
    clipsQueued: loopState.clipsQueued,
    postsScheduled: loopState.postsScheduled,
    errorsEncountered: loopState.errorsEncountered,
    
    // Active jobs
    activeJobs: {
      downloads: loopState.activeJobs.downloads.length,
      clips: loopState.activeJobs.clips.length,
      aiTasks: loopState.activeJobs.aiTasks.length,
      maxDownloads: CONFIG.maxConcurrentDownloads,
      maxClips: CONFIG.maxClipProcessing,
      maxAITasks: CONFIG.maxAITasks
    },
    
    // Safety
    memory: {
      usage: safety.usage,
      isSafe: safety.safe,
      isPaused: safety.paused,
      threshold: CONFIG.memoryPauseThreshold,
      resumeThreshold: CONFIG.memoryResumeThreshold
    },
    
    // Current cycle
    currentCycle: loopState.currentCycle ? {
      id: loopState.currentCycle.cycleId,
      startTime: loopState.currentCycle.startTime,
      stages: Object.keys(loopState.currentCycle.stages)
    } : null,
    
    // Configuration
    config: {
      cooldownMinutes: CONFIG.cooldownBetweenCycles / 60000,
      minViralScore: CONFIG.minViralScore,
      maxCandidatesPerCycle: CONFIG.maxCandidatesPerCycle,
      platforms: CONFIG.platforms
    }
  };
}

/**
 * Get system report (for Overlord AI integration)
 * @returns {Object} Comprehensive system report
 */
function getSystemReport() {
  const status = getStatus();
  
  return {
    timestamp: new Date().toISOString(),
    autonomousMode: {
      enabled: status.isRunning,
      status: status.isRunning ? (status.isPaused ? 'paused' : 'active') : 'stopped',
      uptime: status.startedAt ? Date.now() - new Date(status.startedAt).getTime() : 0
    },
    contentPipeline: {
      totalDiscovered: status.videosDiscovered,
      totalDownloaded: status.videosDownloaded,
      totalClipsGenerated: status.clipsGenerated,
      totalClipsQueued: status.clipsQueued,
      totalPostsScheduled: status.postsScheduled,
      cyclesCompleted: status.cyclesCompleted,
      errors: status.errorsEncountered
    },
    resources: {
      memoryUsage: status.memory.usage,
      memorySafe: status.memory.isSafe,
      activeJobs: status.activeJobs
    },
    nextAction: {
      nextCycle: status.nextCycleAt,
      timeUntilNext: status.nextCycleAt ? new Date(status.nextCycleAt).getTime() - Date.now() : null
    }
  };
}

/**
 * Manually trigger a cycle
 * @returns {Object} Trigger result
 */
async function triggerCycle() {
  if (!loopState.isRunning) {
    return {
      success: false,
      reason: 'Loop is not running. Start it first.',
      state: getStatus()
    };
  }
  
  const safety = checkMemorySafety();
  if (!safety.safe && safety.paused) {
    return {
      success: false,
      reason: `Cannot trigger cycle: ${safety.reason}`,
      state: getStatus()
    };
  }
  
  // Execute immediately
  const result = await executeCycle();
  
  // Reset next cycle timer
  loopState.nextCycleAt = new Date(Date.now() + CONFIG.cooldownBetweenCycles).toISOString();
  
  return {
    success: result.success,
    cycleResult: result,
    state: getStatus()
  };
}

/**
 * Get recent cycle history
 * @param {number} limit - Number of cycles to return
 * @returns {Array} Cycle history
 */
function getCycleHistory(limit = 10) {
  return loopState.cycleHistory.slice(-limit);
}

/**
 * Clear cycle history
 * @returns {Object} Clear result
 */
function clearHistory() {
  const count = loopState.cycleHistory.length;
  loopState.cycleHistory = [];
  
  return {
    success: true,
    cleared: count
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main controls
  startLoop,
  stopLoop,
  triggerCycle,
  
  // Status
  getStatus,
  getSystemReport,
  
  // History
  getCycleHistory,
  clearHistory,
  
  // Safety
  checkMemorySafety,
  
  // Configuration
  CONFIG
};

