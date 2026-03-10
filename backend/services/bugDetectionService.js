/**
 * Auto Self-Repair Bug Detection Service
 * Lightweight bug detection engine for 8GB RAM optimization
 * Detects runtime errors and generates fix suggestions
 */

// In-memory cache - only store last 10 errors for 8GB RAM optimization
const MAX_ERRORS = 10;
let detectedErrors = [];

// Error pattern definitions for common issues
const ERROR_PATTERNS = {
  // Prisma field mismatch errors
  prismaFieldError: {
    patterns: [
      /Invalid\s+`prisma\.[^`]+`\s+invocation/i,
      /Field\s+'([^']+)'\s+not\s+found/i,
      /Unknown\s+field\s+'([^']+)'/i,
      /The\s+field\s+`([^`]+)`\s+is\s+not\s+found/i,
      /Cannot\s+read\s+property\s+['"]?(\w+)['"]?\s+of\s+undefined/i,
      /Argument\s+`(\w+)`\s+is\s+missing/i
    ],
    type: 'Prisma Field Error',
    generateSuggestion: (match, error) => {
      const field = match[1] || match[2] || match[3];
      // Common Prisma field name corrections
      const fieldCorrections = {
        'viral_score': 'viralScore',
        'viralScore': 'viral_score',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'user_id': 'userId',
        'video_id': 'videoId',
        'clip_id': 'clipId',
        'job_id': 'jobId',
        'is_active': 'isActive',
        'is_completed': 'isCompleted'
      };
      
      const correction = fieldCorrections[field.toLowerCase()];
      if (correction) {
        return `Field '${field}' not found. Use '${correction}' based on schema.prisma`;
      }
      return `Field '${field}' not found in Prisma schema. Check your schema.prisma file and ensure the field exists.`;
    }
  },

  // Undefined variable errors
  undefinedVariable: {
    patterns: [
      /Cannot\s+read\s+property\s+['"]?(\w+)['"]?\s+of\s+undefined/i,
      /Cannot\s+read\s+properties\s+of\s+undefined/i,
      /(\w+)\s+is\s+not\s+defined/i,
      /ReferenceError:\s*(\w+)\s+is\s+not\s+defined/i,
      /\[(\w+)\]\s+is\s+undefined/i
    ],
    type: 'Undefined Variable',
    generateSuggestion: (match, error) => {
      const variable = match[1] || 'unknown';
      // Check if it's a service reference
      if (error.includes('require') || error.includes('import')) {
        return `Variable '${variable}' is undefined. Check if the module is properly imported/required.`;
      }
      return `Variable '${variable}' is undefined. Initialize it before use or check if it's properly imported.`;
    }
  },

  // Missing import errors
  missingImport: {
    patterns: [
      /Cannot\s+find\s+module\s+['"]?([^'"]+)['"]?/i,
      /Module\s+not\s+found:\s*Error:\s*Cannot\s+find\s+module/i,
      /require\([^)]+\)\s+is\s+not\s+a\s+function/i,
      /(\w+)\s+is\s+not\s+a\s+function/i,
      /(\w+)\s+is\s+not\s+defined/i
    ],
    type: 'Missing Import',
    generateSuggestion: (match, error) => {
      const module = match[1];
      return `Missing import: Cannot find module '${module}'. Check the file path and ensure it's installed.`;
    }
  },

  // API route errors
  apiRouteError: {
    patterns: [
      /Cannot\s+GET\s+(\/\S+)/i,
      /Cannot\s+POST\s+(\/\S+)/i,
      /Route\s+not\s+found/i,
      /404\s+Not\s+Found/i,
      /Cannot\s+read\s+property\s+['"]?(\w+)['"]?\s+of\s+undefined.*request/i,
      /req\.(\w+)\s+is\s+undefined/i
    ],
    type: 'API Route Error',
    generateSuggestion: (match, error) => {
      const route = match[1] || 'unknown';
      if (route !== 'unknown') {
        return `API route '${route}' not found. Check your routes configuration.`;
      }
      return `API route error detected. Check request parameters and route definitions.`;
    }
  },

  // Null reference errors
  nullReference: {
    patterns: [
      /Cannot\s+read\s+property\s+['"]?(\w+)['"]?\s+of\s+null/i,
      /Cannot\s+read\s+properties\s+of\s+null/i,
      /null\s+is\s+not\s+an\s+object/i,
      /null\s+\(\s*reading\s+['"]?(\w+)['"]?\s*\)/i,
      /\.(\w+)\s+is\s+null/i
    ],
    type: 'Null Reference Error',
    generateSuggestion: (match, error) => {
      const property = match[1] || 'unknown property';
      return `Null reference: Cannot access '${property}' on null. Add null check before accessing the property.`;
    }
  },

  // Type errors
  typeError: {
    patterns: [
      /TypeError:\s*(.+)/i,
      /(\w+)\s+is\s+not\s+a\s+function/i,
      /(\w+)\s+\(\s*\)\s+is\s+not\s+a\s+function/i,
      /Cannot\s+call\s+(\w+)\s+as\s+a\s+function/i
    ],
    type: 'Type Error',
    generateSuggestion: (match, error) => {
      const func = match[1] || 'function';
      return `Type error: '${func}' is not a function. Check the type of the variable.`;
    }
  },

  // Async/await errors
  asyncError: {
    patterns: [
      /SyntaxError:\s*Unexpected\s+token\s+.*await/i,
      /await\s+is\s+only\s+valid\s+in\s+async\s+function/i,
      /Cannot\s+use\s+await\s+outside\s+async\s+function/i,
      /Promise\.all\s+is\s+not\s+a\s+function/i
    ],
    type: 'Async/Await Error',
    generateSuggestion: (match, error) => {
      if (error.includes('await')) {
        return `Async/await error. Ensure 'await' is used inside an async function.`;
      }
      return `Async operation error. Check your Promise handling.`;
    }
  },

  // Database connection errors
  databaseError: {
    patterns: [
      /ECONNREFUSED/i,
      /Database\s+connection\s+failed/i,
      /PrismaClientInitializationError/i,
      /Cannot\s+connect\s+to\s+database/i,
      /Too\s+many\s+connections/i
    ],
    type: 'Database Error',
    generateSuggestion: (match, error) => {
      return `Database connection error. Check DATABASE_URL in .env and ensure database is running.`;
    }
  },

  // Authentication errors
  authError: {
    patterns: [
      /401\s+Unauthorized/i,
      /403\s+Forbidden/i,
      /Invalid\s+token/i,
      /Token\s+expired/i,
      /Cannot\s+read\s+property\s+['"]?headers['"]?\s+of\s+undefined/i
    ],
    type: 'Authentication Error',
    generateSuggestion: (match, error) => {
      return `Authentication error. Check auth headers and token validity.`;
    }
  },

  // Generic catch-all for unknown errors
  unknown: {
    patterns: [/.*/],
    type: 'Unknown Error',
    generateSuggestion: (match, error) => {
      // Try to extract useful information
      const lines = error.split('\n');
      const firstLine = lines[0] || error;
      return `Error detected: ${firstLine.substring(0, 100)}. Check the stack trace for details.`;
    }
  }
};

/**
 * Parse error message and extract file/line information
 */
function parseErrorLocation(error, stack) {
  const result = {
    file: 'unknown',
    line: 0,
    column: 0
  };

  if (!stack) return result;

  // Try to extract from stack trace
  const stackLines = stack.split('\n');
  for (const line of stackLines) {
    // Match patterns like "at FunctionName (file.js:line:col)" or "at file.js:line:col"
    const match = line.match(/(?:at\s+(?:\w+\s+)?\(?)([^\s:]+\.js):(\d+):(\d+)/);
    if (match) {
      result.file = match[1];
      result.line = parseInt(match[2], 10);
      result.column = parseInt(match[3], 10);
      break;
    }
  }

  return result;
}

/**
 * Classify error type based on error message
 */
function classifyError(errorMessage) {
  if (!errorMessage) return { type: 'Unknown Error', category: 'unknown' };

  for (const [category, pattern] of Object.entries(ERROR_PATTERNS)) {
    for (const regex of pattern.patterns) {
      if (regex.test(errorMessage)) {
        return { type: pattern.type, category };
      }
    }
  }

  return { type: 'Unknown Error', category: 'unknown' };
}

/**
 * Generate fix suggestion based on error type
 */
function generateFixSuggestion(errorMessage, stack, classification) {
  const pattern = ERROR_PATTERNS[classification.category];
  if (!pattern) {
    return 'Unable to generate suggestion. Check error details.';
  }

  for (const regex of pattern.patterns) {
    const match = errorMessage.match(regex);
    if (match) {
      return pattern.generateSuggestion(match, errorMessage);
    }
  }

  return pattern.generateSuggestion([errorMessage], errorMessage);
}

/**
 * Detect and record a bug/error
 */
function detectBug(error, context = {}) {
  const errorMessage = error?.message || String(error);
  const stack = error?.stack || '';
  
  // Classify the error
  const classification = classifyError(errorMessage);
  
  // Parse error location
  const location = parseErrorLocation(errorMessage, stack);
  
  // Generate fix suggestion
  const suggestion = generateFixSuggestion(errorMessage, stack, classification);
  
  // Create bug record
  const bugRecord = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    errorType: classification.type,
    errorCategory: classification.category,
    message: errorMessage.substring(0, 500), // Limit message length
    file: location.file,
    line: location.line,
    column: location.column,
    suggestion,
    context: {
      url: context.url || null,
      method: context.method || null,
      userId: context.userId || null,
      ...context
    },
    stack: stack.substring(0, 1000) // Limit stack trace length
  };

  // Add to cache (keep only last MAX_ERRORS)
  detectedErrors.push(bugRecord);
  if (detectedErrors.length > MAX_ERRORS) {
    detectedErrors.shift();
  }

  // Log the detection
  console.log(`[BugDetection] Detected: ${classification.type} in ${location.file}:${location.line}`);
  console.log(`[BugDetection] Suggestion: ${suggestion}`);

  return bugRecord;
}

/**
 * Get all detected errors
 */
function getDetectedErrors() {
  return detectedErrors;
}

/**
 * Get latest detected error
 */
function getLatestError() {
  if (detectedErrors.length === 0) return null;
  return detectedErrors[detectedErrors.length - 1];
}

/**
 * Get error count
 */
function getErrorCount() {
  return detectedErrors.length;
}

/**
 * Clear all detected errors
 */
function clearErrors() {
  detectedErrors = [];
  console.log('[BugDetection] Error cache cleared');
}

/**
 * Get errors by type
 */
function getErrorsByType(type) {
  return detectedErrors.filter(e => e.errorType === type);
}

/**
 * Get errors by file
 */
function getErrorsByFile(file) {
  return detectedErrors.filter(e => e.file === file);
}

/**
 * Get diagnostic summary for AI chat
 */
function getDiagnosticSummary() {
  const latest = getLatestError();
  if (!latest) {
    return {
      hasErrors: false,
      message: 'No bugs detected. System is running smoothly.'
    };
  }

  return {
    hasErrors: true,
    count: getErrorCount(),
    latest: {
      file: latest.file,
      errorType: latest.errorType,
      suggestion: latest.suggestion,
      timestamp: latest.timestamp
    }
  };
}

module.exports = {
  detectBug,
  getDetectedErrors,
  getLatestError,
  getErrorCount,
  clearErrors,
  getErrorsByType,
  getErrorsByFile,
  getDiagnosticSummary,
  MAX_ERRORS
};

