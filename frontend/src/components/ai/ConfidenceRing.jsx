import { motion } from "framer-motion";
import { Brain, Zap, Activity, Cpu } from "lucide-react";

// Get color based on confidence level
const getConfidenceColor = (value) => {
  if (value >= 71) return { 
    color: "#10b981",
    gradient: "from-green-500 to-emerald-500",
    label: "High Confidence",
    status: "high"
  };
  if (value >= 31) return { 
    color: "#f59e0b",
    gradient: "from-yellow-500 to-orange-500",
    label: "Learning",
    status: "learning"
  };
  return { 
    color: "#ef4444",
    gradient: "from-red-500 to-pink-500",
    label: "Idle",
    status: "idle"
  };
};

// Get AI status icon
const getStatusIcon = (status) => {
  switch(status) {
    case 'high': return { icon: Zap, label: 'Optimizing' };
    case 'learning': return { icon: Brain, label: 'Learning' };
    default: return { icon: Cpu, label: 'Idle' };
  }
};

const ConfidenceRing = ({ 
  value = 0, 
  size = 140, 
  strokeWidth = 10,
  color = "#8b5cf6",
  bgColor = "#374151",
  showLabel = true,
  label = "AI Confidence",
  showStatus = true,
  animated = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const config = getConfidenceColor(value);
  const ringColor = color === "auto" ? config.color : color;
  const statusInfo = getStatusIcon(config.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="relative inline-flex items-center justify-center">
      {animated && (
        <motion.div
          animate={{ 
            boxShadow: [
              `0 0 20px ${ringColor}40`,
              `0 0 40px ${ringColor}60`,
              `0 0 20px ${ringColor}40`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute rounded-full"
          style={{ 
            width: size + 20, 
            height: size + 20,
          }}
        />
      )}
      
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth + 6}
          fill="transparent"
          strokeLinecap="round"
          opacity={0.15}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            filter: `blur(6px)`,
          }}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <motion.span
              animate={animated ? { 
                textShadow: [
                  `0 0 10px ${ringColor}`,
                  `0 0 20px ${ringColor}`,
                  `0 0 10px ${ringColor}`
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl font-bold text-white"
            >
              {Math.round(value)}%
            </motion.span>
          </motion.div>
          
          <span className="text-xs text-gray-400 mt-1">{label}</span>
          
          {showStatus && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r ${config.gradient} bg-opacity-20 border border-white/10`}
            >
              <StatusIcon className="w-3 h-3 text-white" />
              <span className="text-[10px] text-white font-medium">{statusInfo.label}</span>
              {animated && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-white"
                />
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

const MiniConfidenceRing = ({ value = 0, size = 48 }) => {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = (val) => {
    if (val >= 80) return "#10b981";
    if (val >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={4}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth={4}
          fill="transparent"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{Math.round(value)}</span>
    </div>
  );
};

export { ConfidenceRing, MiniConfidenceRing };
export default ConfidenceRing;
