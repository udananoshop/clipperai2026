/**
 * OVERLORD Phase 6 - System Health Service
 * Evaluates system health and returns health score
 */

const logger = require('../utils/logger');

// Optional service imports
let systemMetricsService = null;
let executionGovernorService = null;

try {
  systemMetricsService = require('./systemMetricsService');
} catch (err) {
  // Service not available
}

try {
  executionGovernorService = require('./executionGovernorService');
} catch (err) {
  // Service not available
}

/**
 * Calculate memory health score (0-100)
 * Based on heap usage percentage
 * @returns {number} - Memory health score
 */
function getMemoryHealth() {
  try {
    if (systemMetricsService) {
      const mem = systemMetricsService.getMemoryUsage();
      const heapPercent = mem.heapUsagePercent;
      
      // 0-70% = 100 health
      // 70-85% = decreasing health
      // 85%+ = 0 health
      if (heapPercent <= 70) {
        return 100;
      } else if (heapPercent <= 85) {
        return Math.round(100 - ((heapPercent - 70) / 15) * 100);
      } else {
        return Math.max(0, 100 - ((heapPercent - 70) / 15) * 100);
      }
    }
    
    // Fallback: calculate directly
    const mem = process.memoryUsage();
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    
    if (heapPercent <= 70) return 100;
    if (heapPercent <= 85) return Math.round(100 - ((heapPercent - 70) / 15) * 100);
    return Math.max(0, 100 - ((heapPercent - 70) / 15) * 100);
  } catch (err) {
    return 50; // Default on error
  }
}

/**
 * Calculate error rate health score (0-100)
 * Based on error rate from system metrics
 * @returns {number} - Error rate health score
 */
function getErrorRateHealth() {
  try {
    if (systemMetricsService) {
      const errorRate = systemMetricsService.getErrorRate();
      const errorPercent = errorRate * 100;
      
      // 0-5% errors = 100 health
      // 5-30% errors = decreasing health
      // 30%+ = 0 health
      if (errorPercent <= 5) {
        return 100;
      } else if (errorPercent <= 30) {
        return Math.round(100 - ((errorPercent - 5) / 25) * 100);
      } else {
        return 0;
      }
    }
    
    return 50; // Default if service unavailable
  } catch (err) {
    return 50;
  }
}

/**
 * Calculate execution time health score (0-100)
 * Based on average execution time
 * @returns {number} - Execution time health score
 */
function getExecutionTimeHealth() {
  try {
    if (systemMetricsService) {
      const avgTime = systemMetricsService.getAvgExecutionTime();
      
      // < 2000ms = 100 health
      // 2000-7000ms = decreasing health
      // 7000ms+ = 0 health
      if (avgTime <= 2000) {
        return 100;
      } else if (avgTime <= 7000) {
        return Math.round(100 - ((avgTime - 2000) / 5000) * 100);
      } else {
        return 0;
      }
    }
    
    // Check execution governor if available
    if (executionGovernorService) {
      try {
        const state = executionGovernorService.getSystemLoadState();
        switch (state.state) {
          case 'NORMAL': return 100;
          case 'HIGH_LOAD': return 60;
          case 'CRITICAL': return 30;
          case 'SAFE_MODE': return 10;
          default: return 50;
        }
      } catch (err) {
        // Fall through
      }
    }
    
    return 50; // Default
  } catch (err) {
    return 50;
  }
}

/**
 * Calculate load state health score (0-100)
 * Based on execution governor load state
 * @returns {number} - Load state health score
 */
function getLoadStateHealth() {
  try {
    if (executionGovernorService) {
      const state = executionGovernorService.getSystemLoadState();
      
      switch (state.state) {
        case 'NORMAL': return 100;
        case 'HIGH_LOAD': return 60;
        case 'CRITICAL': return 30;
        case 'SAFE_MODE': return 10;
        default: return 50;
      }
    }
    
    return 75; // Default - assume OK if no governor
  } catch (err) {
    return 75;
  }
}

/**
 * Get system health score (0-100)
 * Composite of all health metrics
 * @returns {Object} - Health score and breakdown
 */
function getHealthScore() {
  const memoryHealth = getMemoryHealth();
  const errorRateHealth = getErrorRateHealth();
  const executionTimeHealth = getExecutionTimeHealth();
  const loadStateHealth = getLoadStateHealth();
  
  // Weighted average: memory 30%, errors 30%, execution 20%, load 20%
  const healthScore = Math.round(
    (memoryHealth * 0.30) +
    (errorRateHealth * 0.30) +
    (executionTimeHealth * 0.20) +
    (loadStateHealth * 0.20)
  );
  
  // Determine status
  let status;
  if (healthScore >= 80) {
    status = 'healthy';
  } else if (healthScore >= 50) {
    status = 'degraded';
  } else if (healthScore >= 20) {
    status = 'unhealthy';
  } else {
    status = 'critical';
  }
  
  const result = {
    healthScore,
    status,
    breakdown: {
      memory: memoryHealth,
      errorRate: errorRateHealth,
      executionTime: executionTimeHealth,
      loadState: loadStateHealth
    },
    recommendations: [],
    checkedAt: new Date().toISOString()
  };
  
  // Add recommendations
  if (memoryHealth < 50) {
    result.recommendations.push('Memory usage critical - consider restarting or scaling');
  }
  if (errorRateHealth < 50) {
    result.recommendations.push('High error rate detected - review logs for issues');
  }
  if (executionTimeHealth < 50) {
    result.recommendations.push('Execution times degrading - check job queue');
  }
  if (loadStateHealth < 50) {
    result.recommendations.push('System under high load - consider throttling new jobs');
  }
  
  // DEV MODE ONLY: Log health check
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SystemHealth] Score: ${healthScore}, Status: ${status}`);
    console.log('  Memory:', memoryHealth, 'Errors:', errorRateHealth, 'Exec:', executionTimeHealth, 'Load:', loadStateHealth);
  }
  
  return result;
}

/**
 * Get memory usage percentage
 * @returns {number} - Memory usage percentage
 */
function getMemoryUsagePercent() {
  try {
    const mem = process.memoryUsage();
    return Math.round((mem.heapUsed / mem.heapTotal) * 100);
  } catch (err) {
    return 0;
  }
}

/**
 * Get free memory in MB
 * @returns {number} - Free memory in MB
 */
function getFreeMemoryMB() {
  try {
    const mem = process.memoryUsage();
    return Math.round((mem.heapTotal - mem.heapUsed) / 1024 / 1024);
  } catch (err) {
    return 0;
  }
}

/**
 * Check if memory threshold exceeded
 * @param {number} thresholdPercent - Threshold percentage
 * @returns {boolean} - True if threshold exceeded
 */
function isMemoryThresholdExceeded(thresholdPercent = 85) {
  return getMemoryUsagePercent() >= thresholdPercent;
}

module.exports = {
  getHealthScore,
  getMemoryHealth,
  getErrorRateHealth,
  getExecutionTimeHealth,
  getLoadStateHealth,
  getMemoryUsagePercent,
  getFreeMemoryMB,
  isMemoryThresholdExceeded
};
