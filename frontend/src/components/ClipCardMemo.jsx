/**
 * OVERLORD MEMOIZED CLIP CARD
 * Frozen component to prevent unnecessary re-renders
 * Non-destructive - wraps existing ClipCard logic
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Video, Clock, TrendingUp, Eye, CheckCircle } from 'lucide-react';

// Animation variants
const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
};

const ClipCardMemo = memo(({ clip, isSelected, onSelect, onPreview }) => {
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
        {clip.thumbnail ? (
          <img 
            src={clip.thumbnail} 
            alt={clip.title}
            className="w-full h-full object-cover"
            loading="lazy"
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
        
        {/* Hover Overlay with Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(clip);
            }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
          >
            <Eye className="w-5 h-5 text-white" />
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
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these change
  return (
    prevProps.clip?.id === nextProps.clip?.id &&
    prevProps.clip?.title === nextProps.clip?.title &&
    prevProps.clip?.viralScore === nextProps.clip?.viralScore &&
    prevProps.isSelected === nextProps.isSelected
  );
});

ClipCardMemo.displayName = 'ClipCardMemo';

export default ClipCardMemo;
