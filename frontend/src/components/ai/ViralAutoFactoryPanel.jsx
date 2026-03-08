/**
 * Viral Auto Factory Control Panel
 * Control and monitor the automated content generation pipeline
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RefreshCw, Activity, Cpu, Clock, Zap, AlertTriangle, CheckCircle, Database, Download } from 'lucide-react';
import * as viralAutoFactoryService from '../services/viralAutoFactoryService';

const ViralAutoFactoryPanel = () => {
  const [status, setStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch status and metrics
  const fetchData = async () => {
    try {
      const [statusRes, metricsRes] = await Promise.all([
        viralAutoFactoryService.getStatus(),
        viralAutoFactoryService.getMetrics()
      ]);
      
      if (statusRes.success) {
        setStatus(statusRes.data);
      }
      if (metricsRes.success) {
        setMetrics(metricsRes.data);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle start
  const handleStart = async () => {
    setActionLoading(true);
    try {
      const result = await viralAutoFactoryService.start();
      if (result.success) {
        await fetchData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle stop
  const handleStop = async () => {
    setActionLoading(true);
    try {
      const result = await viralAutoFactoryService.stop();
      if (result.success) {
        await fetchData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle trigger
  const handleTrigger = async () => {
    setActionLoading(true);
    try {
      const result = await viralAutoFactoryService.triggerDiscovery();
      if (result.success) {
        await fetchData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const isRunning = status?.running || false;
  const isPaused = status?.paused || false;
  const memoryUsage = status?.memoryUsage || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 rounded-2xl border border-white/10 backdrop-blur-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Viral Auto Factory</h2>
            <p className="text-sm text-gray-400">Fully automated content pipeline</p>
          </div>
        
        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
          isRunning 
            ? isPaused 
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}>
          {isRunning ? (
            isPaused ? <><AlertTriangle className="w-4 h-4" /> Paused</> : <><CheckCircle className="w-4 h-4" /> Active</>
          ) : (
            <><Pause className="w-4 h-4" /> Stopped</>
          )}
        </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Discovered */}
        <div className="p-4 bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Discovered</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.discovered || 0}</div>

        {/* Downloaded */}
        <div className="p-4 bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Download className="w-4 h-4" />
            <span className="text-xs">Downloaded</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.downloaded || 0}</div>

        {/* Clips Generated */}
        <div className="p-4 bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Cpu className="w-4 h-4" />
            <span className="text-xs">Clips</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.clipsGenerated || 0}</div>

        {/* Queue Size */}
        <div className="p-4 bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Queue</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {status?.queueSize || 0} / {status?.maxConcurrent || 2}
          </div>
      </div>

      {/* Memory Usage */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Memory Usage</span>
          <span className={`text-sm font-medium ${
            memoryUsage >= 85 ? 'text-red-400' : memoryUsage >= 75 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {memoryUsage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${memoryUsage}%` }}
            className={`h-full rounded-full ${
              memoryUsage >= 85 ? 'bg-red-500' : memoryUsage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          />
        </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {isRunning ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStop}
            disabled={actionLoading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Pause className="w-5 h-5" />
            Stop Factory
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            disabled={actionLoading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            Start Factory
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTrigger}
          disabled={actionLoading || !isRunning}
          className="py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${actionLoading ? 'animate-spin' : ''}`} />
          Trigger Now
        </motion.button>
      </div>

      {/* Last Activity */}
      {metrics?.lastScan && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Last Scan: {new Date(metrics.lastScan).toLocaleTimeString()}</span>
            <span>Total Runs: {metrics.totalRuns || 0}</span>
          </div>
      )}
    </motion.div>
  );
};

export default ViralAutoFactoryPanel;
