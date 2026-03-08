import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Upload as UploadIcon, 
  Download, 
  FileVideo, 
  Link, 
  CheckCircle, 
  XCircle,
  Loader2,
  Cloud,
  Youtube,
  Instagram,
  Twitter,
  Clock,
  AlertCircle,
  Zap,
  Brain,
  Check,
  X,
  History,
  Image,
  FileWarning,
  AlertTriangle
} from 'lucide-react';

// CSS Styles for animations (injected into page)
const CSS_STYLES = `
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(34, 211, 238, 0.5), 0 0 10px rgba(34, 211, 238, 0.3); }
    50% { box-shadow: 0 0 15px rgba(34, 211, 238, 0.8), 0 0 25px rgba(34, 211, 238, 0.5); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .ai-ready-pulse { animation: pulse-glow 2s ease-in-out infinite; }
  .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
  .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
  .progress-bar-transition { transition: width 0.3s ease-out; }
  .thumbnail-preview { object-fit: cover; }
  .dropzone-hover { transition: all 0.2s ease; }
`;

// AI Ready Indicator Component (CSS-only pulse)
const AIReadyIndicator = ({ status }) => {
  if (status !== 'ready') return null;
  
  return (
    <div 
      className="ai-ready-pulse flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-full"
      style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
    >
      <Zap className="w-3.5 h-3.5 text-cyan-400" />
      <span className="text-xs font-medium text-cyan-400">AI Engine Ready</span>
    </div>
  );
};

// File Validation Badge Component
const FileValidationBadge = ({ file, fileSizeMB }) => {
  if (!file) return null;
  
  const isLargeFile = fileSizeMB > 500;
  const isUnsupported = !['video/mp4', 'video/mov', 'video/mkv', 'video/webm', 'video/avi'].includes(file.type);
  
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 animate-slide-up">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/60 rounded-md border border-gray-700/50">
        <FileVideo className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-300">{file.name.split('.').pop()?.toUpperCase()}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/60 rounded-md border border-gray-700/50">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-300">{fileSizeMB.toFixed(1)} MB</span>
      </div>
      {isLargeFile && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-md border border-red-500/40">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">Large File</span>
        </div>
      )}
      {isUnsupported && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 rounded-md border border-yellow-500/40">
          <FileWarning className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs text-yellow-400">Unsupported</span>
        </div>
      )}
    </div>
  );
};

// Thumbnail Preview Component
const ThumbnailPreview = ({ file, onClear }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [duration, setDuration] = useState(null);
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (!file) {
      setThumbnailUrl(null);
      setDuration(null);
      return;
    }
    
    // Create instant thumbnail using URL.createObjectURL
    const url = URL.createObjectURL(file);
    setThumbnailUrl(url);
    
    // Light probe for duration using video element
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    
    video.onloadedmetadata = () => {
      const seconds = Math.floor(video.duration);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setDuration(mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`);
    };
    
    video.onerror = () => {
      setDuration(null); // Can't read duration
    };
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);
  
  if (!thumbnailUrl || !file) return null;
  
  return (
    <div className="relative mt-4 animate-slide-up group">
      <div className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-gray-700/50">
        <video 
          ref={videoRef}
          src={thumbnailUrl}
          className="w-full h-32 object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded-md">
            <Image className="w-3 h-3 text-gray-300" />
            <span className="text-xs text-gray-300">Preview</span>
          </div>
          {duration && (
            <div className="px-2 py-1 bg-black/60 rounded-md">
              <span className="text-xs text-gray-300">{duration}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
};

// Lightweight AI Status Panel Component
const AIStatusPanel = ({ status, progress }) => {
  const statusConfig = {
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', label: 'Idle', icon: Brain },
    ready: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', label: 'Ready', icon: CheckCircle },
    uploading: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', label: 'Uploading', icon: UploadIcon },
    processing: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'Processing', icon: Loader2 },
    completed: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'Completed', icon: Check },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Error', icon: X }
  };
  
  const config = statusConfig[status] || statusConfig.idle;
  const StatusIcon = config.icon;
  
  return (
    <div className={`relative overflow-hidden rounded-xl p-4 ${config.bg} border ${config.border} animate-slide-up`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <AIReadyIndicator status={status} />
          {status === 'uploading' || status === 'processing' ? (
            <span className="text-xs text-gray-400">{progress}%</span>
          ) : null}
        </div>
      </div>
      {/* CSS-only progress bar */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="mt-3 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 progress-bar-transition"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Mini Upload History Component
const UploadHistory = ({ uploads }) => {
  const getStatusBadge = (status) => {
    const config = {
      processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return config[status] || config.processing;
  };
  
  if (uploads.length === 0) return null;
  
  return (
    <div className="mt-6 p-4 rounded-xl bg-gray-900/50 border border-white/10 backdrop-blur-sm animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Recent Uploads</span>
      </div>
      <div className="space-y-2">
        {uploads.slice(0, 3).map((upload) => (
          <div key={upload.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{upload.title}</p>
              <p className="text-xs text-gray-500">{upload.date}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(upload.status)}`}>
              {upload.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// Estimate processing time (mock calculation)
const estimateProcessingTime = (fileSizeMB) => {
  if (fileSizeMB < 10) return '~30 seconds';
  if (fileSizeMB < 50) return '~1-2 minutes';
  if (fileSizeMB < 100) return '~3-5 minutes';
  return '~10+ minutes';
};

const Upload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [aiStatus, setAiStatus] = useState('ready');
  
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);
  const navigate = useNavigate();

  // Inject CSS styles on mount
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS_STYLES;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  // Cleanup thumbnail URL on unmount
  useEffect(() => {
    return () => {
      // Cleanup handled by ThumbnailPreview component
    };
  }, []);

  // Memoized validation
  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return null;
    
    const validTypes = ['video/mp4', 'video/mov', 'video/mkv', 'video/webm', 'video/avi'];
    const maxSizeMB = 500;
    
    if (!validTypes.includes(selectedFile.type)) {
      return { valid: false, error: 'Invalid file type. Only video files accepted.' };
    }
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `File too large. Max ${maxSizeMB}MB allowed.` };
    }
    return { valid: true, error: null };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validation = validateFile(droppedFile);
      
      if (!validation.valid) {
        setFileError(validation.error);
        return;
      }
      
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e) => {
    setFileError(null);
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validation = validateFile(selectedFile);
      
      if (!validation.valid) {
        setFileError(validation.error);
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // XHR-based upload for accurate progress tracking
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setAiStatus('uploading');
    setUploading(true);
    setMessage(null);
    setUploadProgress(0);

    // Add to local history
    const newUpload = {
      id: Date.now(),
      title: title || file.name,
      status: 'processing',
      date: new Date().toLocaleDateString()
    };
    setUploadHistory(prev => [newUpload, ...prev]);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      
      // Progress event handler
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percent);
        }
      };
      
      // Load complete
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setMessage({ type: 'success', text: 'Video uploaded successfully!' });
          setAiStatus('completed');
          
          setUploadHistory(prev => 
            prev.map(u => u.id === newUpload.id ? { ...u, status: 'completed' } : u)
          );
          
          setFile(null);
          setTitle('');
          setUploadProgress(100);
          
          setTimeout(() => {
            setAiStatus('ready');
            navigate('/dashboard');
          }, 1500);
          
          resolve(xhr.response);
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
        setUploading(false);
      };
      
      // Error handler
      xhr.onerror = () => {
        reject(new Error('Network error'));
        setUploading(false);
      };
      
      // Setup form data - NO AUTH NEEDED
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);
      
      // Open connection - direct to backend NO AUTH (standalone mode)
      xhr.open('POST', 'http://localhost:3001/api/video/upload-simple');
      
      // Send request
      xhr.send(formData);
    }).catch((error) => {
      // Handle error in promise chain
      try {
        const errorData = error.message ? JSON.parse(error.message) : { error: error.message };
        setMessage({ type: 'error', text: errorData.error || 'Upload failed' });
      } catch {
        setMessage({ type: 'error', text: error.message || 'Upload failed' });
      }
      setAiStatus('error');
      setUploadProgress(0);
      
      setUploadHistory(prev => 
        prev.map(u => u.id === newUpload.id ? { ...u, status: 'failed' } : u)
      );
      
      setTimeout(() => setAiStatus('ready'), 3000);
    });
  };

  const handleUrlDownload = async (e) => {
    e.preventDefault();
    if (!url) return;

    setAiStatus('processing');
    setDownloading(true);
    setMessage(null);

    try {
      await axios.post('/api/video/download', { url });

      setMessage({ type: 'success', text: 'Video downloaded successfully!' });
      setAiStatus('completed');
      setUrl('');

      setTimeout(() => {
        setAiStatus('ready');
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Download failed' });
      setAiStatus('error');
      setTimeout(() => setAiStatus('ready'), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const supportedPlatforms = [
    { name: 'YouTube', icon: Youtube, color: 'bg-red-500' },
    { name: 'Vimeo', icon: Cloud, color: 'bg-cyan-500' },
    { name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { name: 'Twitter', icon: Twitter, color: 'bg-blue-400' },
  ];

  const fileSizeMB = file ? file.size / (1024 * 1024) : 0;
  const estimatedTime = useMemo(() => estimateProcessingTime(fileSizeMB), [fileSizeMB]);

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
            Upload Center
          </h1>
          <p className="text-gray-400 mt-2">Upload videos or download from URL</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border backdrop-blur-xl animate-slide-up ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
              <span className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</span>
            </div>
          </div>
        )}

        {/* AI Status Panel */}
        <div className="mb-6">
          <AIStatusPanel status={aiStatus} progress={uploadProgress} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload from File */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl animate-slide-up">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5" />
            <div className="relative p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <FileVideo className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Upload from File</h2>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-5">
                {/* Enhanced Dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all dropzone-hover
                    ${dragActive ? 'border-purple-500 bg-purple-500/10 scale-[1.01]' : fileError ? 'border-red-500 bg-red-500/5' : uploading ? 'border-gray-600 bg-gray-800/20 cursor-not-allowed' : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/mov,video/mkv,video/webm,video/avi"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                  
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileVideo className="w-12 h-12 text-purple-400 mb-3" />
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-gray-500 text-sm mt-1">{formatFileSize(file.size)}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{estimatedTime}</span>
                        <span className="capitalize">{file.type.split('/')[1]}</span>
                      </div>
                    </div>
                  ) : fileError ? (
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
                      <p className="text-red-400 text-sm">{fileError}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadIcon className="w-12 h-12 text-gray-500 mb-3" />
                      <p className="text-gray-300 font-medium">Drag and drop your video here</p>
                      <p className="text-gray-500 text-sm mt-1">or click to browse</p>
                      <p className="text-gray-600 text-xs mt-3">MP4, MOV, MKV, WebM, AVI • Max 500MB</p>
                    </div>
                  )}
                </div>

                {/* File Validation Badge */}
                <FileValidationBadge file={file} fileSizeMB={fileSizeMB} />

                {/* Thumbnail Preview */}
                <ThumbnailPreview file={file} onClear={clearFile} />

                {/* Real Progress Bar with XHR */}
                {uploading && (
                  <div className="space-y-2 animate-slide-up">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Uploading...</span>
                      <span className="text-purple-400 font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 progress-bar-transition"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Video Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter video title"
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadIcon className="w-5 h-5" />}
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </button>

                {/* Mini Upload History */}
                <UploadHistory uploads={uploadHistory} />
              </form>
            </div>
          </div>

          {/* Download from URL */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl animate-slide-up">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-green-500/5" />
            <div className="relative p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-cyan-500/20 rounded-xl">
                  <Download className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Download from URL</h2>
              </div>

              <form onSubmit={handleUrlDownload} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Video URL</label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      disabled={downloading}
                      className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all disabled:opacity-50"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={downloading || !url}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
                >
                  {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {downloading ? 'Downloading...' : 'Download Video'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-4">Supported Platforms:</p>
                <div className="flex flex-wrap gap-3">
                  {supportedPlatforms.map((platform) => (
                    <div key={platform.name} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <div className={`w-2 h-2 rounded-full ${platform.color}`} />
                      <span className="text-sm text-gray-300">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
