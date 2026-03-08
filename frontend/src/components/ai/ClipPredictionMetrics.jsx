import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Clock, Zap, Award, TrendingUp } from 'lucide-react';

const DEFAULT_PREDICTION = {
  predictedViews: { min: 10000, max: 50000 },
  retention: 72,
  bestDuration: '45s',
  viralScore: 78,
};

const ClipPredictionMetrics = ({ prediction, clips = [] }) => {
  const data = prediction || DEFAULT_PREDICTION;

  // If clips are provided, calculate average metrics
  const avgViralScore = clips.length > 0 
    ? Math.round(clips.reduce((sum, clip) => sum + (clip.viral_score || 0), 0) / clips.length)
    : data.viralScore;

  const getViralScoreColor = (score) => {
    if (score >= 75) return { 
      bg: 'bg-green-500', 
      text: 'text-green-400', 
      border: 'border-green-500/30',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
      gradient: 'from-green-500 to-emerald-500'
    };
    if (score >= 50) return { 
      bg: 'bg-yellow-500', 
      text: 'text-yellow-400', 
      border: 'border-yellow-500/30',
      glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]',
      gradient: 'from-yellow-500 to-orange-500'
    };
    return { 
      bg: 'bg-red-500', 
      text: 'text-red-400', 
      border: 'border-red-500/30',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
      gradient: 'from-red-500 to-pink-500'
    };
  };

  const getViralScoreLabel = (score) => {
    if (score >= 75) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  const viralStyle = getViralScoreColor(avgViralScore);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/60 via-purple-900/10 to-gray-900/60 border border-white/10 backdrop-blur-xl p-5"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-orange-500/5" />
      
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
            className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30"
          >
            <Award className="w-5 h-5 text-amber-400" />
          </motion.div>
          <div>
            <span className="text-lg font-bold text-white">Prediction Metrics</span>
            <p className="text-xs text-gray-400">AI-powered insights</p>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Predicted Views */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Predicted Views</span>
            </div>
            <div className="text-lg font-bold text-white">
              {data.predictedViews?.min?.toLocaleString() || '0'} - {data.predictedViews?.max?.toLocaleString() || '0'}
            </div>
          </motion.div>

          {/* Retention */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Retention</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-lg font-bold text-white">{data.retention || 0}%</div>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.retention || 0}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Best Duration */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Best Duration</span>
            </div>
            <div className="text-lg font-bold text-white">{data.bestDuration || 'N/A'}</div>
          </motion.div>

          {/* Viral Score - Premium */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-xl bg-gray-800/50 border ${viralStyle.border} ${viralStyle.glow}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className={`w-4 h-4 ${viralStyle.text}`} />
              <span className="text-xs text-gray-400">Viral Score</span>
            </div>
            <div className="flex items-center justify-between">
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-2xl font-bold ${viralStyle.text}`}
              >
                {avgViralScore || 0}
              </motion.span>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${viralStyle.bg}`}
              >
                {getViralScoreLabel(avgViralScore)}
              </motion.div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${avgViralScore}%` }}
                transition={{ duration: 1, delay: 0.4 }}
                className={`h-full bg-gradient-to-r ${viralStyle.gradient} rounded-full`}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClipPredictionMetrics;
