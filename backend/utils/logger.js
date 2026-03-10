/**
 * Logger Utility - PRODUCTION READY
 * Structured logging with timestamp, level, message, jobId
 * Creates logs directory if it doesn't exist
 * Won't crash if logger errors
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (e) {
  // Don't crash if directory creation fails
}

const logFile = path.join(logsDir, 'server.log');

/**
 * Build structured log entry
 * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
 * @param {string} message - Log message
 * @param {Object} extras - Additional fields (jobId, userId, etc.)
 * @returns {Object} Structured log object
 */
const buildLogEntry = (level, message, extras = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    ...extras
  };
};

/**
 * Write log message to file (non-blocking)
 * @param {Object} logEntry - Structured log entry
 */
const writeLog = (logEntry) => {
  const logLine = JSON.stringify(logEntry) + '\n';
  
  // Console: Only log WARN and ERROR by default to reduce spam
  // INFO logs go to file only (production)
  if (logEntry.level === 'ERROR' || logEntry.level === 'WARN') {
    try {
      console.log(`[${logEntry.level}] ${logEntry.message}`);
    } catch (e) {
      // Ignore console errors
    }
  }
  
  // File: Log everything
  try {
    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error('[Logger] Failed to write to log file:', err.message);
      }
    });
  } catch (e) {
    // Don't crash if file write fails
  }
};

/**
 * Logger object with methods for different log types
 */
const logger = {
  /**
   * Log structured info
   * @param {string} message 
   * @param {Object} extras - Additional fields (jobId, userId, etc.)
   */
  info: (message, extras = {}) => {
    const entry = buildLogEntry('INFO', message, extras);
    writeLog(entry);
  },
  
  /**
   * Log structured warn
   * @param {string} message 
   * @param {Object} extras - Additional fields
   */
  warn: (message, extras = {}) => {
    const entry = buildLogEntry('WARN', message, extras);
    writeLog(entry);
  },
  
  /**
   * Log structured error
   * @param {string} message 
   * @param {Object} extras - Additional fields (jobId, stack, etc.)
   */
  error: (message, extras = {}) => {
    const entry = buildLogEntry('ERROR', message, extras);
    writeLog(entry);
  },
  
  /**
   * Log structured debug (only in development)
   * @param {string} message 
   * @param {Object} extras - Additional fields
   */
  debug: (message, extras = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const entry = buildLogEntry('DEBUG', message, extras);
      writeLog(entry);
    }
  },
  
  // Legacy methods for backward compatibility
  upload: (message) => {
    logger.info(message, { category: 'UPLOAD' });
  },
  
  clip: (message) => {
    logger.info(message, { category: 'CLIP' });
  },
  
  ai: (message) => {
    logger.info(message, { category: 'AI' });
  },
  
  /**
   * Get log file path
   */
  getLogFilePath: () => {
    return logFile;
  }
};

module.exports = logger;
