/**
 * AI Job Status Card - Premium Glassmorphism Design
 * Real-time progress tracking with smooth animations
 */

import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Zap,
  FileText,
  Mic,
  Sparkles,
  TrendingUp,
  Hash,
  Save
} from 'lucide-react';

const stepIcons = {
  'starting': Zap,
  'extracting_metadata': FileText,
  'metadata_extracted': FileText,
  'generating_subtitles': Mic,
  'subtitles_generated': Mic,
  'analyzing_viral_hook': Sparkles,
  'viral_hooks_detected': Sparkles,
  'generating_predictions': TrendingUp,
  'predictions_generated': TrendingUp,
  'generating_title_hashtags': Hash,
  'title_generated': Hash,
  'saving_results': Save,
  'completed': CheckCircle2,
  'failed': XCircle,
};

const stepLabels = {
  'starting': 'Initializing...',
  'extracting_metadata': 'Extracting video metadata',
  'metadata_extracted': 'Metadata extracted',
  'generating_subtitles': 'Generating subtitles',
  'subtitles_generated': 'Subtitles generated',
  'analyzing_viral_hook': 'Analyzing viral hooks',
  'viral_hooks_detected': 'Viral hooks detected',
  'generating_predictions': 'Generating clip predictions',
  'predictions_generated': 'Predictions ready',
  'generating_title_hashtags': 'Generating title & hashtags',
  'title_generated': 'Title generated',
  'saving_results': 'Saving results',
  'completed': 'Processing complete!',
  'failed': 'Processing failed',
};

const AnimatedProgressBar = ({ progress, status }) => {
  const isProcessing = status === 'processing' || status === 'pending';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className="relative h-3 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ 
          duration: 0.5, 
          ease: 'easeOut',
          delay: 0.2
        }}
        className={`absolute left-0 top-0 h-full rounded-full ${
          isFailed 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : isCompleted
              ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-400'
              : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500'
        }`}
      />
      
      {/* Animated glow effect while processing */}
      {isProcessing && (
        <motion.div
          animate={{ 
            backgroundPosition: ['200% 0', '-200% 0'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]"
        />
      )}
    </div>
  );
};

const AnimatedNumber = ({ value, suffix = '' }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="font-mono"
    >
      {value}{suffix}
    </motion.span>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    'pending': { 
      bg: 'bg-blue-500/20', 
      text: 'text-blue-400', 
      border: 'border-blue-500/30',
      icon: Clock,
      pulse: true
    },
    'processing': { 
      bg: 'bg-purple-500/20', 
      text: 'text-purple-400', 
      border: 'border-purple-500/30',
      icon: Loader2,
      pulse: true
    },
    'completed': { 
      bg: 'bg-green-500/20', 
      text: 'text-green-400', 
      border: 'border-green-500/30',
      icon: CheckCircle2,
      pulse: false
    },
    'failed': { 
      bg: 'bg-red-500/20', 
      text: 'text-red-400', 
      border: 'border-red-500/30',
      icon: XCircle,
      pulse: false
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-3 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border}`}
    >
      <motion.div
        animate={config.pulse ? { rotate: 360 } : {}}
        transition={config.pulse ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Icon className="w-4 h-4 mr-2" />
      </motion.div>
      <span className="text-sm font-medium capitalize">{status}</span>
    </motion.div>
  );
};

const EstimatedTime = ({ progress, status }) => {
  if (status === 'completed' || status === 'failed') return null;

  // Estimate time remaining based on progress
  const estimatedSeconds = Math.max(0, Math.round((100 - progress) * 0.5));
  
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center text-sm text-gray-400"
    >
      <Clock className="w-4 h-4 mr-2" />
      <span>~{formatTime(estimatedSeconds)} remaining</span>
    </motion.div>
  );
};

const AIJobStatusCard = ({ 
  job = {},
  progress = 0,
  step = 'starting',
  status = 'pending',
  showEstimatedTime = true,
  size = 'default', // 'small' | 'default' | 'large'
}) => {
  const currentProgress = job.progress ?? progress;
  const currentStep = job.currentStep ?? step;
  const currentStatus = job.status ?? status;

  const StepIcon = stepIcons[currentStep] || Zap;
  const stepLabel = stepLabels[currentStep] || 'Processing...';

  const isProcessing = currentStatus === 'processing' || currentStatus === 'pending';
  const isCompleted = currentStatus === 'completed';
  const isFailed = currentStatus === 'failed';

  const sizeClasses = {
    small: { container: 'p-4', progress: 'h-1.5', icon: 'w-8 h-8', text: 'text-sm', number: 'text-xl' },
    default: { container: 'p-6', progress: 'h-2.5', icon: 'w-12 h-12', text: 'text-base', number: 'text-3xl' },
    large: { container: 'p-8', progress: 'h-3', icon: 'w-16 h-16', text: 'lg:text-lg', number: 'text-4xl' },
  };

  const sizeConfig = sizeClasses[size] || sizeClasses.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/90 via-purple-900/20 to-gray-900/90 border border-white/10 backdrop-blur-xl shadow-2xl ${sizeConfig.container}`}
    >
      {/* Glow effect when processing */}
      {isProcessing && (
        <motion.div
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-2xl pointer-events-none"
        />
      )}

      {/* Success animation overlay */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 rounded-2xl pointer-events-none"
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`${sizeConfig.icon} rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-purple-500/30`}
            >
              <StepIcon className={`${size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-8 h-8' : 'w-6 h-6'} text-purple-400`} />
            </motion.div>
            <div>
              <h3 className={`font-semibold text-white ${sizeConfig.text}`}>AI Processing</h3>
              <p className="text-sm text-gray-400">{stepLabel}</p>
            </div>
          </div>
          <StatusBadge status={currentStatus} />
        </div>

        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <motion.span 
              className={`${sizeConfig.number} font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent`}
            >
              <AnimatedNumber value={currentProgress} suffix="%" />
            </motion.span>
          </div>
          <AnimatedProgressBar progress={currentProgress} status={currentStatus} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {showEstimatedTime && (
            <EstimatedTime progress={currentProgress} status={currentStatus} />
          )}
          
          {/* Step indicator dots */}
          <div className="flex items-center space-x-1">
            {[10, 30, 50, 70, 90, 100].map((p, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`w-2 h-2 rounded-full ${
                  currentProgress >= p 
                    ? isFailed 
                      ? 'bg-red-500' 
                      : isCompleted 
                        ? 'bg-green-500' 
                        : 'bg-purple-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Result preview when completed */}
        {isCompleted && job.result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="text-sm text-gray-400">
              {job.result.title && (
                <p className="text-white truncate">Title: {job.result.title}</p>
              )}
              {job.result.hookScore && (
                <p className="text-green-400">Hook Score: {job.result.hookScore}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Error message when failed */}
        {isFailed && job.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-red-500/30"
          >
            <p className="text-sm text-red-400">{job.error}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AIJobStatusCard;
