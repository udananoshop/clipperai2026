import { motion } from 'framer-motion';
import { 
  Video, 
  Clapperboard, 
  Upload, 
  Search, 
  FileQuestion,
  Inbox
} from 'lucide-react';

const iconMap = {
  video: Video,
  clip: Clapperboard,
  upload: Upload,
  search: Search,
  default: Inbox,
  question: FileQuestion
};

const EmptyState = ({ 
  type = 'default',
  title = 'No data found',
  description = 'There is nothing to display here yet.',
  actionLabel,
  onAction,
  className = ''
}) => {
  const Icon = iconMap[type] || iconMap.default;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex flex-col items-center justify-center p-12 
        bg-gradient-to-br from-gray-900/50 to-purple-900/20 
        rounded-2xl border border-white/5 backdrop-blur-sm
        ${className}
      `}
    >
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 mb-6 bg-gray-800/50 rounded-2xl flex items-center justify-center"
      >
        <Icon className="w-10 h-10 text-gray-500" strokeWidth={1.5} />
      </motion.div>
      
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-md mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="
            px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 
            rounded-xl font-semibold shadow-lg shadow-blue-500/30 
            hover:shadow-blue-500/50 transition-all
          "
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
