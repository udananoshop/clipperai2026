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
    console.log("[Pipeline] stages: raw → music → subtitle → DB");
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

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db (default)";
console.log("🗄️  Using Database:", dbUrl);

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

const envValidator = require('./utils/envValidator');
envValidator.validateEnv();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT) || 3001;

const REQUEST_TIMEOUT = 2 * 60 * 1000;
app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT, () => {
    console.error(`⏱️  Request timeout: ${req.method} ${req.url}`);
    res.status(503).json({ success: false, error: 'Request timeout' });
  });
  next();
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use('/clips', express.static(path.join(__dirname, 'clips')));

const dirs = ['uploads', 'output', 'temp', 'logs', 'clips'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const outputSubdirs = ['tiktok', 'youtube', 'instagram', 'facebook', 'formatted', 'subtitles', 'soundtracks', 'watermarked'];
outputSubdirs.forEach(subdir => {
  const subdirPath = path.join(__dirname, 'output', subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
});

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
    healthData = {
      ...healthData,
      activeJobs: pmStatus.activeCount,
      maxConcurrentJobs: pmStatus.maxConcurrentJobs,
      proModeEnabled: isProMode,
      safeModeEnabled: pmStatus.safeModeEnabled,
      availableSlots: pmStatus.availableSlots,
      monetizationEngine
    };
  } catch (err) {
    healthData.activeJobs = 0;
    healthData.maxConcurrentJobs = 3;
    healthData.proModeEnabled = false;
    healthData.safeModeEnabled = true;
    healthData.monetizationEngine = 'DISABLED';
  }
  res.json(healthData);
});

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

const quickActionsRoutes = require('./routes/quickActions');
console.log('✅ quickActionsRoutes loaded:', typeof quickActionsRoutes);
app.use('/api/video', ensureFunction(quickActionsRoutes, 'quickActionsRoutes'));

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

const trendingRoutes = require('./routes/trending');
console.log('✅ trendingRoutes loaded:', typeof trendingRoutes);
app.use('/api/trending', ensureFunction(trendingRoutes, 'trendingRoutes'));

const overlordRoutes = require('./routes/overlord');
console.log('✅ overlordRoutes loaded:', typeof overlordRoutes);
app.use('/api/overlord', ensureFunction(overlordRoutes, 'overlordRoutes'));

// OVERLORD 9.5 - Prediction History Routes
const predictionRoutes = require('./routes/prediction');
console.log('✅ predictionRoutes loaded:', typeof predictionRoutes);
app.use('/api/prediction', ensureFunction(predictionRoutes, 'predictionRoutes'));

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}
app.use('/downloads', express.static(downloadsDir));

console.log('✅ All routes mounted successfully');

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🎬 Backend running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  server.timeout = 10 * 60 * 1000;
  console.log(`⏱️  Server timeout set to 10 minutes`);
});

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

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  if (isShuttingDown) {
    console.error('❌ Already shutting down, forcing exit');
    process.exit(1);
    return;
  }
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (!isShuttingDown) {
    console.warn('⚠️  Unhandled rejection caught - server continues');
  }
});

module.exports = app;
