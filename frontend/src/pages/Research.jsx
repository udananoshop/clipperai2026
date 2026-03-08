import { useState, useCallback, useEffect } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  Trash2,
  Loader2,
  TrendingUp,
  Target,
  Lightbulb,
  Hash,
  Clock,
  BarChart3,
  Zap,
  MessageSquare
} from 'lucide-react';

const analyzeContent = (content, platform) => {
  const wordCount = content.split(/\s+/).filter(w => w).length;
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);
  
  const baseScore = 45 + Math.floor(Math.random() * 40);
  const hookStrength = Math.min(95, Math.floor(baseScore + Math.random() * 20));
  const retention = Math.min(95, Math.floor(baseScore + Math.random() * 15));
  const emotional = Math.min(95, Math.floor(baseScore + Math.random() * 25));
  const shareability = Math.min(95, Math.floor(baseScore + Math.random() * 30));
  
  const topics = ['Technology', 'Lifestyle', 'Education', 'Entertainment', 'Business', 'Health', 'Finance', 'Gaming'];
  const mainTopic = topics[Math.floor(Math.random() * topics.length)];
  
  const audiences = ['Gen Z', 'Millennials', 'Professionals', 'Parents', 'Students', 'Tech Enthusiasts'];
  const targetAudience = audiences[Math.floor(Math.random() * audiences.length)];
  
  const categories = ['Tutorial', 'Review', 'Vlog', 'Educational', 'Comedy', 'Motivation', 'News', 'How-to'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const tones = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational', 'Entertaining'];
  const tone = tones[Math.floor(Math.random() * tones.length)];
  
  const sentiments = ['Positive', 'Neutral', 'Energetic'];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  
  const keywords = [
    { word: mainTopic.toLowerCase(), density: Math.floor(Math.random() * 5) + 1 },
    { word: 'viral', density: Math.floor(Math.random() * 3) + 1 },
    { word: 'tips', density: Math.floor(Math.random() * 2) + 1 },
    { word: '2024', density: Math.floor(Math.random() * 2) + 1 },
    { word: 'guide', density: Math.floor(Math.random() * 2) + 1 },
  ];
  
  const hashtags = [
    `#${mainTopic.toLowerCase()}`, '#viral', '#trending', '#fyp', '#viralvideo',
    '#contentcreator', '#tips', '#2024', '#viralpost', '#viralvideos'
  ].slice(0, 8 + Math.floor(Math.random() * 3));
  
  const suggestions = [
    { type: 'hook', text: `Start with a hook: "You won't believe ${mainTopic}..."`, category: 'Hook' },
    { type: 'cta', text: 'Add a strong CTA: "Like and follow for more!"', category: 'CTA' },
    { type: 'title', text: `Try: "The Ultimate ${mainTopic} Guide for 2024"`, category: 'Title' },
    { type: 'caption', text: 'Add relevant hashtags and mention platform features', category: 'Caption' },
  ];
  
  const predictedReach = baseScore + Math.floor(Math.random() * 20);
  const bestTimes = ['2:00 PM', '6:00 PM', '9:00 PM', '12:00 PM', '8:00 PM'];
  const platformRanking = [
    { platform: 'TikTok', score: Math.floor(predictedReach + Math.random() * 15) },
    { platform: 'YouTube Shorts', score: Math.floor(predictedReach + Math.random() * 10) },
    { platform: 'Instagram Reels', score: Math.floor(predictedReach + Math.random() * 5) },
    { platform: 'Facebook', score: Math.floor(predictedReach - Math.random() * 10) },
  ].sort((a, b) => b.score - a.score);
  
  return {
    overallScore: baseScore,
    metrics: { hookStrength, retention, emotional, shareability },
    content: { mainTopic, targetAudience, category, tone, sentiment },
    keywords,
    hashtags,
    suggestions,
    prediction: {
      reach: predictedReach,
      bestTime: bestTimes[Math.floor(Math.random() * bestTimes.length)],
      platformRanking
    },
    meta: { wordCount, charCount, readingTime }
  };
};

const ProgressBar = ({ value, label, color = 'bg-purple-500' }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-300">{value}%</span>
    </div>
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors" title="Copy">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
};

const Hashtag = ({ tag }) => {
  const [copied, setCopied] = useState(false);
  const handleClick = () => { navigator.clipboard.writeText(tag); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={handleClick} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors">
      {copied ? <Check className="w-3 h-3 inline mr-1" /> : <Hash className="w-3 h-3 inline mr-1" />}
      {tag.replace('#', '')}
    </button>
  );
};

const ModeSelector = ({ mode, setMode }) => (
  <div className="flex gap-2 mb-6">
    {['Basic Analysis', 'Deep Analysis', 'Viral Scan'].map((m) => (
      <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
        {m}
      </button>
    ))}
  </div>
);

const AnalysisInput = ({ content, setContent, platform, setPlatform, analyzing, onAnalyze }) => {
  const charCount = content.length;
  const wordCount = content.split(/\s+/).filter(w => w).length;
  const readingTime = Math.ceil(wordCount / 200) || 0;
  
  return (
    <div className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-purple-400" />
        Content Analyzer
      </h2>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste transcript, caption, or script here..." className="w-full h-48 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span>{charCount} characters</span>
        <span>{wordCount} words</span>
        <span>~{readingTime} min read</span>
      </div>
      <div className="mt-4">
        <label className="text-sm text-gray-400 mb-2 block">Platform</label>
        <div className="flex gap-2">
          {['YouTube', 'TikTok', 'Instagram', 'Facebook'].map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${platform === p ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onAnalyze} disabled={analyzing || !content.trim()} className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2">
        {analyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Zap className="w-5 h-5" /> Analyze Content</>}
      </button>
    </div>
  );
};

const AnalysisResults = ({ results }) => {
  if (!results) {
    return (
      <div className="bg-gray-900/80 rounded-2xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Run analysis to see AI insights</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900/80 rounded-2xl p-6 border border-white/10 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-400" /> Overall Score</h3>
        <div className="flex items-center gap-6 mb-4">
          <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{results.overallScore}</div>
          <span className="text-gray-400">/ 100</span>
        </div>
        <ProgressBar value={results.metrics.hookStrength} label="Hook Strength" color="bg-purple-500" />
        <ProgressBar value={results.metrics.retention} label="Retention Potential" color="bg-cyan-500" />
        <ProgressBar value={results.metrics.emotional} label="Emotional Impact" color="bg-pink-500" />
        <ProgressBar value={results.metrics.shareability} label="Shareability" color="bg-green-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-green-400" /> Content Breakdown</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500">Main Topic</div><div className="text-white font-medium">{results.content.mainTopic}</div></div>
          <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500">Target Audience</div><div className="text-white font-medium">{results.content.targetAudience}</div></div>
          <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500">Category</div><div className="text-white font-medium">{results.content.category}</div></div>
          <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500">Tone</div><div className="text-white font-medium">{results.content.tone}</div></div>
          <div className="bg-gray-800/50 rounded-lg p-3 col-span-2"><div className="text-xs text-gray-500">Sentiment</div><div className="text-white font-medium">{results.content.sentiment}</div></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> Optimization Suggestions</h3>
        <div className="space-y-2">
          {results.suggestions.map((s, i) => (
            <div key={i} className="flex items-start justify-between bg-gray-800/50 rounded-lg p-3">
              <div><span className="text-xs text-purple-400">{s.category}</span><p className="text-gray-300 text-sm">{s.text}</p></div>
              <CopyButton text={s.text} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Hash className="w-5 h-5 text-pink-400" /> Keyword Intelligence</h3>
        <div className="space-y-2 mb-4">{results.keywords.map((k, i) => (<div key={i} className="flex justify-between text-sm"><span className="text-gray-300">{k.word}</span><span className="text-gray-500">{k.density}% density</span></div>))}</div>
        <div className="flex flex-wrap gap-2">{results.hashtags.map((tag, i) => (<Hashtag key={i} tag={tag} />))}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /> Viral Prediction</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500">Predicted Reach</div><div className="text-2xl font-bold text-purple-400">{results.prediction.reach}</div></div>
          <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500">Best Posting Time</div><div className="text-lg font-medium text-white flex items-center gap-1"><Clock className="w-4 h-4" />{results.prediction.bestTime}</div></div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-1">Platform Ranking</div>
          {results.prediction.platformRanking.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-400 w-24">{p.platform}</span>
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500" style={{ width: `${p.score}%` }} /></div>
              <span className="text-gray-300 text-sm w-8">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HistoryItem = ({ item, onLoad, onDelete }) => (
  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
    <button onClick={() => onLoad(item)} className="flex-1 text-left">
      <div className="text-white text-sm font-medium truncate">{item.title || 'Untitled'}</div>
      <div className="text-xs text-gray-500">{item.date} • {item.platform} • Score: {item.score}</div>
    </button>
    <button onClick={() => onDelete(item.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" /></button>
  </div>
);

const ResearchHistory = ({ history, onLoad, onDelete }) => {
  if (!history || history.length === 0) return null;
  return (
    <div className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Research</h3>
      <div className="space-y-2">{history.map((item) => (<HistoryItem key={item.id} item={item} onLoad={onLoad} onDelete={onDelete} />))}</div>
    </div>
  );
};

const Research = () => {
  const [mode, setMode] = useState('Basic Analysis');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('YouTube');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('researchHistory');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error('Failed to load history'); }
    }
  }, []);
  
  const saveHistory = useCallback((newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('researchHistory', JSON.stringify(newHistory));
  }, []);
  
  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
    const analysisResults = analyzeContent(content, platform);
    setResults(analysisResults);
    const newItem = { id: Date.now(), title: content.substring(0, 50) + (content.length > 50 ? '...' : ''), date: new Date().toLocaleDateString(), platform, score: analysisResults.overallScore, data: analysisResults, content: content };
    const updatedHistory = [newItem, ...history.slice(0, 4)];
    saveHistory(updatedHistory);
    setAnalyzing(false);
  }, [content, platform, mode, history, saveHistory]);
  
  const handleLoadHistory = useCallback((item) => { setResults(item.data); setContent(item.content); setPlatform(item.platform); }, []);
  const handleDeleteHistory = useCallback((id) => { const updated = history.filter(h => h.id !== id); saveHistory(updated); }, [history, saveHistory]);
  
  return (
    <div className="min-h-screen p-6">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AI Research Lab</h1>
          <p className="text-gray-400">Advanced AI Content Intelligence Engine</p>
        </div>
        <ModeSelector mode={mode} setMode={setMode} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AnalysisInput content={content} setContent={setContent} platform={platform} setPlatform={setPlatform} analyzing={analyzing} onAnalyze={handleAnalyze} />
          <AnalysisResults results={results} />
        </div>
        <ResearchHistory history={history} onLoad={handleLoadHistory} onDelete={handleDeleteHistory} />
      </div>
    </div>
  );
};

export default Research;
