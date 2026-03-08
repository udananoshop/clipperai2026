/**
 * AI Strategy Insights Panel
 * ClipperAI2026 - Dashboard Component
 * 
 * Displays:
 * - Best Upload Time
 * - Viral Probability
 * - Trending Topic
 * - Recommended Format
 * - Strategy Summary
 * 
 * Auto-refreshes every 60 seconds
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Clock,
  TrendingUp,
  Target,
  Zap,
  Lightbulb,
  RefreshCw,
  Brain,
  Sparkles
} from 'lucide-react';

const AIStrategyInsights = ({ token }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const fetchedRef = useRef(false);

  // Fetch insights from API
  const fetchInsights = async () => {
    try {
      setError(null);
      const response = await axios.get('/api/dashboard/ai-insight', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.data?.success && response.data?.data) {
        setInsights(response.data.data);
        setLastUpdated(new Date());
      } else {
        // Use default values if API returns unexpected format
        setInsights(getDefaultInsights());
      }
    } catch (err) {
      console.error('[AIStrategyInsights] Fetch error:', err.message);
      // Don't show error to user, use defaults
      setInsights(getDefaultInsights());
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    fetchInsights();
    
    // Auto-refresh every 60 seconds
    intervalRef.current = setInterval(() => {
      fetchInsights();
    }, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Loading...';
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 5) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    return `${diffMins}m ago`;
  };

  // Get default insights fallback
  const getDefaultInsights = () => ({
    bestUploadTime: '19:30',
    viralProbability: '55%',
    recommendedFormat: 'Short Clip',
    trendingTopic: 'AI Tools',
    topClip: 'Video #1',
    strategySummary: 'Upload consistently for best results',
    timestamp: new Date().toISOString()
  });

  // Loading skeleton
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-purple-500/30 animate-pulse" />
            <div className="h-5 w-40 bg-gray-700/50 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-24 bg-gray-700/30 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-700/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Get viral probability color
  const getViralColor = (prob) => {
    const num = parseInt(prob) || 0;
    if (num >= 75) return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: '🟢' };
    if (num >= 50) return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: '🟡' };
    return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: '🔴' };
  };

  const viralStyle = getViralColor(insights?.viralProbability);

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
            className="p-2 bg-purple-500/20 rounded-xl"
          >
            <Brain className="w-5 h-5 text-purple-400" />
          </motion.div>
          <div>
            <h3 className="text-gray-200 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Strategy Insights
            </h3>
            <p className="text-xs text-gray-500">Auto-refreshes every 60s</p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchInsights}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </motion.button>
      </div>

      {/* Insights Grid */}
      <div className="space-y-3">
        {/* Best Upload Time */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm text-gray-400">Best Upload Time</span>
          </div>
          <span className="text-sm font-semibold text-blue-300">
            {insights?.bestUploadTime || '19:30'}
          </span>
        </motion.div>

        {/* Viral Probability */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className={`flex items-center justify-between p-3 rounded-xl border ${viralStyle.bg} ${viralStyle.border}`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <TrendingUp className={`w-4 h-4 ${viralStyle.text}`} />
            </div>
            <span className="text-sm text-gray-400">Viral Probability</span>
          </div>
          <span className={`text-sm font-bold ${viralStyle.text}`}>
            {viralStyle.icon} {insights?.viralProbability || '55%'}
          </span>
        </motion.div>

        {/* Trending Topic */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-sm text-gray-400">Trending Topic</span>
          </div>
          <span className="text-sm font-semibold text-orange-300">
            {insights?.trendingTopic || 'AI Tools'}
          </span>
        </motion.div>

        {/* Recommended Format */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-sm text-gray-400">Recommended Format</span>
          </div>
          <span className="text-sm font-semibold text-cyan-300">
            {insights?.recommendedFormat || 'Short Clip'}
          </span>
        </motion.div>

        {/* Strategy Summary */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Strategy Summary</span>
          </div>
          <p className="text-sm text-purple-200 leading-relaxed">
            {insights?.strategySummary || 'Upload consistently for best results'}
          </p>
        </motion.div>
      </div>

      {/* Footer - Last Updated */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Last updated: {formatLastUpdated()}
        </span>
        <span className="text-xs text-gray-600">
          {insights?.cached ? '📦 Cached' : '🔄 Live'}
        </span>
      </div>

      {/* Background Glow Effect */}
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/20 blur-2xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-pink-500/10 blur-2xl rounded-full pointer-events-none" />
    </motion.div>
  );
};

export default AIStrategyInsights;

