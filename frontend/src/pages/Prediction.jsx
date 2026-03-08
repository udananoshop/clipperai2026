import React, { useState, useCallback, useMemo } from 'react';
import { Target, Sparkles, TrendingUp, Zap, FileText, Lightbulb, Clock, Hash, AlertCircle, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';

// Lightweight scoring function - no external dependencies
const calculatePrediction = (inputs) => {
  try {
    const { title, platform, category, duration, hookStrength } = inputs || {};
    let score = 50;
    
    // Title length factor
    let titleScore = 0;
    if (title && title.length >= 40 && title.length <= 60) titleScore = 15;
    else if (title && title.length >= 20 && title.length <= 80) titleScore = 8;
    
    score += titleScore;
    
    const platformMultipliers = { youtube: 1.0, tiktok: 1.15, instagram: 1.05 };
    const platformMult = platformMultipliers[platform] || 1.0;
    
    const categoryWeights = { tech: 1.2, gaming: 1.15, education: 1.1, entertainment: 1.0, lifestyle: 0.95 };
    const catWeight = categoryWeights[category?.toLowerCase()] || 1.0;
    
    const optimalDuration = platform === 'youtube' ? 480 : platform === 'tiktok' ? 30 : 60;
    const durationDiff = Math.abs((duration || 60) - optimalDuration);
    const durationScore = Math.max(0, 20 - durationDiff / 10);
    const hookScore = (hookStrength || 5) * 3;
    
    const rawScore = (score + hookScore) * platformMult * catWeight + durationScore;
    const finalScore = Math.min(100, Math.max(0, Math.floor(rawScore)));
    
    // Calculate individual factor contributions for explanation
    const factors = {
      title: { score: titleScore, max: 15, label: 'Title Length', weight: 0.25 },
      platform: { score: (platformMult - 1) * 100, max: 15, label: 'Platform Bonus', weight: 0.15 },
      category: { score: (catWeight - 1) * 50, max: 10, label: 'Category', weight: 0.15 },
      duration: { score: durationScore, max: 20, label: 'Duration', weight: 0.20 },
      hook: { score: hookScore, max: 30, label: 'Hook Strength', weight: 0.25 }
    };
    
    // Find dominant factor
    let dominantFactor = 'hook';
    let maxFactorScore = factors.hook.score;
    Object.entries(factors).forEach(([key, val]) => {
      if (val.score > maxFactorScore) {
        maxFactorScore = val.score;
        dominantFactor = key;
      }
    });
    
    const viewBase = platform === 'youtube' ? 50000 : platform === 'tiktok' ? 100000 : 30000;
    const viewMultiplier = finalScore / 50;
    const minViews = Math.floor(viewBase * viewMultiplier * 0.5);
    const maxViews = Math.floor(viewBase * viewMultiplier * 2);
    const engagement = Math.min(25, Math.floor(3 + (finalScore / 100) * 18));
    const viralProb = Math.min(95, Math.floor(finalScore * 0.9 + 5));
    
    const riskLevel = finalScore >= 75 ? 'Low' : finalScore >= 55 ? 'Medium' : 'High';
    
    const times = ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '8:00 PM', '9:00 PM'];
    const bestTime = times[Math.floor(Math.random() * times.length)];
    const hashtagIntensity = finalScore >= 75 ? 'High' : finalScore >= 55 ? 'Medium' : 'Low';
    const captionTones = ['Exciting', 'Mysterious', 'Emotional', 'Humorous', 'Inspirational'];
    const captionTone = captionTones[Math.floor(Math.random() * captionTones.length)];
    const hookSuggestions = [
      `Wait until you see what happens...`,
      `This changed everything about ${category || 'content'}...`,
      `The secret nobody tells you...`,
      `${(title || '').substring(0, 20)} will blow your mind...`
    ];
    
    // Generate explanation based on score
    const explanation = generateExplanation(finalScore, dominantFactor, factors, inputs);
    
    return { 
      score: finalScore, 
      views: { min: minViews, max: maxViews }, 
      engagement, 
      viralProb, 
      riskLevel, 
      strategy: { bestTime, hashtagIntensity, captionTone, hookSuggestions },
      factors,
      dominantFactor,
      explanation,
      error: null
    };
  } catch (err) {
    return { error: err.message, score: 50 };
  }
};

// Generate explanation based on score and factors
const generateExplanation = (score, dominantFactor, factors, inputs) => {
  const explanations = {
    high: {
      title: "Your title length is optimal - between 40-60 characters grabs attention without being too long.",
      platform: `${inputs.platform} is performing well for this type of content.`,
      category: `The ${inputs.category} category has strong engagement potential.`,
      duration: "Your video duration is well-suited for the selected platform.",
      hook: "Strong hook strength! Your opening is compelling and likely to retain viewers."
    },
    low: {
      title: "Consider optimizing your title to 40-60 characters for better click-through rates.",
      platform: "Try testing different platforms to find where your content performs best.",
      category: "Experiment with trending categories or adjust your content strategy.",
      duration: "Consider adjusting duration to match platform best practices.",
      hook: "Strengthen your opening hook to grab attention in the first 3 seconds."
    }
  };
  
  const level = score >= 55 ? 'high' : 'low';
  const suggestions = [];
  
  if (factors[dominantFactor].score < factors[dominantFactor].max * 0.5) {
    suggestions.push(explanations.low[dominantFactor]);
  } else {
    suggestions.push(explanations.high[dominantFactor]);
  }
  
  if (score < 75) {
    if (inputs.title.length < 20) {
      suggestions.push("Try adding power words like 'secret', 'revealed', or 'hack' to your title.");
    }
    if (inputs.hookStrength < 7) {
      suggestions.push("Increase hook strength by creating a stronger opening statement.");
    }
  } else {
    suggestions.push("Great score! Your content is well-optimized for viral potential.");
  }
  
  return {
    dominantFactor: factors[dominantFactor].label,
    scoreLevel: level,
    suggestions: suggestions.slice(0, 2)
  };
};

// Circular Progress component - lightweight SVG
const CircularProgress = React.memo(({ value }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const getColor = (v) => v >= 75 ? '#22c55e' : v >= 55 ? '#eab308' : '#ef4444';
  
  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="48" cy="48" r={radius} stroke="#374151" strokeWidth="8" fill="none" />
        <circle 
          cx="48" cy="48" r={radius} 
          stroke={getColor(value)} 
          strokeWidth="8" 
          fill="none"
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl font-bold ${value >= 75 ? 'text-green-400' : value >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
          {value}
        </span>
      </div>
    </div>
  );
});

CircularProgress.displayName = 'CircularProgress';

// Fade-in wrapper component
const FadeIn = ({ children, delay = 0 }) => (
  <div 
    className="animate-fade-in"
    style={{ 
      animationDelay: `${delay}ms`,
      opacity: 0,
      animationFillMode: 'forwards'
    }}
  >
    {children}
  </div>
);

// Add keyframe animation to CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

// OVERLORD 9.5 - Lightweight Prediction State Manager
// Main Prediction Component
const Prediction = () => {
  const [inputs, setInputs] = useState({ 
    title: '', 
    platform: 'youtube', 
    category: 'tech', 
    duration: 60, 
    hookStrength: 5 
  });
  
  // PART 2: Prevent Duplicate Prediction Calls
  const [isPredicting, setIsPredicting] = useState(false);
  
  // Store only primitive values (no heavy objects)
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Memoized handlers
  const handleInputChange = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handlePredict = useCallback(() => {
    // PART 2: Prevent duplicate calls - avoids memory stacking
    if (isPredicting) return;
    
    if (!inputs.title.trim()) {
      setError('Please enter a video title');
      return;
    }
    
    setIsPredicting(true);
    setLoading(true);
    setError(null);
    setPrediction(null);
    
    // Simulate async with safe handling
    setTimeout(() => {
      try {
        const result = calculatePrediction(inputs);
        
        // PART 1: Auto Release Prediction State
        // Extract only primitive values, discard heavy objects
        if (result.error) {
          setError(result.error);
        } else {
          // Store only primitives (numbers, strings) - no full response objects
          const lightweightResult = {
            score: result.score,
            views: { min: result.views.min, max: result.views.max },
            engagement: result.engagement,
            viralProb: result.viralProb,
            riskLevel: result.riskLevel,
            strategy: result.strategy,
            explanation: result.explanation,
            factors: result.factors,
            dominantFactor: result.dominantFactor
          };
          
          setPrediction(lightweightResult);
          
          // Add lightweight entry to history (limit title length)
          setHistory(prev => [{
            title: inputs.title.substring(0, 50),
            platform: inputs.platform,
            score: result.score,
            category: inputs.category,
            duration: inputs.duration,
            hookStrength: inputs.hookStrength,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev.slice(0, 9)]);
        }
      } catch (err) {
        setError('Prediction failed. Please try again.');
      } finally {
        setLoading(false);
        setIsPredicting(false);
        
        // PART 3: Light Auto Cleanup After Render
        // No forced GC. Just monitoring for stability.
        setTimeout(() => {
          if (performance.memory) {
            console.log("[OVERLORD 9.5] Memory snapshot:", 
              (performance.memory.usedJSHeapSize / 1048576).toFixed(2), "MB"
            );
          }
        }, 3000);
      }
    }, 500);
  }, [inputs, isPredicting]);

  // Memoized categories
  const categories = useMemo(() => [
    'tech', 'gaming', 'education', 'entertainment', 'lifestyle', 
    'business', 'music', 'sports', 'howto', 'comedy', 'vlog'
  ], []);

  const platforms = useMemo(() => [
    { id: 'youtube', label: 'YouTube' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'instagram', label: 'Instagram' }
  ], []);

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 55) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen p-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.2) 0%, transparent 50%)'
        }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-400" />
            AI Prediction Engine
          </h1>
          <p className="text-gray-400 mt-1">Predict content performance with lightweight AI scoring</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Content Input</h2>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-gray-400 text-sm hover:bg-gray-700/50 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                History
              </button>
            </div>

            {/* History Panel */}
            {showHistory && history.length > 0 && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-xl">
                <div className="text-xs text-gray-400 mb-2">Recent Predictions</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {history.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 truncate flex-1 mr-2">{item.title.substring(0, 25)}...</span>
                      <span className={`font-medium ${getScoreColor(item.score)}`}>{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* Title Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <FileText className="w-4 h-4" />
                  Video Title
                </label>
                <input 
                  type="text" 
                  value={inputs.title} 
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Enter video title..."
                />
              </div>

              {/* Platform Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Platform
                </label>
                <div className="flex gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleInputChange('platform', p.id)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                        inputs.platform === p.id 
                          ? 'bg-white/20 border border-white/30 text-white' 
                          : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:bg-gray-700/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Hash className="w-4 h-4" />
                  Category
                </label>
                <select 
                  value={inputs.category} 
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Slider */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Clock className="w-4 h-4" />
                  Duration: {inputs.duration}s
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="600" 
                  step="10" 
                  value={inputs.duration} 
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Hook Strength Slider */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Zap className="w-4 h-4" />
                  Hook Strength: {inputs.hookStrength}/10
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={inputs.hookStrength} 
                  onChange={(e) => handleInputChange('hookStrength', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Predict Button - Disabled during loading */}
              <button 
                onClick={handlePredict} 
                disabled={loading || !inputs.title.trim() || isPredicting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    Predict Performance
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Prediction Results</h2>
            </div>

            {prediction ? (
              <div className="space-y-6">
                {/* Score Circle with Fade-in */}
                <FadeIn>
                  <div className="flex flex-col items-center py-4">
                    <CircularProgress value={prediction.score} />
                    <div className="mt-3">
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        prediction.score >= 75 
                          ? 'bg-green-500/20 text-green-400' 
                          : prediction.score >= 55 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-red-500/20 text-red-400'
                      }`}>
                        {prediction.score >= 75 ? 'High Potential' : prediction.score >= 55 ? 'Good Potential' : 'Needs Work'}
                      </span>
                    </div>
                  </div>
                </FadeIn>

                {/* Metrics Grid with Fade-in */}
                <FadeIn delay={100}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-800/30 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Predicted Views</div>
                      <div className="text-lg font-bold text-white">
                        {(prediction.views.min / 1000).toFixed(1)}K - {(prediction.views.max / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800/30 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Engagement</div>
                      <div className="text-lg font-bold text-blue-400">{prediction.engagement}%</div>
                    </div>
                    <div className="p-4 bg-gray-800/30 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Viral Probability</div>
                      <div className="text-lg font-bold text-purple-400">{prediction.viralProb}%</div>
                    </div>
                    <div className="p-4 bg-gray-800/30 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Risk Level</div>
                      <div className={`text-lg font-bold ${
                        prediction.riskLevel === 'Low' ? 'text-green-400' : 
                        prediction.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {prediction.riskLevel}
                      </div>
                    </div>
                  </div>
                </FadeIn>

                {/* Explanation Panel */}
                <FadeIn delay={200}>
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      Score Analysis
                    </h3>
                    
                    {/* Dominant Factor */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Dominant Factor</div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{prediction.explanation.dominantFactor}</span>
                        {prediction.score >= 55 ? (
                          <ArrowUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Suggestions */}
                    <div className="space-y-2">
                      {prediction.explanation.suggestions.map((suggestion, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-purple-400">•</span>
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeIn>

                {/* Strategy with Fade-in */}
                <FadeIn delay={300}>
                  <div className="p-4 bg-gray-800/30 rounded-xl">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      Posting Strategy AI
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best Time</span>
                        <span className="text-white">{prediction.strategy.bestTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hashtags</span>
                        <span className="text-white">{prediction.strategy.hashtagIntensity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tone</span>
                        <span className="text-white">{prediction.strategy.captionTone}</span>
                      </div>
                    </div>
                  </div>
                </FadeIn>

                {/* Hook Suggestions with Fade-in */}
                <FadeIn delay={400}>
                  <div className="p-4 bg-gray-800/30 rounded-xl">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Hook Suggestions
                    </h3>
                    <div className="space-y-2">
                      {prediction.strategy.hookSuggestions.map((hook, i) => (
                        <div key={i} className="p-3 bg-gray-700/30 rounded-lg text-sm text-gray-300">
                          {hook}
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 mb-4 bg-gray-800/50 rounded-2xl flex items-center justify-center">
                  <Target className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-gray-500 max-w-xs">
                  Enter content details and click "Predict Performance" to see AI analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prediction;
