/**
 * AI Insights Panel - Premium Glassmorphism Design
 * Dashboard enhancement with animated metrics and visualizations
 */

import { motion } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3,
  Sparkles,
  Calendar,
  Activity
} from 'lucide-react';

// Animated Circular Progress Meter
const CircularProgress = ({ 
  value = 0, 
  size = 120, 
  strokeWidth = 8,
  color = '#8b5cf6',
  label,
  showValue = true 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-white"
          >
            {value}%
          </motion.span>
        )}
        {label && (
          <span className="text-xs text-gray-400 mt-1">{label}</span>
        )}
      </div>
    </div>
  );
};

// Risk Meter Component
const RiskMeter = ({ level = 'low' }) => {
  const config = {
    low: { 
      color: '#22c55e', 
      bg: 'from-green-500/20 to-emerald-500/20', 
      border: 'border-green-500/30',
      icon: CheckCircle,
      label: 'Low Risk',
      value: 25
    },
    medium: { 
      color: '#eab308', 
      bg: 'from-yellow-500/20 to-orange-500/20', 
      border: 'border-yellow-500/30',
      icon: AlertTriangle,
      label: 'Medium Risk',
      value: 55
    },
    high: { 
      color: '#ef4444', 
      bg: 'from-red-500/20 to-pink-500/20', 
      border: 'border-red-500/30',
      icon: AlertTriangle,
      label: 'High Risk',
      value: 85
    },
  };

  const current = config[level] || config.low;
  const Icon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl bg-gradient-to-br ${current.bg} border ${current.border}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Risk Level</span>
        <Icon className="w-4 h-4" style={{ color: current.color }} />
      </div>
      <div className="relative h-2 bg-gray-800/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${current.value}%` }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${current.color}, ${current.color}80)`,
            boxShadow: `0 0 10px ${current.color}`
          }}
        />
      </div>
      <div className="mt-2 text-sm font-medium" style={{ color: current.color }}>
        {current.label}
      </div>
    </motion.div>
  );
};

// Metric Card Component
const MetricCard = ({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  color = 'purple',
  trend,
  delay = 0 
}) => {
  const colorConfig = {
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
    blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/20' },
    pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
    orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  };

  const config = colorConfig[color] || colorConfig.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-xl bg-gray-900/50 border ${config.border} backdrop-blur-sm ${config.glow} shadow-lg`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </motion.div>
  );
};

// Best Timestamp Recommendation
const TimestampRecommendation = ({ timestamp, confidence, duration }) => {
  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate position percentage for display
  const positionPercent = duration ? (timestamp / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-xl bg-gray-900/50 border border-purple-500/30 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">Best Clip Start</span>
        <div className="flex items-center text-purple-400">
          <Zap className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{confidence}% confidence</span>
        </div>
      </div>
      
      {/* Timeline visualization */}
      <div className="relative h-8 bg-gray-800/50 rounded-lg overflow-hidden mb-2">
        {/* Progress fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${positionPercent}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500"
        />
        
        {/* Marker */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `calc(${positionPercent}% - 8px)` }}
          transition={{ duration: 1, delay: 0.5, type: 'spring' }}
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
          style={{ left: `${Math.max(0, positionPercent - 2)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>0:00</span>
        <span className="text-purple-400 font-medium">{formatTimestamp(timestamp)}</span>
        <span>{formatTimestamp(duration)}</span>
      </div>
    </motion.div>
  );
};

// Optimal Upload Time
const OptimalUploadTime = ({ time, timezone = 'WIB', day }) => {
  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-xl bg-gray-900/50 border border-blue-500/30 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">Optimal Upload Time</span>
        <Calendar className="w-4 h-4 text-blue-400" />
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-blue-500/20 rounded-xl">
          <Clock className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <div className="text-xl font-bold text-white">{time}</div>
          <div className="text-sm text-gray-400">{getDayName(day)}, {timezone}</div>
        </div>
      </div>
    </motion.div>
  );
};

// Main AI Insights Panel Component
const AIInsightsPanel = ({ 
  insights = {},
  className = '',
  showAll = true 
}) => {
  // Default values from props or sensible defaults
  const {
    viralScore = 0,
    engagementPrediction = 0,
    bestTimestamp = 0,
    bestTimestampDuration = 60,
    bestTimestampConfidence = 85,
    optimalTime = '19:00',
    optimalDay = 5, // Friday
    riskLevel = 'low',
    confidenceScore = 0,
  } = insights;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30"
          >
            <Brain className="w-6 h-6 text-purple-400" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Insights</h3>
            <p className="text-sm text-gray-400">Real-time predictions</p>
          </div>
        </div>
        
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30"
        >
          <Activity className="w-3 h-3 text-green-400 mr-2" />
          <span className="text-xs text-green-400 font-medium">Live</span>
        </motion.div>
      </div>

      {/* Main Metrics Grid */}
      {showAll && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Viral Hook Score */}
            <MetricCard
              icon={Sparkles}
              title="Hook Score"
              value={viralScore || 75}
              subtitle="Viral potential"
              color="pink"
              delay={0.1}
            />

            {/* Engagement Prediction */}
            <MetricCard
              icon={TrendingUp}
              title="Engagement"
              value={`${engagementPrediction || 68}%`}
              subtitle="Predicted engagement"
              color="green"
              trend={12}
              delay={0.2}
            />
          </div>

          {/* Confidence Meter - Circular Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-400">Confidence Score</h4>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            
            <div className="flex items-center justify-center">
              <CircularProgress 
                value={confidenceScore || 82} 
                size={140}
                strokeWidth={10}
                color="#8b5cf6"
                label="AI Confidence"
              />
            </div>
          </motion.div>

          {/* Risk Meter */}
          <RiskMeter level={riskLevel} />

          {/* Best Timestamp Recommendation */}
          <TimestampRecommendation 
            timestamp={bestTimestamp || 15}
            confidence={bestTimestampConfidence}
            duration={bestTimestampDuration}
          />

          {/* Optimal Upload Time */}
          <OptimalUploadTime 
            time={optimalTime}
            day={optimalDay}
          />
        </>
      )}
    </motion.div>
  );
};

export default AIInsightsPanel;
export { 
  AIInsightsPanel, 
  CircularProgress, 
  RiskMeter, 
  MetricCard,
  TimestampRecommendation,
  OptimalUploadTime 
};
