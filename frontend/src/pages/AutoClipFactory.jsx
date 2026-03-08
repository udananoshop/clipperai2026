import { useState, useCallback, useEffect } from 'react';
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
  Film,
  Download,
  RefreshCw,
  Cpu,
  Target,
  Monitor
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

// Progress Bar
const ProgressBar = ({ progress, message, stage }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300 capitalize">{stage}</span>
        <span className="text-sm text-gray-400">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{message}</p>
    </div>
  );
};

// Mode Selector Card
const ModeCard = ({ id, name, description, icon: Icon, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border text-left transition-all ${
      selected 
        ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
    }`}
  >
    <div className="flex items-center gap-3 mb-2">
      <Icon className={`w-5 h-5 ${selected ? 'text-purple-400' : 'text-gray-500'}`} />
      <span className="font-medium">{name}</span>
    </div>
    <p className="text-xs opacity-70">{description}</p>
  </button>
);

// Platform Selector
const PlatformCard = ({ id, name, ratio, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-lg border text-center transition-all ${
      selected 
        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
        : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
    }`}
  >
    <Video className={`w-5 h-5 mx-auto mb-1 ${selected ? 'text-cyan-400' : 'text-gray-500'}`} />
    <span className="text-sm font-medium">{name}</span>
    <span className="text-xs block opacity-60">{ratio}</span>
  </button>
);

// Toggle Option
const ToggleOption = ({ icon: Icon, label, checked, onChange }) => (
  <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
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

// Main Component
const AutoClipFactory = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [mode, setMode] = useState('adaptive');
  const [platform, setPlatform] = useState('youtube');
  const [options, setOptions] = useState({
    addSubtitle: true,
    addMusic: true,
    addTransition: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null);

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setResult(null);
      setProgress(null);
    }
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!videoFile) {
      setToast({ type: 'error', message: 'Please upload a video first' });
      return;
    }

    setIsProcessing(true);
    setProgress({ stage: 'preparing', progress: 0, message: 'Preparing...' });

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('mode', mode);
    formData.append('platform', platform);
    formData.append('addSubtitle', options.addSubtitle);
    formData.append('addMusic', options.addMusic);
    formData.append('addTransition', options.addTransition);

    try {
      // Simulate progress
      let prog = 0;
      const interval = setInterval(() => {
        prog += 10;
        if (prog <= 100) {
          const stages = ['analyzing', 'processing', 'subtitle', 'music', 'exporting'];
          const stageIdx = Math.floor(prog / 20);
          setProgress({ 
            stage: stages[Math.min(stageIdx, stages.length - 1)], 
            progress: prog, 
            message: `${stages[Math.min(stageIdx, stages.length - 1)]}... ${prog}%` 
          });
        }
      }, 400);

      const response = await fetch('http://localhost:3001/api/auto-clip', {
        method: 'POST',
        body: formData
      });

      clearInterval(interval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await response.json();
      
      setIsProcessing(false);
      setProgress({ stage: 'complete', progress: 100, message: 'Complete!' });
      setResult(data);
      setToast({ type: 'success', message: 'Clip generated successfully!' });

    } catch (error) {
      setIsProcessing(false);
      setToast({ type: 'error', message: error.message });
    }
  }, [videoFile, mode, platform, options]);

  return (
    <div className="min-h-screen relative p-8">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Light Mode Badge */}
      <div className="fixed top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-amber-600/20 border border-amber-500/50 rounded-full text-amber-400 text-xs z-50">
        <Zap className="w-3 h-3" />
        Auto Clip Factory — Light Mode
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
            Auto Clip Factory
          </h1>
          <p className="text-gray-400 mt-2">
            Transform long videos into viral clips automatically
          </p>
        </div>

        {/* Upload */}
        <div className="mb-6 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
          {!videoPreview ? (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
              <Upload className="w-8 h-8 text-gray-500 mb-2" />
              <span className="text-gray-400">Click to upload video</span>
              <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center gap-4">
              <video src={videoPreview} className="w-24 h-16 object-cover rounded-lg" />
              <div className="flex-1">
                <p className="text-white font-medium">{videoFile?.name}</p>
                <p className="text-xs text-gray-500">{(videoFile?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={() => { setVideoFile(null); setVideoPreview(null); }} className="p-2 text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium">Processing Mode</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ModeCard 
              id="adaptive" 
              name="Adaptive AI" 
              description="Auto-selects best mode"
              icon={Sparkles}
              selected={mode === 'adaptive'} 
              onClick={() => setMode('adaptive')} 
            />
            <ModeCard 
              id="balanced" 
              name="Balanced" 
              description="Standard processing"
              icon={Monitor}
              selected={mode === 'balanced'} 
              onClick={() => setMode('balanced')} 
            />
            <ModeCard 
              id="aggressive" 
              name="Aggressive" 
              description="Fast viral clips"
              icon={Zap}
              selected={mode === 'aggressive'} 
              onClick={() => setMode('aggressive')} 
            />
            <ModeCard 
              id="calm" 
              name="Calm Podcast" 
              description="Smooth processing"
              icon={Music}
              selected={mode === 'calm'} 
              onClick={() => setMode('calm')} 
            />
          </div>
        </div>

        {/* Platform Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-medium">Platform</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <PlatformCard id="youtube" name="YouTube" ratio="16:9" selected={platform === 'youtube'} onClick={() => setPlatform('youtube')} />
            <PlatformCard id="tiktok" name="TikTok" ratio="9:16" selected={platform === 'tiktok'} onClick={() => setPlatform('tiktok')} />
            <PlatformCard id="instagram" name="Instagram" ratio="9:16" selected={platform === 'instagram'} onClick={() => setPlatform('instagram')} />
            <PlatformCard id="shorts" name="Shorts" ratio="9:16" selected={platform === 'shorts'} onClick={() => setPlatform('shorts')} />
          </div>
        </div>

        {/* Options */}
        <div className="mb-6 p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-pink-400" />
            <span className="text-white font-medium">Options</span>
          </div>
          <div className="space-y-2">
            <ToggleOption icon={Subtitles} label="Auto Subtitle" checked={options.addSubtitle} onChange={() => setOptions(o => ({ ...o, addSubtitle: !o.addSubtitle }))} />
            <ToggleOption icon={Music} label="Background Music" checked={options.addMusic} onChange={() => setOptions(o => ({ ...o, addMusic: !o.addMusic }))} />
            <ToggleOption icon={Film} label="Fade Transitions" checked={options.addTransition} onChange={() => setOptions(o => ({ ...o, addTransition: !o.addTransition }))} />
          </div>
        </div>

        {/* Progress */}
        {isProcessing && progress && (
          <div className="mb-6 p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
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
              : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
          }`}
        >
          {isProcessing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          {isProcessing ? 'Processing...' : 'Generate Clip'}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-6 p-5 bg-green-900/20 border border-green-500/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Clip Generated!</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Mode: <span className="text-purple-400">{result.selectedMode}</span>
                </p>
                <p className="text-sm text-gray-300">
                  Platform: <span className="text-cyan-400">{result.platform?.name}</span>
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoClipFactory;
