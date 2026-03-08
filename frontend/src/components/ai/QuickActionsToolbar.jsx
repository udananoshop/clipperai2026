import React from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  Download, 
  Share2, 
  FileText,
  Video,
  Instagram,
  Youtube,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const QuickActionsToolbar = ({ 
  onReanalyze, 
  onExportTikTok, 
  onExportShorts, 
  onDownloadCaptions,
  videoId,
  actionLoading,
  automationStatus 
}) => {
  
  // Disable all actions if no video is selected
  const isDisabled = !videoId || actionLoading;
  
  const handleReanalyze = () => {
    if (isDisabled || !videoId) return;
    console.log(`Reanalyze video ${videoId}`);
    if (onReanalyze) onReanalyze(videoId);
  };

  const handleExportTikTok = async () => {
    if (isDisabled || !videoId) return;
    
    try {
      console.log(`Export to TikTok: ${videoId}`);
      
      const res = await fetch(
        `http://localhost:3001/api/video/export/tiktok/${videoId}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (data.success) {
        console.log('[TikTok Export] Success:', data.file);
        window.open(data.url, "_blank");
        if (onExportTikTok) onExportTikTok(videoId);
      } else {
        console.error('[TikTok Export] Error:', data.error);
        alert(data.error || "Export failed");
      }
    } catch (err) {
      console.error('[TikTok Export] Server error:', err);
      alert("Server error during export");
    }
  };

  const handleExportShorts = async () => {
    if (isDisabled || !videoId) return;
    
    try {
      console.log(`Export to YouTube Shorts: ${videoId}`);
      
      const res = await fetch(
        `http://localhost:3001/api/video/export/shorts/${videoId}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (data.success) {
        console.log('[Shorts Export] Success:', data.file);
        window.open(data.url, "_blank");
        if (onExportShorts) onExportShorts(videoId);
      } else {
        console.error('[Shorts Export] Error:', data.error);
        alert(data.error || "Export failed");
      }
    } catch (err) {
      console.error('[Shorts Export] Server error:', err);
      alert("Server error during export");
    }
  };

  const handleDownloadCaptions = async () => {
    if (isDisabled || !videoId) return;
    
    try {
      console.log(`Download captions for video ${videoId}`);
      
      const res = await fetch(
        `http://localhost:3001/api/video/${videoId}/captions`,
        { method: "POST" }
      );

      const data = await res.json();

      if (data.success) {
        console.log('[Captions] Success:', data.captionFile);
        if (data.url) {
          window.open(data.url, "_blank");
        }
        if (onDownloadCaptions) onDownloadCaptions(videoId);
      } else {
        console.error('[Captions] Error:', data.error);
        alert(data.error || "Failed to generate captions");
      }
    } catch (err) {
      console.error('[Captions] Server error:', err);
      alert("Server error during captions generation");
    }
  };

  const isLoading = (id) => {
    return actionLoading === id;
  };

  // Only keep export-related actions - generate more is now automated
  const actions = [
    {
      id: 'tiktok',
      icon: Video,
      label: 'TikTok',
      onClick: handleExportTikTok,
      gradient: 'from-pink-500 to-rose-500',
      hoverGradient: 'hover:from-pink-600 hover:to-rose-600',
    },
    {
      id: 'shorts',
      icon: Youtube,
      label: 'Shorts',
      onClick: handleExportShorts,
      gradient: 'from-red-500 to-orange-500',
      hoverGradient: 'hover:from-red-600 hover:to-orange-600',
    },
    {
      id: 'captions',
      icon: FileText,
      label: 'Captions',
      onClick: handleDownloadCaptions,
      gradient: 'from-green-500 to-emerald-500',
      hoverGradient: 'hover:from-green-600 hover:to-emerald-600',
    },
    {
      id: 'reanalyze',
      icon: RefreshCw,
      label: 'Reanalyze',
      onClick: handleReanalyze,
      gradient: 'from-blue-500 to-cyan-500',
      hoverGradient: 'hover:from-blue-600 hover:to-cyan-600',
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/60 via-purple-900/10 to-gray-900/60 border border-white/10 backdrop-blur-xl p-5"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5" />
      
      <div className="relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3 mb-5"
        >
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2.5 bg-gray-700/50 rounded-xl border border-gray-600/30"
          >
            <Share2 className="w-5 h-5 text-gray-300" />
          </motion.div>
          <div>
            <span className="text-lg font-bold text-white">Export Actions</span>
            <p className="text-xs text-gray-400">Automated pipeline active</p>
          </div>
        </motion.div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={!isDisabled ? { scale: 1.05, y: -2 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              onClick={action.onClick}
              disabled={isDisabled}
              className={`
                relative overflow-hidden rounded-xl p-3 
                bg-gradient-to-br ${action.gradient} ${action.hoverGradient}
                shadow-lg shadow-black/20
                group
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Shine effect on hover */}
              {!actionLoading && (
                <motion.div 
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              )}
              
              <div className="relative flex flex-col items-center space-y-2">
                <motion.div 
                  animate={{ 
                    rotate: action.id === 'reanalyze' && !actionLoading ? [0, 360] : 0 
                  }}
                  transition={{ 
                    duration: action.id === 'reanalyze' && !actionLoading ? 2 : 0, 
                    repeat: action.id === 'reanalyze' && !actionLoading ? Infinity : 0, 
                    ease: "linear" 
                  }}
                  className="p-2 rounded-lg bg-white/20 backdrop-blur-sm"
                >
                  {isLoading(action.id) ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <action.icon className="w-4 h-4 text-white" />
                  )}
                </motion.div>
                <span className="text-xs font-semibold text-white">
                  {isLoading(action.id) ? 'Processing...' : action.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default QuickActionsToolbar;
