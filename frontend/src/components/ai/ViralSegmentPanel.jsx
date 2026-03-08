/**
 * VIRAL SEGMENT PANEL
 * ClipperAI2026 - Dashboard Component for Viral Moment Detection
 * 
 * Displays:
 * - viralScore for each segment
 * - segment timestamp
 * - engagement level
 * 
 * This component extends the clip preview panel without modifying existing modules.
 */

import React from 'react';
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  Activity,
  Volume2,
  Mic,
  Film,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';

/**
 * Format timestamp to mm:ss
 */
const formatTimestamp = (seconds) => {
  if (!seconds && seconds !== 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get engagement level color
 */
const getEngagementColor = (level) => {
  switch (level) {
    case 'high':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'low':
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  }
};

/**
 * Get viral score color
 */
const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-gray-400';
};

/**
 * Get viral score background gradient
 */
const getScoreGradient = (score) => {
  if (score >= 80) return 'from-green-500 to-emerald-500';
  if (score >= 60) return 'from-yellow-500 to-orange-500';
  return 'from-gray-500 to-gray-600';
};

/**
 * Single Segment Card Component
 */
const SegmentCard = ({ segment, index, isSelected, onClick }) => {
  const {
    startTime,
    endTime,
    duration,
    viralScore,
    emotionScore,
    speechIntensity,
    sceneChangeScore,
    engagementLevel
  } = segment;
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border text-left transition-all ${
        isSelected 
          ? 'bg-purple-600/20 border-purple-500' 
          : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Header: Index + Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Segment {index + 1}</span>
          {isSelected && <Sparkles className="w-3 h-3 text-purple-400" />}
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${getScoreGradient(viralScore)} text-white text-xs font-bold`}>
          {viralScore}
        </div>
      </div>
      
      {/* Timestamp */}
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-white font-mono">
          {formatTimestamp(startTime)} → {formatTimestamp(endTime)}
        </span>
        <span className="text-gray-500 text-xs">({duration}s)</span>
      </div>
      
      {/* Metrics Row */}
      <div className="flex items-center gap-3 mb-2">
        {/* Engagement Level */}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getEngagementColor(engagementLevel)}`}>
          {engagementLevel || 'normal'}
        </span>
      </div>
      
      {/* Detailed Metrics */}
      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-700/50">
        <div className="text-center">
          <Mic className="w-3 h-3 mx-auto text-purple-400 mb-1" />
          <span className="text-xs text-gray-500">Speech</span>
          <p className={`text-xs font-medium ${getScoreColor(Math.round((speechIntensity || 0.5) * 100))}`}>
            {Math.round((speechIntensity || 0.5) * 100)}%
          </p>
        </div>
        <div className="text-center">
          <Activity className="w-3 h-3 mx-auto text-pink-400 mb-1" />
          <span className="text-xs text-gray-500">Emotion</span>
          <p className={`text-xs font-medium ${getScoreColor(emotionScore || 50)}`}>
            {Math.round(emotionScore || 50)}
          </p>
        </div>
        <div className="text-center">
          <Film className="w-3 h-3 mx-auto text-cyan-400 mb-1" />
          <span className="text-xs text-gray-500">Scene</span>
          <p className={`text-xs font-medium ${getScoreColor(Math.round((sceneChangeScore || 0.2) * 100))}`}>
            {Math.round((sceneChangeScore || 0.2) * 100)}%
          </p>
        </div>
      </div>
    </button>
  );
};

/**
 * Main Viral Segment Panel Component
 */
const ViralSegmentPanel = ({ 
  segments = [], 
  selectedSegment, 
  onSelectSegment,
  isLoading = false,
  error = null,
  fallbackUsed = false
}) => {
  // If no segments and not loading, show empty state
  if (!isLoading && segments.length === 0 && !error) {
    return (
      <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Viral Moments</h3>
        </div>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">
            No viral segments detected yet
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Upload a video to analyze viral moments
          </p>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Viral Moments</h3>
          <span className="ml-auto">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-800/50 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-4 w-20 bg-gray-700 rounded" />
                <div className="h-5 w-10 bg-gray-700 rounded" />
              </div>
              <div className="h-4 w-32 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-6 bg-gray-800/30 rounded-xl border border-red-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-red-400" />
          <h3 className="text-white font-medium">Viral Moments</h3>
        </div>
        <div className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm">Analysis unavailable</p>
            <p className="text-gray-500 text-xs mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Viral Moments</h3>
          <span className="text-xs text-gray-500">({segments.length})</span>
        </div>
        {fallbackUsed && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            Using fallback
          </span>
        )}
      </div>
      
      {/* Summary Stats */}
      {segments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-green-400 mb-1" />
            <p className="text-xs text-gray-500">Top Score</p>
            <p className={`text-lg font-bold ${getScoreColor(segments[0]?.viralScore || 0)}`}>
              {segments[0]?.viralScore || 0}
            </p>
          </div>
          <div className="text-center">
            <Activity className="w-4 h-4 mx-auto text-purple-400 mb-1" />
            <p className="text-xs text-gray-500">Avg Score</p>
            <p className="text-lg font-bold text-white">
              {Math.round(segments.reduce((sum, s) => sum + (s.viralScore || 0), 0) / segments.length)}
            </p>
          </div>
          <div className="text-center">
            <Volume2 className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
            <p className="text-xs text-gray-500">Segments</p>
            <p className="text-lg font-bold text-white">{segments.length}</p>
          </div>
        </div>
      )}
      
      {/* Segment List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {segments.map((segment, index) => (
          <SegmentCard
            key={segment.id || index}
            segment={segment}
            index={index}
            isSelected={selectedSegment?.id === segment.id || selectedSegment === index}
            onClick={() => onSelectSegment && onSelectSegment(segment, index)}
          />
        ))}
      </div>
      
      {/* View More Button */}
      {segments.length > 5 && (
        <button className="w-full mt-4 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 text-sm flex items-center justify-center gap-1 transition-colors">
          View all {segments.length} segments
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Compact version for inline display
 */
export const ViralSegmentBadge = ({ segment }) => {
  if (!segment) return null;
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/30 border border-purple-500/30">
      <Zap className="w-3 h-3 text-purple-400" />
      <span className="text-xs text-gray-400">Viral:</span>
      <span className={`text-sm font-bold ${getScoreColor(segment.viralScore)}`}>
        {segment.viralScore}
      </span>
      <span className="text-gray-600">|</span>
      <Clock className="w-3 h-3 text-gray-500" />
      <span className="text-xs text-gray-400">
        {formatTimestamp(segment.startTime)}-{formatTimestamp(segment.endTime)}
      </span>
    </div>
  );
};

export default ViralSegmentPanel;

