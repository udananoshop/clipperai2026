/**
 * ClipperAi2026 - Realtime AI Dashboard Status Component
 * Shows live job status, viral score, and rendering progress
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api';

const RealtimeDashboardAIStatus = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000);

  // Fetch dashboard data
  const fetchDashboardStatus = useCallback(async () => {
    try {
      const response = await api.get('/ai/dashboard/status');
      if (response.success) {
        setDashboardData(response.dashboard);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchDashboardStatus();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardStatus, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, fetchDashboardStatus]);

  // Format time ago
  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString();
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      queued: 'bg-yellow-500',
      processing: 'bg-blue-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-400';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      CRITICAL: 'text-red-500',
      HIGH: 'text-orange-500',
      NORMAL: 'text-blue-500',
      LOW: 'text-gray-500'
    };
    return colors[priority] || 'text-gray-500';
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI Processing Dashboard</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Last updated: {formatTimeAgo(lastUpdate)}
          </span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded text-sm ${
              autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* Queue Status */}
      {dashboardData?.queue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Queued</div>
            <div className="text-3xl font-bold text-yellow-500">{dashboardData.queue.queued}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Processing</div>
            <div className="text-3xl font-bold text-blue-500">{dashboardData.queue.currentlyProcessing}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Active Jobs</div>
            <div className="text-3xl font-bold text-purple-500">{dashboardData.queue.active}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Max Concurrent</div>
            <div className="text-3xl font-bold text-gray-300">{dashboardData.queue.maxConcurrent}</div>
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Active Processing Jobs</h3>
        {dashboardData?.processing?.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.processing.map((job) => (
              <div key={job.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{job.type}</span>
                    <span className="ml-2 text-sm text-gray-400">#{job.id.slice(0, 8)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>

                {job.options && (
                  <div className="mt-2 text-sm text-gray-400">
                    {job.options.aspectRatio && <span className="mr-3">Aspect: {job.options.aspectRatio}</span>}
                    {job.options.quality && <span>Quality: {job.options.quality}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-400">
            No active jobs at the moment
          </div>
        )}
      </div>

      {/* Queued Jobs */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Queued Jobs</h3>
        {dashboardData?.queue?.nextJob ? (
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{dashboardData.queue.nextJob.type}</span>
                <span className="ml-2 text-sm text-gray-400">
                  Position: {dashboardData.queue.nextJob.position}
                </span>
              </div>
              <span className={`font-semibold ${getPriorityColor(dashboardData.queue.nextJob.priority)}`}>
                {dashboardData.queue.nextJob.priority}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-400">
            Queue is empty
          </div>
        )}
      </div>

      {/* Recent Completed */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Recent Completed</h3>
        {dashboardData?.recentCompleted?.length > 0 ? (
          <div className="space-y-2">
            {dashboardData.recentCompleted.slice(0, 5).map((job) => (
              <div key={job.id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-medium">{job.type}</span>
                  <span className="ml-2 text-sm text-gray-400">
                    {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                  {job.result?.hookScore && (
                    <span className="text-green-400 font-semibold">
                      Hook: {job.result.hookScore}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-400">
            No recent completed jobs
          </div>
        )}
      </div>

      {/* Refresh Controls */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Refresh interval:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm"
          >
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
          <button
            onClick={fetchDashboardStatus}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboardAIStatus;
