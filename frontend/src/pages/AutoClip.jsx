import { useState, useEffect, useCallback, memo } from 'react';
import { 
  Upload, 
  Video, 
  Zap, 
  Settings,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Music,
  Subtitles,
  Languages,
  FileVideo,
  Download,
  RefreshCw,
  Scissors,
  Lightbulb
} from 'lucide-react';

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-purple-600';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Zap;

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg text-white ${bgColor} shadow-lg z-50`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ progress, message, stage }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300 capitalize">{stage.replace(/_/g, ' ')}</span>
        <span className="text-sm text-gray-400">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{message}</p>
    </div>
  );
};

// Platform Selector
const PlatformSelector = ({ selected, onChange }) => {
  const platforms = [
    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'youtube_shorts', name: 'Shorts', icon: '▶️' },
    { id: 'youtube_normal', name: 'YouTube', icon: '📺' }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {platforms.map((platform) => (
        <button
          key={platform.id}
          type="button"
          onClick={() => onChange(platform.id)}
          className={`p-3 rounded-xl border transition-all ${
            selected === platform.id 
              ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
          }`}
        >
          <span className="text-2xl block mb-1">{platform.icon}</span>
          <span className="text-xs font-medium">{platform.name}</span>
        </button>
      ))}
    </div>
  );
};

// Duration Selector
const DurationSelector = ({ selected, onChange }) => {
  const durations = [
    { value: '30', label: '30s' },
    { value: '45', label: '45s' },
    { value: '60', label: '60s' }
  ];

  return (
    <div className="flex gap-2">
      {durations.map((d) => (
        <button
          key={d.value}
          type="button"
          onClick={() => onChange(d.value)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
            selected === d.value
              ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
};

// Smart Trim Toggle
const SmartTrimToggle = ({ checked, onChange }) => {
  return (
    <label className="flex items-start justify-between p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-all">
      <div className="flex items-start gap-3">
        <Scissors className={`w-5 h-5 mt-0.5 ${checked ? 'text-purple-400' : 'text-gray-500'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Smart Trim Mode</span>
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">Recommended</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Removes boring parts and keeps high-energy moments automatically.
          </p>
        </div>
      </div>
      <div 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-purple-600' : 'bg-gray-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-7' : 'left-1'}`} />
      </div>
    </label>
  );
};

// Option Toggle
const OptionToggle = ({ icon: Icon, label, checked, onChange }) => {
  return (
    <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${checked ? 'text-purple-400' : 'text-gray-500'}`} />
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <div 
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-purple-600' : 'bg-gray-700'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </div>
    </label>
  );
};

// Main AutoClip Page
const AutoClip = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [platform, setPlatform] = useState('youtube_shorts');
  const [duration, setDuration] = useState('30');
  const [smartTrim, setSmartTrim] = useState(true);
  const [options, setOptions] = useState({
    autoSubtitle: true,
    autoTranslate: false,
    addMusic: true,
    smartHook: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [toast, setToast] = useState(null);
  const [generatedClips, setGeneratedClips] = useState([]);

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setGeneratedClips([]);
      setProgress(null);
    }
  }, []);

  // Handle option change
  const handleOptionChange = useCallback((key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!videoFile) {
      setToast({ type: 'error', message: 'Please upload a video first' });
      return;
    }

    setIsProcessing(true);
    setProgress({ stage: 'uploading', progress: 0, message: 'Uploading video...' });

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('platform', platform);
    formData.append('duration', duration);
    formData.append('smartTrim', smartTrim);
    formData.append('autoSubtitle', options.autoSubtitle);
    formData.append('autoTranslate', options.autoTranslate);
    formData.append('addMusic', options.addMusic);
    formData.append('smartHook', options.smartHook);

    try {
      // Simulate upload progress
      let uploadProgress = 0;
      const uploadInterval = setInterval(() => {
        uploadProgress += 10;
        if (uploadProgress <= 30) {
          setProgress({ stage: 'uploading', progress: uploadProgress, message: 'Uploading video...' });
        } else {
          clearInterval(uploadInterval);
        }
      }, 200);

      const response = await fetch('http://localhost:3001/api/auto-clip/generate', {
        method: 'POST',
        body: formData
      });

      clearInterval(uploadInterval);

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      const data = await response.json();
      
      // Simulate processing progress (in production, would poll status endpoint)
      let procProgress = 30;
      const procInterval = setInterval(() => {
        procProgress += 4;
        if (procProgress >= 100) {
          clearInterval(procInterval);
          setIsProcessing(false);
          setGeneratedClips([
            { id: 1, platform, duration: parseInt(duration), smartTrim, url: '#' },
            { id: 2, platform, duration: parseInt(duration), smartTrim, url: '#' },
            { id: 3, platform, duration: parseInt(duration), smartTrim, url: '#' }
          ]);
          setToast({ type: 'success', message: smartTrim ? 'Smart clips generated successfully!' : 'Clips generated successfully!' });
        } else {
          const stages = smartTrim 
            ? ['analyzing_audio', 'energy_scoring', 'hook_detection', 'scene_detection', 'building_clip', 'subtitles', 'music', 'complete']
            : ['analyzing', 'detecting', 'processing', 'subtitles', 'music', 'exporting'];
          const stageIdx = Math.floor(procProgress / 12);
          setProgress({ 
            stage: stages[Math.min(stageIdx, stages.length - 1)], 
            progress: procProgress, 
            message: `Processing... ${procProgress}%` 
          });
        }
      }, 400);

    } catch (error) {
      setIsProcessing(false);
      setToast({ type: 'error', message: 'Processing failed. Please try again.' });
      console.error(error);
    }
  }, [videoFile, platform, duration, smartTrim, options]);

  return (
    <div className="min-h-screen relative p-8">
      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
            Auto Clip Factory
          </h1>
          <p className="text-gray-400 mt-2">
            {smartTrim 
              ? 'Smart AI trims your video to keep only the best moments' 
              : 'Transform long videos into viral clips automatically'}
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
          {!videoPreview ? (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
              <Upload className="w-10 h-10 text-gray-500 mb-3" />
              <span className="text-gray-400">Click to upload video</span>
              <span className="text-xs text-gray-600 mt-1">MP4, MOV, AVI, WebM (max 500MB)</span>
              <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center gap-4">
              <video src={videoPreview} className="w-32 h-20 object-cover rounded-lg" />
              <div className="flex-1">
                <p className="text-white font-medium">{videoFile?.name}</p>
                <p className="text-xs text-gray-500">{(videoFile?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                className="p-2 text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Smart Trim Toggle */}
        <div className="mb-6">
          <SmartTrimToggle checked={smartTrim} onChange={setSmartTrim} />
        </div>

        {/* Processing Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Platform Selection */}
          <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-medium">Target Platform</h3>
            </div>
            <PlatformSelector selected={platform} onChange={setPlatform} />
          </div>

          {/* Duration Selection */}
          <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white font-medium">Clip Duration</h3>
            </div>
            <DurationSelector selected={duration} onChange={setDuration} />
          </div>
        </div>

        {/* Options */}
        <div className="mb-8 p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-pink-400" />
            <h3 className="text-white font-medium">Processing Options</h3>
          </div>
          <div className="space-y-2">
            <OptionToggle 
              icon={Subtitles} 
              label="Auto Subtitle" 
              checked={options.autoSubtitle} 
              onChange={() => handleOptionChange('autoSubtitle')} 
            />
            <OptionToggle 
              icon={Languages} 
              label="Auto Translate" 
              checked={options.autoTranslate} 
              onChange={() => handleOptionChange('autoTranslate')} 
            />
            <OptionToggle 
              icon={Music} 
              label="Add Background Music" 
              checked={options.addMusic} 
              onChange={() => handleOptionChange('addMusic')} 
            />
            <OptionToggle 
              icon={Sparkles} 
              label="Smart Hook Detection" 
              checked={options.smartHook} 
              onChange={() => handleOptionChange('smartHook')} 
            />
          </div>
        </div>

        {/* Progress */}
        {isProcessing && progress && (
          <div className="mb-8 p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
            <ProgressBar progress={progress.progress} message={progress.message} stage={progress.stage} />
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!videoFile || isProcessing}
          className={`w-full py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition-all ${
            !videoFile || isProcessing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : smartTrim
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/30'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {smartTrim ? <Scissors className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              {smartTrim ? 'Generate Smart Clips' : 'Generate All Clips'}
            </>
          )}
        </button>

        {/* Generated Clips */}
        {generatedClips.length > 0 && (
          <div className="mt-8">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Generated Clips
              {smartTrim && <span className="text-xs text-green-400">(Smart Trim)</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedClips.map((clip) => (
                <div key={clip.id} className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-purple-500/50 transition-colors">
                  <div className="aspect-[9/16] bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Play className="w-8 h-8 text-gray-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-400">{clip.duration}s</span>
                      {clip.smartTrim && <span className="ml-2 text-xs text-purple-400">Smart</span>}
                    </div>
                    <button className="p-2 text-purple-400 hover:text-purple-300">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoClip;
