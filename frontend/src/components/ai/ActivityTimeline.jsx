import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Upload, 
  AudioWaveform, 
  Target, 
  Scissors, 
  TrendingUp, 
  CheckCircle,
  Sparkles,
  Video,
  Zap
} from 'lucide-react';

const DEFAULT_TIMELINE = [
  {
    id: 1,
    type: 'completed',
    title: 'Video Processing Complete',
    description: 'Final viral scoring completed',
    timestamp: '2 min ago',
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    borderColor: 'border-green-500/30',
  },
  {
    id: 2,
    type: 'completed',
    title: 'Viral Scoring',
    description: 'Analyzed engagement potential',
    timestamp: '3 min ago',
    icon: TrendingUp,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 3,
    type: 'completed',
    title: 'Clip Selection',
    description: 'Selected 3 optimal clips',
    timestamp: '4 min ago',
    icon: Scissors,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 4,
    type: 'completed',
    title: 'Hook Detection',
    description: 'Found 5 strong hooks',
    timestamp: '5 min ago',
    icon: Target,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/20',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 5,
    type: 'completed',
    title: 'Audio Analysis',
    description: 'Speech & music analyzed',
    timestamp: '6 min ago',
    icon: AudioWaveform,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/20',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 6,
    type: 'completed',
    title: 'Upload Received',
    description: 'video_2024.mp4 uploaded',
    timestamp: '8 min ago',
    icon: Upload,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20',
    borderColor: 'border-gray-500/30',
  },
];

const ActivityTimeline = ({ activities, title = 'Activity Timeline' }) => {
  const timeline = activities || DEFAULT_TIMELINE;

  const getIcon = (item) => {
    const Icon = item.icon || Activity;
    return <Icon className={`w-4 h-4 ${item.color}`} />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl h-full"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5" />
      
      <div className="relative p-5 h-full flex flex-col">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3 mb-5"
        >
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30"
          >
            <Activity className="w-5 h-5 text-blue-400" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-gray-400">Real-time updates</p>
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <AnimatePresence>
            {timeline.map((item, index) => (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex space-x-3 group"
              >
                {/* Icon & Line */}
                <div className="flex flex-col items-center">
                  <motion.div 
                    whileHover={{ scale: 1.2 }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bgColor} border ${item.borderColor || 'border-white/10'} backdrop-blur-sm`}
                  >
                    {getIcon(item)}
                  </motion.div>
                  {index < timeline.length - 1 && (
                    <div className="w-0.5 h-12 bg-gradient-to-b from-gray-700 to-transparent my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <motion.div 
                    whileHover={{ x: 4 }}
                    className="p-3 rounded-xl bg-gray-800/30 border border-white/5 hover:bg-gray-800/50 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {item.timestamp}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 pt-4 border-t border-gray-700/50"
        >
          <div className="flex items-center justify-center">
            <motion.div 
              animate={{ 
                boxShadow: ['0 0 0 rgba(168,85,247,0)', '0 0 10px rgba(168,85,247,0.5)', '0 0 0 rgba(168,85,247,0)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-300 font-medium">Real-time updates enabled</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ActivityTimeline;
