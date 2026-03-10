/**
 * AI ASSISTANT COMMAND SYSTEM
 * ClipperAI2026 Auto Content Factory
 * 
 * Interprets user commands and routes them to existing services
 * 
 * Commands supported:
 * - "scan viral videos" / "find viral videos"
 * - "start download queue" / "download videos"
 * - "generate clips" / "create clips"
 * - "show system health" / "system status"
 * - "optimize memory" / "free memory"
 * - "scan trending" / "check trends"
 * - "pause" / "resume"
 * - "diagnose system"
 * - "fix last error"
 * - "show patches"
 * - "rollback last patch"
 */

const os = require('os');

// Lazy-load dependencies
let viralHunterService = null;
let viralScheduler = null;
let viralClipFactory = null;
let resourceMonitor = null;
let viralScoreEngine = null;
let selfRepairAgent = null;

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

const getViralClipFactory = () => {
  if (!viralClipFactory) {
    try { viralClipFactory = require('../services/viralClipFactory'); } catch (e) {}
  }
  return viralClipFactory;
};

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try { resourceMonitor = require('../core/resourceMonitor'); } catch (e) {}
  }
  return resourceMonitor;
};

const getViralScoreEngine = () => {
  if (!viralScoreEngine) {
    try { viralScoreEngine = require('./viralScoreEngine'); } catch (e) {}
  }
  return viralScoreEngine;
};

const getSelfRepairAgent = () => {
  if (!selfRepairAgent) {
    try { selfRepairAgent = require('./selfRepairAgent'); } catch (e) {}
  }
  return selfRepairAgent;
};

// =============================================================================
// COMMAND PATTERNS
// =============================================================================

const COMMAND_PATTERNS = {
  scan: /^(scan|find|search|discover)\s+(viral\s+)?(videos?|content|trending)/i,
  download: /^(start\s+)?(download\s+)?(queue|videos?)/i,
  generate: /^(generate|create|make)\s+(clips?)/i,
  status: /^(show\s+)?(system\s+)?(health|status)/i,
  optimize: /^(optimize|free|clean)\s+(memory)/i,
  trending: /^(scan|check|get)\s+trending/i,
  pause: /^pause/i,
  resume: /^resume/i,
  help: /^(help|commands|what can you do)/i,
  stats: /^stats/i,
  videos: /^(how many|list)\s+(videos?|clips?)/i,
  memory: /^(what's|check|show)\s+memory/i,
  process: /^(process|handle)\s+(queue|jobs?)/i,
  // Self-Repair commands
  diagnose: /^(diagnose\s+system|system\s+diagnostics|run\s+diagnostics)/i,
  fixError: /^(fix\s+(last\s+)?error|repair\s+(last\s+)?error|auto\s+fix)/i,
  showPatches: /^(show\s+patch(es)?|list\s+patch(es)?|view\s+patch(es)?)/i,
  rollback: /^(rollback|rollback\s+last\s+patch|undo\s+patch)/i
};

// =============================================================================
// COMMAND HANDLERS
// =============================================================================

/**
 * Handle scan viral videos command
 */
async function handleScanViral(input) {
  console.log('[AIAssistant] Scanning viral videos...');
  
  try {
    const hunter = getViralHunterService();
    if (!hunter) {
      return {
        success: false,
        message: 'ViralHunter service not available',
        command: 'scan viral videos'
      };
    }
    
    const candidates = await hunter.scanTrendingSources();
    
    return {
      success: true,
      message: `Found ${candidates.length} viral video candidates`,
      data: {
        candidates: candidates.slice(0, 10),
        count: candidates.length,
        topScore: candidates.length > 0 ? candidates[0].viralScore : 0
      },
      command: 'scan viral videos'
    };
  } catch (error) {
    return {
      success: false,
      message: `Scan failed: ${error.message}`,
      command: 'scan viral videos'
    };
  }
}

/**
 * Handle download queue command
 */
async function handleDownloadQueue(input) {
  console.log('[AIAssistant] Processing download queue...');
  
  try {
    const scheduler = getViralScheduler();
    const status = scheduler?.getStatus();
    
    return {
      success: true,
      message: status?.downloaderStatus?.active > 0 
        ? `Download queue active: ${status.downloaderStatus.active} downloads running`
        : 'Download queue ready',
      data: {
        activeDownloads: status?.downloaderStatus?.active || 0,
        queuedJobs: status?.downloaderStatus?.queued || 0,
        schedulerRunning: status?.running || false
      },
      command: 'start download queue'
    };
  } catch (error) {
    return {
      success: false,
      message: `Download status error: ${error.message}`,
      command: 'start download queue'
    };
  }
}

/**
 * Handle generate clips command
 */
async function handleGenerateClips(input) {
  console.log('[AIAssistant] Generating clips...');
  
  try {
    const factory = getViralClipFactory();
    const status = factory?.getStatus();
    
    return {
      success: true,
      message: status?.isProcessing 
        ? 'Clip generation in progress'
        : 'Clip factory ready',
      data: {
        isProcessing: status?.isProcessing || false,
        jobsCompleted: status?.jobsCompleted || 0,
        jobsFailed: status?.jobsFailed || 0
      },
      command: 'generate clips'
    };
  } catch (error) {
    return {
      success: false,
      message: `Clip generation error: ${error.message}`,
      command: 'generate clips'
    };
  }
}

/**
 * Handle system health command
 */
async function handleSystemHealth(input) {
  console.log('[AIAssistant] Checking system health...');
  
  try {
    const monitor = getResourceMonitor();
    const health = monitor?.getSystemHealth();
    
    return {
      success: true,
      message: `System health: ${health?.mode || 'unknown'}`,
      data: {
        mode: health?.mode || 'unknown',
        memoryUsage: health?.memoryUsage || 0,
        cpuUsage: health?.cpuUsage || 0,
        thresholds: health?.thresholds,
        system: health?.system
      },
      command: 'show system health'
    };
  } catch (error) {
    return {
      success: false,
      message: `Health check error: ${error.message}`,
      command: 'show system health'
    };
  }
}

/**
 * Handle optimize memory command
 */
async function handleOptimizeMemory(input) {
  console.log('[AIAssistant] Optimizing memory...');
  
  try {
    const monitor = getResourceMonitor();
    const memInfo = monitor?.getMemoryInfo();
    const sysMem = monitor?.getSystemMemoryUsage();
    
    return {
      success: true,
      message: `Memory usage: ${sysMem}%`,
      data: {
        systemMemoryPercent: sysMem || 0,
        heapUsed: memInfo?.heapUsed || '0MB',
        heapTotal: memInfo?.heapTotal || '0MB',
        rss: memInfo?.rss || '0MB',
        recommendation: sysMem > 85 
          ? 'Consider pausing new jobs'
          : 'Memory within safe limits'
      },
      command: 'optimize memory'
    };
  } catch (error) {
    return {
      success: false,
      message: `Memory optimization error: ${error.message}`,
      command: 'optimize memory'
    };
  }
}

/**
 * Handle scan trending command
 */
async function handleScanTrending(input) {
  console.log('[AIAssistant] Scanning trending...');
  
  try {
    const hunter = getViralHunterService();
    const trending = await hunter?.getTrendingData();
    
    return {
      success: true,
      message: `Found ${trending?.length || 0} trending items`,
      data: {
        trending: trending || [],
        count: trending?.length || 0,
        sources: ['YouTube', 'Reddit', 'TikTok']
      },
      command: 'scan trending'
    };
  } catch (error) {
    return {
      success: false,
      message: `Trending scan error: ${error.message}`,
      command: 'scan trending'
    };
  }
}

/**
 * Handle help command
 */
async function handleHelp(input) {
  return {
    success: true,
    message: 'Available commands:',
    data: {
      commands: [
        { command: 'scan viral videos', description: 'Scan for viral video candidates' },
        { command: 'start download queue', description: 'Check or start downloads' },
        { command: 'generate clips', description: 'Generate clips from videos' },
        { command: 'show system health', description: 'Check system health status' },
        { command: 'optimize memory', description: 'Check and optimize memory usage' },
        { command: 'scan trending', description: 'Get trending content' },
        { command: 'pause', description: 'Pause all AI processing' },
        { command: 'resume', description: 'Resume AI processing' },
        { command: 'stats', description: 'Show processing statistics' },
        { command: 'help', description: 'Show this help message' }
      ]
    },
    command: 'help'
  };
}

/**
 * Handle stats command
 */
async function handleStats(input) {
  console.log('[AIAssistant] Getting stats...');
  
  try {
    const scheduler = getViralScheduler();
    const factory = getViralClipFactory();
    const monitor = getResourceMonitor();
    
    const schedulerStatus = scheduler?.getStatus() || {};
    const factoryStatus = factory?.getStatus() || {};
    const health = monitor?.getSystemHealth();
    
    return {
      success: true,
      message: 'System statistics',
      data: {
        downloads: {
          active: schedulerStatus.downloaderStatus?.active || 0,
          queued: schedulerStatus.downloaderStatus?.queued || 0
        },
        clips: {
          completed: factoryStatus.jobsCompleted || 0,
          failed: factoryStatus.jobsFailed || 0,
          processing: factoryStatus.isProcessing || false
        },
        system: {
          memory: health?.memoryUsage || 0,
          cpu: health?.cpuUsage || 0,
          mode: health?.mode || 'unknown'
        }
      },
      command: 'stats'
    };
  } catch (error) {
    return {
      success: false,
      message: `Stats error: ${error.message}`,
      command: 'stats'
    };
  }
}

/**
 * Handle pause command
 */
async function handlePause(input) {
  console.log('[AIAssistant] Pausing AI processing...');
  
  try {
    const scheduler = getViralScheduler();
    scheduler?.stop();
    
    return {
      success: true,
      message: 'AI processing paused',
      command: 'pause'
    };
  } catch (error) {
    return {
      success: false,
      message: `Pause error: ${error.message}`,
      command: 'pause'
    };
  }
}

/**
 * Handle resume command
 */
async function handleResume(input) {
  console.log('[AIAssistant] Resuming AI processing...');
  
  try {
    const scheduler = getViralScheduler();
    scheduler?.start();
    
    return {
      success: true,
      message: 'AI processing resumed',
      command: 'resume'
    };
  } catch (error) {
    return {
      success: false,
      message: `Resume error: ${error.message}`,
      command: 'resume'
    };
  }
}

/**
 * Handle diagnose system command (Self-Repair)
 */
async function handleDiagnoseSystem(input) {
  console.log('[AIAssistant] Running system diagnosis...');
  
  try {
    const selfRepair = getSelfRepairAgent();
    if (!selfRepair) {
      return {
        success: false,
        message: 'Self-Repair service not available',
        command: 'diagnose system'
      };
    }
    
    const diagnosis = await selfRepair.diagnoseSystem();
    
    return {
      success: true,
      message: `System diagnosis complete: ${diagnosis.systemHealth}`,
      data: diagnosis,
      command: 'diagnose system'
    };
  } catch (error) {
    return {
      success: false,
      message: `Diagnosis error: ${error.message}`,
      command: 'diagnose system'
    };
  }
}

/**
 * Handle fix last error command (Self-Repair)
 */
async function handleFixLastError(input) {
  console.log('[AIAssistant] Attempting to fix last error...');
  
  try {
    const selfRepair = getSelfRepairAgent();
    if (!selfRepair) {
      return {
        success: false,
        message: 'Self-Repair service not available',
        command: 'fix last error'
      };
    }
    
    const result = await selfRepair.fixLastError();
    
    return {
      success: result.success,
      message: result.success ? 'Error fix attempted' : 'No errors to fix',
      data: result,
      command: 'fix last error'
    };
  } catch (error) {
    return {
      success: false,
      message: `Fix error: ${error.message}`,
      command: 'fix last error'
    };
  }
}

/**
 * Handle show patches command (Self-Repair)
 */
async function handleShowPatches(input) {
  console.log('[AIAssistant] Getting patch list...');
  
  try {
    const selfRepair = getSelfRepairAgent();
    if (!selfRepair) {
      return {
        success: false,
        message: 'Self-Repair service not available',
        command: 'show patches'
      };
    }
    
    const patches = selfRepair.getPatches();
    
    return {
      success: true,
      message: `Found ${patches.total} patches`,
      data: patches,
      command: 'show patches'
    };
  } catch (error) {
    return {
      success: false,
      message: `Show patches error: ${error.message}`,
      command: 'show patches'
    };
  }
}

/**
 * Handle rollback command (Self-Repair)
 */
async function handleRollback(input) {
  console.log('[AIAssistant] Rolling back last patch...');
  
  try {
    const selfRepair = getSelfRepairAgent();
    if (!selfRepair) {
      return {
        success: false,
        message: 'Self-Repair service not available',
        command: 'rollback'
      };
    }
    
    const result = await selfRepair.rollbackLastPatch();
    
    return {
      success: result.success,
      message: result.success ? 'Patch rolled back successfully' : 'Rollback failed',
      data: result,
      command: 'rollback'
    };
  } catch (error) {
    return {
      success: false,
      message: `Rollback error: ${error.message}`,
      command: 'rollback'
    };
  }
}

// =============================================================================
// COMMAND ROUTER
// =============================================================================

/**
 * Parse and route command to appropriate handler
 */
async function processCommand(input) {
  const command = input.trim().toLowerCase();
  
  console.log(`[AIAssistant] Processing command: "${command}"`);
  
  // Match command to handler
  if (COMMAND_PATTERNS.scan.test(command)) {
    return await handleScanViral(command);
  }
  
  if (COMMAND_PATTERNS.download.test(command)) {
    return await handleDownloadQueue(command);
  }
  
  if (COMMAND_PATTERNS.generate.test(command)) {
    return await handleGenerateClips(command);
  }
  
  if (COMMAND_PATTERNS.status.test(command)) {
    return await handleSystemHealth(command);
  }
  
  if (COMMAND_PATTERNS.optimize.test(command)) {
    return await handleOptimizeMemory(command);
  }
  
  if (COMMAND_PATTERNS.trending.test(command)) {
    return await handleScanTrending(command);
  }
  
  if (COMMAND_PATTERNS.pause.test(command)) {
    return await handlePause(command);
  }
  
  if (COMMAND_PATTERNS.resume.test(command)) {
    return await handleResume(command);
  }
  
  if (COMMAND_PATTERNS.help.test(command)) {
    return await handleHelp(command);
  }
  
  if (COMMAND_PATTERNS.stats.test(command)) {
    return await handleStats(command);
  }
  
  // Self-Repair commands
  if (COMMAND_PATTERNS.diagnose.test(command)) {
    return await handleDiagnoseSystem(command);
  }
  
  if (COMMAND_PATTERNS.fixError.test(command)) {
    return await handleFixLastError(command);
  }
  
  if (COMMAND_PATTERNS.showPatches.test(command)) {
    return await handleShowPatches(command);
  }
  
  if (COMMAND_PATTERNS.rollback.test(command)) {
    return await handleRollback(command);
  }
  
  // Unknown command
  return {
    success: false,
    message: `Unknown command: "${input}". Type "help" for available commands.`,
    data: {
      suggestions: [
        'scan viral videos',
        'generate clips',
        'show system health',
        'optimize memory',
        'scan trending',
        'diagnose system',
        'fix last error',
        'show patches',
        'rollback',
        'stats',
        'help'
      ]
    }
  };
}

/**
 * Get assistant status
 */
function getStatus() {
  return {
    name: 'ClipperAI Assistant',
    version: '1.0.0',
    mode: 'Auto Content Factory',
    ready: true,
    commands: [
      'scan viral videos',
      'start download queue',
      'generate clips',
      'show system health',
      'optimize memory',
      'scan trending',
      'pause',
      'resume',
      'stats',
      'help'
    ]
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  processCommand,
  getStatus,
  // Export patterns for testing
  COMMAND_PATTERNS
};

