import { motion } from "framer-motion";

/**
 * Skeleton Loading Component
 * Premium animated skeleton for loading states
 */

const SkeletonCard = ({ className = "" }) => (
  <div className={`bg-gray-800/50 rounded-xl p-4 ${className}`}>
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

const SkeletonVideoCard = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800"
  >
    <div className="aspect-video bg-gray-800 animate-pulse"></div>
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-800 rounded w-3/4"></div>
      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
    </div>
  </motion.div>
);

const SkeletonStatCard = () => (
  <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/50">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 bg-gray-700 rounded-xl"></div>
      <div className="w-12 h-4 bg-gray-700 rounded"></div>
    </div>
    <div className="h-8 bg-gray-700 rounded w-20 mb-2"></div>
    <div className="h-3 bg-gray-700/50 rounded w-16"></div>
  </div>
);

const SkeletonTable = ({ rows = 5 }) => (
  <div className="space-y-2">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="h-12 bg-gray-800/30 rounded-lg animate-pulse"></div>
    ))}
  </div>
);

const SkeletonText = ({ lines = 3 }) => (
  <div className="space-y-2">
    {[...Array(lines)].map((_, i) => (
      <div 
        key={i} 
        className="h-4 bg-gray-700/50 rounded"
        style={{ width: i === lines - 1 ? '60%' : '100%' }}
      ></div>
    ))}
  </div>
);

const SkeletonChart = () => (
  <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/50">
    <div className="flex items-center justify-between mb-4">
      <div className="w-24 h-5 bg-gray-700 rounded"></div>
      <div className="w-16 h-4 bg-gray-700 rounded"></div>
    </div>
    <div className="flex items-end justify-between h-32 gap-2">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i} 
          className="flex-1 bg-gray-700/50 rounded-t"
          style={{ height: `${30 + Math.random() * 60}%` }}
        ></div>
      ))}
    </div>
  </div>
);

const SkeletonRing = () => (
  <div className="relative flex items-center justify-center">
    <div className="w-24 h-24 rounded-full border-4 border-gray-700"></div>
    <div className="absolute w-24 h-24 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
  </div>
);

export {
  SkeletonCard,
  SkeletonVideoCard,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonText,
  SkeletonChart,
  SkeletonRing
};
