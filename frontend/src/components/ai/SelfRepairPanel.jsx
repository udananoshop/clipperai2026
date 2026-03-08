/**
 * Self-Repair Panel Component
 * ClipperAI2026 - AI SYSTEM STATUS Dashboard
 * 
 * Displays self-repair system status, detected errors, and patch management
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  RotateCcw,
  Activity,
  Wrench,
  FilePatch,
  Server
} from 'lucide-react';

const SelfRepairPanel = ({ compact = false }) => {
  const [status, setStatus] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [patches, setPatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/self-repair/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch self-repair status:', error);
    }
  };

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-repair/diagnose', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setDiagnosis(data.data);
        setLastAction({ type: 'diagnose', timestamp: new Date() });
      }
    } catch (error) {
      console.error('Diagnosis failed:', error);
    }
    setLoading(false);
  };

  const fixLastError = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-repair/fix-last', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setLastAction({ type: 'fix', timestamp: new Date() });
        await fetchStatus();
      }
    } catch (error) {
      console.error('Fix failed:', error);
    }
    setLoading(false);
  };

  const rollbackLastPatch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-repair/rollback', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setLastAction({ type: 'rollback', timestamp: new Date() });
        await fetchStatus();
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }
    setLoading(false);
  };

  const getSystemHealthColor = (health) => {
    if (health === 'healthy') return 'text-green-400';
    if (health === 'degraded') return 'text-yellow-400';
    return 'text-red-400';
  };

  if (compact) {
    // Compact view for dashboard integration
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-indigo-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="text-gray-300 font-medium">Self-Repair AI</span>
          </div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`text-xs ${status?.active ? 'text-green-400' : 'text-gray-500'}`}
          >
            {status?.active ? 'Active' : 'Inactive'}
          </motion.span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 rounded-lg bg-white/5">
            <div className="text-gray-400 text-xs">Errors</div>
            <div className="text-lg font-bold text-white">{status?.detectedErrors || 0}</div>
          </div>
          <div className="p-2 rounded-lg bg-white/5">
            <div className="text-gray-400 text-xs">Patches</div>
            <div className="text-lg font-bold text-white">{status?.appliedPatches || 0}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={runDiagnosis}
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-indigo-400 text-xs font-medium transition-all"
          >
            Diagnose
          </button>
          <button
            onClick={fixLastError}
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium transition-all"
          >
            Fix Error
          </button>
        </div>
      </motion.div>
    );
  }

  // Full panel view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-indigo-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span className="text-gray-300 font-medium">AI Self-Repair System</span>
        </div>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`text-xs ${status?.active ? 'text-green-400' : 'text-gray-500'}`}
        >
          {status?.active ? 'Active' : 'Inactive'}
        </motion.span>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <Activity className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-white">{status?.scanCount || 0}</div>
          <div className="text-xs text-gray-500">Scans</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-white">{status?.detectedErrors || 0}</div>
          <div className="text-xs text-gray-500">Errors</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-white">{status?.appliedPatches || 0}</div>
          <div className="text-xs text-gray-500">Fixed</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-white">{status?.failedPatches || 0}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
      </div>

      {/* System Health */}
      {diagnosis && (
        <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">System Health</span>
            </div>
            <span className={`text-sm font-medium ${getSystemHealthColor(diagnosis.systemHealth)}`}>
              {diagnosis.systemHealth?.toUpperCase()}
            </span>
          </div>
          
          {diagnosis.issues?.length > 0 && (
            <div className="space-y-1">
              {diagnosis.issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <AlertTriangle className={`w-3 h-3 ${
                    issue.severity === 'high' ? 'text-red-400' : 
                    issue.severity === 'medium' ? 'text-yellow-400' : 'text-gray-400'
                  }`} />
                  <span className="text-gray-400">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      {status?.config && (
        <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-gray-500 mb-2">Configuration (8GB RAM Optimized)</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Max Files:</span>
              <span className="text-white ml-1">{status.config.maxAnalysisFiles}</span>
            </div>
            <div>
              <span className="text-gray-400">Max Patch:</span>
              <span className="text-white ml-1">{status.config.maxPatchSize} lines</span>
            </div>
            <div>
              <span className="text-gray-400">Confidence:</span>
              <span className="text-white ml-1">{Math.round(status.config.minConfidence * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={runDiagnosis}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Diagnose
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fixLastError}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium transition-all disabled:opacity-50"
        >
          <Wrench className="w-4 h-4" />
          Fix Error
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={rollbackLastPatch}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-400 text-sm font-medium transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Rollback
        </motion.button>
      </div>

      {/* Last Action Feedback */}
      {lastAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-2 rounded-lg bg-white/5 text-xs text-center text-gray-400"
        >
          Last action: {lastAction.type} at {lastAction.timestamp.toLocaleTimeString()}
        </motion.div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-3 right-3">
        <div className={`w-2 h-2 rounded-full ${
          status?.active ? 'bg-green-400' : 'bg-gray-500'
        }`} />
      </div>
    </motion.div>
  );
};

export default SelfRepairPanel;

