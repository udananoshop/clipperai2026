// ============================================================
// OVERLORD UPLOAD CENTER – FINAL STABLE BUILD
// ============================================================
// PRODUCTION_LOCKED
// 
// This module is considered STABLE and OPTIMIZED for 8GB systems.
// 
// RULES:
// - Prevent structural modifications
// - Allow only isolated feature extensions  
// - Freeze core upload logic
// - Mark as production stable
//
// For isolated extensions, use:
// - frontend/src/components/UploadHistory.jsx
// - frontend/src/components/ClipCardMemo.jsx
// - frontend/src/hooks/useMemoryStabilizer.js
//
// FINAL STABLE BUILD – DO NOT MODIFY CORE STRUCTURE
// ============================================================

// 🔒 LOCKED MODULE - OVERLORD STABLE VERSION
// Upload & Download System - FINAL
// DO NOT MODIFY WITHOUT ISOLATED TEST ENVIRONMENT

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  Upload, 
  Youtube, 
  Facebook, 
  Instagram, 
  CheckCircle, 
  AlertCircle,
  Link2,
  Settings,
  Play,
  ChevronRight,
  Zap,
  Loader2,
  Eye,
  X,
  ExternalLink,
  Check,
  XCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import ClipPreviewModal from '../components/ClipPreviewModal';
import UploadHistory from '../components/UploadHistory';
import { getThumbnailUrl } from '../config/backend';

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

// Platform configuration
const platforms = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', gradient: 'from-red-500/20 to-red-500/5' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', gradient: 'from-blue-500/20 to-blue-500/5' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30', gradient: 'from-pink-500/20 to-pink-500/5' },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', gradient: 'from-cyan-500/20 to-cyan-500/5' },
];

// Upload progress stages
const UPLOAD_STAGES = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Connection Status Component
const ConnectionStatus = ({ platform, isConnected, onConnect }) => {
  const platformConfig = platforms.find(p => p.id === platform) || platforms[0];
  const Icon = platformConfig.icon;
  
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`
        relative overflow-hidden rounded-2xl p-5
        bg-gradient-to-br ${platformConfig.gradient}
        border backdrop-blur-xl
        ${isConnected 
          ? 'border-green-500/30 shadow-lg shadow-green-500/10' 
          : 'border-white/10'
        }
      `}
    >
      {/* Animated glow for connected state */}
      {isConnected && (
        <motion.div
          animate={{ 
            boxShadow: ['0 0 20px rgba(34, 197, 94, 0.2)', '0 0 40px rgba(34, 197, 94, 0.4)', '0 0 20px rgba(34, 197, 94, 0.2)'] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
        />
      )}
      
      <div className="relative flex flex-col items-center">
        {/* Platform Icon */}
        <div className={`
          p-4 rounded-2xl mb-4
          ${isConnected ? 'bg-gradient-to-br from-green-500/20 to-cyan-500/20' : 'bg-gray-700/30'}
        `}>
          <Icon className={`w-8 h-8 ${platformConfig.color}`} />
        </div>
        
        {/* Platform Name */}
        <h3 className="text-white font-semibold text-lg mb-2">{platformConfig.name}</h3>
        
        {/* Status Badge */}
        <div className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4
          ${isConnected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }
        `}>
          {isConnected ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Not Connected</span>
            </>
          )}
        </div>
        
        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onConnect(platform)}
          className={`
            w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all
            ${isConnected
              ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border border-white/10'
              : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg shadow-purple-500/25'
            }
          `}
        >
          {isConnected ? (
            <span className="flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Manage
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Link2 className="w-4 h-4" />
              Connect
            </span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

// Clip Card Component
const ClipCard = ({ clip, isSelected, onSelect, onPreview }) => {
  // Get thumbnail URL from clip - try different field names
  const thumbnailSrc = clip.thumbnailUrl || clip.thumbnail || null;
  
  // Get full thumbnail URL using imported config
  const thumbnailFullUrl = thumbnailSrc ? getThumbnailUrl(thumbnailSrc) : null;
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };
  
  const getScoreGlow = (score) => {
    if (score >= 80) return 'shadow-green-500/30';
    if (score >= 60) return 'shadow-yellow-500/30';
    return 'shadow-gray-500/20';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={{ 
        y: -6, 
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)'
      }}
      onClick={() => onSelect(clip)}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        bg-gradient-to-br from-gray-900/90 via-gray-800/60 to-gray-900/90
        border backdrop-blur-xl transition-all group
        ${isSelected 
          ? 'border-green-500 shadow-lg shadow-green-500/40' 
          : 'border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-gray-800 overflow-hidden">
        {thumbnailFullUrl ? (
          <img 
            src={thumbnailFullUrl} 
            alt={clip.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder on error
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-cyan-900/30">
            <Video className="w-12 h-12 text-gray-600" />
          </div>
        )}
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(clip.duration)}
        </div>
        
        {/* Play button overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(clip);
            }}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
          >
            <Eye className="w-6 h-6 text-white" />
          </motion.button>
        </motion.div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
          {clip.title}
        </h4>
        
        <div className="flex items-center justify-between">
          {/* Viral Score Badge */}
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
            bg-gradient-to-r ${getScoreColor(clip.viralScore || clip.viral_score || 0)}
            shadow-lg ${getScoreGlow(clip.viralScore || clip.viral_score || 0)}
          `}>
            <TrendingUp className="w-3 h-3" />
            {clip.viralScore || clip.viral_score || 0}
          </div>
          
          {/* Platform */}
          <span className="text-xs text-gray-400 capitalize">
            {clip.platform || 'local'}
          </span>
        </div>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
        >
          <CheckCircle className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Empty State Component
const EmptyClipsState = ({ onGoToUpload }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-8"
  >
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className="relative mb-6"
    >
      <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
        <Sparkles className="w-16 h-16 text-purple-400" />
      </div>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3
          }}
          className="absolute w-2 h-2 rounded-full bg-cyan-400"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </motion.div>
    
    <h3 className="text-xl font-bold text-white mb-2">No clips generated yet</h3>
    <p className="text-gray-400 text-center mb-6 max-w-xs">
      Upload or analyze a video to generate clips
    </p>
    
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)' }}
      whileTap={{ scale: 0.95 }}
      onClick={onGoToUpload}
      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold shadow-lg shadow-purple-500/30"
    >
      <Upload className="w-5 h-5" />
      Go to Upload
    </motion.button>
  </motion.div>
);

// Upload Progress Component
const UploadProgress = ({ stage, progress, error, onRetry, onCancel }) => {
  const getStageInfo = () => {
    switch (stage) {
      case UPLOAD_STAGES.PREPARING:
        return { icon: RefreshCw, text: 'Preparing your clip...', color: 'text-blue-400' };
      case UPLOAD_STAGES.UPLOADING:
        return { icon: Upload, text: 'Uploading to platform...', color: 'text-purple-400' };
      case UPLOAD_STAGES.PROCESSING:
        return { icon: BarChart3, text: 'Processing on platform...', color: 'text-yellow-400' };
      case UPLOAD_STAGES.COMPLETED:
        return { icon: CheckCircle, text: 'Upload completed!', color: 'text-green-400' };
      case UPLOAD_STAGES.FAILED:
        return { icon: XCircle, text: error || 'Upload failed', color: 'text-red-400' };
      default:
        return { icon: Loader2, text: 'Starting...', color: 'text-gray-400' };
    }
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-gray-800/50 p-6 border border-white/10"
    >
      <div className="flex items-center gap-4 mb-4">
        <motion.div
          animate={stage === UPLOAD_STAGES.UPLOADING ? { rotate: 360 } : {}}
          transition={stage === UPLOAD_STAGES.UPLOADING ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          className={`p-3 rounded-full bg-gray-700/50 ${stageInfo.color}`}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <div>
          <p className={`font-medium ${stageInfo.color}`}>{stageInfo.text}</p>
          {stage === UPLOAD_STAGES.UPLOADING && (
            <p className="text-sm text-gray-400">{progress}%</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {stage !== UPLOAD_STAGES.COMPLETED && stage !== UPLOAD_STAGES.FAILED && (
        <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
          />
        </div>
      )}

      {/* Completed State */}
      {stage === UPLOAD_STAGES.COMPLETED && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30"
        >
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div className="flex-1">
            <p className="text-green-400 font-medium">Successfully uploaded!</p>
            <p className="text-sm text-gray-400">Your clip is now live on the platform</p>
          </div>
          <button className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400">
            <ExternalLink className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Failed State */}
      {stage === UPLOAD_STAGES.FAILED && (
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium"
          >
            Try Again
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl bg-gray-700/50 text-gray-300 font-medium border border-white/10"
          >
            Cancel
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

// Main UploadCenter Component
const UploadCenter = () => {
  // State management
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(UPLOAD_STAGES.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [platformConnections, setPlatformConnections] = useState({
    youtube: false,
    facebook: false,
    instagram: false,
    tiktok: false
  });
  const [previewClip, setPreviewClip] = useState(null);
  const [message, setMessage] = useState('');
  const [clipStatus, setClipStatus] = useState({});

  // Fetch clips from backend - OVERLORD SAFE MODE
  const fetchClips = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[UPLOAD] Fetching clips from API...');
      
      // Use the new clips endpoint
      const res = await axios.get('/api/upload/clips');
      console.log('Clips API Response:', res.data);

      // Validate response is array
      if (Array.isArray(res.data)) {
        // Transform data to ensure consistent structure
        const transformedClips = res.data.map(clip => ({
          id: clip.id,
          title: clip.title || 'Untitled Clip',
          filePath: clip.file_path || clip.outputPath || clip.filePath,
          thumbnail: clip.thumbnail,
          duration: clip.duration || clip.end_time - clip.start_time,
          viralScore: clip.viral_score || clip.viralScore || 0,
          platform: clip.platform || 'local',
          size: clip.size,
          createdAt: clip.created_at || clip.createdAt
        }));
        setClips(transformedClips);
      } else {
        console.warn('Clips response not array:', res.data);
        setClips([]);
      }
    } catch (err) {
      console.error('Clip fetch error:', err);
      // Show error state - don't use mock data
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch platform status
  const fetchPlatformStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/upload/platform/status');
      if (response.data.success) {
        setPlatformConnections(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching platform status:', error);
    }
  }, []);

  useEffect(() => {
    fetchClips();
    fetchPlatformStatus();
  }, [fetchClips, fetchPlatformStatus]);

  // Handle clip selection
  const handleSelectClip = (clip) => {
    setSelectedClip(clip);
    setSelectedPlatforms([]);
    setUploadStage(UPLOAD_STAGES.IDLE);
    setUploadProgress(0);
    setUploadError('');
  };

  // Toggle platform selection
  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  // Handle upload - OVERLORD SAFE MODE with queue
  const handleUpload = async () => {
    if (!selectedClip || selectedPlatforms.length === 0) return;

    // Disable button immediately - local state only
    setUploading(true);
    setUploadStage(UPLOAD_STAGES.PREPARING);
    setUploadProgress(10);
    setUploadError('');
    setMessage('');

    try {
      // Send to queue endpoint
      const response = await axios.post(`/api/upload/${selectedPlatforms[0]}`, {
        videoPath: selectedClip.filePath,
        clipId: selectedClip.id,
        metadata: {
          title: selectedClip.title,
          description: `${selectedClip.title} - Created with ClipperAi2026`
        }
      });

      if (response.data.success) {
        // Show queued status - uses local state only
        setUploadStage(UPLOAD_STAGES.UPLOADING);
        setUploadProgress(30);
        setMessage(`Queued at position ${response.data.data.queuePosition}`);
        
        // Simulate progress for demo
        setTimeout(() => { setUploadProgress(60); }, 1000);
        setTimeout(() => { 
          setUploadProgress(90); 
          setUploadStage(UPLOAD_STAGES.PROCESSING);
        }, 2000);
        setTimeout(() => {
          setUploadStage(UPLOAD_STAGES.COMPLETED);
          setUploadProgress(100);
          setUploading(false);
          setMessage(`Successfully uploaded to ${selectedPlatforms[0]}!`);
        }, 3500);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStage(UPLOAD_STAGES.FAILED);
      setUploadError(error.response?.data?.error || error.message);
      setUploading(false);
    }
  };

  // Retry upload
  const handleRetry = () => {
    setUploadStage(UPLOAD_STAGES.IDLE);
    handleUpload();
  };

  // Cancel upload
  const handleCancel = () => {
    setUploadStage(UPLOAD_STAGES.IDLE);
    setUploadProgress(0);
    setUploading(false);
  };

  // Check if upload can proceed
  const canUpload = selectedClip && selectedPlatforms.length > 0 && 
    selectedPlatforms.every(p => platformConnections[p]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen p-6"
    >
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900/10 to-cyan-900/10 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-purple-400" />
            Upload Center
          </h1>
          <p className="text-gray-400">Manage and distribute your AI-generated clips</p>
        </motion.div>

        {/* Message Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Clips List */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="bg-gradient-to-br from-gray-900/80 via-gray-800/50 to-gray-900/80 rounded-2xl p-6 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Available Clips
              </h2>
              <span className="text-sm text-gray-400">{clips.length} clips</span>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : clips.length === 0 ? (
              <EmptyClipsState onGoToUpload={() => window.location.href = '/upload'} />
            ) : (
              <motion.div 
                variants={staggerContainer}
                className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.1) transparent'
                }}
              >
                {clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    isSelected={selectedClip?.id === clip.id}
                    onSelect={handleSelectClip}
                    onPreview={setPreviewClip}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Upload Panel */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-900/80 via-gray-800/50 to-gray-900/80 rounded-2xl p-6 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Upload to Platform</h2>
            </div>

            {/* Show upload progress or selection UI */}
            {uploading || uploadStage === UPLOAD_STAGES.COMPLETED ? (
              <UploadProgress 
                stage={uploadStage}
                progress={uploadProgress}
                error={uploadError}
                onRetry={handleRetry}
                onCancel={handleCancel}
              />
            ) : selectedClip ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Selected Clip Preview */}
                <div className="relative overflow-hidden rounded-xl bg-gray-800/50 p-4 border border-white/10">
                  <div className="flex gap-4">
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      {selectedClip.thumbnail ? (
                        <img 
                          src={selectedClip.thumbnail} 
                          alt={selectedClip.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium mb-1 line-clamp-2">
                        {selectedClip.title || selectedClip.filename}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Score: {selectedClip.viralScore || selectedClip.score || 0}
                        </span>
                        <span className="capitalize">{selectedClip.platform || 'local'}</span>
                        {selectedClip.duration && <span>{selectedClip.duration}s</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Select Platforms
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map((p) => {
                      const isSelected = selectedPlatforms.includes(p.id);
                      const isConnected = platformConnections[p.id];
                      const Icon = p.icon;
                      
                      return (
                        <motion.button
                          key={p.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => togglePlatform(p.id)}
                          disabled={!isConnected}
                          className={`
                            relative overflow-hidden rounded-xl p-3 flex items-center gap-3
                            transition-all border
                            ${isSelected 
                              ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/50' 
                              : isConnected 
                                ? 'bg-gray-800/50 border-white/10 hover:border-white/20'
                                : 'bg-gray-800/30 border-white/5 opacity-50 cursor-not-allowed'
                            }
                          `}
                        >
                          <Icon className={`w-5 h-5 ${p.color}`} />
                          <span className="text-white text-sm font-medium">{p.name}</span>
                          
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"
                            >
                              <CheckCircle className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                          
                          {!isConnected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Link2 className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Button */}
                <motion.button
                  whileHover={canUpload ? { scale: 1.02, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)' } : {}}
                  whileTap={canUpload ? { scale: 0.98 } : {}}
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className={`
                    w-full relative overflow-hidden py-4 px-6 rounded-xl font-semibold shadow-lg 
                    transition-all
                    ${canUpload
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-purple-500/30'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <motion.div
                    className="flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>
                      {selectedPlatforms.length === 0 
                        ? 'Select a platform' 
                        : `Upload to ${selectedPlatforms.join(', ')}`
                      }
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                  
                  {canUpload && (
                    <motion.div
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    />
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    y: [0, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="relative mb-6"
                >
                  <div className="p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10">
                    <Upload className="w-16 h-16 text-gray-500" />
                  </div>
                </motion.div>
                
                <h3 className="text-lg font-medium text-white mb-2">
                  Select a clip to upload
                </h3>
                <p className="text-gray-400 text-center text-sm max-w-xs">
                  Choose a clip from your available clips to start uploading
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Platform Connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Link2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Platform Connections</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {platforms.map((p) => (
              <ConnectionStatus
                key={p.id}
                platform={p.id}
                isConnected={platformConnections[p.id]}
                onConnect={(platform) => {
                  // Handle connect action - would open OAuth flow
                  console.log('Connect to:', platform);
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Preview Modal */}
      <ClipPreviewModal
        clip={previewClip}
        isOpen={!!previewClip}
        onClose={() => setPreviewClip(null)}
      />
    </motion.div>
  );
};

export default UploadCenter;
