import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Clock, TrendingUp, Calendar, HardDrive } from 'lucide-react';

// Use global backend config
import { getClipVideoUrl } from '../config/backend';

const ClipPreviewModal = ({ clip, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef(null);

  if (!isOpen || !clip) return null;

  // Get video URL from clip using global config
  const videoUrl = getClipVideoUrl(clip);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Video Player */}
          <div className="relative bg-black flex items-center justify-center overflow-hidden">
            {videoUrl ? (
              <video
                ref={videoRef}
                controls
                preload="metadata"
                playsInline
                className="w-full h-full object-contain max-h-full"
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('Video load error:', e);
                  e.target.poster = null;
                }}
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center text-gray-500">
                  <Play className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Preview not available</p>
                </div>
              </div>
            )}

            {/* Play Button Overlay */}
            {videoUrl && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlay}
                  className="pointer-events-auto p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <Play className="w-12 h-12 text-white fill-white" />
                </motion.button>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">{clip.title}</h2>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Duration */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
                <Clock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="text-white font-medium">
                    {clip.duration ? formatDuration(clip.duration) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Size */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-gray-400">Size</p>
                  <p className="text-white font-medium">
                    {formatSize(clip.size)}
                  </p>
                </div>
              </div>

              {/* Created */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
                <Calendar className="w-5 h-5 text-pink-400" />
                <div>
                  <p className="text-xs text-gray-400">Created</p>
                  <p className="text-white font-medium">
                    {formatDate(clip.createdAt || clip.created_at)}
                  </p>
                </div>
              </div>

              {/* Viral Score */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
                <TrendingUp className={`w-5 h-5 ${getScoreColor(clip.viralScore || clip.viral_score)}`} />
                <div>
                  <p className="text-xs text-gray-400">Viral Score</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${getScoreBg(clip.viralScore || clip.viral_score || 0)} text-white text-sm font-bold`}>
                    {clip.viralScore || clip.viral_score || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Badge */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Platform:</span>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium border border-purple-500/30 capitalize">
                {clip.platform || 'Unknown'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClipPreviewModal;
