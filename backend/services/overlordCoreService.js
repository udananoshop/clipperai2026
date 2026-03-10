/**
 * Overlord AI Core Service
 * ClipperAI2026 - Central AI Controller
 * 
 * The main orchestrator that:
 * - Receives commands from chat/voice
 * - Routes tasks to appropriate handlers
 * - Manages the AI assistant state
 * 
 * Optimized for 8GB RAM - lightweight with caching
 */

// Lazy-loaded service dependencies
let commandParser = null;
let taskExecutor = null;
let voiceCommand = null;
let contentFactory = null;
let analyticsService = null;
let viralPredictionService = null;
let growthStrategyService = null;

const getCommandParser = () => {
  if (!commandParser) {
    try { commandParser = require('./commandParserService'); } catch (e) {}
  }
  return commandParser;
};

const getTaskExecutor = () => {
  if (!taskExecutor) {
    try { taskExecutor = require('./taskExecutionService'); } catch (e) {}
  }
  return taskExecutor;
};

const getVoiceCommand = () => {
  if (!voiceCommand) {
    try { voiceCommand = require('./voiceCommandService'); } catch (e) {}
  }
  return voiceCommand;
};

const getContentFactory = () => {
  if (!contentFactory) {
    try { contentFactory = require('./contentFactoryService'); } catch (e) {}
  }
  return contentFactory;
};

const getAnalyticsService = () => {
  if (!analyticsService) {
    try { analyticsService = require('./analyticsService'); } catch (e) {}
  }
  return analyticsService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try { viralPredictionService = require('./viralPredictionService'); } catch (e) {}
  }
  return viralPredictionService;
};

const getGrowthStrategyService = () => {
  if (!growthStrategyService) {
    try { growthStrategyService = require('./growthStrategyService'); } catch (e) {}
  }
  return growthStrategyService;
};

// ============================================================================
// OVERLORD STATE
// ============================================================================

// In-memory state (lightweight for 8GB RAM)
const overlordState = {
  status: 'online',
  startedAt: new Date().toISOString(),
  commandsProcessed: 0,
  activeTasks: [],
  commandHistory: [],
  maxHistory: 50
};

// ============================================================================
// CORE METHODS
// ============================================================================

/**
 * Process a command (text or voice)
 * @param {string} input - The command input
 * @param {Object} options - Additional options
 */
async function processCommand(input, options = {}) {
  const startTime = Date.now();
  
  try {
    console.log(`[Overlord] Processing command: ${input}`);
    
    // Determine if it's a voice command
    const isVoiceCommand = options.isVoice || false;
    
    let result;
    
    if (isVoiceCommand && typeof input === 'object') {
      // Voice command with transcribed text
      const voiceProcessor = getVoiceCommand();
      result = await voiceProcessor?.processVoiceCommand(input);
    } else {
      // Regular text command
      const parser = getCommandParser();
      const executor = getTaskExecutor();
      
      const parsed = parser?.parseCommand(input);
      
      if (!parsed?.success) {
        return {
          success: false,
          message: parsed?.error || 'Could not understand the command',
          input,
          timestamp: new Date().toISOString()
        };
      }
      
      result = await executor?.executeTask(parsed, options);
    }
    
    // Update state
    overlordState.commandsProcessed++;
    addToHistory({
      input,
      result,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime
    });
    
    return {
      success: result?.success ?? false,
      message: result?.result?.message || result?.message || 'Command processed',
      data: result?.result || result,
      task: result?.task,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('[Overlord] Command error:', error.message);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      input,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get Overlord status
 */
function getStatus() {
  return {
    status: overlordState.status,
    startedAt: overlordState.startedAt,
    uptime: calculateUptime(overlordState.startedAt),
    commandsProcessed: overlordState.commandsProcessed,
    activeTasks: overlordState.activeTasks.length,
    features: getAvailableFeatures(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get command history
 */
function getHistory(limit = 10) {
  return overlordState.commandHistory.slice(-limit);
}

/**
 * Clear command history
 */
function clearHistory() {
  overlordState.commandHistory = [];
  return { success: true, message: 'History cleared' };
}

/**
 * Add command to history
 */
function addToHistory(entry) {
  overlordState.commandHistory.push(entry);
  
  // Keep only last maxHistory entries
  if (overlordState.commandHistory.length > overlordState.maxHistory) {
    overlordState.commandHistory = overlordState.commandHistory.slice(-overlordState.maxHistory);
  }
}

/**
 * Calculate uptime
 */
function calculateUptime(startedAt) {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = now - start;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

/**
 * Get available features
 */
function getAvailableFeatures() {
  return [
    {
      name: 'Command Parser',
      status: 'active',
      description: 'Natural language command understanding'
    },
    {
      name: 'Task Execution',
      status: 'active',
      description: 'Task execution and service orchestration'
    },
    {
      name: 'Voice Commands',
      status: 'active',
      description: 'Voice input processing'
    },
    {
      name: 'Content Factory',
      status: 'active',
      description: 'Ideas, captions, hashtags, scripts'
    },
    {
      name: 'Analytics Integration',
      status: 'active',
      description: 'System analytics and insights'
    },
    {
      name: 'Viral Prediction',
      status: 'active',
      description: 'Viral potential analysis'
    },
    {
      name: 'Growth Strategy',
      status: 'active',
      description: 'Personalized growth recommendations'
    }
  ];
}

// ============================================================================
// QUICK ACTIONS (Direct Access)
// ============================================================================

/**
 * Quick action: Generate content ideas
 */
async function quickGenerateIdeas(count = 10, language = 'en') {
  const contentFactory = getContentFactory();
  const result = await contentFactory?.generateContentIdeas(count, language);
  
  return {
    success: true,
    type: 'content_ideas',
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick action: Generate caption
 */
async function quickGenerateCaption(style = 'viral', language = 'en') {
  const contentFactory = getContentFactory();
  const result = await contentFactory?.generateCaption(style, language);
  
  return {
    success: true,
    type: 'caption',
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick action: Generate hashtags
 */
async function quickGenerateHashtags(count = 15, language = 'en') {
  const contentFactory = getContentFactory();
  const result = await contentFactory?.generateHashtags(count, language);
  
  return {
    success: true,
    type: 'hashtags',
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick action: Get analytics
 */
async function quickGetAnalytics(timeframe = '30d') {
  const analytics = getAnalyticsService();
  const result = await analytics?.getSummary(timeframe);
  
  return {
    success: true,
    type: 'analytics',
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick action: Get viral prediction
 */
async function quickGetViralPrediction() {
  const viral = getViralPredictionService();
  const result = await viral?.predictViralPotential();
  
  return {
    success: true,
    type: 'viral_prediction',
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick action: Get growth strategy
 */
async function quickGetGrowthStrategy(language = 'en') {
  const strategy = getGrowthStrategyService();
  const result = await strategy?.generateGrowthStrategy(language);
  
  return {
    success: true,
    type: 'growth_strategy',
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick action: Get system diagnostics
 */
async function quickSystemDiagnostics() {
  return getStatus();
}

// ============================================================================
// DEVICE ADAPTIVE MODE
// ============================================================================

/**
 * Adjust processing based on device capabilities
 * @param {string} deviceMode - Device mode (high-performance, balanced, low-resource, mobile-lite)
 */
function adaptToDevice(deviceMode) {
  const adaptations = {
    'high-performance': {
      cacheTTL: 120000,  // 2 minutes
      maxHistory: 100,
      enableDetailedLogs: true
    },
    'balanced': {
      cacheTTL: 60000,   // 1 minute
      maxHistory: 50,
      enableDetailedLogs: true
    },
    'low-resource': {
      cacheTTL: 30000,  // 30 seconds
      maxHistory: 20,
      enableDetailedLogs: false
    },
    'mobile-lite': {
      cacheTTL: 15000,  // 15 seconds
      maxHistory: 10,
      enableDetailedLogs: false
    }
  };
  
  const config = adaptations[deviceMode] || adaptations.balanced;
  
  overlordState.maxHistory = config.maxHistory;
  
  console.log(`[Overlord] Adapted to device mode: ${deviceMode}`, config);
  
  return {
    success: true,
    deviceMode,
    config,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core
  processCommand,
  getStatus,
  getHistory,
  clearHistory,
  
  // Quick Actions
  quickGenerateIdeas,
  quickGenerateCaption,
  quickGenerateHashtags,
  quickGetAnalytics,
  quickGetViralPrediction,
  quickGetGrowthStrategy,
  quickSystemDiagnostics,
  
  // Device Adaptive
  adaptToDevice,
  
  // State
  getState: () => overlordState
};

