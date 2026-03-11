require('dotenv').config();

console.log("===========================================");
console.log("🔧 CLIPPER AI 2026 - STARTING SERVER");
console.log("===========================================");

// ============================================================================
// OVERLORD 8GB PRO FINAL - Startup Confirmation
// ============================================================================
console.log("===========================================");
console.log("[OVERLORD 8GB PRO FINAL ACTIVE]");
console.log("===========================================");
console.log("OVERLORD OPTIMIZATION MODE");
console.log("8GB PRO STABLE PROFILE ACTIVE");
console.log("Memory Adaptive Guard: ON");
console.log("Sequential Render: ON");
console.log("Adaptive Cooldown: ON");
console.log("Long Render Protection: ON");
console.log("GPU Fallback: ON");
console.log("Hard Crash Guard: ON");
console.log("===========================================");
// ============================================================================

// ============================================================================
// OVERLORD GPU AMD SAFE MODE - GPU Detection
// ============================================================================
(async () => {
  try {
    const gpuDetector = require('./utils/gpuDetector');
    const gpu = await gpuDetector.detectGPU();
    console.log("==============================");
    console.log("[GPU] OVERLORD GPU SAFE MODE");
    console.log("==============================");
    console.log(`[GPU] AMF encoder available: ${gpu.hasAMF}`);
    console.log(`[GPU] Selected encoder: ${gpu.encoder}`);
    console.log("[GPU] 8GB SAFE MODE ACTIVE");
    console.log("==============================");
  } catch (error) {
    console.warn("[GPU] Detection failed, using CPU fallback:", error.message);
    console.log("==============================");
    console.log("[GPU] Selected encoder: libx264 (CPU)");
    console.log("[GPU] 8GB SAFE MODE ACTIVE");
    console.log("==============================");
  }
})();

// ============================================================================
// PRODUCTION HARDENING - STABILITY GUARD
// ============================================================================
(async () => {
  try {
    const stabilityGuard = require('./services/stabilityGuard');
    
    // Check encoder health at startup
    const encoderHealth = await stabilityGuard.checkEncoderHealth();
    
    console.log("==============================");
    console.log("[Stability] PRODUCTION HARDENING");
    console.log("==============================");
    console.log(`[Stability] Encoder health: ${encoderHealth.hasAMF ? 'AMF OK' : 'CPU Fallback'}`);
    console.log(`[Stability] Memory pause threshold: ${stabilityGuard.config.MEMORY_PAUSE_THRESHOLD}%`);
    console.log(`[Stability] Memory cooldown threshold: ${stabilityGuard.config.MEMORY_COOLDOWN_THRESHOLD}%`);
    console.log(`[Stability] Job timeout: ${stabilityGuard.config.JOB_TIMEOUT_MS / 1000}s`);
    console.log(`[Stability] Render cooldown: ${stabilityGuard.config.RENDER_COOLDOWN_MIN}-${stabilityGuard.config.RENDER_COOLDOWN_MAX}ms`);
    console.log("[Stability] STABILITY GUARD ACTIVE");
    console.log("==============================");
  } catch (error) {
    console.warn("[Stability] Initialization failed:", error.message);
  }
})();

// ============================================================================
// SMART MEMORY LIMITER - 8GB SAFE
// ============================================================================
(async () => {
  try {
    const smartLimiter = require('./core/smartLimiter');
    
    // Start memory monitoring
    smartLimiter.start();
    
    console.log("==============================");
    console.log("[Limiter] SMART MEMORY LIMITER");
    console.log("==============================");
    console.log(`[Limiter] High threshold: ${smartLimiter.config.MEMORY_HIGH_THRESHOLD}%`);
    console.log(`[Limiter] Critical threshold: ${smartLimiter.config.MEMORY_CRITICAL_THRESHOLD}%`);
    console.log(`[Limiter] Safe threshold: ${smartLimiter.config.MEMORY_SAFE_THRESHOLD}%`);
    console.log("[Limiter] SINGLE QUEUE MODE ACTIVE");
    console.log("==============================");
  } catch (error) {
    console.warn("[Limiter] Initialization failed:", error.message);
  }
})();

// ============================================================================
// DATABASE SAFE LAYER
// ============================================================================
(async () => {
  try {
    const dbSafeLayer = require('./core/dbSafeLayer');
    console.log("[DB] Safe Write Layer ACTIVE");
  } catch (error) {
    console.warn("[DB] Safe layer init failed:", error.message);
  }
})();

// ============================================================================
// UNIFIED PIPELINE ENGINE
// ============================================================================
(async () => {
  try {
    const unifiedPipeline = require('./engine/unifiedPipeline');
    console.log("==============================");
    console.log("[Pipeline] UNIFIED PIPELINE ENGINE");
    console.log("==============================");
    console.log("[Pipeline] Stages: raw → music → subtitle → DB");
    console.log("[Pipeline] Stage delay: 1500ms");
    console.log("[Pipeline] Memory hard limit: 90%");
    console.log("[Pipeline] SEQUENTIAL MODE ACTIVE");
    console.log("==============================");
  } catch (error) {
    console.warn("[Pipeline] Init failed:", error.message);
  }
})();

// ============================================================================
// SMART CACHE CLEANER
// ============================================================================
(async () => {
  try {
    const smartCacheCleaner = require('./core/smartCacheCleaner');
    smartCacheCleaner.start();
    console.log("==============================");
    console.log("[Cleaner] SMART CACHE CLEANER");
    console.log("==============================");
    console.log("[Cleaner] SAFE MODE ACTIVE");
    console.log("[Cleaner] Final files protected");
    console.log("[Cleaner] Max cache 2GB enforced");
    console.log("==============================");
  } catch (error) {
    console.warn("[Cleaner] Init failed:", error.message);
  }
})();

// ============================================================================
// SMART QUEUE LIMITER
// ============================================================================
(async () => {
  try {
    const smartQueueLimiter = require('./services/smartQueueLimiter');
    smartQueueLimiter.start();
    console.log("==============================");
    console.log("[QueueLimiter] SMART QUEUE LIMITER");
    console.log("==============================");
    console.log("[QueueLimiter] ACTIVE - 8GB SAFE PROFILE");
    console.log("==============================");
  } catch (error) {
    console.warn("[QueueLimiter] Init failed:", error.message);
  }
})();
// ============================================================================

// 🗄️  DATABASE PERSISTENCE CHECK
const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db (default)";
console.log("🗄️  Using Database:", dbUrl);

// Check database file exists
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log("🗄️  DB File Path:", dbPath);
console.log("🗄️  DB File Exists:", fs.existsSync(dbPath));
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log("🗄️  DB File Size:", stats.size, "bytes");
}
console.log("===========================================");

// PATCH: Validate environment variables before server starts
const envValidator = require('./utils/envValidator');
envValidator.validateEnv();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// Request timeout middleware (2 minutes)
const REQUEST_TIMEOUT = 2 * 60 * 1000;
app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT, () => {
    console.error(`⏱️  Request timeout: ${req.method} ${req.url}`);
    res.status(503).json({ success: false, error: 'Request timeout' });
  });
  next();
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use('/clips', express.static(path.join(__dirname, 'clips')));

// Ensure directories exist
const dirs = ['uploads', 'output', 'temp', 'logs', 'clips'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Ensure output subdirectories exist
const outputSubdirs = ['tiktok', 'youtube', 'instagram', 'facebook', 'formatted', 'subtitles', 'soundtracks', 'watermarked'];
outputSubdirs.forEach(subdir => {
  const subdirPath = path.join(__dirname, 'output', subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
});

// ============================================================================
// VIDEO LIBRARY - NEW STORAGE STRUCTURE (EXTENSION)
// Creates organized storage for future clips without breaking existing paths
// ============================================================================
const storageBase = path.join(__dirname, 'storage');
const libraryDirs = [
  'uploads',
  'downloads',
  'clips/tiktok',
  'clips/youtube',
  'clips/instagram',
  'clips/facebook',
  'processed/subtitles',
  'processed/watermark',
  'processed/music',
  'exports/ready'
];

console.log('[Library] Creating storage directories...');
libraryDirs.forEach(dir => {
  const dirPath = path.join(storageBase, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[Library] Created: storage/${dir}`);
  }
});

// Static files for NEW storage structure (for future clips)
app.use('/storage', express.static(path.join(__dirname, 'storage')));
console.log('[Library] Static /storage mounted');

// Health check
app.get('/api/health', (req, res) => {
  let healthData = {
    status: 'OK',
    timestamp: new Date().toISOString()
  };
  
  try {
    const systemConfig = require('./core/systemConfig');
    const processManager = require('./core/processManager');
    
    const isProMode = systemConfig.isProModeEnabled();
    const pmStatus = processManager.getStatus();
    
    let monetizationEngine = 'DISABLED';
    try {
      const contentIntelligence = require('./services/contentIntelligenceService');
      if (contentIntelligence.isMonetizationEnabled && contentIntelligence.isMonetizationEnabled()) {
        monetizationEngine = 'ENABLED';
      }
    } catch (e) {}
    
    // Get self-healing status
    let selfHealingStatus = 'unavailable';
    try {
      const selfHealingMonitor = require('./services/selfHealingMonitor');
      if (selfHealingMonitor && typeof selfHealingMonitor.getHealthStatus === 'function') {
        const healStatus = selfHealingMonitor.getHealthStatus();
        selfHealingStatus = healStatus.status;
      }
    } catch (e) {}
    
    healthData = {
      ...healthData,
      activeJobs: pmStatus.activeCount,
      maxConcurrentJobs: pmStatus.maxConcurrentJobs,
      proModeEnabled: isProMode,
      safeModeEnabled: pmStatus.safeModeEnabled,
      availableSlots: pmStatus.availableSlots,
      monetizationEngine,
      selfHealing: selfHealingStatus
    };
  } catch (err) {
    healthData.activeJobs = 0;
    healthData.maxConcurrentJobs = 3;
    healthData.proModeEnabled = false;
    healthData.safeModeEnabled = true;
    healthData.monetizationEngine = 'DISABLED';
    healthData.selfHealing = 'error';
  }
  
  res.json(healthData);
});

// Mount routes
console.log('🔄 Mounting routes...');

const ensureFunction = (middleware, name) => {
  if (typeof middleware === 'function') {
    return middleware;
  }
  console.error(`❌ ${name} is not a function, got:`, typeof middleware);
  return (req, res, next) => next();
};

const authRoutes = require('./routes/auth');
console.log('✅ authRoutes loaded:', typeof authRoutes);
app.use('/api/auth', ensureFunction(authRoutes, 'authRoutes'));

const videoRoutes = require('./routes/video');
console.log('✅ videoRoutes loaded:', typeof videoRoutes);

// Quick Actions routes - MUST be before videoRoutes
const quickActionsRoutes = require('./routes/quickActions');
console.log('✅ quickActionsRoutes loaded:', typeof quickActionsRoutes);
app.use('/api/video', ensureFunction(quickActionsRoutes, 'quickActionsRoutes'));

// Video routes after quickActions
app.use('/api/video', ensureFunction(videoRoutes, 'videoRoutes'));

const aiRoutes = require('./routes/ai');
console.log('✅ aiRoutes loaded:', typeof aiRoutes);
app.use('/api/ai', ensureFunction(aiRoutes, 'aiRoutes'));

const uploadRoutes = require('./routes/upload');
console.log('✅ uploadRoutes loaded:', typeof uploadRoutes);
app.use('/api/upload', ensureFunction(uploadRoutes, 'uploadRoutes'));

const autoClipRoutes = require('./routes/autoClip');
console.log('✅ autoClipRoutes loaded:', typeof autoClipRoutes);
app.use('/api/auto-clip', ensureFunction(autoClipRoutes, 'autoClipRoutes'));

const downloadRoutes = require('./routes/download');
console.log('✅ downloadRoutes loaded:', typeof downloadRoutes);
app.use('/api/download', downloadRoutes);

const renderRoutes = require('./routes/render');
console.log('✅ renderRoutes loaded:', typeof renderRoutes);
app.use('/api/render', ensureFunction(renderRoutes, 'renderRoutes'));

const dashboardRoutes = require('./routes/dashboard');
console.log('✅ dashboardRoutes loaded:', typeof dashboardRoutes);
app.use('/api/dashboard', ensureFunction(dashboardRoutes, 'dashboardRoutes'));

// Analytics Routes - Overlord-Level Analytics
const analyticsRoutes = require('./routes/analytics');
console.log('✅ analyticsRoutes loaded:', typeof analyticsRoutes);
app.use('/api/analytics', ensureFunction(analyticsRoutes, 'analyticsRoutes'));

// Team Routes - Member Management
const teamRoutes = require('./routes/team');
console.log('✅ teamRoutes loaded:', typeof teamRoutes);
app.use('/api/team', ensureFunction(teamRoutes, 'teamRoutes'));

const trendingRoutes = require('./routes/trending');
console.log('✅ trendingRoutes loaded:', typeof trendingRoutes);
app.use('/api/trending', ensureFunction(trendingRoutes, 'trendingRoutes'));

// Overlord Hybrid Routes
const overlordRoutes = require('./routes/overlord');
console.log('✅ overlordRoutes loaded:', typeof overlordRoutes);
app.use('/api/overlord', ensureFunction(overlordRoutes, 'overlordRoutes'));

// System Routes - Health, Path Detection, API Testing
const systemRoutes = require('./routes/system');
console.log('✅ systemRoutes loaded:', typeof systemRoutes);
app.use('/api/system', ensureFunction(systemRoutes, 'systemRoutes'));

// Chat Routes - Team Chat + AI Assistant
const chatRoutes = require('./routes/chat');
console.log('✅ chatRoutes loaded:', typeof chatRoutes);
app.use('/api/chat', ensureFunction(chatRoutes, 'chatRoutes'));

// Bug Detection Routes - Auto Self-Repair Bug System
const bugDetectionRoutes = require('./routes/bugDetection');
console.log('✅ bugDetectionRoutes loaded:', typeof bugDetectionRoutes);
app.use('/api/bugs', ensureFunction(bugDetectionRoutes, 'bugDetectionRoutes'));

// Self-Healing Monitor - Lightweight Runtime Error Recovery
let selfHealingMonitor;
try {
  selfHealingMonitor = require('./services/selfHealingMonitor');
  selfHealingMonitor.start();
  
  // Start the Service Watchdog (monitors API availability)
  if (selfHealingMonitor.startWatchdog) {
    selfHealingMonitor.startWatchdog();
    console.log('✅ Service Watchdog started');
  }
  
  console.log('✅ SelfHealingMonitor loaded and started');
} catch (e) {
  console.warn('⚠️  SelfHealingMonitor not available:', e.message);
}

// Video Library Routes - Organized Video Storage (EXTENSION)
const libraryRoutes = require('./routes/library');
console.log('✅ libraryRoutes loaded:', typeof libraryRoutes);
app.use('/api/library', ensureFunction(libraryRoutes, 'libraryRoutes'));

// Viral Hunter Routes - Autonomous Viral Content Discovery
const viralHunterRoutes = require('./routes/viralHunter');
console.log('✅ viralHunterRoutes loaded:', typeof viralHunterRoutes);
app.use('/api/viral-hunter', ensureFunction(viralHunterRoutes, 'viralHunterRoutes'));

// AI Assistant Routes - Auto Content Factory Command System
const assistantRoutes = require('./routes/assistant');
console.log('✅ assistantRoutes loaded:', typeof assistantRoutes);
app.use('/api/assistant', ensureFunction(assistantRoutes, 'assistantRoutes'));

// Self-Repair AI Engine Routes - Lightweight self-repair capability
const selfRepairRoutes = require('./routes/selfRepair');
console.log('✅ selfRepairRoutes loaded:', typeof selfRepairRoutes);
app.use('/api/self-repair', ensureFunction(selfRepairRoutes, 'selfRepairRoutes'));

// Content Factory Routes - Auto Content Monetization Engine
const contentFactoryRoutes = require('./routes/contentFactory');
console.log('✅ contentFactoryRoutes loaded:', typeof contentFactoryRoutes);
app.use('/api/content-factory', ensureFunction(contentFactoryRoutes, 'contentFactoryRoutes'));

// Viral Auto Factory Routes - Fully Automated Content Pipeline
const viralAutoFactoryRoutes = require('./routes/viralAutoFactory');
console.log('✅ viralAutoFactoryRoutes loaded:', typeof viralAutoFactoryRoutes);
app.use('/api/viral-auto-factory', ensureFunction(viralAutoFactoryRoutes, 'viralAutoFactoryRoutes'));

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}
app.use('/downloads', express.static(downloadsDir));

console.log('✅ All routes mounted successfully');

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// ============================================================================
// HTTP SERVER CREATION - Must be BEFORE Socket.IO
// ============================================================================
const http = require('http');
const server = http.createServer(app);

// ============================================================================
// SOCKET.IO SETUP - AFTER HTTP server (8GB Optimized)
// ============================================================================
// Using websocket-only transport for 8GB RAM optimization (no polling)
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  },
  path: '/socket.io',
  transports: ['websocket'],  // Websocket only - removes polling overhead
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize chat socket handlers
const { setupChatSocket } = require('./routes/chat');
setupChatSocket(io);
console.log('✅ Chat Socket.IO initialized (Websocket only - 8GB Optimized)');

// Start server - AFTER Socket.IO is attached
server.listen(PORT, () => {
  console.log(`🎬 Backend running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  
  // ============================================================================
  // OVERLORD AI CORE - CENTRAL INTELLIGENCE SYSTEM
  // Initialize the central brain for autonomous platform automation
  // ============================================================================
  try {
    const overlordCore = require('./core/overlordCore');
    const initResult = overlordCore.initialize();
    console.log('🧠 OVERLORD AI CORE:', initResult.status);
    console.log('   - System Monitoring: Active');
    console.log('   - Job Orchestration: Active');
    console.log('   - Viral Hunter: Active (30min interval)');
    console.log('   - Auto Clip Engine: Active');
    console.log('   - AI Decision Engine: Active');
    console.log('   - Safety Guard: Active');
    console.log('   - Logging: Active');
  } catch (error) {
    console.warn('⚠️  OVERLORD AI CORE init failed:', error.message);
  }
  // ============================================================================
  
  // Set timeout to 10 minutes for large uploads
  server.timeout = 10 * 60 * 1000;
  console.log(`⏱️  Server timeout set to 10 minutes`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
});

let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  try {
    const jobQueue = require('./services/aiJobQueueManager');
    if (jobQueue && typeof jobQueue.shutdown === 'function') {
      jobQueue.shutdown();
      console.log('✅ Queue worker stopped');
    }
  } catch (e) {
    console.warn('⚠️  Queue shutdown error:', e.message);
  }
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  }
  
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// ============================================================================
// BUG DETECTION SERVICE - Global Error Hooks
// ============================================================================
let bugDetectionService;
try {
  bugDetectionService = require('./services/bugDetectionService');
  console.log('✅ BugDetection Service loaded');
} catch (e) {
  console.warn('⚠️  BugDetection Service not available:', e.message);
}

// Uncaught Exception Handler with Bug Detection
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  
  // Detect and record the bug
  if (bugDetectionService) {
    try {
      bugDetectionService.detectBug(err, {
        type: 'uncaughtException',
        timestamp: new Date().toISOString()
      });
    } catch (bdError) {
      console.warn('⚠️  Bug detection error:', bdError.message);
    }
  }
  
  if (isShuttingDown) {
    console.error('❌ Already shutting down, forcing exit');
    process.exit(1);
    return;
  }
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Unhandled Rejection Handler with Bug Detection
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  
  // Detect and record the bug
  if (bugDetectionService) {
    try {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      bugDetectionService.detectBug(error, {
        type: 'unhandledRejection',
        promise: String(promise),
        timestamp: new Date().toISOString()
      });
    } catch (bdError) {
      console.warn('⚠️  Bug detection error:', bdError.message);
    }
  }
  
  if (!isShuttingDown) {
    console.warn('⚠️  Unhandled rejection caught - server continues');
  }
});

module.exports = app;
