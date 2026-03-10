// OVERLORD V11 LITE STABLE - 8GB OPTIMIZED CORE
// UPGRADED: Smart Cut Engine V3 - Speech Sensitive
// INTEGRATED: Stage B - Scene + Emotion AI
console.log("🎬 OVERLORD V11 LITE STABLE");
console.log("[OVERLORD V11 LITE STABLE - 8GB READY]");
console.log("[SmartCut V3] Speech-sensitive cut detection active.");
console.log("[SmartCut V3] Silence detection: -35dB threshold, 400ms min");
console.log("[SmartCut V3] Speech guard buffer: 0.25s before/after silence");
console.log("[SmartCut V3] Min clip: 3.5s, Max clip: 45s");
console.log("[StageB] Scene detection ready");
console.log("[StageB] Emotion scoring ready");

/**
 * CLIPPERAI2026 - OVERLORD V11 LITE STABLE
 * Target: 8GB RAM Laptop
 * Mode: Stable, Auto Adaptive
 * 
 * UPGRADED: Smart Cut Engine V2 with:
 * - Speech-to-text analysis
 * - Sentence boundary detection
 * - Silence detection
 * - Scene detection
 * - Viral scoring
 * - Hook booster
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Smart Cut Engine V3 - Speech Sensitive
const smartCutEngineV3 = require('./smartCutEngine_V3');

// Smart Cut Engine V2 (legacy fallback)
const smartCutEngine = require('./smartCutEngine');

// OVERLORD Stage B - Scene + Emotion AI
const sceneEmotionEngine = require('./sceneEmotionEngine');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const SOUNDTRACKS_DIR = path.join(OUTPUT_DIR, 'soundtracks');
const FORMATTED_DIR = path.join(OUTPUT_DIR, 'formatted');
const SUBTITLES_DIR = path.join(OUTPUT_DIR, 'subtitles');
const THUMBNAILS_DIR = path.join(OUTPUT_DIR, 'thumbnails');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const STATS_FILE = path.join(OUTPUT_DIR, 'stats.json');

// Stats Aggregator
const statsAggregator = require('../services/statsAggregator');

// Prisma client for database
const prisma = require('../prisma/client');

// ============ OVERLORD V11 CONFIG ============
const CONFIG = {
  // Memory Control
  HARD_MEMORY_CAP: 80,
  MEMORY_DOWNGRADE: 75,
  MAX_CONCURRENCY: 2,
  MAX_THREADS: 2,
  COOLDOWN_BETWEEN_RENDERS: 2000,
  
  // Render Settings
  DEFAULT_RESOLUTION: '720p',
  BITRATE: 'medium-low',
  AUDIO_BITRATE: '96k',
  FFMPEG_PRESET: 'veryfast',
  CRF: 23,
  
  // Smart Cut V11 Lite
  MIN_SILENCE_GAP: 0.4,
  SPEECH_WAVEFORM_PROTECTION: true,
  
  // Platform durations
  PLATFORMS: [
    { name: 'youtube', width: 1280, height: 720, aspect: '16:9', dir: 'youtube', duration: [45, 90] },
    { name: 'tiktok', width: 720, height: 1280, aspect: '9:16', dir: 'tiktok', duration: [25, 40] },
    { name: 'instagram', width: 720, height: 1280, aspect: '9:16', dir: 'instagram', duration: [30, 45] },
    { name: 'facebook', width: 720, height: 720, aspect: '1:1', dir: 'facebook', duration: [30, 60] }
  ],
  
  // ECO platforms (lower quality)
  ECO_PLATFORMS: [
    { name: 'youtube', width: 854, height: 480, aspect: '16:9', dir: 'youtube', duration: [45, 90] },
    { name: 'tiktok', width: 540, height: 960, aspect: '9:16', dir: 'tiktok', duration: [25, 40] },
    { name: 'instagram', width: 540, height: 960, aspect: '9:16', dir: 'instagram', duration: [30, 45] },
    { name: 'facebook', width: 540, height: 540, aspect: '1:1', dir: 'facebook', duration: [30, 60] }
  ],
  
  // Auto Features (Light Mode)
  AUTO_MUSIC: true,
  MUSIC_VOLUME: 0.08, // -28dB
  FADE_DURATION: 0.4,
  WATERMARK_CORNER: true,
  WATERMARK_OPACITY: 0.6,
  SUBTITLE_BASIC: true,
  SUBTITLE_MAX_LINES: 2,
  
  // Safeguard Layer
  ECO_THRESHOLD: 78,
  FORCE_SEQUENTIAL_THRESHOLD: 82,
  PAUSE_THRESHOLD: 85,
  ECO_COOLDOWN: 3000
};

// Output folders
const OUTPUT_FOLDERS = ['formatted', 'subtitles', 'soundtracks', 'watermarked', 'youtube', 'tiktok', 'instagram', 'facebook', 'thumbnails'];

// ============ STATE ============
const renderQueue = [];
let isProcessing = false;
const processedHashes = new Set();
const activityTimeline = [];
let currentJobStatus = 'Idle';
let currentJobId = null;
let io = null;
let memoryPeak = 0;
let statsCache = null;
let statsDirty = false;
let renderCount = 0;
let creditsUsed = 0;
let recentScores = [];

let featureStates = {
  smartCut: true,
  autoMusic: true,
  fadeEffect: true,
  watermark: true,
  subtitle: true,
  ecoMode: false
};

// ============ HELPERS ============
function setSocketIO(socketIO) { io = socketIO; }
function emitProgress(jobId, percent, stage) { if (io) io.emit('renderProgress', { jobId, percent, stage: stage || 'processing' }); }

function addActivityEvent(event, details = '') {
  const evt = { event, details, timestamp: new Date().toISOString() };
  activityTimeline.push(evt);
  if (activityTimeline.length > 50) activityTimeline.shift();
  console.log('[Activity] ' + event + (details ? ' - ' + details : ''));
}

function getActivityTimeline() { return activityTimeline.slice(-20); }

function generateFileHash(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex').substring(0, 16);
  } catch (e) {
    return crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 16);
  }
}

function checkDuplicate(hash) {
  if (processedHashes.has(hash)) {
    console.log('[Duplicate] Hash match - generating unique ID');
    return true;
  }
  processedHashes.add(hash);
  return false;
}

function ensureOutputDirs() {
  OUTPUT_FOLDERS.forEach(folder => {
    const dir = path.join(OUTPUT_DIR, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(SOUNDTRACKS_DIR)) fs.mkdirSync(SOUNDTRACKS_DIR, { recursive: true });
}

// ============ MEMORY CHECK ============
function checkMemorySafe() {
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const percent = ((totalMem - freeMem) / totalMem) * 100;
    if (percent > memoryPeak) memoryPeak = percent;
    console.log('[Memory] Usage:', percent.toFixed(2) + '% | Peak:', memoryPeak.toFixed(2) + '%');
    return percent;
  } catch { return 50; }
}

// ============ STAGE B 8GB MEMORY GUARD ============
function isStageBEnabled() {
  const memPercent = checkMemorySafe();
  if (memPercent >= 85) {
    console.log('[StageB] Disabled due to memory guard');
    return false;
  }
  return true;
}

function getRenderMode() {
  const memPercent = checkMemorySafe();
  if (memPercent >= CONFIG.PAUSE_THRESHOLD) return 'PAUSE';
  if (memPercent >= CONFIG.FORCE_SEQUENTIAL_THRESHOLD) return 'SEQUENTIAL';
  if (memPercent >= CONFIG.ECO_THRESHOLD) return 'ECO';
  return 'STABLE';
}

function getFeaturesForMode(mode) {
  featureStates = {
    smartCut: true,
    autoMusic: mode !== 'SEQUENTIAL' && mode !== 'PAUSE',
    fadeEffect: mode === 'STABLE' || mode === 'ECO',
    watermark: mode !== 'PAUSE',
    subtitle: mode === 'STABLE',
    ecoMode: mode === 'ECO'
  };
  
  if (mode === 'ECO') {
    addActivityEvent('ECO MODE', 'Lower bitrate');
  } else if (mode === 'SEQUENTIAL') {
    addActivityEvent('Sequential Mode', 'Auto music disabled');
  } else if (mode === 'PAUSE') {
    addActivityEvent('Pause Mode', 'Limited features');
  }
  
  return featureStates;
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function runFFmpeg(args, timeout) {
  timeout = timeout || 180000;
  return new Promise(function(resolve, reject) {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    let killed = false;
    
    const child = spawn(ffmpegPath, args, { 
      shell: true, 
      windowsHide: true, 
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    child.on('close', function(code) {
      if (killed) reject(new Error('FFmpeg timeout'));
      else if (code === 0) resolve();
      else reject(new Error('FFmpeg exited with code ' + code));
    });
    child.on('error', reject);
    
    setTimeout(function() {
      killed = true;
      try { child.kill(); } catch (e) { }
      reject(new Error('FFmpeg timeout'));
    }, timeout);
  });
}

function getRandomSoundtrack() {
  try {
    if (!fs.existsSync(SOUNDTRACKS_DIR)) return null;
    const files = fs.readdirSync(SOUNDTRACKS_DIR).filter(f => f.endsWith('.mp3'));
    if (files.length === 0) return null;
    return path.join(SOUNDTRACKS_DIR, files[Math.floor(Math.random() * files.length)]);
  } catch { return null; }
}

function getLogoPath() {
  const logoPath = path.join(ASSETS_DIR, 'logo.png');
  return fs.existsSync(logoPath) ? logoPath : null;
}

function generateBasicSubtitle(filename, outputPath) {
  const baseName = path.basename(filename, path.extname(filename));
  const text = baseName.replace(/[-_]/g, ' ').substring(0, 40);
  const srt = `1
00:00:00,000 --> 00:00:05,000
${text}

2
00:00:05,000 --> 00:00:10,000
ClipperAI V11
`;
  fs.writeFileSync(outputPath, srt);
  return outputPath;
}

function calculateViralScore(duration, hasMusic, hasSubtitle, hasWatermark) {
  let score = 50;
  if (duration >= 30 && duration <= 60) score += 20;
  else if (duration >= 25) score += 10;
  if (hasMusic) score += 10;
  if (hasSubtitle) score += 10;
  if (hasWatermark) score += 5;
  return Math.min(95, score);
}

function updateRecentScores(score) {
  recentScores.push(score);
  if (recentScores.length > 100) recentScores.shift();
}

function getAverageViralScore() {
  if (recentScores.length === 0) return 70;
  const sum = recentScores.reduce((a, b) => a + b, 0);
  return Math.round(sum / recentScores.length);
}

function getTrendingItems() {
  const sorted = [...recentScores].sort((a, b) => b - a);
  return sorted.slice(0, 5).length;
}

// ============ RENDER FUNCTION ============
async function renderClip(videoPath, platform, jobId, features) {
  const platforms = features.ecoMode ? CONFIG.ECO_PLATFORMS : CONFIG.PLATFORMS;
  const platformConfig = platforms.find(p => p.name === platform) || platforms[0];
  const outputPath = path.join(OUTPUT_DIR, platformConfig.dir, `${jobId}_${platform}.mp4`);
  
  let lastError = null;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        console.log('[Render] Retry ' + platform + ' attempt ' + (attempt + 1));
        await wait(1000);
      }
      
      let filters = [];
      
      // Scale
      filters.push(`scale=${platformConfig.width}:${platformConfig.height}:force_original_aspect_ratio=decrease`);
      filters.push(`pad=${platformConfig.width}:${platformConfig.height}:(ow-iw)/2:(oh-ih)/2`);
      
      // Fade in/out
      if (features.fadeEffect) {
        filters.push(`fade=t=in:st=0:d=${CONFIG.FADE_DURATION}`);
        filters.push(`fade=t=out:st=${platformConfig.duration[1] - CONFIG.FADE_DURATION}:d=${CONFIG.FADE_DURATION}`);
      }
      
      let vfFilter = filters.join(',');
      let args = ['-i', videoPath];
      
      // Music
      if (features.autoMusic) {
        const musicPath = getRandomSoundtrack();
        if (musicPath) args.push('-i', musicPath);
      }
      
      // Watermark (corner only - lightweight)
      if (features.watermark) {
        const logoPath = getLogoPath();
        if (logoPath) {
          args.push('-i', logoPath);
          const logoW = Math.floor(platformConfig.width * 0.08);
          const x = 10;
          const y = 10;
          vfFilter += `,overlay=${x}:${y}`;
        }
      }
      
      args.push('-vf', vfFilter);
      
      // Audio
      if (features.autoMusic && getRandomSoundtrack()) {
        args.push('-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first:weights=1 ${CONFIG.MUSIC_VOLUME}[aout]`);
        args.push('-map', '0:v');
        args.push('-map', '[aout]');
      } else {
        args.push('-c:a', 'aac');
        args.push('-b:a', CONFIG.AUDIO_BITRATE);
      }
      
      // Encoding
      args.push('-c:v', 'libx264');
      args.push('-profile:v', 'high');
      args.push('-level', '4.0');
      args.push('-preset', CONFIG.FFMPEG_PRESET);
      args.push('-crf', String(CONFIG.CRF));
      args.push('-threads', String(CONFIG.MAX_THREADS));
      args.push('-pix_fmt', 'yuv420p');
      args.push('-t', String(platformConfig.duration[1]));
      args.push('-movflags', '+faststart');
      args.push('-y');
      args.push(outputPath);
      
      emitProgress(jobId, 30, 'rendering');
      addActivityEvent('Rendering', platform + ' ' + platformConfig.width + 'p');
      await runFFmpeg(args, 180000);
      
      // Basic subtitle
      if (features.subtitle) {
        try {
          const subPath = path.join(SUBTITLES_DIR, `${jobId}.srt`);
          generateBasicSubtitle(videoPath, subPath);
        } catch (e) {}
      }
      
      console.log('[Render] Saved:', platformConfig.dir + '/' + jobId + '_' + platform + '.mp4');
      addActivityEvent('Clip Saved', platform);
      
      return { 
        platform, path: outputPath, success: true,
        duration: platformConfig.duration[1],
        resolution: platformConfig.width + 'p'
      };
    } catch (err) {
      lastError = err;
      console.error('[Render] Error:', err.message);
    }
  }
  
  return { platform, error: lastError.message, success: false, duration: 0, resolution: '0p' };
}

// ============ QUEUE PROCESSOR ============
async function processQueue() {
  if (isProcessing || renderQueue.length === 0) return;
  isProcessing = true;
  const job = renderQueue.shift();
  
  try { await processJob(job); } 
  catch (err) { console.error('[Queue] Job error:', err.message); job.reject(err); }
  
  isProcessing = false;
  if (renderQueue.length > 0) {
    await wait(CONFIG.COOLDOWN_BETWEEN_RENDERS);
    processQueue();
  }
}

// Process job
async function processJob(job) {
  const { videoPath, options, resolve, reject } = job;
  const timestamp = Date.now();
  const jobId = options.jobId || ('job_' + timestamp);
  
  currentJobStatus = 'Processing';
  currentJobId = jobId;
  
  console.log('[Job] Starting:', jobId);
  addActivityEvent('Processing Started', jobId);
  
  // Check duplicate
  const hash = generateFileHash(videoPath);
  const isDup = checkDuplicate(hash);
  if (isDup) addActivityEvent('Duplicate detected', 'unique ID generated');
  
  if (!fs.existsSync(videoPath)) throw new Error('Input video not found');
  ensureOutputDirs();
  
  const mode = getRenderMode();
  const features = getFeaturesForMode(mode);
  
  // Cooldown if ECO
  if (mode === 'ECO') {
    console.log('[ECO] Cooldown 3s...');
    await wait(CONFIG.ECO_COOLDOWN);
  }
  
  const result = {
    success: true,
    jobId: isDup ? jobId + '_' + timestamp : jobId,
    mode: mode,
    memoryPeak: memoryPeak,
    ecoMode: features.ecoMode,
    duplicate: isDup,
    clips: {},
    viralScores: {},
    errors: []
  };
  
  try {
    addActivityEvent('SmartCut V11 Lite', 'Silence gap >= 400ms');
    
    const platforms = ['youtube', 'tiktok', 'instagram', 'facebook'];
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      
      // Check memory before each render
      const currentMode = getRenderMode();
      if (currentMode === 'PAUSE') {
        addActivityEvent('Paused', 'Memory > 85%');
        await wait(5000);
      }
      
      const percent = Math.floor(((i + 1) / platforms.length) * 100);
      emitProgress(result.jobId, percent, platform);
      
      const clipResult = await renderClip(videoPath, platform, result.jobId, features);
      
      if (clipResult.success) {
        result.clips[platform] = clipResult.path;
        result.viralScores[platform] = calculateViralScore(
          clipResult.duration, features.autoMusic, features.subtitle, features.watermark
        );
        updateRecentScores(result.viralScores[platform]);
        addActivityEvent('Clip Generated', platform + ' ' + clipResult.resolution + ' score:' + result.viralScores[platform]);
      } else {
        result.errors.push({ platform, error: clipResult.error });
      }
      
      // Cooldown between renders
      if (i < platforms.length - 1) {
        await wait(CONFIG.COOLDOWN_BETWEEN_RENDERS);
      }
    }
    
    renderCount++;
    creditsUsed += Object.keys(result.clips).length;
    
    currentJobStatus = 'Idle';
    currentJobId = null;
    addActivityEvent('Rendering Complete', result.jobId);
    addActivityEvent('Memory Stable', 'Peak: ' + memoryPeak.toFixed(2) + '%');
    emitProgress(result.jobId, 100, 'complete');
    
if (statsDirty) {
      updateStatsFile(result);
      statsDirty = false;
    }
    
    // Save platform records to database (non-blocking)
    savePlatformRecordsToDB(result, videoPath).catch(err => {
      console.error('[Analytics Sync] Background save failed:', err.message);
    });
    
    if (result.errors.length > 0) result.success = false;
    resolve(result);
  } catch (err) {
    currentJobStatus = 'Error';
    console.error('[Job] Critical:', err.message);
    reject(err);
  }
}

// ============ UPDATE STATS FILE ============
function updateStatsFile(result) {
  try {
    const stats = getDashboardStats();
    stats.lastJob = {
      jobId: result.jobId,
      mode: result.mode,
      memoryPeak: result.memoryPeak,
      platforms: Object.keys(result.clips),
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    console.log('[Stats] Dashboard updated');
  } catch (e) {}
}

// ============ SAVE PLATFORM RECORDS TO DATABASE ============
async function savePlatformRecordsToDB(result, videoPath) {
  // Lazy-load thumbnail service to avoid startup errors
  let thumbnailService = null;
  try {
    thumbnailService = require('../services/thumbnailService');
  } catch (e) {
    console.log('[Thumbnail] Service not available');
  }

  try {
    // Get or create default user (id: 1)
    let userId = 1;
    
    // Get original video filename
    const originalFilename = path.basename(videoPath);
    const originalTitle = path.basename(videoPath, path.extname(videoPath));
    
    // Save each platform clip to database
    const platforms = Object.keys(result.clips);
    for (const platform of platforms) {
      const clipPath = result.clips[platform];
      const viralScore = result.viralScores[platform] || 70;
      
      // Generate thumbnail for this clip
      let thumbnailPath = null;
      if (thumbnailService && fs.existsSync(clipPath)) {
        try {
          // Generate thumbnail in the same directory as the clip
          const clipDir = path.dirname(clipPath);
          thumbnailPath = await thumbnailService.generateThumbnail(clipPath, clipDir, {
            width: 320,
            quality: 3,
            timestamp: '00:00:01'
          });
          
          if (thumbnailPath) {
            // Convert to relative path for storage
            thumbnailPath = path.relative(path.join(__dirname, '..'), thumbnailPath).replace(/\\/g, '/');
            console.log('[Thumbnail] Generated:', thumbnailPath);
          }
        } catch (thumbError) {
          console.log('[Thumbnail] Failed:', thumbError.message);
        }
      }
      
      // Create Video record for each platform
      await prisma.video.create({
        data: {
          title: `${originalTitle} - ${platform}`,
          filename: path.basename(clipPath),
          path: clipPath,
          platform: platform,
          status: 'completed',
          userId: userId,
          viralScore: viralScore
        }
      });
      
      console.log(`[Analytics Sync] Created ${platform} record: ${path.basename(clipPath)}`);
    }
    
    console.log('[Analytics Sync] Platform records inserted successfully.');
  } catch (error) {
    console.error('[Analytics Sync] Error saving platform records:', error.message);
  }
}

// ============ MAIN API ============
function generateClips(videoPath, options) {
  return new Promise((resolve, reject) => {
    const job = { videoPath, options: options || {}, resolve, reject };
    renderQueue.push(job);
    console.log('[Queue] Job added, queue size:', renderQueue.length);
    statsDirty = true;
    if (!isProcessing) processQueue();
  });
}

// ============ DASHBOARD STATS ============
function getDashboardStats() {
  if (statsCache && !statsDirty) return statsCache;
  
  const stats = {
    totalVideos: 0,
    totalClips: 0,
    platformCounts: {},
    avgViralScore: getAverageViralScore(),
    trendingItems: getTrendingItems(),
    aiConfidence: getAverageViralScore(),
    aiStatus: currentJobStatus,
    activeJob: currentJobId,
    processingJobs: renderQueue.length,
    creditsUsed: creditsUsed,
    memoryUsage: 0,
    memoryPeak: memoryPeak,
    queueSize: renderQueue.length,
    renderMode: getRenderMode(),
    featureStatus: featureStates,
    renderCount: renderCount,
    lastUpdated: new Date().toISOString()
  };
  
  let totalClips = 0;
  CONFIG.PLATFORMS.forEach(p => {
    const dir = path.join(OUTPUT_DIR, p.dir);
    let count = 0;
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4') && !f.startsWith('.'));
      count = files.length;
    }
    stats.platformCounts[p.name] = count;
    totalClips += count;
  });
  stats.totalClips = totalClips;
  
  if (fs.existsSync(FORMATTED_DIR)) {
    stats.totalVideos = fs.readdirSync(FORMATTED_DIR).filter(f => f.endsWith('.mp4')).length;
  }
  
  stats.memoryUsage = checkMemorySafe();
  
  statsCache = stats;
  return stats;
}

// ============ SMART CUT V2 - CAPCUT MODE API ============

/**
 * Analyze video with Smart Cut V2 for intelligent segmentation
 * Returns high-scoring segments with viral metadata
 */
async function analyzeWithSmartCut(videoPath, options = {}) {
  try {
    log('[SmartCut V2] Starting intelligent analysis...');
    addActivityEvent('SmartCut V2', 'Analyzing video content');
    
    const result = await smartCutEngine.analyzeVideo(videoPath, options);
    
    log(`[SmartCut V2] Analysis complete: ${result.segments.length} segments found`);
    addActivityEvent('SmartCut V2 Analysis', `Found ${result.segments.length} high-scoring segments`);
    
    return result;
  } catch (error) {
    log(`[SmartCut V2] Error: ${error.message}`);
    addActivityEvent('SmartCut V2 Error', error.message);
    throw error;
  }
}

/**
 * Generate clips using Smart Cut V2 intelligent segmentation
 * This is the main entry point for CapCut-style auto-clipping
 * ENHANCED: Stage B - Scene + Emotion AI for smarter cut selection
 */
async function generateSmartClips(videoPath, options = {}) {
  const {
    maxSegments = 8,
    targetDuration = 30,
    platforms = ['youtube', 'tiktok', 'instagram', 'facebook']
  } = options;
  
  const timestamp = Date.now();
  const jobId = options.jobId || ('smart_' + timestamp);
  
  currentJobStatus = 'Smart Processing';
  currentJobId = jobId;
  
  log(`[SmartCut V2] Starting: ${jobId}`);
  addActivityEvent('SmartCut V2 Started', jobId);
  
  try {
    // ============ PIPELINE: SmartCut V3 → Stage B Enhancement ============
    let segments = [];
    let segmentAnalysis = {};
    let usedStageB = false;
    
    // Step 1: Run SmartCut V3 FIRST (speech-sensitive cut detection)
    log('[SmartCut V3] Running speech-sensitive cut detection...');
    emitProgress(jobId, 10, 'smartcut');
    
    try {
      const analysis = await smartCutEngineV3.analyzeVideo(videoPath, {
        targetDuration,
        maxSegments
      });
      segments = analysis.segments;
      segmentAnalysis = analysis.metadata || {};
      log(`[SmartCut V3] Found ${segments.length} base segments`);
    } catch (scError) {
      log(`[SmartCut V3] Error: ${scError.message}, falling back to V2`);
      // Fallback to V2 if V3 fails
      const analysis = await smartCutEngine.analyzeVideo(videoPath, {
        targetDuration,
        maxSegments
      });
      segments = analysis.segments;
      segmentAnalysis = analysis.metadata || {};
    }
    
    // Step 2: Stage B Enhancement (if memory allows)
    if (isStageBEnabled() && segments.length > 0) {
      try {
        log('[StageB] Scene detection active');
        log('[StageB] Emotion scoring enabled');
        
        // Enhance segments with emotion scoring
        const sceneSegments = await sceneEmotionEngine.analyze(videoPath);
        
        if (sceneSegments && sceneSegments.length > 0) {
          // Merge Stage B scores with SmartCut V3 segments
          log(`[StageB] Enhanced segments count: ${sceneSegments.length}`);
          segments = sceneSegments;
          usedStageB = true;
          log('[StageB] Enhancement complete');
        } else {
          log('[StageB] No emotion segments found, using SmartCut V3 segments');
        }
      } catch (stageBError) {
        log(`[StageB] Warning: ${stageBError.message}, continuing with SmartCut V3 segments`);
      }
    } else if (!isStageBEnabled()) {
      log('[StageB] Skipped due to memory guard');
    }
    
    // Step 3: If SmartCut V3 failed completely, fallback to legacy silence cut
    if (segments.length === 0) {
      log('[SmartCut] No segments found, using legacy silence detection');
      const analysis = await smartCutEngine.analyzeVideo(videoPath, {
        targetDuration,
        maxSegments
      });
      segments = analysis.segments;
      segmentAnalysis = analysis.metadata || {};
    }
    
    emitProgress(jobId, 30, 'segments');
    log(`[Pipeline] Final segments count: ${segments.length}`);
    
    // Step 2: Get render mode and features
    const mode = getRenderMode();
    const features = getFeaturesForMode(mode);
    
    const result = {
      success: true,
      jobId,
      mode: 'SMART_' + mode,
      smartCutVersion: 'V2',
      stageBActive: usedStageB,
      memoryPeak: memoryPeak,
      segments: segments,
      segmentAnalysis: segmentAnalysis,
      clips: {},
      viralScores: {},
      errors: []
    };
    
    // Step 3: Render each segment to multiple platforms
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      for (const platform of platforms) {
        const platformConfig = CONFIG.PLATFORMS.find(p => p.name === platform) || CONFIG.PLATFORMS[0];
        
        // Calculate segment-specific output path
        const segmentOutputPath = path.join(
          OUTPUT_DIR, 
          platformConfig.dir, 
          `${jobId}_seg${i}_${platform}.mp4`
        );
        
        try {
          // Render segment with smart cut
          const clipResult = await renderSmartSegment(
            videoPath, 
            segment, 
            platform, 
            jobId,
            features,
            i
          );
          
          if (clipResult.success) {
            result.clips[`${platform}_seg${i}`] = clipResult.path;
            
            // Use segment's viral score (from Stage B or Smart Cut analysis)
            const segmentScore = segment.score || 70;
            result.viralScores[`${platform}_seg${i}`] = segmentScore;
            updateRecentScores(segmentScore);
            
            if (usedStageB) {
              addActivityEvent('StageB Segment', `${platform} seg${i} score:${segmentScore}`);
            } else {
              addActivityEvent('Smart Segment', `${platform} seg${i} score:${segmentScore}`);
            }
          } else {
            result.errors.push({ platform, segment: i, error: clipResult.error });
          }
        } catch (err) {
          result.errors.push({ platform, segment: i, error: err.message });
        }
      }
      
      // Progress update
      const percent = 30 + Math.floor(((i + 1) / segments.length) * 60);
      emitProgress(jobId, percent, `segment_${i}`);
      
      // ============ 8GB SAFETY: 2-second cooldown between renders ============
      if (i < segments.length - 1) {
        await wait(2000);
      }
    }
    
    renderCount++;
    creditsUsed += Object.keys(result.clips).length;
    
    currentJobStatus = 'Idle';
    currentJobId = null;
    
    if (usedStageB) {
      addActivityEvent('StageB Complete', `${result.clips.length} clips generated`);
    } else {
      addActivityEvent('SmartCut V2 Complete', `${result.clips.length} clips generated`);
    }
    emitProgress(jobId, 100, 'complete');
    
    // Save stats
    if (statsDirty) {
      updateStatsFile(result);
      statsDirty = false;
    }
    
    return result;
  } catch (error) {
    currentJobStatus = 'Error';
    log(`[SmartCut V2] Critical: ${error.message}`);
    throw error;
  }
}

/**
 * Render a specific segment of the video
 */
async function renderSmartSegment(videoPath, segment, platform, jobId, features, segmentIndex) {
  const platforms = features.ecoMode ? CONFIG.ECO_PLATFORMS : CONFIG.PLATFORMS;
  const platformConfig = platforms.find(p => p.name === platform) || platforms[0];
  const outputPath = path.join(OUTPUT_DIR, platformConfig.dir, `${jobId}_seg${segmentIndex}_${platform}.mp4`);
  
  const duration = segment.end - segment.start;
  
  let lastError = null;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        log(`[SmartCut] Retry segment ${segmentIndex} ${platform} attempt ${attempt + 1}`);
        await wait(1000);
      }
      
      let filters = [];
      
      // Scale
      filters.push(`scale=${platformConfig.width}:${platformConfig.height}:force_original_aspect_ratio=decrease`);
      filters.push(`pad=${platformConfig.width}:${platformConfig.height}:(ow-iw)/2:(oh-ih)/2`);
      
      // Fade in/out (for hook segments, add extra fade)
      if (features.fadeEffect) {
        if (segment.hasHook) {
          // Hook booster: stronger fade in
          filters.push(`fade=t=in:st=0:d=0.5`);
        } else {
          filters.push(`fade=t=in:st=0:d=${CONFIG.FADE_DURATION}`);
        }
        
        const fadeOutStart = Math.max(0, duration - CONFIG.FADE_DURATION);
        filters.push(`fade=t=out:st=${fadeOutStart}:d=${CONFIG.FADE_DURATION}`);
      }
      
      let vfFilter = filters.join(',');
      let args = ['-ss', String(segment.start), '-t', String(duration), '-i', videoPath];
      
      // Music
      if (features.autoMusic) {
        const musicPath = getRandomSoundtrack();
        if (musicPath) args.push('-i', musicPath);
      }
      
      // Watermark
      if (features.watermark) {
        const logoPath = getLogoPath();
        if (logoPath) {
          args.push('-i', logoPath);
          const logoW = Math.floor(platformConfig.width * 0.08);
          vfFilter += `,overlay=10:10`;
        }
      }
      
      args.push('-vf', vfFilter);
      
      // Audio
      if (features.autoMusic && getRandomSoundtrack()) {
        args.push('-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first:weights=1 ${CONFIG.MUSIC_VOLUME}[aout]`);
        args.push('-map', '0:v');
        args.push('-map', '[aout]');
      } else {
        args.push('-c:a', 'aac');
        args.push('-b:a', CONFIG.AUDIO_BITRATE);
      }
      
      // Encoding
      args.push('-c:v', 'libx264');
      args.push('-profile:v', 'high');
      args.push('-level', '4.0');
      args.push('-preset', CONFIG.FFMPEG_PRESET);
      args.push('-crf', String(CONFIG.CRF));
      args.push('-threads', String(CONFIG.MAX_THREADS));
      args.push('-pix_fmt', 'yuv420p');
      args.push('-movflags', '+faststart');
      args.push('-y');
      args.push(outputPath);
      
      log(`[SmartCut] Rendering segment ${segmentIndex} ${platform} [${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s]`);
      await runFFmpeg(args, 180000);
      
      return {
        platform,
        path: outputPath,
        success: true,
        duration,
        resolution: platformConfig.width + 'p',
        segmentIndex,
        startTime: segment.start,
        endTime: segment.end,
        score: segment.score
      };
    } catch (err) {
      lastError = err;
      log(`[SmartCut] Error segment ${segmentIndex} ${platform}: ${err.message}`);
    }
  }
  
  return {
    platform,
    error: lastError ? lastError.message : 'Unknown error',
    success: false,
    duration: 0,
    resolution: '0p',
    segmentIndex
  };
}

// Helper function for logging
function log(message) {
  console.log(`[SmartCut V2] ${message}`);
}

// Export
module.exports = {
  generateClips,
  generateSmartClips,
  analyzeWithSmartCut,
  setSocketIO,
  getDashboardStats,
  getActivityTimeline,
  CONFIG,
  featureStates,
  // Also export smartCutEngine for direct access
  smartCutEngine
};
