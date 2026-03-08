import { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Film, 
  Play, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Loader,
  Target,
  BarChart3
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

function ViralHunter() {
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [clips, setClips] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendingRes, downloadsRes, clipsRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/viral-hunter/stats`).then(r => r.json()),
        fetch(`${API_BASE}/viral-hunter/trending`).then(r => r.json()),
        fetch(`${API_BASE}/viral-hunter/downloads`).then(r => r.json()),
        fetch(`${API_BASE}/viral-hunter/clips`).then(r => r.json()),
        fetch(`${API_BASE}/viral-hunter/status`).then(r => r.json())
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (trendingRes.success) setTrending(trendingRes.data?.candidates || []);
      if (downloadsRes.success) setDownloads(downloadsRes.data || []);
      if (clipsRes.success) setClips(clipsRes.data || []);
      if (statusRes.success) setStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to load viral hunter data:', error);
    }
    setLoading(false);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch(`${API_BASE}/viral-hunter/scan`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Scan failed:', error);
    }
    setScanning(false);
  };

  const handleStart = async () => {
    try {
      await fetch(`${API_BASE}/viral-hunter/start`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Start failed:', error);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/viral-hunter/stop`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Stop failed:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Loader className="w-4 h-4 animate-spin text-yellow-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-500" />
            Viral Hunter AI
          </h1>
          <p className="text-gray-400 mt-1">
            Autonomous viral content discovery and auto-clip generation
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            {scanning ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
          {status?.enabled ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <Zap className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Search className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Discovered</p>
              <p className="text-2xl font-bold text-white">{stats?.totalDiscovered || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Downloaded</p>
              <p className="text-2xl font-bold text-white">{stats?.totalDownloaded || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Film className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Clips Generated</p>
              <p className="text-2xl font-bold text-white">{stats?.totalClipped || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Jobs</p>
              <p className="text-2xl font-bold text-white">{stats?.activeDownloads || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          System Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {status?.running ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-gray-300">
              {status?.running ? 'Running' : 'Idle'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">
              Last Run: {status?.lastRun ? new Date(status.lastRun).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">
              Queue: {stats?.queuedJobs || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">
              Interval: 30 min
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Candidates */}
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Trending Candidates
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {trending.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No trending videos found</p>
            ) : (
              trending.map((video, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{video.title}</p>
                    <p className="text-gray-400 text-sm">{video.platform}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-400">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-bold">{video.viralScore}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Downloads */}
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            Recent Downloads
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {downloads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No downloads yet</p>
            ) : (
              downloads.slice(0, 10).map((download, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    {getStatusIcon(download.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{download.sourcePlatform}</p>
                    <p className="text-gray-400 text-xs">
                      Score: {download.viralScore} • {download.status}
                    </p>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {download.downloadedAt && new Date(download.downloadedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Generated Clips */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          Generated Clips
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {clips.length === 0 ? (
            <p className="text-gray-500 text-center py-8 col-span-full">No clips generated yet</p>
          ) : (
            clips.slice(0, 8).map((clip, idx) => (
              <div 
                key={idx}
                className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="aspect-video bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                  <Play className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-white font-medium truncate">{clip.discovery?.title || 'Viral Clip'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400 text-sm">{clip.clipsGenerated} clips</span>
                  <span className="text-green-400 text-sm">Score: {clip.viralScore}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Run History */}
      {status?.runHistory && status.runHistory.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Run History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-gray-700">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Candidates</th>
                  <th className="text-left py-2 px-3">Downloads</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {status.runHistory.slice(0, 5).map((run, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50">
                    <td className="py-2 px-3 text-gray-300">{new Date(run.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-300">{run.candidatesFound || '-'}</td>
                    <td className="py-2 px-3 text-gray-300">
                      {run.downloadsSuccessful || 0}/{run.downloadsAttempted || 0}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        run.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-300">{run.duration}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViralHunter;

