/**
 * BestClipCard - Displays the best performing clip
 * Part of Overlord-Level Analytics System
 */

import { memo, useState, useEffect } from 'react';
import { Trophy, Play, ExternalLink, Clock, Eye } from 'lucide-react';

const BestClipCard = ({ data, loading }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!loading && data) {
      setIsVisible(true);
    }
  }, [loading, data]);

  const getPlatformColor = (platform) => {
    const colors = {
      tiktok: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
      youtube: 'bg-red-500/20 border-red-500/30 text-red-400',
      instagram: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      facebook: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    };
    return colors[platform?.toLowerCase()] || colors.youtube;
  };

  const formatViews = (views) => {
    if (!views || views === 0) return 'N/A';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg" />
          <div className="h-5 bg-gray-700 rounded w-32" />
        </div>
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Best Performing Clip</h3>
            <p className="text-xs text-gray-400">Top viral score</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">No clips available yet</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 transition-all duration-500 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Trophy Icon */}
      <div className="absolute top-3 right-3">
        <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Best Performing Clip</h3>
          <p className="text-xs text-gray-400">Top viral score</p>
        </div>
      </div>

      {/* Clip Title */}
      <h4 className="text-lg font-bold text-white mb-3 truncate">
        {data.title || 'Untitled Clip'}
      </h4>

      {/* Platform Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPlatformColor(data.platform)}`}>
          {data.platform || 'YouTube'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-gray-400">Views</span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatViews(data.views)}
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-gray-400">Viral Score</span>
          </div>
          <div className="text-lg font-bold text-yellow-400">
            {data.viralScore || 0}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>
          {data.createdAt 
            ? new Date(data.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })
            : 'Unknown date'}
        </span>
      </div>
    </div>
  );
};

export default memo(BestClipCard);

