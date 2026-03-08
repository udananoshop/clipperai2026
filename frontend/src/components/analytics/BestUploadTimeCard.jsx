/**
 * BestUploadTimeCard - Displays the best time to upload
 * Part of Overlord-Level Analytics System
 */

import { memo, useState, useEffect } from 'react';
import { Clock, Calendar, Zap, Target, TrendingUp } from 'lucide-react';

const BestUploadTimeCard = ({ data, loading }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!loading && data) {
      setIsVisible(true);
    }
  }, [loading, data]);

  const formatHour = (hour) => {
    const h = hour % 24;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:00 ${suffix}`;
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg" />
          <div className="h-5 bg-gray-700 rounded w-32" />
        </div>
        <div className="h-12 bg-gray-700 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  if (!data || !data.timeRange) {
    return (
      <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Best Upload Time</h3>
            <p className="text-xs text-gray-400">Optimal posting schedule</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">Not enough data yet</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 transition-all duration-500 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Clock Icon */}
      <div className="absolute top-3 right-3">
        <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Best Upload Time</h3>
          <p className="text-xs text-gray-400">Optimal posting schedule</p>
        </div>
      </div>

      {/* Main Time Display */}
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <span className="text-xl font-bold text-cyan-400">{data.timeRange}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-400">Avg Viral Score</span>
          </div>
          <div className="text-lg font-bold text-white">
            {data.avgViralScore || 0}
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-gray-400">Sample Size</span>
          </div>
          <div className="text-lg font-bold text-white">
            {data.sampleSize || 0} clips
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">
            {data.recommendation || 'Upload during peak hours for better engagement'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Analyzed from your upload history</span>
        </div>
      </div>
    </div>
  );
};

export default memo(BestUploadTimeCard);

