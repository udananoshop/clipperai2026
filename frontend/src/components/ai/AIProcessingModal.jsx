/**
 * AI Processing Modal - Fullscreen Overlay
 * Premium glassmorphism design with smooth animations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Download, Sparkles } from 'lucide-react';
import AIJobStatusCard from './AIJobStatusCard';
import useAIProgress from '../../hooks/useAIProgress';

const AIProcessingModal = ({ 
  isOpen, 
  onClose, 
  jobId,
  job,
  onViewResult,
  onComplete,
  size = 'default',
  showViewResult = true,
}) => {
  // Use WebSocket hook for real-time updates
  const {
    progress,
    step,
    status,
    estimatedTime,
    result,
    error,
    isConnected,
    isProcessing,
    isCompleted,
    isFailed,
  } = useAIProgress(jobId, {
    autoConnect: isOpen && !!jobId,
    onComplete: (result) => {
      if (onComplete) {
        onComplete(result);
      }
    },
    onError: (err) => {
      console.error('[AIProcessingModal] Error:', err);
    },
  });

  // Merge WebSocket data with prop data
  const mergedJob = {
    ...job,
    progress: progress,
    currentStep: step,
    status: status,
    estimatedTime,
    result: result || job?.result,
    error: error || job?.error,
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    // Only close if clicking outside and processing is complete
    if (e.target === e.currentTarget && (isCompleted || isFailed || !isProcessing)) {
      onClose();
    }
  };

  // Handle view result action
  const handleViewResult = () => {
    if (onViewResult) {
      onViewResult(result || mergedJob);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(20px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/70"
          />

          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 opacity-20"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)',
                backgroundSize: '200% 200%',
              }}
            />
          </div>

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.16, 1, 0.3, 1], // Smooth easing
              delay: 0.1 
            }}
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute -top-4 -right-4 z-10 p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-sm transition-colors"
              disabled={isProcessing}
            >
              <X className="w-5 h-5 text-white/80" />
            </motion.button>

            {/* Connection status indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-4 -left-4 z-10"
            >
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                isConnected 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-yellow-400'
                }`} />
                {isConnected ? 'Live' : 'Connecting...'}
              </div>
            </motion.div>

            {/* Main Card */}
            <AIJobStatusCard 
              job={mergedJob}
              progress={progress}
              step={step}
              status={status}
              showEstimatedTime={true}
              size={size}
            />

            {/* Action Buttons - Show when completed or failed */}
            <AnimatePresence>
              {(isCompleted || isFailed) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 flex justify-center space-x-4"
                >
                  {isCompleted && showViewResult && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleViewResult}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 transition-all"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      View Results
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold text-white backdrop-blur-sm transition-all"
                  >
                    {isFailed ? 'Close' : 'Done'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing hint */}
            {isProcessing && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-center text-sm text-gray-400"
              >
                {isConnected 
                  ? 'Processing in real-time... You can minimize this modal.'
                  : 'Connecting to live updates...'}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Wrapper component with job polling fallback
export const AIProcessingModalWithJob = ({ 
  isOpen, 
  onClose, 
  jobId,
  onViewResult,
  onComplete,
  pollInterval = 3000,
  size = 'default',
  showViewResult = true,
}) => {
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Poll for job status if WebSocket doesn't work
  useEffect(() => {
    if (!isOpen || !jobId) return;

    const fetchJobStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/ai/pipeline/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
          setJobData(data.job);
          
          // Auto-close on completion if callback provided
          if (data.job.status === 'completed' && onComplete) {
            onComplete(data.job);
          }
        }
      } catch (err) {
        console.error('[AIProcessingModal] Polling error:', err);
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Set up polling if still processing
    if (jobData?.status === 'processing' || jobData?.status === 'pending') {
      const interval = setInterval(fetchJobStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [isOpen, jobId, pollInterval, onComplete, jobData?.status]);

  return (
    <AIProcessingModal
      isOpen={isOpen}
      onClose={onClose}
      jobId={jobId}
      job={jobData}
      onViewResult={onViewResult}
      onComplete={onComplete}
      size={size}
      showViewResult={showViewResult}
    />
  );
};

import { useState, useEffect } from 'react';

export default AIProcessingModal;
export { AIProcessingModalWithJob };
