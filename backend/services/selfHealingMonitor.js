
/**
 * SELF-HEALING MONITOR
 * Lightweight runtime error detection and recovery system
 * 
 * Monitors:
 * - Backend logs for crash patterns
 * - Node.js runtime errors (uncaughtException, unhandledRejection)
 * - Process termination events
 * - Server crash detection
 * - SERVICE WATCHDOG: API port availability and health endpoint
 * 
 * Recovery:
 * - Max 3 restart attempts
 * - 30 second cooldown (crash recovery)
 * - 15 second cooldown (watchdog recovery)
 * - Logs to storage/system_logs/healing.log
 * - Logs watchdog events to storage/system_logs/service_watchdog.log
 * 
 * Constraints:
 * - Non-intrusive, non-blocking
 * - Max 1 monitoring thread
 * - Safe for 8GB RAM systems
 * - Does NOT modify business logic
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const http = require('http');
const net = require('net');

// ===================================================================
// CONFIGURATION
// ===================================================================

const CONFIG = {
  // Recovery settings
  MAX_RESTART_ATTEMPTS: 3,
  RESTART_COOLDOWN_MS: 30000,
  
  // Log paths
  STORAGE_DIR: path.join(__dirname, '..', 'storage'),
  LOG_DIR: path.join(__dirname, '..', 'storage', 'system_logs'),
  LOG_FILE: 'healing.log',
  CRASH_FILE: 'crashes.log',
  WATCHDOG_LOG_FILE: 'service_watchdog.log',
  
  // Monitoring
  LOG_POLL_INTERVAL_MS: 5000,
  MEMORY_CHECK_INTERVAL_MS: 10000,
  
  // RAM limits for 8GB systems
  MAX_MEMORY_PERCENT: 90,
  WARNING_MEMORY_PERCENT: 80,
  
  // Server settings
  SERVER_PORT: 3001,
  SERVER_SCRIPT: 'server.js',
  
  // WATCHDOG settings (Service availability monitoring)
  WATCHDOG_ENABLED: true,
  WATCHDOG_PORT: 3001,
  WATCHDOG_HEALTH_ENDPOINT: '/api/health',
  WATCHDOG_CHECK_INTERVAL_MS: 10000, // Check every 10 seconds
  WATCHDOG_COOLDOWN_MS: 15000, // 15 second cooldown between restarts
  WATCHDOG_MAX_ATTEMPTS: 3,
  WATCHDOG_STARTUP_DELAY_MS: 10000, // Wait 10 seconds after startup before monitoring
  WATCHDOG_TIMEOUT_MS: 5000 // 5 second timeout for health check
};

// Ensure directories exist
const LOG_PATH = path.join(CONFIG.LOG_DIR, CONFIG.LOG_FILE);
const CRASH_PATH = path.join(CONFIG.LOG_DIR, CONFIG.CRASH_FILE);

function ensureDirectories() {
  try {
    if (!fs.existsSync(CONFIG.STORAGE_DIR)) {
      fs.mkdirSync(CONFIG.STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('[SelfHealingMonitor] Directory creation failed:', e.message);
  }
}
ensureDirectories();

// ===================================================================
// STATE
// ===================================================================

const monitorState = {
  isMonitoring: false,
  restartAttempts: 0,
  lastRestartTime: null,
  lastCrashTime: null,
  isRecovering: false,
  serverPid: null,
  healthStatus: 'healthy', // healthy, recovering, error
  crashHistory: [],
  maxHistoryItems: 50
};

// ===================================================================
// WATCHDOG STATE - Service availability monitoring
// ===================================================================

const watchdogState = {
  isWatching: false,
  isEnabled: true,
  portCheckFailures: 0,
  healthCheckFailures: 0,
  lastCheckTime: null,
  lastPortCheck: null,
  lastHealthCheck: null,
  restartAttempts: 0,
  lastRestartAttempt: null,
  isRecovering: false,
  startupDelayPassed: false,
  lastHealthyTime: null,
  watchHistory: [],
  maxHistoryItems: 20
};

// Watchdog log path
const WATCHDOG_LOG_PATH = path.join(CONFIG.LOG_DIR, CONFIG.WATCHDOG_LOG_FILE);

// ===================================================================
// WATCHDOG LOGGING
// ===================================================================

function watchdogLog(level, action, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] [WATCHDOG] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  
  // Console output
  switch (level) {
    case 'error':
      console.error('[WATCHDOG]', message, data || '');
      break;
    case 'warn':
      console.warn('[WATCHDOG]', message, data || '');
      break;
    default:
      console.log('[WATCHDOG]', message, data || '');
  }
  
  // File output (watchdog log)
  try {
    fs.appendFileSync(WATCHDOG_LOG_PATH, logEntry + '\n', 'utf8');
  } catch (e) {
    console.error('[WATCHDOG] Log write error:', e.message);
  }
  
  // Add to history
  watchdogState.watchHistory.push({
    timestamp,
    level,
    action,
    message,
    data
  });
  if (watchdogState.watchHistory.length > watchdogState.maxHistoryItems) {
    watchdogState.watchHistory = watchdogState.watchHistory.slice(-watchdogState.maxHistoryItems);
  }
}

// ===================================================================
// LOGGING
// ===================================================================

function log(level, action, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${action}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  
  // Console output
  switch (level) {
    case 'error':
      console.error('[SELF HEAL]', message, data || '');
      break;
    case 'warn':
      console.warn('[SELF HEAL]', message, data || '');
      break;
    default:
      console.log('[SELF HEAL]', message, data || '');
  }
  
  // File output
  try {
    fs.appendFileSync(LOG_PATH, logEntry + '\n', 'utf8');
  } catch (e) {
    console.error('[SelfHealingMonitor] Log write error:', e.message);
  }
}

// ===================================================================
// CRASH LOGGING
// ===================================================================

function logCrash(errorType, message, stackTrace, metadata = {}) {
  const crashEntry = {
    timestamp: new Date().toISOString(),
    errorType,
    message,
    stackTrace,
    metadata,
    restartAttempts: monitorState.restartAttempts
  };
  
  // Add to history
  monitorState.crashHistory.push(crashEntry);
  if (monitorState.crashHistory.length > monitorState.maxHistoryItems) {
    monitorState.crashHistory = monitorState.crashHistory.slice(-monitorState.maxHistoryItems);
  }
  
  // Write to crash file
  try {
    const crashLine = JSON.stringify(crashEntry) + '\n';
    fs.appendFileSync(CRASH_PATH, crashLine, 'utf8');
  } catch (e) {
    console.error('[SelfHealingMonitor] Crash log error:', e.message);
  }
  
  return crashEntry;
}

// ===================================================================
// PROCESS MANAGEMENT
// ===================================================================

/**
 * Check if server is running
 */
function isServerRunning() {
  if (!monitorState.serverPid) return false;
  
  try {
    // Check if process exists
    process.kill(monitorState.serverPid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get current server PID from port
 */
async function findServerPid() {
  return new Promise((resolve) => {
    // Use netstat to find process on port 3001
    const netstat = spawn('netstat', ['-ano'], { shell: true });
    let output = '';
    
    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    netstat.on('close', () => {
      // Look for port 3001
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(':3001') && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1]);
          if (pid && pid > 0) {
            resolve(pid);
            return;
          }
        }
      }
      resolve(null);
    });
    
    netstat.on('error', () => {
      resolve(null);
    });
  });
}

// ===================================================================
// RECOVERY ACTIONS
// ===================================================================

/**
 * Attempt to restart the Node.js server
 */
async function restartServer() {
  // Check cooldown
  if (monitorState.lastRestartTime) {
    const timeSinceRestart = Date.now() - monitorState.lastRestartTime;
    if (timeSinceRestart < CONFIG.RESTART_COOLDOWN_MS) {
      log('warn', 'RESTART', `Cooldown active, last restart ${Math.floor(timeSinceRestart / 1000)}s ago`);
      return { success: false, reason: 'cooldown_active' };
    }
  }
  
  // Check max attempts
  if (monitorState.restartAttempts >= CONFIG.MAX_RESTART_ATTEMPTS) {
    log('error', 'RESTART', 'Max restart attempts reached, giving up');
    monitorState.healthStatus = 'error';
    return { success: false, reason: 'max_attempts_reached' };
  }
  
  log('warn', 'RESTART', 'Attempting to restart server...');
  monitorState.isRecovering = true;
  monitorState.healthStatus = 'recovering';
  monitorState.restartAttempts++;
  monitorState.lastRestartTime = Date.now();
  
  try {
    // Try to find and kill existing server
    const currentPid = await findServerPid();
    if (currentPid) {
      log('info', 'RESTART', `Killing existing server (PID: ${currentPid})`);
      try {
        process.kill(currentPid, 'SIGTERM');
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        // Process may already be dead
      }
    }
    
    // Start new server
    log('info', 'RESTART', 'Starting new server process...');
    
    const serverPath = path.join(__dirname, '..', CONFIG.SERVER_SCRIPT);
    const serverDir = path.dirname(serverPath);
    
    const serverProcess = spawn('node', [CONFIG.SERVER_SCRIPT], {
      cwd: serverDir,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    monitorState.serverPid = serverProcess.pid;
    
    // Wait for server to start
    await new Promise(r => setTimeout(r, 5000));
    
    // Check if running
    const newPid = await findServerPid();
    if (newPid) {
      log('info', 'RESTART', `Server restarted successfully (new PID: ${newPid})`);
      monitorState.isRecovering = false;
      monitorState.healthStatus = 'healthy';
      
      log('info', 'RESTART', 'Recovery successful!');
      return { success: true, newPid };
    } else {
      log('error', 'RESTART', 'Server failed to start');
      monitorState.isRecovering = false;
      monitorState.healthStatus = 'error';
      return { success: false, reason: 'start_failed' };
    }
    
  } catch (error) {
    log('error', 'RESTART', 'Restart failed:', error.message);
    monitorState.isRecovering = false;
    monitorState.healthStatus = 'error';
    return { success: false, error: error.message };
  }
}

/**
 * Clear temporary files
 */
function clearTempFiles() {
  try {
    const tempDirs = [
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'output', 'temp')
    ];
    
    let clearedCount = 0;
    
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            // Only delete files older than 1 hour
            const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
            if (ageHours > 1 && stats.isFile()) {
              fs.unlinkSync(filePath);
              clearedCount++;
            }
          } catch (e) {
            // Skip files that can't be deleted
          }
        }
      }
    }
    
    if (clearedCount > 0) {
      log('info', 'CLEANUP', `Cleared ${clearedCount} temporary files`);
    }
    
    return { success: true, clearedCount };
  } catch (error) {
    log('error', 'CLEANUP', 'Failed to clear temp files:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Release locked ffmpeg processes
 */
function releaseFFmpegProcesses() {
  return new Promise((resolve) => {
    try {
      // Kill any hung ffmpeg processes
      const taskkill = spawn('taskkill', ['/F', '/IM', 'ffmpeg.exe'], { shell: true });
      
      taskkill.on('close', (code) => {
        if (code === 0) {
          log('info', 'FFMPEG', 'Released locked ffmpeg processes');
          resolve({ success: true });
        } else {
          resolve({ success: true, note: 'No processes to kill' });
        }
      });
      
      taskkill.on('error', () => {
        resolve({ success: true, note: 'Taskkill not available' });
      });
      
      // Timeout
      setTimeout(() => {
        resolve({ success: true, note: 'Timeout' });
      }, 5000);
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

// ===================================================================
// ERROR DETECTION
// ===================================================================

/**
 * Parse error from stack trace
 */
function parseError(stackTrace) {
  if (!stackTrace) return { file: null, line: null, errorType: 'unknown' };
  
  // Common patterns
  const patterns = [
    /at\s+.+\s+\((.+):(\d+):(\d+)\)/,  // at function (file:line:col)
    /at\s+(.+):(\d+):(\d+)/,            // at file:line:col
    /(.+):(\d+):(\d+)/                   // file:line:col
  ];
  
  for (const pattern of patterns) {
    const match = stackTrace.match(pattern);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        errorType: extractErrorType(stackTrace)
      };
    }
  }
  
  return {
    file: null,
    line: null,
    errorType: extractErrorType(stackTrace)
  };
}

/**
 * Extract error type from message
 */
function extractErrorType(message) {
  const messageStr = String(message).toLowerCase();
  
  if (messageStr.includes('syntaxerror')) return 'syntax';
  if (messageStr.includes('referenceerror')) return 'reference';
  if (messageStr.includes('typeerror')) return 'type';
  if (messageStr.includes('rangeerror')) return 'range';
  if (messageStr.includes('evalerror')) return 'eval';
  if (messageStr.includes('urierror')) return 'uri';
  if (messageStr.includes('uncaughtexception')) return 'uncaught';
  if (messageStr.includes('unhandledrejection')) return 'unhandled';
  if (messageStr.includes('econnrefused')) return 'connection';
  if (messageStr.includes('enomem')) return 'memory';
  if (messageStr.includes('eaccess') || messageStr.includes('permission')) return 'permission';
  
  return 'runtime';
}

// ===================================================================
// CRASH HANDLERS
// ===================================================================

/**
 * Handle uncaught exception
 */
function handleUncaughtException(error) {
  const timestamp = new Date().toISOString();
  const stackTrace = error.stack || error.message || String(error);
  const parsed = parseError(stackTrace);
  
  log('error', 'CRASH', `Uncaught exception: ${error.message}`, {
    file: parsed.file,
    line: parsed.line,
    errorType: parsed.errorType
  });
  
  // Log crash
  logCrash('uncaughtException', error.message, stackTrace, {
    file: parsed.file,
    line: parsed.line
  });
  
  // Update state
  monitorState.lastCrashTime = timestamp;
  monitorState.healthStatus = 'error';
  
  // Attempt recovery
  return attemptRecovery('uncaughtException', parsed);
}

/**
 * Handle unhandled promise rejection
 */
function handleUnhandledRejection(reason, promise) {
  const timestamp = new Date().toISOString();
  const stackTrace = reason?.stack || reason || String(reason);
  const parsed = parseError(stackTrace);
  
  log('error', 'CRASH', `Unhandled rejection: ${reason}`, {
    file: parsed.file,
    line: parsed.line,
    errorType: parsed.errorType
  });
  
  // Log crash
  logCrash('unhandledRejection', String(reason), stackTrace, {
    file: parsed.file,
    line: parsed.line
  });
  
  monitorState.lastCrashTime = timestamp;
  
  // Attempt recovery
  return attemptRecovery('unhandledRejection', parsed);
}

/**
 * Attempt automatic recovery
 */
async function attemptRecovery(crashType, parsedError) {
  log('info', 'RECOVERY', `Starting recovery for ${crashType}...`);
  
  // Step 1: Clear temp files
  clearTempFiles();
  
  // Step 2: Release ffmpeg processes
  await releaseFFmpegProcesses();
  
  // Step 3: Restart server if needed
  if (parsedError.errorType === 'syntax' || parsedError.errorType === 'reference') {
    // Syntax/reference errors need server restart
    const result = await restartServer();
    return result;
  }
  
  return { success: true, action: 'cleanup_only' };
}

// ===================================================================
// MEMORY MONITORING
// ===================================================================

/**
 * Check memory usage
 */
function getMemoryUsage() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percent = (usedMem / totalMem) * 100;
    
    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percent: percent.toFixed(1),
      isWarning: percent >= CONFIG.WARNING_MEMORY_PERCENT,
      isCritical: percent >= CONFIG.MAX_MEMORY_PERCENT
    };
  } catch (error) {
    return { percent: 0, error: error.message };
  }
}

/**
 * Memory check handler
 */
function checkMemory() {
  const mem = getMemoryUsage();
  
  if (mem.isCritical) {
    log('warn', 'MEMORY', `Critical memory usage: ${mem.percent}%`);
    
    // Attempt cleanup
    clearTempFiles();
    
    monitorState.healthStatus = 'warning';
  } else if (mem.isWarning) {
    log('info', 'MEMORY', `High memory usage: ${mem.percent}%`);
  }
  
  return mem;
}

// ===================================================================
// STATUS
// ===================================================================

/**
 * Get current health status
 */
function getHealthStatus() {
  const mem = getMemoryUsage();
  
  return {
    status: monitorState.healthStatus,
    isMonitoring: monitorState.isMonitoring,
    isRecovering: monitorState.isRecovering,
    restartAttempts: monitorState.restartAttempts,
    maxRestartAttempts: CONFIG.MAX_RESTART_ATTEMPTS,
    lastCrashTime: monitorState.lastCrashTime,
    lastRestartTime: monitorState.lastRestartTime,
    memory: mem,
    recentCrashes: monitorState.crashHistory.slice(-5),
    watchdog: {
      isWatching: watchdogState.isWatching,
      isEnabled: watchdogState.isEnabled,
      isRecovering: watchdogState.isRecovering,
      portCheckFailures: watchdogState.portCheckFailures,
      healthCheckFailures: watchdogState.healthCheckFailures,
      restartAttempts: watchdogState.restartAttempts,
      lastHealthyTime: watchdogState.lastHealthyTime,
      lastCheckTime: watchdogState.lastCheckTime
    }
  };
}

/**
 * Reset health status
 */
function resetHealth() {
  monitorState.healthStatus = 'healthy';
  monitorState.restartAttempts = 0;
  log('info', 'RESET', 'Health status reset');
}

// ===================================================================
// WATCHDOG - Service Availability Monitoring
// ===================================================================

/**
 * Check if port is available (TCP connection test)
 */
function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = CONFIG.WATCHDOG_TIMEOUT_MS;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({ available: true, port });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ available: false, port, error: 'timeout' });
    });
    
    socket.on('error', (err) => {
      resolve({ available: false, port, error: err.message });
    });
    
    socket.connect(port, '127.0.0.1');
  });
}

/**
 * Check health endpoint
 */
function checkHealthEndpoint() {
  return new Promise((resolve) => {
    const url = `http://127.0.0.1:${CONFIG.WATCHDOG_PORT}${CONFIG.WATCHDOG_HEALTH_ENDPOINT}`;
    const timeout = CONFIG.WATCHDOG_TIMEOUT_MS;
    
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ 
            healthy: res.statusCode === 200 && json.status === 'OK',
            statusCode: res.statusCode,
            data: json
          });
        } catch (e) {
          resolve({ healthy: res.statusCode === 200, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ healthy: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, error: 'timeout' });
    });
    
    req.setTimeout(timeout);
    
    // Timeout fallback
    setTimeout(() => {
      if (!res) resolve({ healthy: false, error: 'timeout' });
    }, timeout + 500);
  });
}

/**
 * Watchdog recovery - restart the backend server
 */
async function watchdogRecovery() {
  // Check cooldown
  if (watchdogState.lastRestartAttempt) {
    const timeSinceRestart = Date.now() - watchdogState.lastRestartAttempt;
    if (timeSinceRestart < CONFIG.WATCHDOG_COOLDOWN_MS) {
      watchdogLog('warn', 'RECOVERY', `Watchdog cooldown active, last attempt ${Math.floor(timeSinceRestart / 1000)}s ago`);
      return { success: false, reason: 'cooldown_active' };
    }
  }
  
  // Check max attempts
  if (watchdogState.restartAttempts >= CONFIG.WATCHDOG_MAX_ATTEMPTS) {
    watchdogLog('error', 'RECOVERY', 'Max watchdog restart attempts reached, giving up');
    watchdogState.isRecovering = false;
    return { success: false, reason: 'max_attempts_reached' };
  }
  
  watchdogLog('warn', 'RECOVERY', `Attempting to restart backend (attempt ${watchdogState.restartAttempts + 1}/${CONFIG.WATCHDOG_MAX_ATTEMPTS})...`);
  watchdogState.isRecovering = true;
  watchdogState.restartAttempts++;
  watchdogState.lastRestartAttempt = Date.now();
  
  try {
    // Try to find and kill existing server
    const currentPid = await findServerPid();
    if (currentPid) {
      watchdogLog('info', 'RECOVERY', `Killing existing server (PID: ${currentPid})`);
      try {
        process.kill(currentPid, 'SIGTERM');
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        // Process may already be dead
      }
    }
    
    // Start new server
    watchdogLog('info', 'RECOVERY', 'Starting new server process...');
    
    const serverPath = path.join(__dirname, '..', CONFIG.SERVER_SCRIPT);
    const serverDir = path.dirname(serverPath);
    
    const serverProcess = spawn('node', [CONFIG.SERVER_SCRIPT], {
      cwd: serverDir,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    monitorState.serverPid = serverProcess.pid;
    
    // Wait for server to start
    await new Promise(r => setTimeout(r, 5000));
    
    // Check if port is now available
    const portCheck = await checkPortAvailability(CONFIG.WATCHDOG_PORT);
    if (portCheck.available) {
      watchdogLog('info', 'RECOVERY', `Backend restarted successfully on port ${CONFIG.WATCHDOG_PORT}`);
      watchdogState.isRecovering = false;
      watchdogState.portCheckFailures = 0;
      watchdogState.healthCheckFailures = 0;
      watchdogState.lastHealthyTime = Date.now();
      
      // Update main health status
      monitorState.healthStatus = 'healthy';
      monitorState.isRecovering = false;
      
      return { success: true };
    } else {
      watchdogLog('error', 'RECOVERY', 'Backend failed to start');
      watchdogState.isRecovering = false;
      return { success: false, reason: 'start_failed' };
    }
    
  } catch (error) {
    watchdogLog('error', 'RECOVERY', 'Watchdog recovery failed:', error.message);
    watchdogState.isRecovering = false;
    return { success: false, error: error.message };
  }
}

/**
 * Main watchdog check - runs periodically
 */
async function watchdogCheck() {
  // Skip if not enabled or already recovering
  if (!watchdogState.isEnabled || watchdogState.isRecovering) {
    return;
  }
  
  // Skip startup delay
  if (!watchdogState.startupDelayPassed) {
    return;
  }
  
  watchdogState.lastCheckTime = Date.now();
  
  try {
    // Check port availability first (faster)
    const portCheck = await checkPortAvailability(CONFIG.WATCHDOG_PORT);
    watchdogState.lastPortCheck = Date.now();
    
    if (!portCheck.available) {
      watchdogState.portCheckFailures++;
      watchdogLog('warn', 'CHECK', `API port ${CONFIG.WATCHDOG_PORT} unreachable (failure #${watchdogState.portCheckFailures})`);
      
      // Trigger recovery if port is down
      if (watchdogState.portCheckFailures >= 1) {
        watchdogLog('error', 'CHECK', 'API port unreachable, triggering recovery...');
        await watchdogRecovery();
      }
      return;
    }
    
    // Port is available, check health endpoint
    const healthCheck = await checkHealthEndpoint();
    watchdogState.lastHealthCheck = Date.now();
    
    if (!healthCheck.healthy) {
      watchdogState.healthCheckFailures++;
      watchdogLog('warn', 'CHECK', `Health endpoint failed (failure #${watchdogState.healthCheckFailures})`, { statusCode: healthCheck.statusCode });
      
      // Trigger recovery if health check fails
      if (watchdogState.healthCheckFailures >= 1) {
        watchdogLog('error', 'CHECK', 'Health endpoint failed, triggering recovery...');
        await watchdogRecovery();
      }
      return;
    }
    
    // All good - reset failure counts
    if (watchdogState.portCheckFailures > 0 || watchdogState.healthCheckFailures > 0) {
      watchdogLog('info', 'CHECK', 'Backend recovered, resetting failure counters');
    }
    watchdogState.portCheckFailures = 0;
    watchdogState.healthCheckFailures = 0;
    watchdogState.lastHealthyTime = Date.now();
    
  } catch (error) {
    watchdogLog('error', 'CHECK', 'Watchdog check error:', error.message);
  }
}

/**
 * Start watchdog monitoring
 */
function startWatchdog() {
  if (watchdogState.isWatching) {
    watchdogLog('warn', 'START', 'Watchdog already running');
    return { success: false, reason: 'already_running' };
  }
  
  watchdogLog('info', 'START', 'Starting service watchdog...');
  
  // Set startup delay
  watchdogState.startupDelayPassed = false;
  setTimeout(() => {
    watchdogState.startupDelayPassed = true;
    watchdogLog('info', 'START', 'Startup delay passed, watchdog now active');
  }, CONFIG.WATCHDOG_STARTUP_DELAY_MS);
  
  // Start watchdog check interval
  const watchdogInterval = setInterval(() => {
    if (monitorState.isMonitoring) {
      watchdogCheck();
    }
  }, CONFIG.WATCHDOG_CHECK_INTERVAL_MS);
  
  // Prevent interval from keeping process alive
  watchdogInterval.unref();
  
  watchdogState.isWatching = true;
  watchdogState.isEnabled = true;
  
  watchdogLog('info', 'START', `Service watchdog started (check interval: ${CONFIG.WATCHDOG_CHECK_INTERVAL_MS}ms)`);
  
  return { success: true };
}

/**
 * Stop watchdog monitoring
 */
function stopWatchdog() {
  if (!watchdogState.isWatching) {
    return { success: false, reason: 'not_running' };
  }
  
  watchdogLog('info', 'STOP', 'Stopping service watchdog...');
  
  watchdogState.isWatching = false;
  watchdogState.isEnabled = false;
  
  return { success: true };
}

// ===================================================================
// START/STOP
// ===================================================================

/**
 * Start monitoring
 */
function start() {
  if (monitorState.isMonitoring) {
    log('warn', 'MONITOR', 'Already monitoring');
    return { success: false, reason: 'already_running' };
  }
  
  log('info', 'MONITOR', 'Starting self-healing monitor...');
  
  // Set up error handlers
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
  
  // Start memory monitoring
  setInterval(checkMemory, CONFIG.MEMORY_CHECK_INTERVAL_MS);
  
  monitorState.isMonitoring = true;
  monitorState.healthStatus = 'healthy';
  
  log('info', 'MONITOR', 'Self-healing monitor started');
  
  return { success: true };
}

/**
 * Stop monitoring
 */
function stop() {
  log('info', 'MONITOR', 'Stopping self-healing monitor...');
  
  monitorState.isMonitoring = false;
  monitorState.healthStatus = 'stopped';
  
  return { success: true };
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  CONFIG,
  start,
  stop,
  getHealthStatus,
  resetHealth,
  checkMemory,
  getMemoryUsage,
  restartServer,
  clearTempFiles,
  releaseFFmpegProcesses,
  handleUncaughtException,
  handleUnhandledRejection,
  log,
  // Watchdog exports
  startWatchdog,
  stopWatchdog,
  watchdogState,
  watchdogLog
};

