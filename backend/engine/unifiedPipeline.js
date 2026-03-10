/**
 * OVERLORD 8GB SAFE - Unified Pipeline Engine
 * 
 * Sequential pipeline: metadata → music → subtitle → prisma
 * - Creates derived files: *_raw.mp4, *_music.mp4, *_final.mp4
 * - Only ONE prisma.video.create() at final stage
 * - NO database writes in intermediate stages
 * - Respects memory limits
 * - 1500ms delay between stages
 * - Force GC between stages if available
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Import stages
const musicSync = require('./musicSyncLite');
const subtitleLite = require('./subtitleLite');
const dbSafeLayer = require('../core/dbSafeLayer');

// Stage delay
const STAGE_DELAY_MS = 1500;

// Memory thresholds
const MEMORY_SOFT_LIMIT = 80;
const MEMORY_HARD_LIMIT = 90;

/**
 * Check memory before each stage
 */
function checkMemory() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return Math.round((usedMem / totalMem) * 100);
  } catch (e) {
    return 0;
  }
}

/**
 * Force garbage collection if available
 */
function forceGC() {
  if (global.gc) {
    console.log('[Pipeline] Running garbage collection');
    global.gc();
  }
}

/**
 * Wait delay between stages
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate derived filename
 */
function getDerivedPath(originalPath, suffix) {
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const base = path.basename(originalPath, ext);
  return path.join(dir, `${base}_${suffix}${ext}`);
}

/**
 * Main unified pipeline
 * @param {Object} job - Job configuration
 * @returns {Promise<{success: boolean, outputPath: string, videoId?: number, error?: string}>}
 */
async function runPipeline(job) {
  const {
    inputPath,        // Original uploaded video
    title,
    platform = 'youtube',
    userId = 1,
    musicPath = null, // Optional music file
    musicVolume = 0.3,
    subtitleText = '', // Optional subtitle
    useGPU = true      // Use GPU encoder if available
  } = job;
  
  console.log('[Pipeline] Starting unified pipeline');
  console.log('[Pipeline] Input:', inputPath);
  
  // Verify input exists
  if (!fs.existsSync(inputPath)) {
    return { success: false, outputPath: '', error: 'Input file not found' };
  }
  
  // Check memory at start
  let memUsage = checkMemory();
  console.log('[Pipeline] Initial memory:', memUsage + '%');
  
  if (memUsage > MEMORY_HARD_LIMIT) {
    return { success: false, outputPath: '', error: `Memory too high (${memUsage}%), aborting` };
  }
  
  // ========================================
  // STAGE 1: Prepare raw file (pass-through)
  // ========================================
  const rawPath = getDerivedPath(inputPath, 'raw');
  
  try {
    console.log('[Pipeline] Stage 1: Preparing raw file');
    fs.copyFileSync(inputPath, rawPath);
    console.log('[Pipeline] Stage 1 complete:', rawPath);
  } catch (e) {
    return { success: false, outputPath: '', error: 'Stage 1 failed: ' + e.message };
  }
  
  await delay(STAGE_DELAY_MS);
  forceGC();
  
  // Check memory before stage 2
  memUsage = checkMemory();
  console.log('[Pipeline] Memory before stage 2:', memUsage + '%');
  
  if (memUsage > MEMORY_HARD_LIMIT) {
    // Cleanup and abort
    try { fs.unlinkSync(rawPath); } catch (e) {}
    return { success: false, outputPath: '', error: `Memory too high (${memUsage}%), aborting` };
  }
  
  // ========================================
  // STAGE 2: Music Sync
  // ========================================
  const musicPath2 = getDerivedPath(inputPath, 'music');
  
  try {
    console.log('[Pipeline] Stage 2: Applying music sync');
    const musicResult = await musicSync.apply(rawPath, musicPath2, {
      musicVolume,
      musicPath
    });
    
    if (!musicResult.success) {
      console.warn('[Pipeline] Music sync failed, using raw');
      fs.copyFileSync(rawPath, musicPath2);
    }
    console.log('[Pipeline] Stage 2 complete:', musicPath2);
  } catch (e) {
    console.warn('[Pipeline] Music stage error:', e.message);
    fs.copyFileSync(rawPath, musicPath2);
  }
  
  await delay(STAGE_DELAY_MS);
  forceGC();
  
  // Check memory before stage 3
  memUsage = checkMemory();
  console.log('[Pipeline] Memory before stage 3:', memUsage + '%');
  
  if (memUsage > MEMORY_HARD_LIMIT) {
    // Cleanup and abort
    try { fs.unlinkSync(rawPath); } catch (e) {}
    try { fs.unlinkSync(musicPath2); } catch (e) {}
    return { success: false, outputPath: '', error: `Memory too high (${memUsage}%), aborting` };
  }
  
  // ========================================
  // STAGE 3: Subtitle Overlay
  // ========================================
  const finalPath = getDerivedPath(inputPath, 'final');
  
  try {
    console.log('[Pipeline] Stage 3: Applying subtitles');
    const subResult = await subtitleLite.apply(musicPath2, finalPath, {
      subtitleText
    });
    
    if (!subResult.success) {
      console.warn('[Pipeline] Subtitle failed, using music version');
      fs.copyFileSync(musicPath2, finalPath);
    }
    console.log('[Pipeline] Stage 3 complete:', finalPath);
  } catch (e) {
    console.warn('[Pipeline] Subtitle stage error:', e.message);
    fs.copyFileSync(musicPath2, finalPath);
  }
  
  await delay(STAGE_DELAY_MS);
  forceGC();
  
  // ========================================
  // STAGE 4: Single Prisma Write (FINAL)
  // ========================================
  console.log('[Pipeline] Stage 4: Saving to database');
  
  // Clean intermediate files to save space
  try {
    if (fs.existsSync(rawPath) && rawPath !== finalPath) fs.unlinkSync(rawPath);
    if (fs.existsSync(musicPath2) && musicPath2 !== finalPath) fs.unlinkSync(musicPath2);
  } catch (e) {
    console.warn('[Pipeline] Cleanup warning:', e.message);
  }
  
  // Use dbSafeLayer to prevent double-write errors
  const dbResult = await dbSafeLayer.safeCreateVideo({
    title: title || 'Untitled',
    filename: path.basename(finalPath),
    path: finalPath,
    platform,
    userId,
    // Only include valid fields - let dbSafeLayer handle validation
    originalName: path.basename(inputPath)
  });
  
  if (!dbResult.success) {
    console.error('[Pipeline] Database write failed:', dbResult.error);
    // Still return the file, but without DB entry
    return { 
      success: true, 
      outputPath: finalPath, 
      videoId: null,
      warning: 'File created but DB write failed'
    };
  }
  
  console.log('[Pipeline] Stage 4 complete - Video saved:', dbResult.data?.id);
  
  // Final memory check
  memUsage = checkMemory();
  console.log('[Pipeline] Final memory:', memUsage + '%');
  
  return {
    success: true,
    outputPath: finalPath,
    videoId: dbResult.data?.id || null
  };
}

/**
 * Abort pipeline gracefully
 */
async function abortPipeline(stages) {
  console.log('[Pipeline] Aborting pipeline, cleaning up...');
  for (const stage of stages) {
    try {
      if (fs.existsSync(stage)) fs.unlinkSync(stage);
    } catch (e) {}
  }
  forceGC();
}

module.exports = {
  runPipeline,
  abortPipeline,
  checkMemory,
  config: {
    STAGE_DELAY_MS,
    MEMORY_SOFT_LIMIT,
    MEMORY_HARD_LIMIT
  }
};

console.log('[Pipeline] Unified Pipeline Engine ACTIVE');
