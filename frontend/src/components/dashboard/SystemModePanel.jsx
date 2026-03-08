/**
 * System Mode Panel Component
 * ClipperAI2026 - Displays system status including Safe Mode
 * Auto-refreshes every 60 seconds
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Cpu, HardDrive, AlertTriangle, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const SystemModePanel = () => {
  const [systemStatus, setSystemStatus] = useState({
    systemMode: 'normal',
    safeModeActive: false,
    deviceMode: 'balanced',
    memoryUsage: 0,
    lastError: null,
    healthyServices: 0,
    totalServices: 0,
    loading: true
  });

  const fetchSystemStatus = async () => {
    try {
      // Fetch from health endpoint
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      
      // Fetch from safe mode status if available
      let safeModeData = { safeModeActive: false, healthyServices: 0, totalServices: 4 };
      try {
        const safeModeRes = await fetch('/api/system/safe-mode');
        if (safeModeRes.ok) {
          safeModeData = await safeModeRes.json();
        }
      } catch (e) {
        // Safe mode endpoint not available
      }
      
      // Fetch last error if available
      let lastError = null;
      try {
        const errorRes = await fetch('/api/bugs/latest');
        if (errorRes.ok) {
          const errorData = await errorRes.json();
          if (errorData.success && errorData.data) {
            lastError = errorData.data;
          }
        }
      } catch (e) {
        // Bug detection endpoint not available
      }

      setSystemStatus({
        systemMode: safeModeData.safeModeActive ? 'safe-mode' : 'normal',
        safeModeActive: safeModeData.safeModeActive || false,
        deviceMode: 'balanced', // Could be fetched from deviceAdaptiveService
        memoryUsage: healthData.memoryUsage || 0,
        lastError,
        healthyServices: safeModeData.healthyServices || 4,
        totalServices: safeModeData.totalServices || 4,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
      setSystemStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSystemStatus();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSystemStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getMemoryColor = (usage) => {
    if (usage >= 90) return 'text-red-400';
    if (usage >= 75) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getModeIcon = () => {
    if (systemStatus.safeModeActive) return Shield;
    return CheckCircle;
  };

  const ModeIcon = getModeIcon();

  if (systemStatus.loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-amber-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
      >
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-amber-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ModeIcon className={`w-5 h-5 ${systemStatus.safeModeActive ? 'text-amber-400' : 'text-green-400'}`} />
          <span className="text-gray-300 font-medium">System Mode</span>
        </div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`px-2 py-1 rounded text-xs font-medium ${
            systemStatus.safeModeActive 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}
        >
          {systemStatus.safeModeActive ? 'Safe Mode Active' : 'Normal'}
        </motion.div>
      </div>

      {/* Status Grid */}
      <div className="space-y-3">
        {/* System Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div className="flex items-center space-x-2">
            <Shield className={`w-4 h-4 ${systemStatus.safeModeActive ? 'text-amber-400' : 'text-green-400'}`} />
            <span className="text-sm text-gray-400">System Status</span>
          </div>
          <span className={`text-sm font-medium ${systemStatus.safeModeActive ? 'text-amber-400' : 'text-green-400'}`}>
            {systemStatus.safeModeActive ? 'Safe Mode' : 'Normal'}
          </span>
        </div>

        {/* Device Mode */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">Device Mode</span>
          </div>
          <span className="text-sm font-medium text-cyan-400 capitalize">
            {systemStatus.deviceMode}
          </span>
        </div>

        {/* Memory Usage */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div className="flex items-center space-x-2">
            <HardDrive className={`w-4 h-4 ${getMemoryColor(systemStatus.memoryUsage)}`} />
            <span className="text-sm text-gray-400">Memory Usage</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${systemStatus.memoryUsage}%`,
                  backgroundColor: systemStatus.memoryUsage >= 90 ? '#ef4444' : systemStatus.memoryUsage >= 75 ? '#eab308' : '#22c55e'
                }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
              />
            </div>
            <span className={`text-sm font-medium ${getMemoryColor(systemStatus.memoryUsage)}`}>
              {systemStatus.memoryUsage}%
            </span>
          </div>
        </div>

        {/* Services Health */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Services</span>
          </div>
          <span className="text-sm font-medium text-green-400">
            {systemStatus.healthyServices}/{systemStatus.totalServices} Healthy
          </span>
        </div>

        {/* Last Error */}
        {systemStatus.lastError && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Last Error</span>
            </div>
            <p className="text-xs text-gray-400 truncate">
              {systemStatus.lastError.errorType || 'Unknown error'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {systemStatus.lastError.file || 'Unknown file'}
            </p>
          </div>
        )}

        {/* No Error State */}
        {!systemStatus.lastError && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">No errors detected</span>
            </div>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Auto-refresh: 60s</span>
          <span className="flex items-center space-x-1">
            <RefreshCw className="w-3 h-3" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default SystemModePanel;

