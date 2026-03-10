/**
 * ClipperAi2026 - AI Processing Pipeline Service
 * Phase 2: Automated AI processing after video download
 * 
 * Features:
 * - Step-by-step AI processing pipeline
 * - Progress tracking with WebSocket updates
 * - Error recovery and retry mechanism
 * - Timeout protection
 * - Execution time logging per step
 * - ENHANCED: Hook strength, emotional intensity, trend alignment, platform recommendation, confidence scoring
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const db = require('../database');

// Service imports
const subtitleService = require('./subtitleService');
const viralHookDetector = require('./viralHookDetector');
const predictionService = require('./predictionService');
const aiService = require('./aiService');
const autonomousModeService = require('./autonomousModeService');

// TITAN-A Services
const scoreNormalizer = require('./scoreNormalizer');
const decisionEngine = require('./decisionEngine');
const strategySummary = require('./strategySummary');

// TITAN-B Phase 7 - Decision Engine Service
const decisionEngineService = require('./decisionEngineService');

// TITAN-C Phase 9 - Optimization Service
const optimizationService = require('./optimizationService');

// TITAN-C Phase 10 - Job Orchestrator Service
const jobOrchestratorService = require('./jobOrchestratorService');

// OVERLORD Phase 1 - External AI Brain Service
const aiExternalBrainService = require('./aiExternalBrainService');

// OVERLORD Phase 3 - AI Safeguard Service
const aiSafeguardService = require('./aiSafeguardService');

// OVERLORD Phase 4 - Smart Execution Controller
const smartExecutionController = require('./smartExecutionController');

// WebSocket manager - will be set from server.js
let wsManager = null;

// Active high priority job count (for throttling)
let activeHighJobCount = 0;

/**
 * Set WebSocket manager instance
 * @param {Object} ws - WebSocket manager instance
 */
function setWebSocketManager(ws) {
  wsManager = ws;
}

/**
 * Pipeline configuration
 */
const CONFIG = {
  maxRetries: 3,
  retryDelayMs: 2000,
  stepTimeouts: {
    metadata: 30000,
    subtitles: 180000,
    viralHook: 60000,
    predictions: 60000,
    titleHashtags: 30000,
    saveResults: 10000
  }
};

/**
 * Create a new AI job in the database
 * @param {string} videoPath - Path to the video file
 * @param {number} videoId - Database video ID
 * @returns {Object} - Job object
 */
async function createJob(videoPath, videoId = null) {
  const jobId = uuidv4();
  
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO ai_jobs (id, video_id, video_path, status, progress, current_step, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 0, 'created', datetime('now'), datetime('now'))`,
      [jobId, videoId, videoPath],
      function(err) {
        if (err) {
          logger.error('[AIPipeline] Failed to create job:', err);
          reject(err);
        } else {
          logger.info(`[AIPipeline] Job ${jobId} created for video: ${videoPath}`);
          resolve({ jobId, videoPath, videoId });
        }
      }
    );
  });
}

/**
 * Update job progress in database
 * @param {string} jobId - Job ID
 * @param {number} progress - Progress percentage
 * @param {string} step - Current step name
 * @param {string} status - Job status
 */
async function updateJobProgress(jobId, progress, step, status = 'processing') {
  return new Promise((resolve) => {
    db.run(
      `UPDATE ai_jobs SET progress = ?, current_step = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      [progress, step, status, jobId],
      function(err) {
        if (err) {
          logger.error(`[AIPipeline] Failed to update job progress:`, err);
        }
        resolve();
      }
    );
  });
}

/**
 * Mark job as completed
 * @param {string} jobId - Job ID
 * @param {Object} result - Final result
 * @param {number} executionTimeMs - Total execution time
 */
async function completeJob(jobId, result, executionTimeMs) {
  return new Promise((resolve) => {
    db.run(
      `UPDATE ai_jobs SET 
        status = 'completed', 
        progress = 100, 
        current_step = 'completed',
        completed_at = datetime('now'),
        result = ?,
        execution_time_ms = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [JSON.stringify(result), executionTimeMs, jobId],
      function(err) {
        if (err) {
          logger.error(`[AIPipeline] Failed to complete job:`, err);
        }
        resolve();
      }
    );
  });
}

/**
 * Mark job as failed
 * @param {string} jobId - Job ID
 * @param {string} errorMessage - Error message
 */
async function failJob(jobId, errorMessage) {
  return new Promise((resolve) => {
    db.run(
      `UPDATE ai_jobs SET 
        status = 'failed', 
        error_message = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [errorMessage, jobId],
      function(err) {
        if (err) {
          logger.error(`[AIPipeline] Failed to mark job as failed:`, err);
        }
        resolve();
      }
    );
  });
}

/**
 * Emit progress via WebSocket
 * @param {string} jobId - Job ID
 * @param {number} progress - Progress percentage
 * @param {string} step - Current step name
 * @param {Object} additionalData - Additional data
 */
function emitProgress(jobId, progress, step, additionalData = {}) {
  if (wsManager) {
    wsManager.broadcastJobProgress(jobId, progress, step, additionalData);
  }
  
  // Also emit custom ai-progress event
  if (wsManager) {
    const clients = wsManager.clients;
    if (clients) {
      const message = {
        type: 'ai-progress',
        jobId,
        progress,
        step,
        ...additionalData,
        timestamp: new Date().toISOString()
      };
      clients.forEach((client) => {
        if (client.ws && client.ws.readyState === 1) {
          client.ws.send(JSON.stringify(message));
        }
      });
    }
  }
}

/**
 * Execute a pipeline step with timeout and retry protection
 * @param {string} name - Step name
 * @param {Function} fn - Step function
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} retries - Number of retries
 * @returns {Promise<Object>} - Step result
 */
async function executeStep(name, fn, timeoutMs = 60000, retries = CONFIG.maxRetries) {
  const stepStartTime = Date.now();
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`[AIPipeline] Step "${name}" - Attempt ${attempt}/${retries}`);
      
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      
      const executionTime = Date.now() - stepStartTime;
      logger.info(`[AIPipeline] Step "${name}" completed in ${executionTime}ms`);
      
      return { success: true, result, executionTime, attempt };
      
    } catch (error) {
      lastError = error;
      logger.warn(`[AIPipeline] Step "${name}" failed (attempt ${attempt}):`, error.message);
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelayMs));
      }
    }
  }
  
  throw new Error(`${name} failed after ${retries} attempts: ${lastError.message}`);
}

/**
 * Extract video metadata
 * @param {string} videoPath - Path to video file
 * @returns {Object} - Video metadata
 */
async function extractMetadata(videoPath) {
  const startTime = Date.now();
  
  try {
    // Get file stats
    const stats = fs.statSync(videoPath);
    
    // Extract basic metadata
    const metadata = {
      filename: path.basename(videoPath),
      fileSize: stats.size,
      fileSizeFormatted: formatFileSize(stats.size),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      extension: path.extname(videoPath).toLowerCase()
    };
    
    // Try to get video duration using ffprobe (if available)
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Use ffprobe to get duration (optional - won't fail if not available)
      const ffprobeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
      const { stdout } = await execAsync(ffprobeCmd).catch(() => ({ stdout: null }));
      
      if (stdout) {
        metadata.duration = parseFloat(stdout.trim());
        metadata.durationFormatted = formatDuration(metadata.duration);
      }
    } catch (ffprobeError) {
      logger.warn('[AIPipeline] ffprobe not available, duration not extracted');
    }
    
    const executionTime = Date.now() - startTime;
    logger.info(`[AIPipeline] Metadata extracted in ${executionTime}ms`);
    
    return metadata;
    
  } catch (error) {
    logger.error('[AIPipeline] Metadata extraction failed:', error);
    throw error;
  }
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Main AI Pipeline function
 * @param {string} videoPath - Path to the video file
 * @param {Object} metadata - Optional initial metadata
 * @param {string} jobId - Optional job ID (if already created)
 * @returns {Promise<Object>} - Pipeline result
 */
async function runAIPipeline(videoPath, metadata = {}, jobId = null) {
  const pipelineStartTime = Date.now();
  const finalJobId = jobId || uuidv4();
  
  logger.info(`[AIPipeline] Starting pipeline for: ${videoPath}, JobID: ${finalJobId}`);
  
  const results = {
    jobId: finalJobId,
    videoPath,
    steps: {},
    completedAt: null,
    safeguard: null,
    executionStrategy: null
  };
  
  try {
    // ========== OVERLORD Phase 3: AI Safeguard Validation ==========
    const jobForSafeguard = {
      id: finalJobId,
      title: metadata?.title || path.basename(videoPath),
      original_url: metadata?.originalUrl || metadata?.original_url || '',
      retry_count: metadata?.retryCount || metadata?.retry_count || 0,
      previous_failures: metadata?.previousFailures || metadata?.previous_failures || 0,
      confidence: metadata?.confidence || 50,
      priority: metadata?.priority || metadata?.priorityLevel || 'medium'
    };
    
    const safeguardResult = aiSafeguardService.validateJob(jobForSafeguard);
    results.safeguard = safeguardResult;
    
    logger.info('[AIPipeline] Safeguard validation complete', {
      jobId: finalJobId,
      valid: safeguardResult.valid,
      blocked: safeguardResult.blocked,
      riskScore: safeguardResult.riskScore
    });
    
    if (safeguardResult.blocked) {
      logger.warn('[AIPipeline] Job blocked by safeguard', {
        jobId: finalJobId,
        reason: safeguardResult.reason,
        riskScore: safeguardResult.riskScore
      });
      
      await failJob(finalJobId, `Blocked by safeguard: ${safeguardResult.reason}`);
      
      emitProgress(finalJobId, 0, 'blocked', { 
        reason: safeguardResult.reason,
        riskScore: safeguardResult.riskScore
      });
      
      return {
        success: false,
        jobId: finalJobId,
        status: 'blocked',
        reason: safeguardResult.reason,
        riskScore: safeguardResult.riskScore
      };
    }
    // ========== End OVERLORD Phase 3 ==========
    
    // ========== OVERLORD Phase 4: Smart Execution Controller ==========
    const currentActiveHighJobs = activeHighJobCount;
    
    const executionStrategy = smartExecutionController.executionStrategy(
      jobForSafeguard,
      currentActiveHighJobs
    );
    results.executionStrategy = executionStrategy;
    
    logger.info('[AIPipeline] Execution strategy determined', {
      jobId: finalJobId,
      mode: executionStrategy.mode,
      delay: executionStrategy.delay,
      throttle: executionStrategy.throttle
    });
    
    if (executionStrategy.delay > 0) {
      logger.info('[AIPipeline] Applying dynamic delay', {
        jobId: finalJobId,
        delayMs: executionStrategy.delay
      });
      await new Promise(resolve => setTimeout(resolve, executionStrategy.delay));
    }
    
    const jobPriority = (jobForSafeguard.priority || 'medium').toLowerCase();
    if (jobPriority === 'high') {
      activeHighJobCount++;
    }
    // ========== End OVERLORD Phase 4 ==========
    
    // Step 1: Extract metadata (10%)
    emitProgress(finalJobId, 5, 'extracting_metadata');
    await updateJobProgress(finalJobId, 5, 'extracting_metadata');
    
    const metadataResult = await executeStep(
      'extract_metadata',
      () => extractMetadata(videoPath),
      CONFIG.stepTimeouts.metadata
    );
    
    results.steps.metadata = {
      ...metadataResult.result,
      executionTimeMs: metadataResult.executionTime
    };
    results.metadata = metadataResult.result;
    
    emitProgress(finalJobId, 10, 'extracting_metadata', { metadata: results.metadata });
    await updateJobProgress(finalJobId, 10, 'extracting_metadata');
    
    // Step 2: Generate subtitles (30%)
    emitProgress(finalJobId, 15, 'generating_subtitles');
    await updateJobProgress(finalJobId, 15, 'generating_subtitles');
    
    const subtitleResult = await executeStep(
      'generate_subtitles',
      async () => {
        try {
          const result = await subtitleService.generateSubtitles(videoPath, 'en');
          return {
            success: true,
            subtitlePath: result.subtitlePath,
            content: result.content,
            language: result.language
          };
        } catch (subtitleError) {
          // If subtitle generation fails, continue with mock data
          logger.warn('[AIPipeline] Subtitle generation failed, using fallback:', subtitleError.message);
          return {
            success: false,
            subtitlePath: null,
            content: 'Subtitle generation not available',
            language: 'en',
            error: subtitleError.message,
            fallback: true
          };
        }
      },
      CONFIG.stepTimeouts.subtitles
    );
    
    results.steps.subtitles = {
      ...subtitleResult.result,
      executionTimeMs: subtitleResult.executionTime
    };
    results.subtitles = subtitleResult.result;
    
    // Parse subtitles for viral hook analysis
    let transcriptText = '';
    if (subtitleResult.result.content && !subtitleResult.result.fallback) {
      try {
        const parsed = subtitleService.parseSRT(subtitleResult.result.content);
        transcriptText = parsed.map(s => s.text).join(' ');
      } catch (parseError) {
        logger.warn('[AIPipeline] Failed to parse subtitles:', parseError.message);
      }
    }
    
    emitProgress(finalJobId, 30, 'generating_subtitles', { subtitles: !!subtitleResult.result.subtitlePath });
    await updateJobProgress(finalJobId, 30, 'generating_subtitles');
    
    // Step 3: Analyze viral hook (50%)
    emitProgress(finalJobId, 35, 'analyzing_viral_hook');
    await updateJobProgress(finalJobId, 35, 'analyzing_viral_hook');
    
    const viralHookResult = await executeStep(
      'analyze_viral_hook',
      async () => {
        try {
          // Combine metadata title + transcript for analysis
          const analysisText = [
            results.metadata.filename,
            transcriptText
          ].filter(Boolean).join(' ');
          
          const analysis = await viralHookDetector.analyzeHook({
            transcript: analysisText,
            title: results.metadata.filename,
            duration: results.metadata.duration || 60
          });
          
          return { success: true, ...analysis };
        } catch (viralError) {
          // Return mock analysis if service fails
          logger.warn('[AIPipeline] Viral hook analysis failed, using fallback:', viralError.message);
          return {
            success: false,
            hookScore: 50,
            grade: 'C',
            fallback: true,
            error: viralError.message,
            recommendations: [{ priority: 'medium', message: 'AI analysis unavailable' }]
          };
        }
      },
      CONFIG.stepTimeouts.viralHook
    );
    
    results.steps.viralHook = {
      ...viralHookResult.result,
      executionTimeMs: viralHookResult.executionTime
    };
    results.viralHook = viralHookResult.result;
    
    emitProgress(finalJobId, 50, 'analyzing_viral_hook', { hookScore: results.viralHook.hookScore });
    await updateJobProgress(finalJobId, 50, 'analyzing_viral_hook');
    
    // Step 4: Generate predictions (70%)
    emitProgress(finalJobId, 55, 'generating_predictions');
    await updateJobProgress(finalJobId, 55, 'generating_predictions');
    
    const predictionResult = await executeStep(
      'generate_predictions',
      async () => {
        try {
          const predictions = await predictionService.predict({
            videoId: null,
            duration: results.metadata.duration,
            hookScore: results.viralHook.hookScore,
            transcript: transcriptText
          });
          return { success: true, ...predictions };
        } catch (predError) {
          // Return fallback predictions
          logger.warn('[AIPipeline] Prediction failed, using fallback:', predError.message);
          return {
            success: false,
            predictedViews: { min: 1000, max: 10000 },
            retention: 65,
            bestDuration: '30s',
            viralScore: results.viralHook.hookScore || 50,
            fallback: true,
            error: predError.message
          };
        }
      },
      CONFIG.stepTimeouts.predictions
    );
    
    results.steps.predictions = {
      ...predictionResult.result,
      executionTimeMs: predictionResult.executionTime
    };
    results.predictions = predictionResult.result;
    
    emitProgress(finalJobId, 70, 'generating_predictions', { predictions: results.predictions });
    await updateJobProgress(finalJobId, 70, 'generating_predictions');
    
    // Step 5: Generate title and hashtags (90%)
    emitProgress(finalJobId, 75, 'generating_title_hashtags');
    await updateJobProgress(finalJobId, 75, 'generating_title_hashtags');
    
    const titleHashtagResult = await executeStep(
      'generate_title_hashtags',
      async () => {
        try {
          // Use AI service to generate title and hashtags
          const content = [
            results.metadata.filename,
            results.viralHook.recommendations?.[0]?.message,
            transcriptText.substring(0, 500)
          ].filter(Boolean).join(' ');
          
          const [title, hashtags] = await Promise.all([
            aiService.generateCaption(content, 'en', 'youtube'),
            aiService.generateHashtags(content, 'youtube', 'en')
          ]);
          
          return { success: true, title, hashtags };
        } catch (aiError) {
          // Return fallback title and hashtags
          logger.warn('[AIPipeline] AI title/hashtags failed, using fallback:', aiError.message);
          const baseName = path.basename(videoPath, path.extname(videoPath));
          return {
            success: false,
            title: baseName.substring(0, 60),
            hashtags: ['#viral', '#trending', '#fyp', '#shorts'],
            fallback: true,
            error: aiError.message
          };
        }
      },
      CONFIG.stepTimeouts.titleHashtags
    );
    
    results.steps.titleAndHashtags = {
      ...titleHashtagResult.result,
      executionTimeMs: titleHashtagResult.executionTime
    };
    results.titleAndHashtags = titleHashtagResult.result;
    
    emitProgress(finalJobId, 90, 'generating_title_hashtags', { 
      title: results.titleAndHashtags.title 
    });
    await updateJobProgress(finalJobId, 90, 'generating_title_hashtags');
    
    // Step 6: Save all results to database (100%)
    emitProgress(finalJobId, 95, 'saving_results');
    await updateJobProgress(finalJobId, 95, 'saving_results');
    
    await executeStep(
      'save_results',
      async () => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO ai_results (
              job_id, video_id, metadata, subtitles, viral_hook, predictions, title_and_hashtags, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              finalJobId,
              null,
              JSON.stringify(results.metadata),
              JSON.stringify(results.subtitles),
              JSON.stringify(results.viralHook),
              JSON.stringify(results.predictions),
              JSON.stringify(results.titleAndHashtags)
            ],
            function(err) {
              if (err) {
                logger.error('[AIPipeline] Failed to save results:', err);
                reject(err);
              } else {
                logger.info(`[AIPipeline] Results saved to database for job ${finalJobId}`);
                resolve({ saved: true });
              }
            }
          );
        });
      },
      CONFIG.stepTimeouts.saveResults
    );
    
    // ========== TITAN-A PHASE: Decision Engine Integration ==========
    // Extract metrics for decision engine
    const decisionMetrics = {
      hookStrength: results.viralHook?.hookScore || 50,
      emotionalIntensity: results.predictions?.emotionalScore || results.viralHook?.emotionalScore || 50,
      retentionScore: results.predictions?.retention || 50,
      engagementScore: results.predictions?.engagement || 50,
      trendAlignment: results.viralHook?.trendScore || 50
    };

    // Normalize scores
    results.scores = {
      raw: decisionMetrics,
      normalized: scoreNormalizer.normalizeObjectScores(decisionMetrics, {
        hookStrength: { min: 0, max: 10 },
        emotionalIntensity: { min: 0, max: 100 },
        retentionScore: { min: 0, max: 100 },
        engagementScore: { min: 0, max: 100 },
        trendAlignment: { min: 0, max: 100 }
      })
    };

    // Calculate decision
    const decision = decisionEngine.calculateDecision(results.scores.normalized);
    results.decision = {
      finalScore: decision.finalScore,
      confidence: decision.confidence,
      priorityLevel: decision.priorityLevel,
      processingWeight: decision.processingWeight,
      breakdown: decision.breakdown
    };

    // Generate strategic summary
    const strategy = strategySummary.generateStrategicSummary({
      ...results.scores.normalized,
      finalScore: decision.finalScore
    });
    results.strategy = {
      summaryText: strategy.summaryText,
      recommendedPlatform: strategy.recommendedPlatform,
      optimizationTips: strategy.optimizationTips
    };
    // ========== End TITAN-A Phase ==========

    // ========== OVERLORD PHASE 1 & 2: External AI Brain + Hybrid Fusion ==========
    // Prepare job object for external AI enhancement
    const jobForExternalAI = {
      id: finalJobId,
      viral_score: results.viralHook?.hookScore || 50,
      engagement_score: results.predictions?.engagement || 50,
      trend_boost: results.viralHook?.trendScore || 50,
      sentiment_score: results.predictions?.emotionalScore || 50,
      confidence: results.decision?.confidence || 50,
      priorityLevel: results.decision?.priorityLevel || 'medium',
      execution_time_ms: 0,
      result: results,
      completed_at: new Date().toISOString()
    };

    // Get external AI enhancement (if API is configured)
    let aiEnhancement = null;
    if (aiExternalBrainService.isConfigured()) {
      try {
        aiEnhancement = await aiExternalBrainService.enhanceDecision(jobForExternalAI);
      } catch (aiError) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[OVERLORD] External AI enhancement failed:', aiError.message);
        }
      }
    }

    // Calculate hybrid score
    const localScore = results.decision?.finalScore || 50;
    const aiScore = aiEnhancement?.ai_score || null;
    const hybridResult = decisionEngineService.calculateHybridScore(localScore, aiScore, results.decision?.confidence || 50);

    // Update decision with hybrid results
    results.decision = {
      ...results.decision,
      finalScore: hybridResult.finalScore,
      confidence: hybridResult.confidence,
      hybrid: {
        isHybrid: hybridResult.isHybrid,
        localScore: hybridResult.localScore,
        aiScore: hybridResult.aiScore,
        aiContribution: hybridResult.aiContribution,
        confidenceBoost: hybridResult.confidenceBoost
      }
    };

    // Update priority level based on hybrid score
    results.decision.priorityLevel = decisionEngineService.assignPriorityLevel(hybridResult.finalScore);

    // Save AI refined score to database (if available)
    if (aiEnhancement?.ai_score !== undefined && aiEnhancement?.ai_score !== null) {
      db.run(
        'UPDATE ai_jobs SET ai_refined_score = ? WHERE id = ?',
        [aiEnhancement.ai_score, finalJobId],
        (err) => {
          if (err && process.env.NODE_ENV !== 'production') {
            console.log('[OVERLORD] Failed to save ai_refined_score:', err.message);
          }
        }
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[OVERLORD] Hybrid fusion complete:', {
        local: localScore,
        ai: aiScore,
        final: hybridResult.finalScore,
        confidence: hybridResult.confidence
      });
    }
    // ========== End OVERLORD Phase ==========

    // Calculate total execution time
    const totalExecutionTime = Date.now() - pipelineStartTime;
    results.completedAt = new Date().toISOString();
    results.executionTimeMs = totalExecutionTime;
    results.executionTimeFormatted = formatDuration(totalExecutionTime / 1000);
    
    // Mark job as completed
    await completeJob(finalJobId, results, totalExecutionTime);
    
    emitProgress(finalJobId, 100, 'completed', { 
      success: true,
      executionTimeMs: totalExecutionTime
    });
    
    // Broadcast completion
    if (wsManager) {
      wsManager.broadcastJobComplete(finalJobId, results);
    }
    
    logger.info(`[AIPipeline] Pipeline completed for job ${finalJobId} in ${totalExecutionTime}ms`);
    
    return {
      success: true,
      jobId: finalJobId,
      status: 'completed',
      progress: 100,
      result: results
    };
    
  } catch (error) {
    const errorMessage = error.message;
    logger.error(`[AIPipeline] Pipeline failed for job ${finalJobId}:`, errorMessage);
    
    // Mark job as failed
    await failJob(finalJobId, errorMessage);
    
    // Emit error
    emitProgress(finalJobId, 0, 'failed', { error: errorMessage });
    
    if (wsManager) {
      wsManager.broadcastJobError(finalJobId, errorMessage);
    }
    
    return {
      success: false,
      jobId: finalJobId,
      status: 'failed',
      error: errorMessage
    };
  }
}

/**
 * Get job status by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job status
 */
async function getJobStatus(jobId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM ai_jobs WHERE id = ?`,
      [jobId],
      function(err, row) {
        if (err) {
          logger.error(`[AIPipeline] Failed to get job status:`, err);
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          // Parse result JSON if exists
          if (row.result) {
            try {
              row.result = JSON.parse(row.result);
            } catch (e) {
              // Ignore parse errors
            }
          }
          resolve(row);
        }
      }
    );
  });
}

/**
 * Get all jobs with optional filters
 * @param {Object} filters - Optional filters (status, limit)
 * @returns {Promise<Array>} - List of jobs
 */
async function getJobs(filters = {}) {
  const { status, limit = 50 } = filters;
  
  let query = 'SELECT * FROM ai_jobs';
  const params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  return new Promise((resolve, reject) => {
    db.all(query, params, function(err, rows) {
      if (err) {
        logger.error(`[AIPipeline] Failed to get jobs:`, err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get AI results for a video
 * @param {number} videoId - Video ID
 * @returns {Promise<Object>} - AI results
 */
async function getResultsByVideoId(videoId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM ai_results WHERE video_id = ? ORDER BY created_at DESC LIMIT 1`,
      [videoId],
      function(err, row) {
        if (err) {
          logger.error(`[AIPipeline] Failed to get results:`, err);
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          // Parse JSON fields
          try {
            row.metadata = row.metadata ? JSON.parse(row.metadata) : null;
            row.subtitles = row.subtitles ? JSON.parse(row.subtitles) : null;
            row.viral_hook = row.viral_hook ? JSON.parse(row.viral_hook) : null;
            row.predictions = row.predictions ? JSON.parse(row.predictions) : null;
            row.title_and_hashtags = row.title_and_hashtags ? JSON.parse(row.title_and_hashtags) : null;
          } catch (e) {
            // Ignore parse errors
          }
          resolve(row);
        }
      }
    );
  });
}

module.exports = {
  setWebSocketManager,
  runAIPipeline,
  createJob,
  getJobStatus,
  getJobs,
  getResultsByVideoId,
  // Export for testing
  executeStep,
  extractMetadata,
  formatFileSize,
  formatDuration
};
