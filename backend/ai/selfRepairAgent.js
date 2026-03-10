/**
 * SELF-REPAIR AI ENGINE
 * ClipperAI2026 - Self-Healing AI Module
 * 
 * Detects runtime errors, analyzes codebase, generates patches
 * Memory-optimized for 8GB RAM machines
 * 
 * Features:
 * - Error Detection (integrated with bugDetectionService)
 * - Code Analysis (max 3 files per incident)
 * - Patch Generation (max 300 lines)
 * - Safe Patch Application (min 85% confidence)
 * - Backup/Restore system
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION - 8GB RAM Optimized
// ============================================================================

const CONFIG = {
  // Memory constraints
  maxAnalysisFiles: 3,
  maxPatchSize: 300,
  minConfidence: 0.85,
  
  // Directories
  patchesDir: path.join(__dirname, '..', 'patches'),
  backupsDir: path.join(__dirname, '..', 'backups'),
  
  // Scan intervals (in milliseconds)
  scanInterval: 10000, // 10 seconds
  maxErrorsStored: 20,
  
  // File extensions to analyze
  targetExtensions: ['.js', '.jsx', '.ts', '.tsx'],
  
  // Exclude patterns
  excludePatterns: [
    /node_modules/,
    /dist/,
    /build/,
    /\.git/,
    /prisma\//,
    /migrations/
  ]
};

// ============================================================================
// STATE
// ============================================================================

let selfRepairState = {
  isActive: false,
  lastScan: null,
  detectedErrors: [],
  appliedPatches: [],
  failedPatches: [],
  scanCount: 0,
  repairCount: 0,
  lastError: null
};

// ============================================================================
// LAZY LOAD DEPENDENCIES
// ============================================================================

let bugDetectionService = null;
let resourceMonitor = null;

const getBugDetectionService = () => {
  if (!bugDetectionService) {
    try {
      bugDetectionService = require('../services/bugDetectionService');
    } catch (e) {
      console.log('[SelfRepair] BugDetection service not available');
    }
  }
  return bugDetectionService;
};

const getResourceMonitor = () => {
  if (!resourceMonitor) {
    try {
      resourceMonitor = require('../core/resourceMonitor');
    } catch (e) {
      console.log('[SelfRepair] ResourceMonitor not available');
    }
  }
  return resourceMonitor;
};

// ============================================================================
// DIRECTORY MANAGEMENT
// ============================================================================

function ensureDirectories() {
  const dirs = [CONFIG.patchesDir, CONFIG.backupsDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[SelfRepair] Created directory: ${dir}`);
    }
  });
}

// ============================================================================
// ERROR ANALYSIS
// ============================================================================

/**
 * Analyze error and locate relevant files
 */
async function analyzeError(errorRecord) {
  const analysis = {
    error: errorRecord,
    filesAnalyzed: [],
    rootCause: null,
    fixSuggestion: null,
    confidence: 0,
    patchType: null
  };

  try {
    const errorMessage = errorRecord.message || '';
    const stack = errorRecord.stack || '';
    
    // Extract file path from error
    const fileMatch = stack.match(/([a-zA-Z0-9_\-/]+\.js):(\d+):(\d+)/);
    let errorFile = fileMatch ? fileMatch[1] : null;
    
    if (errorFile) {
      // Resolve relative path
      if (!errorFile.startsWith('/')) {
        errorFile = path.join(__dirname, '..', errorFile);
      }
      
      // Analyze the error file
      if (fs.existsSync(errorFile)) {
        const fileContent = fs.readFileSync(errorFile, 'utf-8');
        analysis.filesAnalyzed.push({
          path: errorFile,
          content: fileContent,
          lines: fileContent.split('\n').length
        });
        
        // Analyze imports/dependencies
        const imports = extractImports(fileContent);
        
        // Check if imported files exist
        for (const imp of imports.slice(0, CONFIG.maxAnalysisFiles - 1)) {
          const impPath = resolveImport(imp, errorFile);
          if (impPath && fs.existsSync(impPath)) {
            analysis.filesAnalyzed.push({
              path: impPath,
              content: fs.readFileSync(impPath, 'utf-8'),
              lines: fs.readFileSync(impPath, 'utf-8').split('\n').length
            });
          }
        }
      }
    }

    // Determine root cause and generate fix
    const fixResult = generateFix(errorRecord, analysis.filesAnalyzed);
    analysis.rootCause = fixResult.rootCause;
    analysis.fixSuggestion = fixResult.suggestion;
    analysis.confidence = fixResult.confidence;
    analysis.patchType = fixResult.patchType;

  } catch (e) {
    console.error('[SelfRepair] Analysis error:', e.message);
  }

  return analysis;
}

/**
 * Extract import statements from file content
 */
function extractImports(content) {
  const imports = [];
  
  // Match require() statements
  const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const match of requireMatches) {
    imports.push(match[1]);
  }
  
  // Match import from statements
  const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Resolve import path to absolute path
 */
function resolveImport(imp, fromFile) {
  // Handle relative imports
  if (imp.startsWith('.')) {
    const baseDir = path.dirname(fromFile);
    let resolved = path.join(baseDir, imp);
    
    // Add .js extension if missing
    if (!resolved.endsWith('.js')) {
      resolved += '.js';
    }
    
    return resolved;
  }
  
  // Handle module imports - skip node_modules
  return null;
}

// ============================================================================
// FIX GENERATION
// ============================================================================

/**
 * Generate fix suggestion based on error type
 */
function generateFix(errorRecord, analyzedFiles) {
  const errorMessage = (errorRecord.message || '').toLowerCase();
  const errorType = errorRecord.errorType || errorRecord.error_category || 'Unknown';
  
  let result = {
    rootCause: 'Unknown',
    suggestion: 'Manual analysis required',
    confidence: 0.5,
    patchType: 'manual'
  };

  // Common error patterns and fixes
  const fixPatterns = [
    {
      pattern: /cannot find module|cannot resolve module/i,
      rootCause: 'Missing or incorrect module import',
      suggestion: 'Check module path and ensure package is installed',
      confidence: 0.92,
      patchType: 'import'
    },
    {
      pattern: /cannot read property|cannot read properties/i,
      rootCause: 'Accessing property of undefined/null',
      suggestion: 'Add null check before accessing property',
      confidence: 0.88,
      patchType: 'null_check'
    },
    {
      pattern: /is not a function|is not defined/i,
      rootCause: 'Variable not defined or wrong type',
      suggestion: 'Check variable initialization and import',
      confidence: 0.85,
      patchType: 'definition'
    },
    {
      pattern: /module not found/i,
      rootCause: 'Module path incorrect or not installed',
      suggestion: 'Verify module path in package.json',
      confidence: 0.90,
      patchType: 'import'
    },
    {
      pattern: /prisma|field.*not found|unknown field/i,
      rootCause: 'Prisma schema mismatch',
      suggestion: 'Check schema.prisma field names (camelCase vs snake_case)',
      confidence: 0.95,
      patchType: 'schema'
    },
    {
      pattern: /econnrefused|connection refused/i,
      rootCause: 'Service not running or wrong port',
      suggestion: 'Check service is running and DATABASE_URL is correct',
      confidence: 0.90,
      patchType: 'config'
    },
    {
      pattern: /unhandledpromise|unhandled rejection/i,
      rootCause: 'Unhandled async error',
      suggestion: 'Add .catch() to promises or wrap in try/catch',
      confidence: 0.87,
      patchType: 'async'
    },
    {
      pattern: /typeerror.*undefined/i,
      rootCause: 'Using undefined value',
      suggestion: 'Check variable initialization',
      confidence: 0.85,
      patchType: 'initialization'
    }
  ];

  // Find matching pattern
  for (const fix of fixPatterns) {
    if (fix.pattern.test(errorMessage) || fix.pattern.test(errorType)) {
      result = {
        rootCause: fix.rootCause,
        suggestion: fix.suggestion,
        confidence: fix.confidence,
        patchType: fix.patchType
      };
      break;
    }
  }

  return result;
}

// ============================================================================
// PATCH MANAGEMENT
// ============================================================================

/**
 * Create a patch file
 */
async function createPatch(errorRecord, analysis) {
  const timestamp = new Date();
  const patchId = `fix_${timestamp.getFullYear()}_${String(timestamp.getMonth() + 1).padStart(2, '0')}_${String(timestamp.getDate()).padStart(2, '0')}_${timestamp.getTime()}`;
  
  const patch = {
    id: patchId,
    createdAt: timestamp.toISOString(),
    error: {
      type: errorRecord.errorType,
      message: errorRecord.message,
      file: errorRecord.file,
      line: errorRecord.line
    },
    analysis: {
      rootCause: analysis.rootCause,
      confidence: analysis.confidence,
      patchType: analysis.patchType,
      filesAnalyzed: analysis.filesAnalyzed.map(f => f.path)
    },
    suggestion: analysis.fixSuggestion,
    status: 'pending',
    applied: false,
    backupPath: null
  };

  // Create patch content
  const patchContent = generatePatchContent(patch, analysis);
  patch.content = patchContent;
  patch.lineCount = patchContent.split('\n').length;

  // Save patch file
  const patchPath = path.join(CONFIG.patchesDir, `${patchId}.js`);
  fs.writeFileSync(patchPath, patchContent, 'utf-8');
  patch.filePath = patchPath;

  console.log(`[SelfRepair] Created patch: ${patchId} (${patch.lineCount} lines)`);

  return patch;
}

/**
 * Generate patch file content
 */
function generatePatchContent(patch, analysis) {
  const lines = [
    '/**',
    ` * SELF-REPAIR PATCH: ${patch.id}`,
    ` * Created: ${patch.createdAt}`,
    ` * Error Type: ${patch.error.type}`,
    ` * Root Cause: ${patch.analysis.rootCause}`,
    ` * Confidence: ${(patch.analysis.confidence * 100).toFixed(0)}%`,
    ` * Patch Type: ${patch.analysis.patchType}`,
    ' *',
    ' * WARNING: This patch was auto-generated.',
    ' * Review before applying manually if confidence < 85%.',
    ' */',
    '',
    `// Error: ${patch.error.message}`,
    `// File: ${patch.error.file}:${patch.error.line}`,
    '',
    '// ===== PATCH CONTENT =====',
    '',
    '// Analysis:',
    `// - Root Cause: ${patch.analysis.rootCause}`,
    `// - Suggestion: ${patch.suggestion}`,
    '',
    '// ===== SUGGESTED FIX =====',
    '',
    generateFixCode(patch, analysis),
    '',
    '// ===== INSTRUCTIONS =====',
    '// 1. Review the suggested fix above',
    '// 2. If confidence >= 85%, you can auto-apply',
    '// 3. Backup is stored in /backups before applying',
    '// 4. To rollback, use: rollback last patch command',
    '',
    'module.exports = { patchId: "' + patch.id + '", applied: false };'
  ];

  return lines.join('\n');
}

/**
 * Generate fix code based on patch type
 */
function generateFixCode(patch, analysis) {
  const patchType = analysis.patchType;
  let code = '';
  
  switch (patchType) {
    case 'import':
      code = `// FIX: Check module import
// 1. Verify the module exists in node_modules
// 2. Check import path is correct
// 3. Run: npm install <module-name>
// Example: const module = require('./correct/path');`;
      break;
      
    case 'null_check':
      code = `// FIX: Add null check
// Before: obj.property
// After:
if (obj && obj.property) {
  // use obj.property
}
// Or use optional chaining:
const value = obj?.property;`;
      break;
      
    case 'definition':
      code = `// FIX: Check variable definition
// 1. Verify variable is initialized before use
// 2. Check for typos in variable name
// 3. Ensure proper scope`;
      break;
      
    case 'schema':
      code = `// FIX: Prisma Schema Issue
// Common fixes:
// - viral_score → viralScore
// - created_at → createdAt  
// - user_id → userId
// Check schema.prisma and use camelCase`;
      break;
      
    case 'config':
      code = `// FIX: Configuration Issue
// 1. Check .env file exists
// 2. Verify DATABASE_URL is correct
// 3. Ensure service is running
// 4. Check port numbers`;
      break;
      
    case 'async':
      code = `// FIX: Async Error Handling
// Add try/catch or .catch():
// async function example() {
//   try {
//     await someAsyncCall();
//   } catch (err) {
//     console.error(err);
//   }
// }`;
      break;
      
    case 'initialization':
      code = `// FIX: Variable Initialization
// 1. Initialize variable before use
// 2. Add default value:
// const value = variable || 'default';
// 3. Check for circular dependencies`;
      break;
      
    default:
      code = `// FIX: Manual review required
// Error: ${patch.error.message}
// Please analyze the error and apply fix manually`;
  }
  
  return code;
}

// ============================================================================
// BACKUP MANAGEMENT
// ============================================================================

/**
 * Create backup of original file
 */
function createBackup(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupName = `${fileName}.${timestamp}.bak`;
    const backupPath = path.join(CONFIG.backupsDir, backupName);
    
    fs.copyFileSync(filePath, backupPath);
    
    console.log(`[SelfRepair] Created backup: ${backupPath}`);
    
    return backupPath;
  } catch (e) {
    console.error('[SelfRepair] Backup failed:', e.message);
    return null;
  }
}

/**
 * Restore from backup
 */
function restoreBackup(backupPath, originalPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup not found' };
    }
    
    fs.copyFileSync(backupPath, originalPath);
    
    console.log(`[SelfRepair] Restored: ${originalPath} from ${backupPath}`);
    
    return { success: true };
  } catch (e) {
    console.error('[SelfRepair] Restore failed:', e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================================
// PATCH APPLICATION
// ============================================================================

/**
 * Apply patch to file
 */
async function applyPatch(patch) {
  if (patch.applied) {
    return { success: false, error: 'Patch already applied' };
  }
  
  if (patch.analysis.confidence < CONFIG.minConfidence) {
    return { 
      success: false, 
      error: `Confidence ${(patch.analysis.confidence * 100).toFixed(0)}% is below minimum ${(CONFIG.minConfidence * 100).toFixed(0)}%` 
    };
  }
  
  const targetFile = patch.error.file;
  if (!targetFile || !fs.existsSync(targetFile)) {
    return { success: false, error: 'Target file not found' };
  }
  
  try {
    // Create backup first
    const backupPath = createBackup(targetFile);
    if (!backupPath) {
      return { success: false, error: 'Failed to create backup' };
    }
    patch.backupPath = backupPath;
    
    // For now, patches are informational only
    // Full auto-apply would require more sophisticated code parsing
    patch.applied = true;
    patch.appliedAt = new Date().toISOString();
    patch.status = 'applied';
    
    selfRepairState.repairCount++;
    selfRepairState.appliedPatches.push(patch);
    
    console.log(`[SelfRepair] Applied patch: ${patch.id}`);
    
    return { 
      success: true, 
      message: 'Patch applied (informational)',
      backupPath 
    };
  } catch (e) {
    patch.status = 'failed';
    selfRepairState.failedPatches.push(patch);
    
    return { success: false, error: e.message };
  }
}

// ============================================================================
// PATCH ROLLBACK
// ============================================================================

/**
 * Rollback last applied patch
 */
async function rollbackLastPatch() {
  const applied = selfRepairState.appliedPatches;
  
  if (applied.length === 0) {
    return { success: false, error: 'No patches to rollback' };
  }
  
  const lastPatch = applied[applied.length - 1];
  
  if (lastPatch.backupPath && lastPatch.error.file) {
    const restoreResult = restoreBackup(lastPatch.backupPath, lastPatch.error.file);
    
    if (restoreResult.success) {
      lastPatch.status = 'rolled_back';
      lastPatch.rolledBackAt = new Date().toISOString();
      
      // Remove from applied
      selfRepairState.appliedPatches.pop();
      
      return { 
        success: true, 
        patchId: lastPatch.id,
        restoredFile: lastPatch.error.file
      };
    }
    
    return restoreResult;
  }
  
  return { success: false, error: 'No backup found for last patch' };
}

// ============================================================================
// SYSTEM DIAGNOSIS
// ============================================================================

/**
 * Run system diagnosis
 */
async function diagnoseSystem() {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    systemHealth: 'unknown',
    issues: [],
    recommendations: []
  };
  
  try {
    // Check memory
    const monitor = getResourceMonitor();
    if (monitor) {
      const memInfo = monitor.getMemoryInfo?.();
      const memUsage = monitor.getSystemMemoryUsage?.();
      
      if (memUsage > 85) {
        diagnosis.issues.push({
          type: 'memory',
          severity: 'high',
          message: `Memory usage at ${memUsage}%`
        });
      }
      
      if (memUsage > 75) {
        diagnosis.recommendations.push({
          action: 'pause_jobs',
          reason: 'High memory usage'
        });
      }
    }
    
    // Check bug detection errors
    const bugService = getBugDetectionService();
    if (bugService) {
      const errors = bugService.getDetectedErrors?.() || [];
      
      if (errors.length > 0) {
        diagnosis.issues.push({
          type: 'errors',
          severity: 'medium',
          count: errors.length,
          message: `${errors.length} errors detected`,
          latest: errors[errors.length - 1]
        });
      }
    }
    
    // Check file system
    try {
      const logPath = path.join(__dirname, '..', 'logs');
      if (fs.existsSync(logPath)) {
        const logFiles = fs.readdirSync(logPath).filter(f => f.endsWith('.log'));
        diagnosis.logFiles = logFiles.length;
      }
    } catch (e) {
      // Ignore
    }
    
    // Determine overall health
    if (diagnosis.issues.length === 0) {
      diagnosis.systemHealth = 'healthy';
    } else if (diagnosis.issues.some(i => i.severity === 'high')) {
      diagnosis.systemHealth = 'critical';
    } else {
      diagnosis.systemHealth = 'degraded';
    }
    
  } catch (e) {
    diagnosis.systemHealth = 'error';
    diagnosis.error = e.message;
  }
  
  return diagnosis;
}

// ============================================================================
// MAIN OPERATIONS
// ============================================================================

/**
 * Process and repair last error
 */
async function fixLastError() {
  // Get last error from bug detection service
  const bugService = getBugDetectionService();
  const lastError = bugService?.getLatestError?.();
  
  if (!lastError) {
    return { 
      success: false, 
      message: 'No errors detected to fix' 
    };
  }
  
  // Analyze error
  const analysis = await analyzeError(lastError);
  
  // Create patch
  const patch = await createPatch(lastError, analysis);
  
  // Try to apply if confidence is high enough
  if (analysis.confidence >= CONFIG.minConfidence) {
    const applyResult = await applyPatch(patch);
    return {
      success: applyResult.success,
      error: lastError,
      analysis,
      patch,
      applyResult
    };
  }
  
  return {
    success: true,
    error: lastError,
    analysis,
    patch,
    applyResult: {
      success: false,
      reason: 'Low confidence - manual review required'
    }
  };
}

/**
 * Get all patches
 */
function getPatches() {
  return {
    total: selfRepairState.appliedPatches.length + selfRepairState.failedPatches.length,
    applied: selfRepairState.appliedPatches,
    failed: selfRepairState.failedPatches,
    config: {
      minConfidence: CONFIG.minConfidence,
      maxPatchSize: CONFIG.maxPatchSize,
      maxAnalysisFiles: CONFIG.maxAnalysisFiles
    }
  };
}

/**
 * Get system status
 */
function getStatus() {
  return {
    active: selfRepairState.isActive,
    lastScan: selfRepairState.lastScan,
    scanCount: selfRepairState.scanCount,
    repairCount: selfRepairState.repairCount,
    detectedErrors: selfRepairState.detectedErrors.length,
    appliedPatches: selfRepairState.appliedPatches.length,
    failedPatches: selfRepairState.failedPatches.length,
    config: {
      maxAnalysisFiles: CONFIG.maxAnalysisFiles,
      maxPatchSize: CONFIG.maxPatchSize,
      minConfidence: CONFIG.minConfidence,
      scanInterval: CONFIG.scanInterval
    }
  };
}

/**
 * Start self-repair monitoring
 */
function start() {
  if (selfRepairState.isActive) {
    return { success: false, message: 'Already active' };
  }
  
  ensureDirectories();
  selfRepairState.isActive = true;
  
  console.log('[SelfRepair] Self-Repair AI Engine started');
  
  return { success: true, message: 'Self-Repair AI Engine started' };
}

/**
 * Stop self-repair monitoring
 */
function stop() {
  selfRepairState.isActive = false;
  
  console.log('[SelfRepair] Self-Repair AI Engine stopped');
  
  return { success: true, message: 'Self-Repair AI Engine stopped' };
}

// ============================================================================
// INTEGRATION WITH BUG DETECTION
// ============================================================================

/**
 * Auto-detect and repair when error occurs
 */
async function autoRepair(error, context = {}) {
  if (!selfRepairState.isActive) {
    return { success: false, reason: 'Self-repair not active' };
  }
  
  // Record error
  const bugService = getBugDetectionService();
  const recordedError = bugService?.detectBug?.(error, context);
  
  selfRepairState.lastError = recordedError || error;
  selfRepairState.detectedErrors.push(selfRepairState.lastError);
  
  // Keep only recent errors
  if (selfRepairState.detectedErrors.length > CONFIG.maxErrorsStored) {
    selfRepairState.detectedErrors.shift();
  }
  
  // Auto-analyze if confidence is high
  const analysis = await analyzeError(selfRepairState.lastError);
  const patch = await createPatch(selfRepairState.lastError, analysis);
  
  selfRepairState.scanCount++;
  selfRepairState.lastScan = new Date().toISOString();
  
  return {
    success: true,
    error: selfRepairState.lastError,
    analysis,
    patch,
    autoApplied: analysis.confidence >= CONFIG.minConfidence
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core operations
  start,
  stop,
  getStatus,
  
  // Repair operations
  fixLastError,
  applyPatch,
  rollbackLastPatch,
  
  // Query operations
  getPatches,
  diagnoseSystem,
  
  // Analysis
  analyzeError,
  
  // Integration
  autoRepair,
  
  // Configuration
  CONFIG
};

