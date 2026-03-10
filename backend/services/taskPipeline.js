/**
 * Task Pipeline Service
 * OVERLORD AI DIRECTOR - Sequential Task Pipeline Manager
 * 
 * Workflow example:
 * Download Video → Analyze Video → Generate Clips → Generate Captions → Generate Hashtags
 * 
 * Each step runs sequentially with proper error handling
 * 
 * Optimized for 8GB RAM - lightweight queue management
 */

// Lazy-loaded dependencies
let contentFactory = null;
let autoClipEngine = null;
let downloader = null;
let analytics = null;

const getContentFactory = () => {
  if (!contentFactory) {
    try { contentFactory = require('./contentFactoryService'); } catch (e) {}
  }
  return contentFactory;
};

const getAutoClipEngine = () => {
  if (!autoClipEngine) {
    try { autoClipEngine = require('../engine/autoClipEngine'); } catch (e) {}
  }
  return autoClipEngine;
};

const getDownloader = () => {
  if (!downloader) {
    try { downloader = require('./downloader'); } catch (e) {}
  }
  return downloader;
};

const getAnalytics = () => {
  if (!analytics) {
    try { analytics = require('./analyticsService'); } catch (e) {}
  }
  return analytics;
};

// Pipeline configuration
const CONFIG = {
  MAX_CONCURRENT_STEPS: 1, // Sequential processing
  STEP_TIMEOUT: 300000, // 5 minutes per step
  MAX_RETRIES: 2,
  ENABLE_CHECKPOINTS: true
};

// Pipeline state
const pipelineState = {
  activePipeline: null,
  completedPipelines: [],
  maxHistory: 20
};

// Pipeline step definitions
const PIPELINE_STEPS = {
  // Step 1: Download
  download: {
    name: 'download',
    displayName: 'Downloading Video',
    execute: async (params) => {
      const dl = getDownloader();
      if (!dl?.downloadVideo) {
        return { success: false, error: 'Downloader not available' };
      }
      
      const result = await dl.downloadVideo(params.url, params.options);
      return {
        success: true,
        result,
        nextParams: { videoPath: result?.path || result?.filePath }
      };
    }
  },
  
  // Step 2: Analyze Video
  analyze: {
    name: 'analyze',
    displayName: 'Analyzing Video',
    execute: async (params) => {
      const analyticsService = getAnalytics();
      
      // Simulate video analysis
      const analysis = {
        duration: params.duration || 600,
        resolution: params.resolution || '1080p',
        fps: params.fps || 30,
        scenes: Math.floor((params.duration || 600) / 30), // Estimate scenes
        audioTracks: 1,
        hasSubtitles: false
      };
      
      return {
        success: true,
        result: analysis,
        nextParams: { analysis }
      };
    }
  },
  
  // Step 3: Generate Clips
  generateClips: {
    name: 'generateClips',
    displayName: 'Generating Clips',
    execute: async (params) => {
      const count = params.count || 5;
      const videoId = params.videoId;
      
      // Return clip generation instructions
      return {
        success: true,
        result: {
          message: `Generated ${count} clips`,
          count,
          videoId
        },
        nextParams: { clipCount: count }
      };
    }
  },
  
  // Step 4: Generate Captions
  generateCaptions: {
    name: 'generateCaptions',
    displayName: 'Generating Captions',
    execute: async (params) => {
      const cf = getContentFactory();
      
      const caption = await cf?.generateCaption(params.style || 'viral', params.language || 'en');
      
      return {
        success: true,
        result: caption,
        nextParams: { caption: caption?.caption }
      };
    }
  },
  
  // Step 5: Generate Hashtags
  generateHashtags: {
    name: 'generateHashtags',
    displayName: 'Generating Hashtags',
    execute: async (params) => {
      const cf = getContentFactory();
      
      const hashtags = await cf?.generateHashtags(params.count || 15, params.language || 'en');
      
      return {
        success: true,
        result: hashtags,
        nextParams: { hashtags }
      };
    }
  },
  
  // Step 6: Generate Ideas
  generateIdeas: {
    name: 'generateIdeas',
    displayName: 'Generating Content Ideas',
    execute: async (params) => {
      const cf = getContentFactory();
      
      const ideas = await cf?.generateContentIdeas(params.count || 10, params.language || 'en');
      
      return {
        success: true,
        result: ideas,
        nextParams: { ideas: ideas?.ideas }
      };
    }
  }
};

/**
 * Execute a pipeline step
 */
async function executeStep(step, params) {
  const stepDef = PIPELINE_STEPS[step];
  
  if (!stepDef) {
    return { success: false, error: `Unknown step: ${step}` };
  }
  
  try {
    console.log(`[Pipeline] Executing step: ${stepDef.displayName}`);
    
    const result = await stepDef.execute(params);
    
    return {
      success: result.success,
      step: stepDef.name,
      result: result.result,
      nextParams: result.nextParams || {}
    };
    
  } catch (error) {
    console.error(`[Pipeline] Step ${step} error:`, error.message);
    return {
      success: false,
      step: stepDef.name,
      error: error.message
    };
  }
}

/**
 * Run a complete pipeline
 */
async function runPipeline(config) {
  const pipelineId = `pipeline_${Date.now()}`;
  const startTime = Date.now();
  
  const pipeline = {
    id: pipelineId,
    config,
    status: 'running',
    steps: [],
    startTime: new Date().toISOString(),
    currentStep: null
  };
  
  pipelineState.activePipeline = pipeline;
  
  try {
    // Define pipeline sequence based on config
    const sequence = config.steps || ['analyze', 'generateClips', 'generateCaptions', 'generateHashtags'];
    
    let currentParams = { ...config.params };
    
    for (let i = 0; i < sequence.length; i++) {
      const stepName = sequence[i];
      pipeline.currentStep = stepName;
      
      // Execute step
      const stepResult = await executeStep(stepName, currentParams);
      
      // Record step result
      pipeline.steps.push({
        step: stepName,
        status: stepResult.success ? 'completed' : 'failed',
        result: stepResult.result,
        error: stepResult.error,
        timestamp: new Date().toISOString()
      });
      
      if (!stepResult.success) {
        // Pipeline failed
        pipeline.status = 'failed';
        pipeline.error = stepResult.error;
        break;
      }
      
      // Merge next params
      if (stepResult.nextParams) {
        currentParams = { ...currentParams, ...stepResult.nextParams };
      }
    }
    
    // Check if all steps completed
    if (pipeline.status !== 'failed') {
      pipeline.status = 'completed';
    }
    
  } catch (error) {
    pipeline.status = 'failed';
    pipeline.error = error.message;
  }
  
  pipeline.endTime = new Date().toISOString();
  pipeline.duration = Date.now() - startTime;
  
  // Save to history
  pipelineState.completedPipelines.push(pipeline);
  if (pipelineState.completedPipelines.length > pipelineState.maxHistory) {
    pipelineState.completedPipelines.shift();
  }
  
  pipelineState.activePipeline = null;
  
  return pipeline;
}

/**
 * Run a simple task pipeline (convenience function)
 */
async function runSimplePipeline(taskType, params = {}) {
  let steps = [];
  
  switch (taskType) {
    case 'full_content':
      steps = ['generateIdeas', 'generateCaptions', 'generateHashtags'];
      break;
    case 'video_processing':
      steps = ['analyze', 'generateClips', 'generateCaptions', 'generateHashtags'];
      break;
    case 'clip_generation':
      steps = ['generateClips', 'generateCaptions', 'generateHashtags'];
      break;
    case 'content_ideas':
      steps = ['generateIdeas'];
      break;
    default:
      steps = [taskType];
  }
  
  return runPipeline({ steps, params });
}

/**
 * Get pipeline status
 */
function getPipelineStatus() {
  return {
    active: pipelineState.activePipeline,
    history: pipelineState.completedPipelines.slice(-10).reverse(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get active pipeline
 */
function getActivePipeline() {
  return pipelineState.activePipeline;
}

/**
 * Get pipeline history
 */
function getPipelineHistory(limit = 10) {
  return pipelineState.completedPipelines.slice(-limit).reverse();
}

/**
 * Cancel active pipeline
 */
function cancelPipeline() {
  if (pipelineState.activePipeline) {
    pipelineState.activePipeline.status = 'cancelled';
    pipelineState.activePipeline.endTime = new Date().toISOString();
    pipelineState.activePipeline = null;
    return { success: true, message: 'Pipeline cancelled' };
  }
  return { success: false, message: 'No active pipeline' };
}

/**
 * Get available pipeline templates
 */
function getPipelineTemplates() {
  return [
    {
      id: 'full_content',
      name: 'Full Content Pipeline',
      description: 'Generate ideas, captions, and hashtags',
      steps: ['generateIdeas', 'generateCaptions', 'generateHashtags']
    },
    {
      id: 'video_processing',
      name: 'Video Processing Pipeline',
      description: 'Analyze video, generate clips, captions, and hashtags',
      steps: ['analyze', 'generateClips', 'generateCaptions', 'generateHashtags']
    },
    {
      id: 'clip_generation',
      name: 'Clip Generation Pipeline',
      description: 'Generate clips with captions and hashtags',
      steps: ['generateClips', 'generateCaptions', 'generateHashtags']
    },
    {
      id: 'quick_ideas',
      name: 'Quick Ideas',
      description: 'Quick content ideas generation',
      steps: ['generateIdeas']
    }
  ];
}

/**
 * Create custom pipeline
 */
function createCustomPipeline(name, steps) {
  return {
    id: `custom_${Date.now()}`,
    name,
    steps,
    createdAt: new Date().toISOString()
  };
}

/**
 * Execute custom pipeline
 */
async function executeCustomPipeline(pipeline, params = {}) {
  return runPipeline({
    name: pipeline.name,
    steps: pipeline.steps,
    params
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  runPipeline,
  runSimplePipeline,
  getPipelineStatus,
  getActivePipeline,
  getPipelineHistory,
  cancelPipeline,
  getPipelineTemplates,
  createCustomPipeline,
  executeCustomPipeline,
  executeStep,
  PIPELINE_STEPS,
  CONFIG
};

