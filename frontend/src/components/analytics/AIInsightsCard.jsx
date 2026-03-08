/**
 * AIInsightsCard - Displays AI-generated insights
 * Part of Overlord-Level Analytics System
 * 
 * NOTE: Uses lightweight database statistics only
 * NO AI models - SAFE MODE FOR 8GB RAM
 */

import { memo, useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Star, Info, AlertTriangle, Lightbulb } from 'lucide-react';

const AIInsightsCard = ({ insights, loading }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!loading && insights) {
      // Stagger animation for each insight
      setIsVisible(true);
    }
  }, [loading, insights]);

  const getIcon = (iconName) => {
    const icons = {
      trending: TrendingUp,
      uptrend: TrendingUp,
      downtrend: TrendingDown,
      star: Star,
      warning: AlertTriangle,
      info: Info,
      lightbulb: Lightbulb
    };
    return icons[iconName] || Info;
  };

  const getTypeStyles = (type) => {
    const styles = {
      platform: { 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/30', 
        text: 'text-blue-400',
        iconBg: 'bg-blue-500/20'
      },
      trend: { 
        bg: 'bg-purple-500/10', 
        border: 'border-purple-500/30', 
        text: 'text-purple-400',
        iconBg: 'bg-purple-500/20'
      },
      quality: { 
        bg: 'bg-green-500/10', 
        border: 'border-green-500/30', 
        text: 'text-green-400',
        iconBg: 'bg-green-500/20'
      },
      general: { 
        bg: 'bg-gray-500/10', 
        border: 'border-gray-500/30', 
        text: 'text-gray-400',
        iconBg: 'bg-gray-500/20'
      }
    };
    return styles[type] || styles.general;
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'high') {
      return (
        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded font-medium">
          HIGH
        </span>
      );
    }
    if (priority === 'medium') {
      return (
        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded font-medium">
          MED
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="rounded-xl p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg" />
          <div className="h-5 bg-gray-700 rounded w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-700/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="rounded-xl p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Insights</h3>
            <p className="text-xs text-gray-400">Performance intelligence</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">No insights available yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Insights</h3>
            <p className="text-xs text-gray-400">Performance intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Lightbulb className="w-3 h-3" />
          <span>Database-driven</span>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = getIcon(insight.icon);
          const style = getTypeStyles(insight.type);
          
          return (
            <div 
              key={index}
              className={`p-3 rounded-lg ${style.bg} border ${style.border} transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 ${style.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${style.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-gray-200 truncate">{insight.text}</p>
                    {getPriorityBadge(insight.priority)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3 h-3" />
          <span>Based on database statistics • No AI models used</span>
        </div>
      </div>
    </div>
  );
};

export default memo(AIInsightsCard);

