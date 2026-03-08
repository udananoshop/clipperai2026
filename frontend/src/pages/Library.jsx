/**
 * Video Library Page
 * Displays organized library with uploads, downloads, and clips by platform
 * Lightweight - no heavy processing, just file listing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Download,
  Play,
  Film,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
  Video,
  Instagram,
  Facebook,
  Youtube,
  ArrowLeft,
  Grid,
  List
} from 'lucide-react';

// Import backend config for video URL conversion
import { getVideoUrl, getThumbnailUrl } from '../config/backend';
import ClipPreviewModal from '../components/ClipPreviewModal';

// Platform configurations
const platformConfig = {
  tiktok: {
    name: 'TikTok',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    icon: Play
  },
  youtube: {
    name: 'YouTube',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
    icon: Youtube
  },
  instagram: {
    name: 'Instagram',
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
    borderColor: 'border-pink-400/30',
    icon: Instagram
  },
  facebook: {
    name: 'Facebook',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    icon: Facebook
  }
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

// Video Card Component
const VideoCard = ({ item, platform, onPreview }) => {
  const config = platform ? platformConfig[platform] : null;
  
  // Get thumbnail URL from item
  const thumbnailSrc = item.thumbnailUrl || item.thumbnail || null;
  
  // Get full thumbnail URL using backend config (imported at top)
  const thumbnailFullUrl = thumbnailSrc ? getThumbnailUrl(thumbnailSrc) : null;
  
  const formatSize = (bytes) => {
    if (!bytes) return '--';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      whileHover={{ 
        y: -4,
        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.2)'
      }}
      onClick={() => onPreview && onPreview(item)}
      className="bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-gray-800">
        {thumbnailFullUrl ? (
          <img 
            src={thumbnailFullUrl} 
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon on error
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {config ? (
              React.createElement(config.icon, { className: `w-12 h-12 ${config.color}` })
            ) : (
              <Film className="w-12 h-12 text-gray-600" />
            )}
          </div>
        )}
        
        {/* Platform badge */}
        {platform && config && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-md ${config.bgColor} border ${config.borderColor}`}>
            <span className={`text-xs font-medium ${config.color}`}>{config.name}</span>
          </div>
        )}
        
        {/* Duration badge */}
        {item.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-xs text-white">
            {item.duration}s
          </div>
        )}
        
        {/* Play icon overlay when hovering */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white" />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
          {item.title || item.filename}
        </h4>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(item.createdAt || item.created)}
          </span>
          <span>{formatSize(item.size)}</span>
        </div>
        
        {/* Viral Score if available */}
        {item.viralScore && (
          <div className="mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs font-medium text-green-400">
              {item.viralScore}
            </span>
          </div>
        )}
        
{/* View button - open in modal instead of new tab */}
        {item.url && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview && onPreview(item);
            }}
            className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
          >
            <Play className="w-4 h-4" />
            View
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Empty State Component
const EmptyState = ({ type, onBack }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16"
  >
    <div className="p-6 rounded-3xl bg-gray-800/50 mb-4">
      <FolderOpen className="w-16 h-16 text-gray-600" />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">No {type} found</h3>
    <p className="text-gray-400 text-center mb-6">
      {type === 'uploads' && 'Upload videos to see them here'}
      {type === 'downloads' && 'Download videos to see them here'}
      {type === 'clips' && 'Generate clips to see them here'}
    </p>
    {onBack && (
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Go Back
      </button>
    )}
  </motion.div>
);

// Main Library Component
const Library = () => {
  const { type, platform } = useParams();
  const navigate = useNavigate();
  
const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [previewClip, setPreviewClip] = useState(null);

  // Determine current view type
  const currentType = type || 'uploads';
  const currentPlatform = platform;

  // Fetch data based on type and platform
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '/api/library/';
      
      if (currentPlatform) {
        endpoint += `clips/${currentPlatform}`;
      } else if (currentType === 'downloads') {
        endpoint += 'downloads';
      } else {
        endpoint += 'uploads';
      }
      
      console.log('[Library] Fetching from:', endpoint);
      const res = await axios.get(endpoint);
      
      if (res.data.success) {
        const dataKey = currentPlatform ? 'clips' : currentType;
        setItems(res.data[dataKey] || []);
      } else {
        setError(res.data.error || 'Failed to load');
        setItems([]);
      }
    } catch (err) {
      console.error('[Library] Error:', err);
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentType, currentPlatform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get page title
  const getTitle = () => {
    if (currentPlatform && platformConfig[currentPlatform]) {
      return `${platformConfig[currentPlatform].name} Clips`;
    }
    if (currentType === 'downloads') return 'Downloads';
    return 'Uploads';
  };

  // Get icon for header
  const getIcon = () => {
    if (currentPlatform && platformConfig[currentPlatform]) {
      return React.createElement(platformConfig[currentPlatform].icon, { 
        className: `w-6 h-6 ${platformConfig[currentPlatform].color}` 
      });
    }
    if (currentType === 'downloads') return <Download className="w-6 h-6 text-green-400" />;
    return <FolderOpen className="w-6 h-6 text-purple-400" />;
  };

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
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back button for platform views */}
              {(currentPlatform || currentType === 'downloads') && (
                <button
                  onClick={() => navigate('/library/uploads')}
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              
              <div className="p-3 rounded-xl bg-gray-800/50">
                {getIcon()}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  {getTitle()}
                </h1>
                <p className="text-gray-400 mt-1">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              
              {/* Refresh button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <EmptyState 
            type={currentPlatform ? 'clips' : currentType} 
            onBack={() => navigate('/library/uploads')}
          />
        )}

        {/* Video Grid */}
        {!loading && items.length > 0 && (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            className={`
              ${viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
                : 'space-y-3'
              }
            `}
          >
{items.map((item, index) => (
              <VideoCard 
                key={item.id || item.filename || index} 
                item={item}
                platform={item.platform || currentPlatform}
                onPreview={setPreviewClip}
              />
            ))}
          </motion.div>
)}
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

export default Library;

