import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Video, 
  Search, 
  TrendingUp, 
  Clock, 
  Play,
  BarChart3,
  Sparkles
} from 'lucide-react';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch videos
      const videosResponse = await axios.get('/api/video', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Transform videos into activities
      const videoActivities = (videosResponse.data.data || []).slice(0, 3).map(video => ({
        id: video.id,
        type: 'upload',
        title: video.title,
        timestamp: video.createdAt,
        icon: Video,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20'
      }));

      setActivities(videoActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Use mock data for demo
      setActivities([
        {
          id: 1,
          type: 'upload',
          title: 'Amazing Viral Moment.mp4',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          icon: Video,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20'
        },
        {
          id: 2,
          type: 'analysis',
          title: 'Video Analysis Complete',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          icon: Search,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20'
        },
        {
          id: 3,
          type: 'prediction',
          title: 'Viral Score: 85',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          icon: TrendingUp,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityLabel = (type) => {
    switch (type) {
      case 'upload': return 'Uploaded';
      case 'analysis': return 'Analyzed';
      case 'prediction': return 'Predicted';
      default: return 'Activity';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 via-gray-800/50 to-gray-900/80 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 via-gray-800/50 to-gray-900/80 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-4 rounded-full bg-gray-800/50 mb-3">
            <Sparkles className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400 text-sm">No recent activity</p>
          <p className="text-gray-500 text-xs mt-1">Upload a video to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/80 via-gray-800/50 to-gray-900/80 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${activity.bgColor}`}>
                <Icon className={`w-4 h-4 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {activity.title}
                </p>
                <p className="text-gray-500 text-xs">
                  {getActivityLabel(activity.type)}
                </p>
              </div>
              <span className="text-gray-500 text-xs whitespace-nowrap">
                {formatTime(activity.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;
