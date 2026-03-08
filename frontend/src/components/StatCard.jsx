import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    const startValue = 0;
    const endValue = typeof value === 'number' ? value : 0;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (endValue - startValue) * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

const StatCard = ({ title, value, icon: Icon, trend, color = 'purple', showLastUpdated = true }) => {
  const [lastUpdated] = useState(new Date());
  
  const colorClasses = {
    purple: {
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
      accent: 'bg-purple-500/20'
    },
    blue: {
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-cyan-400',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]',
      accent: 'bg-blue-500/20'
    },
    green: {
      gradient: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-emerald-400',
      glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]',
      accent: 'bg-green-500/20'
    },
    orange: {
      gradient: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-500/30',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      glow: 'shadow-[0_0_30px_rgba(249,115,22,0.3)]',
      accent: 'bg-orange-500/20'
    }
  };

  const colors = colorClasses[color] || colorClasses.purple;
  const isZeroValue = value === 0 || value === '0' || value === null || value === undefined;

  const formatLastUpdated = () => {
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        relative overflow-hidden rounded-2xl p-5 
        bg-gradient-to-br ${colors.gradient}
        border ${colors.border}
        backdrop-blur-sm
        transition-all duration-300
        hover:${colors.glow}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          {Icon && (
            <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
              <Icon className={`w-4 h-4 ${colors.iconColor}`} />
            </div>
          )}
          {trend !== undefined && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                trend >= 0 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </motion.div>
          )}
        </div>
        
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className={`text-3xl font-bold mb-1 ${isZeroValue ? 'text-gray-500' : 'text-white'}`}
        >
          {isZeroValue ? (
            <span className="text-lg text-gray-500">No data</span>
          ) : (
            <AnimatedNumber value={typeof value === 'number' ? value : 0} />
          )}
        </motion.div>
        
        <div className="text-sm text-gray-400 font-medium">{title}</div>
        
        {/* Last Updated */}
        {showLastUpdated && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Updated {formatLastUpdated()}</span>
          </div>
        )}
      </div>

      <div className={`absolute -top-10 -right-10 w-20 h-20 ${colors.accent} blur-2xl rounded-full`} />
    </motion.div>
  );
};

export default StatCard;
