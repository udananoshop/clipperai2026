/**
 * AI Safe Mode Service
 * ClipperAI2026 - Crash Protection & Service Resilience
 * 
 * Features:
 * - Detect service failures
 * - Prevent application crashes
 * - Provide safe fallback responses
 * - Optimized for 8GB RAM environments
 * 
 * Example fallback:
 * {
 *   status: "safe-mode",
 *   message: "Service temporarily unavailable",
 *   retry: "60 seconds"
 * }
 */

// Service status tracking
const serviceStatus = {
  analyticsService: { healthy: true, lastError: null, failureCount: 0, lastCheck: null },
  viralPredictionService: { healthy: true, lastError: null, failureCount: 0, lastCheck: null },
  growthStrategyService: { healthy: true, lastError: null, failureCount: 0, lastCheck: null },
  uploadService: { healthy: true, lastError: null, failureCount: 0, lastCheck: null }
};

// Safe mode configuration
const SAFE_MODE_CONFIG = {
  maxFailuresBeforeDeactivate: 3,
  retryInterval: 60000, // 60 seconds
  cacheTimeout: 30000   // 30 seconds
};

// Failure tracking cache
const failureCache = {
  timestamps: {},
  getFailedServices: () => {
    const now = Date.now();
    return Object.entries(failureCache.timestamps)
      .filter(([_, timestamp]) => now - timestamp < SAFE_MODE_CONFIG.retryInterval)
      .map(([service]) => service);
  }
};

/**
 * Create a safe mode fallback response
 */
const createFallbackResponse = (serviceName, originalFallback = null) => {
  return {
    status: "safe-mode",
    service: serviceName,
    message: `${serviceName} temporarily unavailable`,
    retry: `${SAFE_MODE_CONFIG.retryInterval / 1000} seconds`,
    timestamp: new Date().toISOString(),
    ...originalFallback
  };
};

/**
 * Track service failure
 */
const trackFailure = (serviceName, error) => {
  if (serviceStatus[serviceName]) {
    serviceStatus[serviceName].failureCount++;
    serviceStatus[serviceName].lastError = error?.message || String(error);
    serviceStatus[serviceName].lastCheck = new Date().toISOString();
    serviceStatus[serviceName].healthy = false;
    failureCache.timestamps[serviceName] = Date.now();
    
    console.log(`[SafeMode] ${serviceName} failed (${serviceStatus[serviceName].failureCount}x): ${error?.message}`);
    
    // Reset after retry interval
    setTimeout(() => {
      if (serviceStatus[serviceName]) {
        serviceStatus[serviceName].healthy = true;
        serviceStatus[serviceName].failureCount = 0;
        serviceStatus[serviceName].lastError = null;
        console.log(`[SafeMode] ${serviceName} recovered`);
      }
    }, SAFE_MODE_CONFIG.retryInterval);
  }
};

/**
 * Track service success
 */
const trackSuccess = (serviceName) => {
  if (serviceStatus[serviceName]) {
    serviceStatus[serviceName].healthy = true;
    serviceStatus[serviceName].failureCount = 0;
    serviceStatus[serviceName].lastError = null;
    serviceStatus[serviceName].lastCheck = new Date().toISOString();
  }
};

/**
 * Check if a service is in safe mode
 */
const isServiceHealthy = (serviceName) => {
  return serviceStatus[serviceName]?.healthy ?? true;
};

/**
 * Get all service statuses
 */
const getServiceStatuses = () => {
  return {
    ...serviceStatus,
    safeModeActive: failureCache.getFailedServices().length > 0,
    failedServices: failureCache.getFailedServices()
  };
};

/**
 * Wrap a service function with crash protection
 * @param {string} serviceName - Name of the service
 * @param {Function} serviceFunction - The service function to wrap
 * @param {Object} fallbackData - Default fallback data to return on failure
 * @returns {Function} - Wrapped function with crash protection
 */
const withCrashProtection = (serviceName, serviceFunction, fallbackData = {}) => {
  return async (...args) => {
    try {
      // Check if service was recently failing
      const failedServices = failureCache.getFailedServices();
      if (failedServices.includes(serviceName)) {
        console.log(`[SafeMode] ${serviceName} in safe mode, returning fallback`);
        return createFallbackResponse(serviceName, fallbackData);
      }
      
      const result = await serviceFunction(...args);
      trackSuccess(serviceName);
      return result;
    } catch (error) {
      trackFailure(serviceName, error);
      return createFallbackResponse(serviceName, fallbackData);
    }
  };
};

/**
 * Wrap a sync service function with crash protection
 * @param {string} serviceName - Name of the service
 * @param {Function} serviceFunction - The service function to wrap
 * @param {Object} fallbackData - Default fallback data to return on failure
 * @returns {Function} - Wrapped function with crash protection
 */
const withSyncCrashProtection = (serviceName, serviceFunction, fallbackData = {}) => {
  return (...args) => {
    try {
      // Check if service was recently failing
      const failedServices = failureCache.getFailedServices();
      if (failedServices.includes(serviceName)) {
        console.log(`[SafeMode] ${serviceName} in safe mode, returning fallback`);
        return createFallbackResponse(serviceName, fallbackData);
      }
      
      const result = serviceFunction(...args);
      trackSuccess(serviceName);
      return result;
    } catch (error) {
      trackFailure(serviceName, error);
      return createFallbackResponse(serviceName, fallbackData);
    }
  };
};

/**
 * Get system-wide safe mode status
 */
const getSystemStatus = () => {
  const failedServices = failureCache.getFailedServices();
  const allHealthy = Object.values(serviceStatus).every(s => s.healthy);
  
  return {
    systemMode: allHealthy ? 'normal' : 'safe-mode',
    safeModeActive: failedServices.length > 0,
    totalServices: Object.keys(serviceStatus).length,
    healthyServices: Object.values(serviceStatus).filter(s => s.healthy).length,
    failedServices,
    services: serviceStatus,
    timestamp: new Date().toISOString()
  };
};

/**
 * Force reset a service to healthy state
 */
const resetService = (serviceName) => {
  if (serviceStatus[serviceName]) {
    serviceStatus[serviceName].healthy = true;
    serviceStatus[serviceName].failureCount = 0;
    serviceStatus[serviceName].lastError = null;
    delete failureCache.timestamps[serviceName];
    console.log(`[SafeMode] ${serviceName} manually reset`);
    return true;
  }
  return false;
};

/**
 * Force reset all services
 */
const resetAllServices = () => {
  Object.keys(serviceStatus).forEach(serviceName => {
    resetService(serviceName);
  });
  console.log('[SafeMode] All services manually reset');
};

module.exports = {
  // Core functions
  createFallbackResponse,
  trackFailure,
  trackSuccess,
  isServiceHealthy,
  getServiceStatuses,
  getSystemStatus,
  resetService,
  resetAllServices,
  
  // Wrappers
  withCrashProtection,
  withSyncCrashProtection,
  
  // Configuration
  SAFE_MODE_CONFIG,
  serviceStatus
};

