/**
 * Device Adaptive Service
 * ClipperAI2026 - Adaptive Device Engine
 * 
 * Detects device capabilities and automatically adjusts:
 * - Polling interval
 * - Dashboard refresh rate
 * - AI analysis frequency
 * 
 * Modes:
 * - high-performance: Full capabilities
 * - balanced: Balanced performance
 * - low-resource: Optimized for 8GB RAM
 * - mobile-lite: Mobile devices
 */

// Device mode configurations
const MODE_CONFIG = {
  'high-performance': {
    pollingInterval: 15000,      // 15 seconds
    dashboardRefreshRate: 30000, // 30 seconds
    aiAnalysisFrequency: 10000,  // 10 seconds
    maxConcurrentJobs: 5,
    enableAnimations: true,
    cacheSize: 100,
    enableRealtimeUpdates: true
  },
  'balanced': {
    pollingInterval: 30000,      // 30 seconds
    dashboardRefreshRate: 60000, // 60 seconds
    aiAnalysisFrequency: 20000, // 20 seconds
    maxConcurrentJobs: 3,
    enableAnimations: true,
    cacheSize: 50,
    enableRealtimeUpdates: true
  },
  'low-resource': {
    pollingInterval: 45000,      // 45 seconds
    dashboardRefreshRate: 90000, // 90 seconds
    aiAnalysisFrequency: 30000, // 30 seconds
    maxConcurrentJobs: 2,
    enableAnimations: false,
    cacheSize: 20,
    enableRealtimeUpdates: false
  },
  'mobile-lite': {
    pollingInterval: 60000,      // 60 seconds
    dashboardRefreshRate: 120000, // 2 minutes
    aiAnalysisFrequency: 45000, // 45 seconds
    maxConcurrentJobs: 1,
    enableAnimations: false,
    cacheSize: 10,
    enableRealtimeUpdates: false
  }
};

// Current device info
let deviceInfo = {
  type: 'unknown',
  screenSize: { width: 0, height: 0 },
  cpuCores: 0,
  memoryUsage: 0,
  isMobile: false,
  isLowPower: false,
  mode: 'balanced'
};

// Memory thresholds (percentage)
const MEMORY_THRESHOLDS = {
  LOW: 60,
  MEDIUM: 75,
  HIGH: 85,
  CRITICAL: 90
};

/**
 * Detect device type
 */
const detectDeviceType = () => {
  const userAgent = navigator.userAgent || '';
  const screenWidth = window.screen.width || window.innerWidth;
  
  let type = 'desktop';
  let isMobile = false;
  
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    type = 'mobile';
    isMobile = true;
  } else if (/iPad/i.test(userAgent)) {
    type = 'tablet';
    isMobile = true;
  } else if (screenWidth < 768) {
    type = 'mobile';
    isMobile = true;
  } else if (screenWidth < 1024) {
    type = 'tablet';
  }
  
  return { type, isMobile };
};

/**
 * Detect CPU cores (hardware concurrency)
 */
const detectCPUCores = () => {
  return navigator.hardwareConcurrency || 4; // Default to 4 if unavailable
};

/**
 * Get memory usage (if available)
 */
const getMemoryUsage = async () => {
  try {
    if (navigator.deviceMemory) {
      return navigator.deviceMemory;
    }
    // Estimate based on available APIs
    return 8; // Default assumption for 8GB RAM devices
  } catch (e) {
    return 8;
  }
};

/**
 * Check if device is in low power mode
 */
const isLowPowerMode = () => {
  // Check for battery API
  if (navigator.getBattery) {
    return false; // Will be updated async
  }
  // Check for reduced motion preference
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get screen size
 */
const getScreenSize = () => {
  return {
    width: window.screen.width || window.innerWidth,
    height: window.screen.height || window.innerHeight
  };
};

/**
 * Determine device mode based on capabilities
 */
const determineDeviceMode = async () => {
  const { type, isMobile } = detectDeviceType();
  const cpuCores = detectCPUCores();
  const screenSize = getScreenSize();
  const memoryUsage = await getMemoryUsage();
  const isLowPower = isLowPowerMode();
  
  // Store device info
  deviceInfo = {
    type,
    screenSize,
    cpuCores,
    memoryUsage,
    isMobile,
    isLowPower,
    mode: 'balanced' // Will be determined below
  };
  
  // Determine mode based on device capabilities
  let mode = 'balanced';
  
  // Mobile devices get mobile-lite
  if (isMobile || type === 'mobile') {
    mode = 'mobile-lite';
  }
  // Low power mode
  else if (isLowPower) {
    mode = 'low-resource';
  }
  // High performance devices
  else if (cpuCores >= 8 && memoryUsage >= 16 && !isLowPower) {
    mode = 'high-performance';
  }
  // 8GB RAM optimized
  else if (memoryUsage <= 8 && cpuCores <= 4) {
    mode = 'low-resource';
  }
  // Medium devices
  else if (cpuCores >= 4 && memoryUsage >= 8) {
    mode = 'balanced';
  }
  
  deviceInfo.mode = mode;
  return mode;
};

/**
 * Get current mode configuration
 */
const getModeConfig = () => {
  const mode = deviceInfo.mode || 'balanced';
  return MODE_CONFIG[mode] || MODE_CONFIG['balanced'];
};

/**
 * Get device info
 */
const getDeviceInfo = () => {
  return { ...deviceInfo };
};

/**
 * Get polling interval based on current mode
 */
const getPollingInterval = () => {
  return getModeConfig().pollingInterval;
};

/**
 * Get dashboard refresh rate based on current mode
 */
const getDashboardRefreshRate = () => {
  return getModeConfig().dashboardRefreshRate;
};

/**
 * Get AI analysis frequency based on current mode
 */
const getAIAnalysisFrequency = () => {
  return getModeConfig().aiAnalysisFrequency;
};

/**
 * Check if animations should be enabled
 */
const shouldEnableAnimations = () => {
  return getModeConfig().enableAnimations;
};

/**
 * Check if realtime updates should be enabled
 */
const shouldEnableRealtimeUpdates = () => {
  return getModeConfig().enableRealtimeUpdates;
};

/**
 * Get max concurrent jobs
 */
const getMaxConcurrentJobs = () => {
  return getModeConfig().maxConcurrentJobs;
};

/**
 * Initialize device detection and return configuration
 */
const initialize = async () => {
  const mode = await determineDeviceMode();
  console.log(`[DeviceAdaptive] Initialized in ${mode} mode`);
  console.log(`[DeviceAdaptive] Device info:`, deviceInfo);
  
  return {
    mode,
    config: getModeConfig(),
    deviceInfo
  };
};

/**
 * Update device mode manually
 */
const setMode = (mode) => {
  if (MODE_CONFIG[mode]) {
    deviceInfo.mode = mode;
    console.log(`[DeviceAdaptive] Mode changed to ${mode}`);
    return true;
  }
  return false;
};

/**
 * Re-evaluate device mode
 */
const reevaluate = async () => {
  return await determineDeviceMode();
};

// Auto-initialize on load
let initialized = false;

const initIfNeeded = async () => {
  if (!initialized) {
    await initialize();
    initialized = true;
  }
};

// Start initialization
if (typeof window !== 'undefined') {
  // Initialize on first access
  setTimeout(() => initIfNeeded(), 100);
}

export default {
  // Core functions
  initialize,
  reevaluate,
  setMode,
  getDeviceInfo,
  getModeConfig,
  
  // Convenience functions
  getPollingInterval,
  getDashboardRefreshRate,
  getAIAnalysisFrequency,
  shouldEnableAnimations,
  shouldEnableRealtimeUpdates,
  getMaxConcurrentJobs,
  
  // Constants
  MODE_CONFIG,
  MEMORY_THRESHOLDS,
  
  // Device detection
  detectDeviceType,
  detectCPUCores,
  getMemoryUsage,
  isLowPowerMode,
  getScreenSize
};

