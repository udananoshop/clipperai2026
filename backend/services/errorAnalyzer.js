/**
 * Error Analyzer Service
 * OVERLORD AI DIRECTOR - Error Log Analysis Module
 * 
 * Scans server logs and identifies:
 * - Common Express errors
 * - FFmpeg failures
 * - File missing errors
 * - Timeout errors
 * 
 * Returns suggestions for repair
 * 
 * Optimized for 8GB RAM - lightweight analysis
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  LOG_FILE: process.env.LOG_FILE || 'server.log',
  MAX_LINES: 1000, // Max log lines to analyze
  ERROR_PATTERNS: {
    express: [
      /Cannot read properties of undefined/,
      /Cannot read property/,
      /undefined is not a function/,
      /Cannot call method/,
      /Middleware error/,
      /Route handler error/,
      /async.*rejected/,
      /Promise.*rejection/,
      / ECONNREFUSED/,
      /ETIMEDOUT/,
      /ENOTFOUND/,
      /ENOENT/
    ],
    ffmpeg: [
      /ffmpeg.*error/i,
      /ffmpeg.*failed/i,
      /ffmpeg.*crash/i,
      /Invalid data found/i,
      /decode.*error/i,
      /encode.*error/i,
      /Output file #0 does not contain any stream/,
      /No such file or directory.*ffmpeg/,
      /FFmpeg not found/,
      /ffmpeg exited with code/
    ],
    file: [
      /ENOENT.*no such file/,
      /file.*not found/,
      /missing.*file/,
      /cannot open.*file/,
      /EISDIR.*is a directory/,
      /EBUSY.*resource busy/,
      /permission denied/i,
      /access denied/i
    ],
    timeout: [
      /timeout/i,
      /timed out/i,
      /ETIMEDOUT/,
      /request timeout/i,
      /connection timeout/i,
      /operation timeout/i
    ],
    memory: [
      /JavaScript heap out of memory/,
      /FATAL ERROR.*heap/,
      /out of memory/,
      /memory limit exceeded/,
      /Cannot allocate memory/
    ],
    database: [
      /Prisma.*error/i,
      /database.*error/i,
      /SQLITE_CANTOPEN/,
      /SQLITE_CONSTRAINT/,
      /Unique constraint failed/,
      /foreign key constraint failed/
    ]
  }
};

/**
 * Read recent log lines
 */
function readLogLines(count = CONFIG.MAX_LINES) {
  try {
    const logPath = path.join(CONFIG.LOG_DIR, CONFIG.LOG_FILE);
    
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    
    // Return last N lines
    return lines.slice(-count).filter(line => line.trim().length > 0);
    
  } catch (error) {
    console.error('[ErrorAnalyzer] readLogLines error:', error.message);
    return [];
  }
}

/**
 * Extract error lines from logs
 */
function extractErrorLines(lines) {
  const errorLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line contains error indicators
    if (line.includes('error') || 
        line.includes('Error') || 
        line.includes('ERROR') ||
        line.includes('failed') ||
        line.includes('Failed') ||
        line.includes('exception') ||
        line.includes('Exception')) {
      errorLines.push({
        line: i + 1,
        content: line,
        timestamp: extractTimestamp(line)
      });
    }
  }
  
  return errorLines;
}

/**
 * Extract timestamp from log line
 */
function extractTimestamp(line) {
  // Try to extract timestamp from common formats
  const patterns = [
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
    /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/,
    /\[(\d{2}:\d{2}:\d{2})\]/
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Categorize errors
 */
function categorizeErrors(errorLines) {
  const categories = {
    express: [],
    ffmpeg: [],
    file: [],
    timeout: [],
    memory: [],
    database: [],
    other: []
  };
  
  for (const error of errorLines) {
    let matched = false;
    
    // Check each category pattern
    for (const [category, patterns] of Object.entries(CONFIG.ERROR_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(error.content)) {
          categories[category].push(error);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    
    if (!matched) {
      categories.other.push(error);
    }
  }
  
  return categories;
}

/**
 * Analyze FFmpeg errors
 */
function analyzeFFmpegErrors(errors) {
  const analysis = {
    count: errors.length,
    common: [],
    suggestions: []
  };
  
  if (errors.length === 0) return analysis;
  
  // Count common FFmpeg errors
  const errorTypes = {};
  
  for (const error of errors) {
    const content = error.content;
    
    if (/ffmpeg.*not found/i.test(content)) {
      errorTypes['FFmpeg not installed'] = (errorTypes['FFmpeg not installed'] || 0) + 1;
    } else if (/invalid data/i.test(content)) {
      errorTypes['Invalid input file'] = (errorTypes['Invalid input file'] || 0) + 1;
    } else if (/encode.*error/i.test(content)) {
      errorTypes['Encoding error'] = (errorTypes['Encoding error'] || 0) + 1;
    } else if (/exited with code/i.test(content)) {
      errorTypes['FFmpeg process failed'] = (errorTypes['FFmpeg process failed'] || 0) + 1;
    } else {
      errorTypes['Unknown FFmpeg error'] = (errorTypes['Unknown FFmpeg error'] || 0) + 1;
    }
  }
  
  analysis.common = Object.entries(errorTypes).map(([type, count]) => ({ type, count }));
  
  // Generate suggestions
  if (errorTypes['FFmpeg not installed']) {
    analysis.suggestions.push({
      priority: 'high',
      action: 'Install FFmpeg',
      details: 'FFmpeg is required for video processing. Please install FFmpeg and add it to PATH.'
    });
  }
  
  if (errorTypes['Invalid input file']) {
    analysis.suggestions.push({
      priority: 'medium',
      action: 'Verify input files',
      details: 'Some video files may be corrupted or in an unsupported format.'
    });
  }
  
  if (errorTypes['Encoding error']) {
    analysis.suggestions.push({
      priority: 'medium',
      action: 'Check video format',
      details: 'Video encoding may have failed. Check video codec compatibility.'
    });
  }
  
  return analysis;
}

/**
 * Analyze file errors
 */
function analyzeFileErrors(errors) {
  const analysis = {
    count: errors.length,
    missing: [],
    suggestions: []
  };
  
  if (errors.length === 0) return analysis;
  
  // Extract missing file paths
  const missingFiles = new Set();
  
  for (const error of errors) {
    const match = error.content.match(/'([^']+)'/) || error.content.match(/"([^"]+)"/);
    if (match) {
      missingFiles.add(match[1]);
    }
  }
  
  analysis.missing = Array.from(missingFiles).slice(0, 10); // Limit to 10
  
  if (analysis.missing.length > 0) {
    analysis.suggestions.push({
      priority: 'high',
      action: 'Scan uploads folder',
      details: `Found ${analysis.missing.length} missing files. Run scanUploads to check file integrity.`
    });
  }
  
  return analysis;
}

/**
 * Analyze timeout errors
 */
function analyzeTimeoutErrors(errors) {
  const analysis = {
    count: errors.length,
    suggestions: []
  };
  
  if (errors.length === 0) return analysis;
  
  analysis.suggestions.push({
    priority: 'medium',
    action: 'Increase timeout limits',
    details: 'Several timeout errors detected. Consider increasing request timeout for large video processing.'
  });
  
  return analysis;
}

/**
 * Analyze memory errors
 */
function analyzeMemoryErrors(errors) {
  const analysis = {
    count: errors.length,
    suggestions: []
  };
  
  if (errors.length === 0) return analysis;
  
  analysis.suggestions.push({
    priority: 'critical',
    action: 'Free up memory',
    details: 'Memory errors detected. The system may be running out of RAM. Consider reducing concurrent operations.'
  });
  
  analysis.suggestions.push({
    priority: 'high',
    action: 'Enable memory guard',
    details: 'Set MEMORY_CRITICAL_THRESHOLD environment variable to pause processing when memory is high.'
  });
  
  return analysis;
}

/**
 * Analyze database errors
 */
function analyzeDatabaseErrors(errors) {
  const analysis = {
    count: errors.length,
    suggestions: []
  };
  
  if (errors.length === 0) return analysis;
  
  analysis.suggestions.push({
    priority: 'high',
    action: 'Check database integrity',
    details: 'Database errors detected. Run database integrity check.'
  });
  
  return analysis;
}

/**
 * Get diagnostic summary
 */
function getDiagnosticSummary() {
  const lines = readLogLines();
  const errorLines = extractErrorLines(lines);
  const categories = categorizeErrors(errorLines);
  
  // Analyze each category
  const ffmpegAnalysis = analyzeFFmpegErrors(categories.ffmpeg);
  const fileAnalysis = analyzeFileErrors(categories.file);
  const timeoutAnalysis = analyzeTimeoutErrors(categories.timeout);
  const memoryAnalysis = analyzeMemoryErrors(categories.memory);
  const databaseAnalysis = analyzeDatabaseErrors(categories.database);
  
  // Collect all suggestions
  const allSuggestions = [
    ...ffmpegAnalysis.suggestions,
    ...fileAnalysis.suggestions,
    ...timeoutAnalysis.suggestions,
    ...memoryAnalysis.suggestions,
    ...databaseAnalysis.suggestions
  ];
  
  // Remove duplicates
  const uniqueSuggestions = [];
  const seen = new Set();
  
  for (const suggestion of allSuggestions) {
    const key = suggestion.action;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSuggestions.push(suggestion);
    }
  }
  
  return {
    hasErrors: errorLines.length > 0,
    totalErrors: errorLines.length,
    categories: {
      express: categories.express.length,
      ffmpeg: categories.ffmpeg.length,
      file: categories.file.length,
      timeout: categories.timeout.length,
      memory: categories.memory.length,
      database: categories.database.length,
      other: categories.other.length
    },
    analysis: {
      ffmpeg: ffmpegAnalysis,
      file: fileAnalysis,
      timeout: timeoutAnalysis,
      memory: memoryAnalysis,
      database: databaseAnalysis
    },
    suggestions: uniqueSuggestions,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get quick error count
 */
function getErrorCount() {
  const lines = readLogLines(500); // Only read last 500 lines for quick check
  const errorLines = extractErrorLines(lines);
  return errorLines.length;
}

/**
 * Get recent errors
 */
function getRecentErrors(count = 20) {
  const lines = readLogLines(500);
  const errorLines = extractErrorLines(lines);
  return errorLines.slice(-count).reverse();
}

/**
 * Check for specific error patterns
 */
function checkForPattern(patternName) {
  const lines = readLogLines();
  const patterns = CONFIG.ERROR_PATTERNS[patternName] || [];
  
  const matches = [];
  
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      if (pattern.test(lines[i])) {
        matches.push({
          line: i + 1,
          content: lines[i]
        });
      }
    }
  }
  
  return matches;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  readLogLines,
  extractErrorLines,
  categorizeErrors,
  analyzeFFmpegErrors,
  analyzeFileErrors,
  analyzeTimeoutErrors,
  analyzeMemoryErrors,
  analyzeDatabaseErrors,
  getDiagnosticSummary,
  getErrorCount,
  getRecentErrors,
  checkForPattern,
  CONFIG
};

