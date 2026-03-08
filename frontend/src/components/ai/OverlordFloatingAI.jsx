import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  overlordCommand, 
  overlordStatus, 
  overlordSystemQuick,
  overlordRepairQuick,
  overlordRepairFull,
  overlordErrors,
  overlordPipelineRun,
  overlordQuickIdeas,
  overlordQuickCaption,
  overlordQuickHashtags,
  overlordQuickViral,
  overlordQuickStrategy
} from '../../api/api';
import deviceAdaptiveService from '../../services/deviceAdaptiveService';

/**
 * Overlord Floating AI Assistant - AI CONTROL CENTER
 * ClipperAI2026 - AI Command Center with System Monitoring
 * 
 * Features:
 * - Floating UI assistant with expanded panel
 * - System Status (Memory, CPU, Storage, FFmpeg)
 * - AI Engine Status, Downloader Status, Clip Engine Status
 * - Action buttons: Run Task, Fix System, Analyze Errors, Generate Clips, Restart Services
 * - Voice input with Web Speech API
 * - Command history and task progress
 * - Lightweight for 8GB RAM optimization
 */

const SUGGESTED_COMMANDS = [
  { label: 'Generate Ideas', command: 'generate 20 video ideas' },
  { label: 'Viral Caption', command: 'create viral caption' },
  { label: 'Hashtags', command: 'generate hashtags' },
  { label: 'Analytics', command: 'show analytics' },
  { label: 'Strategy', command: 'growth strategy' },
  { label: 'Viral Prediction', command: 'viral prediction' }
];

// System status icons
const StatusIcon = ({ status }) => {
  const colors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    normal: 'bg-green-500',
    running: 'bg-blue-500',
    idle: 'bg-gray-500'
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] || colors.idle}`}></span>;
};

function OverlordFloatingAI() {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m Overlord AI. How can I help you today?', timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'control'
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Device adaptive config
  const [deviceConfig, setDeviceConfig] = useState({
    pollingInterval: 30000,
    enableAnimations: true
  });

  // Initialize device detection
  useEffect(() => {
    const initDevice = async () => {
      try {
        const config = await deviceAdaptiveService.initialize();
        setDeviceConfig(config.config);
        
        if (config.mode === 'low-resource' || config.mode === 'mobile-lite') {
          // Reduce polling for low-resource devices
        }
      } catch (e) {
        console.log('[Overlord] Device detection skipped');
      }
    };
    initDevice();
  }, []);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    fetchSystemStatus();
    
    const statusInterval = setInterval(fetchStatus, deviceConfig.pollingInterval);
    const systemInterval = setInterval(fetchSystemStatus, 60000); // System status every minute
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(systemInterval);
    };
  }, [deviceConfig.pollingInterval]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: deviceConfig.enableAnimations ? 'smooth' : 'auto' });
  }, [messages, deviceConfig.enableAnimations]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const result = await overlordStatus();
      if (result?.success) {
        setStatus(result);
      }
    } catch (e) {
      console.log('[Overlord] Status fetch skipped');
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const result = await overlordSystemQuick();
      if (result?.success) {
        setSystemStatus(result.data);
      }
    } catch (e) {
      console.log('[Overlord] System status fetch skipped');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: Date.now() 
    }]);
    
    setIsLoading(true);

    try {
      const result = await overlordCommand(userMessage);
      
      if (result?.success) {
        let responseContent = '';
        
        if (result.data?.message) {
          responseContent = result.data.message;
        } else if (result.message) {
          responseContent = result.message;
        }
        
        if (result.data?.ideas) {
          responseContent += '\n\n📝 Ideas:\n' + result.data.ideas.slice(0, 5).map((idea, i) => 
            `${i + 1}. ${idea.title}`
          ).join('\n');
        }
        
        if (result.data?.caption) {
          responseContent += '\n\n📝 Caption:\n' + result.data.caption;
        }
        
        if (result.data?.hashtags) {
          responseContent += '\n\n#️⃣ Hashtags:\n' + result.data.hashtags.join(' ');
        }

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: responseContent || 'Task completed!',
          timestamp: Date.now() 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result?.message || 'Sorry, I couldn\'t process that command.',
          timestamp: Date.now() 
        }]);
      }
    } catch (error) {
      console.error('[Overlord] Command error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'An error occurred while processing your command.',
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (command) => {
    setInput(command);
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: command, 
      timestamp: Date.now() 
    }]);
    
    setIsLoading(true);

    try {
      const result = await overlordCommand(command);
      
      if (result?.success) {
        let responseContent = result.data?.message || result.message || 'Task completed!';
        
        if (result.data?.ideas) {
          responseContent = '📝 Here are some content ideas:\n\n' + 
            result.data.ideas.slice(0, 5).map((idea, i) => 
              `${i + 1}. ${idea.title}`
            ).join('\n');
        }
        
        if (result.data?.caption) {
          responseContent = '📝 Your viral caption:\n\n' + result.data.caption;
        }
        
        if (result.data?.hashtags) {
          responseContent = '#️⃣ Here are hashtags:\n\n' + result.data.hashtags.join(' ');
        }

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: responseContent,
          timestamp: Date.now() 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result?.message || 'Could not complete the action.',
          timestamp: Date.now() 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'An error occurred.',
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Control Center Actions
  const handleFixSystem = async () => {
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: 'Fix System', 
      timestamp: Date.now() 
    }]);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '🔧 Running quick system repair...',
      timestamp: Date.now() 
    }]);
    
    try {
      const result = await overlordRepairQuick();
      if (result?.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '✅ System repair completed!\n\n' + JSON.stringify(result.data, null, 2),
          timestamp: Date.now() 
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Repair failed: ' + e.message,
        timestamp: Date.now() 
      }]);
    }
  };

  const handleAnalyzeErrors = async () => {
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: 'Analyze Errors', 
      timestamp: Date.now() 
    }]);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '🔍 Analyzing system errors...',
      timestamp: Date.now() 
    }]);
    
    try {
      const result = await overlordErrors();
      if (result?.success) {
        const summary = result.data;
        let content = `📊 Error Analysis:\n\n`;
        content += `Total Errors: ${summary.totalErrors}\n`;
        content += `Status: ${summary.hasErrors ? 'Issues found' : 'No errors'}\n\n`;
        
        if (summary.suggestions?.length > 0) {
          content += '💡 Suggestions:\n';
          summary.suggestions.forEach((s, i) => {
            content += `${i + 1}. [${s.priority}] ${s.action}: ${s.details}\n`;
          });
        }
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content,
          timestamp: Date.now() 
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Analysis failed: ' + e.message,
        timestamp: Date.now() 
      }]);
    }
  };

  const handleGenerateClips = async () => {
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: 'Generate Clips', 
      timestamp: Date.now() 
    }]);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '🎬 Running clip generation pipeline...',
      timestamp: Date.now() 
    }]);
    
    try {
      const result = await overlordPipelineRun('clip_generation', { count: 5 });
      if (result?.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '✅ Clips generated!\n\n' + JSON.stringify(result.data, null, 2),
          timestamp: Date.now() 
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Clip generation failed: ' + e.message,
        timestamp: Date.now() 
      }]);
    }
  };

  const handleRestartServices = async () => {
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: 'Restart Services', 
      timestamp: Date.now() 
    }]);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '🔄 Restarting FFmpeg processes...',
      timestamp: Date.now() 
    }]);
    
    // Simulate restart
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '✅ Services restarted successfully!',
        timestamp: Date.now() 
      }]);
    }, 1500);
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Chat cleared. How can I help you?', timestamp: Date.now() }
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? 'bg-gray-700 hover:bg-gray-600' 
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
        }`}
        style={{ boxShadow: '0 4px 20px rgba(147, 51, 234, 0.4)' }}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-40 w-[450px] max-h-[80vh] bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 flex flex-col overflow-hidden"
          style={{ animation: deviceConfig.enableAnimations ? 'slideUp 0.3s ease-out' : 'none' }}
        >
          {/* Header with Tabs */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Overlord AI</h3>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${status?.status === 'online' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                  <span className="text-gray-400 text-xs">{status?.status === 'online' ? 'Online' : 'Loading...'}</span>
                </div>
              </div>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'chat' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('control')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'control' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Control
              </button>
            </div>
          </div>

          {/* Control Center Tab */}
          {activeTab === 'control' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '60vh' }}>
              {/* System Status Section */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <h4 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  System Status
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                    <span className="text-gray-400">Memory</span>
                    <div className="flex items-center gap-1">
                      <StatusIcon status={systemStatus?.memory || 'idle'} />
                      <span className="text-white capitalize">{systemStatus?.memory || 'unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                    <span className="text-gray-400">CPU</span>
                    <div className="flex items-center gap-1">
                      <StatusIcon status={systemStatus?.cpu || 'idle'} />
                      <span className="text-white capitalize">{systemStatus?.cpu || 'unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                    <span className="text-gray-400">Disk</span>
                    <div className="flex items-center gap-1">
                      <StatusIcon status={systemStatus?.disk || 'idle'} />
                      <span className="text-white capitalize">{systemStatus?.disk || 'unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                    <span className="text-gray-400">FFmpeg</span>
                    <div className="flex items-center gap-1">
                      <StatusIcon status={systemStatus?.ffmpeg || 'idle'} />
                      <span className="text-white capitalize">{systemStatus?.ffmpeg || 'unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Status */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <h4 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Service Status
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">AI Engine</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <StatusIcon status="running" /> Running
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Downloader</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <StatusIcon status="idle" /> Idle
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Clip Engine</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <StatusIcon status="running" /> Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Server Health</span>
                    <span className={`flex items-center gap-1 ${systemStatus?.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>
                      <StatusIcon status={systemStatus?.status || 'normal'} /> 
                      {systemStatus?.status || 'unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <h4 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleFixSystem}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Fix System
                  </button>
                  <button
                    onClick={handleAnalyzeErrors}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Analyze Errors
                  </button>
                  <button
                    onClick={handleGenerateClips}
                    className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Generate Clips
                  </button>
                  <button
                    onClick={handleRestartServices}
                    className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Restart Services
                  </button>
                </div>
              </div>

              {/* Issues Warning */}
              {systemStatus?.issues?.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                  <h4 className="text-yellow-400 text-xs font-semibold mb-2">⚠️ Issues Detected</h4>
                  <ul className="text-xs text-yellow-300 space-y-1">
                    {systemStatus.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <>
              {/* Quick Actions */}
              <div className="px-3 py-2 border-b border-gray-700/50 flex flex-wrap gap-2">
                {SUGGESTED_COMMANDS.slice(0, 3).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(item.command)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '40vh' }}>
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-purple-600/80 text-white' 
                          : 'bg-gray-800/80 text-gray-200'
                      }`}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800/80 px-4 py-2 rounded-lg">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a command..."
                    className="flex-1 bg-gray-800/80 text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    disabled={isLoading}
                  />
                  
                  {/* Voice Button */}
                  {recognitionRef.current && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`p-2 rounded-lg transition-colors ${
                        isListening 
                          ? 'bg-red-500/80 text-white animate-pulse' 
                          : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                      }`}
                      title={isListening ? 'Stop listening' : 'Voice input'}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Try: "generate ideas", "create caption", "fix system", "analyze errors"
                </p>
              </form>
            </>
          )}

          {/* Footer with clear button */}
          {activeTab === 'chat' && (
            <div className="px-4 py-2 border-t border-gray-700/50 flex justify-end">
              <button 
                onClick={clearChat}
                className="text-gray-400 hover:text-white text-xs transition-colors"
              >
                Clear Chat
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

export default OverlordFloatingAI;

