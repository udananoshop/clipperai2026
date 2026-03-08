/**
 * AUTO CONTENT ENGINE DASHBOARD PANEL
 * Display queued posts, scheduled posts, platform stats, next upload time
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Hash,
  FileText,
  Send,
  RefreshCw,
  Calendar,
  Zap,
  Target,
  BarChart3,
  Layers,
  Pause,
  PlayCircle
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
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
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

const StatusBadge = ({ status }) => {
  const styles = {
    pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", icon: Clock },
    scheduled: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", icon: Calendar },
    posted: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", icon: CheckCircle },
    failed: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", icon: AlertCircle }
  };
  
  const style = styles[status] || styles.pending;
  const Icon = style.icon;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const AutoContentEnginePanel = ({ token, isAdmin = true }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  
  useEffect(() => {
    if (token) {
      fetchStatus();
      fetchQueue();
    }
  }, [token]);
  
  const fetchStatus = async () => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axios.get("/api/content-factory/status");
      if (response.data?.success) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch content factory status:", error);
      // Use mock data for demo
      setStatus({
        success: true,
        status: "active",
        queue: { pending: 3, scheduled: 2, posted: 15, failed: 0 },
        scheduler: { total: 5, pending: 3, scheduled: 2, posted: 15 },
        nextUpload: {
          platform: "tiktok",
          scheduledTime: new Date(Date.now() + 3600000).toISOString()
        },
        platforms: {
          tiktok: { bestTimes: ["12:00", "18:00", "21:00"], nextBestTime: new Date(Date.now() + 3600000).toISOString() },
          instagram: { bestTimes: ["11:00", "19:00"], nextBestTime: new Date(Date.now() + 7200000).toISOString() },
          youtube: { bestTimes: ["13:00", "20:00"], nextBestTime: new Date(Date.now() + 10800000).toISOString() },
          facebook: { bestTimes: ["14:00", "21:00"], nextBestTime: new Date(Date.now() + 14400000).toISOString() }
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchQueue = async () => {
    try {
      const response = await axios.get("/api/content-factory/queue?limit=20");
      if (response.data?.success) {
        setQueue(response.data.queue);
      }
    } catch (error) {
      console.error("Failed to fetch queue:", error);
      // Use mock data
      setQueue([
        { id: "1", clipId: "clip_001", platform: "tiktok", title: "Viral Dance Challenge", status: "pending", scheduledTime: null },
        { id: "2", clipId: "clip_002", platform: "instagram", title: "Behind the Scenes", status: "scheduled", scheduledTime: new Date(Date.now() + 3600000).toISOString() },
        { id: "3", clipId: "clip_003", platform: "youtube", title: "Tutorial Compilation", status: "pending", scheduledTime: null }
      ]);
    }
  };
  
  const generateContent = async (clipId) => {
    try {
      setLoading(true);
      await axios.post("/api/content-factory/generate", {
        clipId,
        platforms: ["tiktok", "instagram", "youtube", "facebook"],
        autoSchedule: true
      });
      await fetchStatus();
      await fetchQueue();
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !status) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5">
        <div className="flex items-center justify-center h-40">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full"
          />
        </div>
      </div>
    );
  }
  
  const stats = status?.queue || { pending: 0, scheduled: 0, posted: 0, failed: 0 };
  const nextUpload = status?.nextUpload;
  const platforms = status?.platforms || {};
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl"
          >
            <Zap className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-gray-300 font-medium">Auto Content Engine</h3>
            <p className="text-xs text-gray-500">AI-Powered Content Factory</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { fetchStatus(); fetchQueue(); }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30"
          >
            Active
          </motion.div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
        >
          <div className="text-xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"
        >
          <div className="text-xl font-bold text-blue-400">{stats.scheduled}</div>
          <div className="text-xs text-gray-500">Scheduled</div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div className="text-xl font-bold text-green-400">{stats.posted}</div>
          <div className="text-xs text-gray-500">Posted</div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20"
        >
          <div className="text-xl font-bold text-purple-400">
            {stats.byPlatform ? Object.values(stats.byPlatform).reduce((a, b) => a + b, 0) : 0}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </motion.div>
      </div>
      
      {/* Next Upload */}
      {nextUpload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-5 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Next Upload</span>
            </div>
            <div className="flex items-center gap-2">
              <PlatformIcon platform={nextUpload.platform} />
              <span className="text-sm text-purple-400 font-medium capitalize">{nextUpload.platform}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(nextUpload.scheduledTime).toLocaleString()}
          </div>
        </motion.div>
      )}
      
      {/* Platform Schedule */}
      <div className="mb-5">
        <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          Platform Best Times
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(platforms).map(([platform, data]) => (
            <div key={platform} className="p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <PlatformIcon platform={platform} />
                  <span className="text-xs text-gray-300 capitalize">{platform}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {data.bestTimes?.join(", ") || "N/A"}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Queue List */}
      <div>
        <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Content Queue
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No items in queue
            </div>
          ) : (
            queue.slice(0, 5).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={item.platform} />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-300 truncate max-w-[150px]">
                      {item.title || item.clipId}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{item.platform}</span>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </motion.div>
            ))
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateContent("new_clip")}
            disabled={loading}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            Generate Content
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default AutoContentEnginePanel;

