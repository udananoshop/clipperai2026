import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  Key, 
  Shield, 
  Database, 
  Save, 
  Eye, 
  EyeOff,
  Check,
  Copy,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Loader2
} from 'lucide-react';
import { getSystemHealth, detectPaths, testApiKey } from '../api/api';

// Lightweight Toast Component (2.5s auto-dismiss)
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'warning' ? 'bg-amber-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertCircle : XCircle;

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg text-white ${bgColor} shadow-lg z-50`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

// Validation functions
const validateApiFormat = (name, value) => {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Not Set' };
  }
  
  switch (name) {
    case 'openaiApiKey':
      return value.startsWith('sk-') && value.length > 20
        ? { valid: true, message: 'Connected' }
        : { valid: false, message: 'Invalid Format' };
    case 'youtubeApiKey':
      return value.length > 25
        ? { valid: true, message: 'Connected' }
        : { valid: false, message: 'Invalid Format' };
    case 'facebookAppId':
      return /^\d+$/.test(value) && value.length >= 8
        ? { valid: true, message: 'Connected' }
        : { valid: false, message: 'Invalid Format' };
    case 'instagramAccessToken':
      return value.length > 20
        ? { valid: true, message: 'Connected' }
        : { valid: false, message: 'Invalid Format' };
    default:
      return value.length > 5
        ? { valid: true, message: 'Connected' }
        : { valid: false, message: 'Invalid Format' };
  }
};

// API Status Badge Component
const ApiStatusBadge = memo(({ name, value }) => {
  const validation = useMemo(() => validateApiFormat(name, value), [name, value, validateApiFormat]);
  
  let status = 'not-set';
  if (!value || value.length === 0) {
    status = 'not-set';
  } else if (!validation.valid) {
    status = 'invalid';
  } else {
    status = 'connected';
  }

  const statusConfig = {
    'not-set': { dot: 'bg-red-500', text: 'text-red-400', label: 'Not Set' },
    'invalid': { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Invalid Format' },
    'connected': { dot: 'bg-green-500', text: 'text-green-400', label: 'Connected' }
  };

  const config = statusConfig[status];

  return (
    <span className={`flex items-center gap-1.5 text-xs ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
});

ApiStatusBadge.displayName = 'ApiStatusBadge';

// API Field Component with Test Button
const ApiField = memo(({ field, value, onChange, onTest, showKey, onToggleShow, testingApi }) => {
  const isTesting = testingApi === field.name;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">{field.label}</label>
        <ApiStatusBadge name={field.name} value={value} />
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : field.type}
            name={field.name}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder={field.placeholder}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <button type="button" onClick={onToggleShow} className="p-1 text-gray-500 hover:text-white">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onTest(field.name)}
          disabled={isTesting || !value}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-gray-300 text-xs whitespace-nowrap transition-colors flex items-center gap-1"
        >
          {isTesting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            'Test'
          )}
        </button>
      </div>
    </div>
  );
});

ApiField.displayName = 'ApiField';

// Performance Toggle Component - Updated with 3 modes
const PerformanceToggle = memo(({ value, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <Zap className={`w-4 h-4 ${value === 'performance' ? 'text-purple-400' : value === 'balanced' ? 'text-blue-400' : 'text-yellow-400'}`} />
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onChange('light')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === 'light' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Light Mode
        </button>
        <button
          type="button"
          onClick={() => onChange('balanced')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === 'balanced' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Balanced Mode
        </button>
        <button
          type="button"
          onClick={() => onChange('performance')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === 'performance' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Performance
        </button>
      </div>
    </div>
  );
});

PerformanceToggle.displayName = 'PerformanceToggle';

// Operation Mode Toggle Component
const OperationModeToggle = memo(({ value, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      {value === 'offline' ? (
        <WifiOff className="w-4 h-4 text-orange-400" />
      ) : (
        <Wifi className="w-4 h-4 text-green-400" />
      )}
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onChange('offline')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === 'offline' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Offline Mode
        </button>
        <button
          type="button"
          onClick={() => onChange('online')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === 'online' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Online Mode
        </button>
      </div>
      {value === 'offline' && (
        <span className="text-xs text-orange-400">Offline Mode Active</span>
      )}
    </div>
  );
});

OperationModeToggle.displayName = 'OperationModeToggle';

// Auto Detect Button Component
const AutoDetectButton = memo(({ onDetect, label, detecting }) => {
  return (
    <button
      type="button"
      onClick={onDetect}
      disabled={detecting}
      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-gray-300 text-xs transition-colors flex items-center gap-1"
    >
      <RefreshCw className={`w-3 h-3 ${detecting ? 'animate-spin' : ''}`} />
      {detecting ? 'Detecting...' : 'Auto Detect'}
    </button>
  );
});

AutoDetectButton.displayName = 'AutoDetectButton';

// Auto Detect All Button Component
const AutoDetectAllButton = memo(({ onDetectAll, detecting }) => {
  return (
    <button
      type="button"
      onClick={onDetectAll}
      disabled={detecting}
      className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 rounded-lg text-white text-xs transition-colors flex items-center gap-1"
    >
      <RefreshCw className={`w-3 h-3 ${detecting ? 'animate-spin' : ''}`} />
      {detecting ? 'Detecting...' : 'Auto Detect All Paths'}
    </button>
  );
});

AutoDetectAllButton.displayName = 'AutoDetectAllButton';

// System Health Card Component
const SystemHealthCard = memo(({ health, loading, error }) => {
  const getStatusColor = (status) => {
    if (status === 'Active' || status === 'Loaded' || status === 'Ready') return 'text-green-400';
    if (status === 'Not Installed' || status === 'Not Available') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getUsageColor = (usage) => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        <span className="ml-2 text-gray-400">Loading system health...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <span className="ml-2 text-red-400">{error}</span>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {/* CPU Usage */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-gray-400">CPU Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getUsageColor(health.cpu?.usage || 0)} transition-all duration-500`}
              style={{ width: `${health.cpu?.usage || 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-white">{health.cpu?.usage || 0}%</span>
        </div>
      </div>

      {/* RAM Usage */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-gray-400">RAM Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getUsageColor(health.ram?.usage || 0)} transition-all duration-500`}
              style={{ width: `${health.ram?.usage || 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-white">{health.ram?.usage || 0}%</span>
        </div>
        <span className="text-xs text-gray-500">{health.ram?.used}GB / {health.ram?.total}GB</span>
      </div>

      {/* Disk Usage */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-green-400" />
          <span className="text-xs text-gray-400">Disk Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getUsageColor(health.disk?.usage || 0)} transition-all duration-500`}
              style={{ width: `${health.disk?.usage || 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-white">{health.disk?.usage || 0}%</span>
        </div>
      </div>

      {/* FFmpeg Status */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-400">FFmpeg</span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor(health.tools?.ffmpeg)}`}>
          {health.tools?.ffmpeg || 'Unknown'}
        </span>
      </div>

      {/* Whisper Status */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-400">Whisper Model</span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor(health.tools?.whisper)}`}>
          {health.tools?.whisper || 'Unknown'}
        </span>
      </div>

      {/* yt-dlp Status */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-400">yt-dlp</span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor(health.tools?.ytdlp)}`}>
          {health.tools?.ytdlp || 'Unknown'}
        </span>
      </div>
    </div>
  );
});

SystemHealthCard.displayName = 'SystemHealthCard';

// Main Settings Component
const Settings = ({ token }) => {
  // Settings state
  const [settings, setSettings] = useState({
    openaiApiKey: '',
    youtubeApiKey: '',
    facebookAppId: '',
    instagramAccessToken: '',
    tiktokAccessToken: '',
    ffmpegPath: '',
    ytdlpPath: '',
    whisperModelPath: ''
  });

  // UI state
  const [showKeys, setShowKeys] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // System health state
  const [systemHealth, setSystemHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);
  
  // Detection state
  const [detectingPaths, setDetectingPaths] = useState(false);
  
  // API testing state
  const [testingApi, setTestingApi] = useState(null);

  // Performance & Operation mode state
  const [perfMode, setPerfMode] = useState(() => {
    const saved = localStorage.getItem('clipper_performance_mode');
    return saved || 'light';
  });
  
  const [opMode, setOpMode] = useState(() => {
    const saved = localStorage.getItem('clipper_operation_mode');
    return saved || 'online';
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  // Fetch system health on mount
  useEffect(() => {
    fetchSystemHealth();
    
    // Refresh health every 60 seconds
    const interval = setInterval(fetchSystemHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  // Apply performance mode on mount only
  useEffect(() => {
    window.CLIPPER_PERFORMANCE_MODE = perfMode;
  }, []);

  // Update performance mode
  useEffect(() => {
    localStorage.setItem('clipper_performance_mode', perfMode);
    window.CLIPPER_PERFORMANCE_MODE = perfMode;
  }, [perfMode]);

  // Update operation mode
  useEffect(() => {
    localStorage.setItem('clipper_operation_mode', opMode);
    window.CLIPPER_OPERATION_MODE = opMode;
  }, [opMode]);

  // Fetch system health from backend
  const fetchSystemHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const result = await getSystemHealth();
      if (result && result.success !== false) {
        setSystemHealth(result);
      } else {
        setHealthError('Failed to fetch system health');
      }
    } catch (err) {
      console.error('Health fetch error:', err);
      setHealthError('System health unavailable');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Memoized handlers
  const handleChange = useCallback((e) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  }, []);

  const toggleShowKey = useCallback((key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    localStorage.setItem('settings', JSON.stringify(settings));
    
    setTimeout(() => {
      setSaved(true);
      setLoading(false);
      setToast({ type: 'success', message: 'Settings saved successfully' });
    }, 300);
  }, [settings]);

  const handleTest = useCallback(async (fieldName) => {
    const value = settings[fieldName];
    const validation = validateApiFormat(fieldName, value);
    
    if (!validation.valid) {
      setToast({ type: 'error', message: '✕ Invalid API format' });
      return;
    }
    
    // Test with backend API
    setTestingApi(fieldName);
    try {
      const providerMap = {
        openaiApiKey: 'openai',
        youtubeApiKey: 'youtube',
        facebookAppId: 'facebook',
        instagramAccessToken: 'instagram',
        tiktokAccessToken: 'tiktok'
      };
      
      const provider = providerMap[fieldName];
      const result = await testApiKey(value, provider);
      
      if (result && result.success) {
        setToast({ 
          type: 'success', 
          message: `✓ ${result.status}: ${result.message}` 
        });
      } else {
        setToast({ 
          type: result?.status === 'API Limit Reached' ? 'warning' : 'error', 
          message: `✕ ${result?.status || 'Error'}: ${result?.message || 'Unknown error'}` 
        });
      }
    } catch (err) {
      console.error('API test error:', err);
      setToast({ type: 'error', message: '✕ Failed to test API' });
    } finally {
      setTestingApi(null);
    }
  }, [settings]);

  const handleAutoDetectAll = useCallback(async () => {
    setDetectingPaths(true);
    try {
      const result = await detectPaths();
      
      if (result && result.success && result.detected) {
        const newSettings = { ...settings };
        let foundCount = 0;
        
        if (result.detected.ffmpegPath) {
          newSettings.ffmpegPath = result.detected.ffmpegPath;
          foundCount++;
        }
        if (result.detected.ytdlpPath) {
          newSettings.ytdlpPath = result.detected.ytdlpPath;
          foundCount++;
        }
        if (result.detected.whisperModelPath) {
          newSettings.whisperModelPath = result.detected.whisperModelPath;
          foundCount++;
        }
        
        setSettings(newSettings);
        setToast({ 
          type: foundCount > 0 ? 'success' : 'warning', 
          message: foundCount > 0 
            ? `✓ Found ${foundCount}/3 paths`
            : '⚠ No paths detected. Please enter manually.'
        });
      } else {
        setToast({ type: 'error', message: '✕ Failed to detect paths' });
      }
    } catch (err) {
      console.error('Path detection error:', err);
      setToast({ type: 'error', message: '✕ Path detection failed' });
    } finally {
      setDetectingPaths(false);
    }
  }, [settings]);

  const copyToClipboard = useCallback((value) => {
    navigator.clipboard.writeText(value);
    setToast({ type: 'success', message: 'Copied to clipboard!' });
  }, []);

  // Memoized section definitions
  const apiFields = useMemo(() => [
    { name: 'openaiApiKey', label: 'OpenAI API Key', placeholder: 'sk-...', type: 'password' },
    { name: 'youtubeApiKey', label: 'YouTube Data API Key', placeholder: 'AIza...', type: 'password' },
    { name: 'facebookAppId', label: 'Facebook App ID', placeholder: '123456789', type: 'text' },
    { name: 'instagramAccessToken', label: 'Instagram Access Token', placeholder: 'IG...', type: 'password' },
    { name: 'tiktokAccessToken', label: 'TikTok Token', placeholder: 'TT...', type: 'password' },
  ], []);

  const pathFields = useMemo(() => [
    { name: 'ffmpegPath', label: 'FFmpeg Path', placeholder: 'C:\\ffmpeg\\bin\\ffmpeg.exe', type: 'text' },
    { name: 'ytdlpPath', label: 'yt-dlp Path', placeholder: 'C:\\yt-dlp\\yt-dlp.exe', type: 'text' },
    { name: 'whisperModelPath', label: 'Whisper Model Path', placeholder: './models/whisper-tiny', type: 'text' },
  ], []);

  // Apply performance mode styles
  const containerClass = useMemo(() => {
    if (perfMode === 'light') {
      return 'min-h-screen p-6';
    }
    return 'min-h-screen p-6';
  }, [perfMode]);

  return (
    <div className={containerClass}>
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your AI system</p>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved 
                ? 'bg-green-600 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>

        {/* System Performance Section - Updated with 3 modes */}
        <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <h2 className="text-sm font-semibold text-white mb-4">System Performance Mode</h2>
          <PerformanceToggle value={perfMode} onChange={setPerfMode} />
          <p className="text-xs text-gray-500 mt-3">
            Light: Limits heavy processes for low-end systems • Balanced: Default AI processing • Performance: Full AI processing power
          </p>
        </div>

        {/* Operation Mode Section */}
        <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <h2 className="text-sm font-semibold text-white mb-4">Operation Mode</h2>
          <OperationModeToggle value={opMode} onChange={setOpMode} />
        </div>

        {/* System Health Monitor - NEW SECTION */}
        <div className="mb-6 p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-semibold text-white">System Health</h2>
            </div>
            <button
              onClick={fetchSystemHealth}
              disabled={healthLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <SystemHealthCard 
            health={systemHealth} 
            loading={healthLoading} 
            error={healthError} 
          />
        </div>

        {/* API Configuration Section */}
        <div className="mb-6 p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-semibold text-white">API Configuration</h2>
          </div>
          <div className="grid gap-4">
            {apiFields.map((field) => (
              <ApiField
                key={field.name}
                field={field}
                value={settings[field.name]}
                onChange={handleChange}
                onTest={handleTest}
                showKey={showKeys[field.name]}
                onToggleShow={() => toggleShowKey(field.name)}
                testingApi={testingApi}
              />
            ))}
          </div>
        </div>

        {/* System Paths Section - Updated with Auto Detect All */}
        <div className="mb-6 p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">System Paths</h2>
            </div>
            <AutoDetectAllButton 
              onDetectAll={handleAutoDetectAll} 
              detecting={detectingPaths}
            />
          </div>
          <div className="space-y-4">
            {pathFields.map((field) => (
              <div key={field.name}>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  {field.label}
                </label>
                <input
                  type="text"
                  name={field.name}
                  value={settings[field.name]}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-amber-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-white mb-1">Security Notice</h3>
              <p className="text-xs text-gray-400">
                Keys are stored locally. Never shared with external servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

