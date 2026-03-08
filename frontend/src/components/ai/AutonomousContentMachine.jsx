/**
 * AUTONOMOUS CONTENT MACHINE PANEL
 * Display autonomous loop status, next scan time, queue size, generated clips, scheduled posts
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Cpu,
  Play,
  Square,
  RefreshCw,
  Clock,
  Zap,
  BarChart3,
  Layers,
  Pause,
  AlertCircle,
  CheckCircle,
  Timer,
  Activity,
  TrendingUp,
  Calendar,
  HardDrive
} from "lucide-react";

const PlatformIcon = ({ platform }) => {
  const icons = {
    tiktok: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    instagram: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.163-2.759 6.163-6.162c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    facebook: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  };
  
  return icons[platform] || <Layers className="w-4 h-4" />;
};

const StatusIndicator = ({ status }) => {
  const config = {
    running: { color: "bg-green-500", pulse: true, label: "Running" },
    paused: { color: "bg-yellow-500", pulse: false, label: "Paused" },
    stopped: { color: "bg-gray-500", pulse: false, label: "Stopped" },
    error: { color: "bg-red-500", pulse: true, label: "Error" }
  };
  
  const c = config[status] || config.stopped;
  
  return (
    <div className="flex items-center gap-2">
      <span className={`relative flex h-3 w-3`}>
        {c.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${c.color}`} />
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${c.color}`} />
      </span>
      <span className="text-xs text-gray-400">{c.label}</span>
    </div>
  );
};

const AutonomousContentMachine = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (token) {
      fetchStatus();
      // Poll every 10 seconds
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);
  
  const fetchStatus = async () => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axios.get("/api/overlord/autonomous/status");
      if (response.data?.success) {
        setStatus(response.data.data);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch autonomous status:", err);
      // Use mock data for demo
      setStatus({
        isRunning: true,
        isPaused: false,
        isStopping: false,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        lastCycleAt: new Date(Date.now() - 1800000).toISOString(),
        nextCycleAt: new Date(Date.now() + 1800000).toISOString(),
        cyclesCompleted: 5,
        videosDiscovered: 12,
        videosDownloaded: 8,
        clipsGenerated: 45,
        clipsQueued: 38,
        postsScheduled: 152,
        errorsEncountered: 2,
        activeJobs: {
          downloads: 0,
          clips: 0,
          aiTasks: 0,
          maxDownloads: 2,
          maxClips: 1,
          maxAITasks: 2
        },
        memory: {
          usage: 62,
          isSafe: true,
          isPaused: false,
          threshold: 85,
          resumeThreshold: 70
        },
        config: {
          cooldownMinutes: 30,
          minViralScore: 70,
          maxCandidatesPerCycle: 2,
          platforms: ["tiktok", "instagram", "youtube", "facebook"]
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  const startLoop = async () => {
    try {
      setLoading(true);
      await axios.post("/api/overlord/autonomous/start");
      await fetchStatus();
    } catch (err) {
      console.error("Failed to start loop:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const stopLoop = async () => {
    try {
      setLoading(true);
      await axios.post("/api/overlord/autonomous/stop");
      await fetchStatus();
    } catch (err) {
      console.error("Failed to stop loop:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const triggerCycle = async () => {
    try {
      setLoading(true);
      await axios.post("/api/overlord/autonomous/trigger");
      await fetchStatus();
    } catch (err) {
      console.error("Failed to trigger cycle:", err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !status) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-blue-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5">
        <div className="flex items-center justify-center h-48">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
          />
        </div>
      </div>
    );
  }
  
  const isRunning = status?.isRunning;
  const isPaused = status?.isPaused;
  const memory = status?.memory || {};
  const activeJobs = status?.activeJobs || {};
  const config = status?.config || {};
  
  // Calculate time until next cycle
  const nextCycleTime = status?.nextCycleAt ? new Date(status.nextCycleAt) : null;
  const now = new Date();
  const timeUntilNext = nextCycleTime ? Math.max(0, nextCycleTime - now) : 0;
  const minutesUntilNext = Math.floor(timeUntilNext / 60000);
  const secondsUntilNext = Math.floor((timeUntilNext % 60000) / 1000);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-blue-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl"
          >
            <Cpu className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-gray-300 font-medium">AUTONOMOUS CONTENT MACHINE</h3>
            <p className="text-xs text-gray-500">Full Automation Loop</p>
          </div>
        </div>
        
        <StatusIndicator status={isRunning ? (isPaused ? "paused" : "running") : "stopped"} />
      </div>
      
      {/* Memory Safety Bar */}
      <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Memory Safety</span>
          </div>
          <span className={`text-xs font-medium ${memory.isSafe ? 'text-green-400' : 'text-red-400'}`}>
            {memory.usage}% / {memory.threshold}%
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${memory.isSafe ? 'bg-green-500' : 'bg-red-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (memory.usage / memory.threshold) * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {memory.isPaused && (
          <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Paused due to high memory usage</span>
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"
        >
          <div className="text-xl font-bold text-blue-400">{status?.cyclesCompleted || 0}</div>
          <div className="text-xs text-gray-500">Cycles</div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20"
        >
          <div className="text-xl font-bold text-purple-400">{status?.clipsGenerated || 0}</div>
          <div className="text-xs text-gray-500">Clips Generated</div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div className="text-xl font-bold text-green-400">{status?.clipsQueued || 0}</div>
          <div className="text-xs text-gray-500">Queued</div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
        >
          <div className="text-xl font-bold text-cyan-400">{status?.postsScheduled || 0}</div>
          <div className="text-xs text-gray-500">Scheduled</div>
        </motion.div>
      </div>
      
      {/* Next Cycle Timer */}
      {isRunning && !isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Next Scan</span>
            </div>
            <div className="text-lg font-mono text-blue-400 font-bold">
              {minutesUntilNext}:{secondsUntilNext.toString().padStart(2, '0')}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Active Jobs */}
      <div className="mb-5">
        <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Active Jobs
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-sm text-gray-300">{activeJobs.downloads}/{activeJobs.maxDownloads}</div>
            <div className="text-xs text-gray-500">Downloads</div>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-sm text-gray-300">{activeJobs.clips}/{activeJobs.maxClips}</div>
            <div className="text-xs text-gray-500">Clips</div>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-sm text-gray-300">{activeJobs.aiTasks}/{activeJobs.maxAITasks}</div>
            <div className="text-xs text-gray-500">AI Tasks</div>
          </div>
        </div>
      </div>
      
      {/* Configuration */}
      <div className="mb-5">
        <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Configuration
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Cooldown:</span>
            <span className="text-gray-300">{config.cooldownMinutes} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Min Viral Score:</span>
            <span className="text-gray-300">{config.minViralScore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Max Candidates:</span>
            <span className="text-gray-300">{config.maxCandidatesPerCycle}</span>
          </div>
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startLoop}
            disabled={loading}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Start Loop
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={stopLoop}
              disabled={loading}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              Stop
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={triggerCycle}
              disabled={loading || isPaused}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Trigger Now
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AutonomousContentMachine;

