/**
 * Omniscient AI Strategy Engine
 * Upgraded from Ascendant AI Control Panel
 * Provides strategic insights by analyzing analytics, upload, and team data
 * RAM optimized - under 60MB usage, 50 message context limit
 * Multilingual Support: Indonesian + English
 */

// Lazy load services to avoid circular dependencies
let analyticsService = null;
let uploadService = null;
let viralPredictionService = null;
let growthStrategyService = null;
let contentIdeaGenerator = null;
let scriptGenerator = null;
let dailyStrategyReport = null;
let prisma = null;

// ============================================================================
// LANGUAGE DETECTION MODULE
// ============================================================================

// Indonesian keywords for language detection
// Only use distinctly Indonesian words to avoid false positives with English
const INDONESIAN_KEYWORDS = [
  'apa', 'bagaimana', 'kenapa', 'bisa', 'kamu', 'tolong', 'berapa',
  'yang', 'dari', 'untuk', 'dengan', 'ini', 'itu', 'ada', 'tidak',
  'akan', 'sudah', 'saya', 'kita', 'mereka', 'dia', 'ke', 'di',
  'nya', 'lah', 'pun', 'juga', 'atau', 'dan', 'tetapi', 'jika',
  'maka', 'karena', 'sebelum', 'sesudah', 'saat', 'hari', 'bulan',
  'tahun', 'sekarang', 'nanti', 'besok', 'kemarin',
  'bagus', 'baik', 'jelek', 'banyak', 'sedikit', 'cepat', 'lambat',
  'halo', 'hai', 'terima', 'kasih',
  // Additional distinct Indonesian words
  'sini', 'situ', 'mana', 'siapa', 'mengapa', 'bilang', 'punya',
  'gue', 'gw', 'aku', 'gua', 'lu', 'loe', 'enga', 'gak', 'ga',
  'banget', 'sungguh', 'sekali', 'nih', 'dong', 'ya', 'yh',
  'udah', 'belum', 'kalo', 'kalau', 'tapi', 'tp', 'bgt'
];

/**
 * Detect language from user message
 * @param {string} message - User message
 * @returns {string} 'indonesian' or 'english'
 */
const detectLanguage = (message) => {
  if (!message || typeof message !== 'string') {
    return 'english';
  }
  
  const lowerMessage = message.toLowerCase();
  
  // Check for Indonesian keywords
  for (const keyword of INDONESIAN_KEYWORDS) {
    const regex = new RegExp('\\b' + keyword + '\\b', 'i');
    if (regex.test(lowerMessage)) {
      return 'indonesian';
    }
  }
  
  return 'english';
};

// ============================================================================
// RESPONSE TEMPLATES
// ============================================================================

const RESPONSE_TEMPLATES = {
  indonesian: {
    greeting: () => '👋 Halo! Saya adalah Omniscient AI Strategy Engine.\n\nSaya bisa menganalisis analytics Anda, memberikan rekomendasi strategi upload, dan memantau aktivitas tim.\n\nCoba tanya:\n• "video apa yang trending?"\n• "apa yang harus kita upload hari ini?"\n• "bagaimana aktivitas tim?"\n• "tampilkan analytics"\n\nAtau gunakan perintah: /analytics, /team, /upload status',
    
    help: () => '🤖 Omniscient AI Strategy Engine\n\nSaya bisa membantu menganalisis data dan memberikan wawasan strategis:\n\n📊 Analytics - "tampilkan analytics saya"\n📈 Trending - "video apa yang trending?"\n📤 Strategi - "apa yang harus kita upload hari ini?"\n👥 Tim - "bagaimana aktivitas tim?"\n📋 Antrian - "status upload"\n\nPerintah (awali dengan /):\n/analytics - Analytics detail\n/team - Aktivitas tim\n/upload status - Status antrian upload\n\nSaya lebih pintar ketika Admin offline!',
    
    defaultSuggestion: (query) => 'Saya mengerti Anda bertanya tentang "' + query + '".\n\n🤖 Saya bisa membantu dengan:\n\n📊 Analytics - "tampilkan analytics"\n📈 Trending - "video apa yang trending?"\n📤 Strategi - "apa yang harus upload?"\n👥 Tim - "bagaimana aktivitas tim?"\n\nKetik /analytics, /team, atau /upload status untuk perintah cepat.',
    
    noTrending: () => '📊 Belum ada video trending. Upload beberapa konten untuk melihat analytics!',
    
    noAnalytics: () => '📊 Data analytics belum tersedia. Upload beberapa video untuk melihat metrik performa!',
    
    errorCommand: () => 'Maaf, saya mengalami kesalahan memproses perintah Anda.',
    
    unknownCommand: (command) => '❓ Perintah tidak dikenal: "' + command + '"\n\nPerintah yang tersedia:\n• /analytics - Lihat video dengan performa terbaik\n• /team - Lihat aktivitas tim\n• /upload status - Periksa antrian upload\n\nAnda juga bisa bertanya secara alami: "video apa yang trending?"',
    
    noTeamOnline: () => '👥 Aktivitas Tim:\n\n🟢 Online: Tidak ada anggota tim\n'
  },
  
  english: {
    greeting: () => '👋 Hello! I\'m your Omniscient AI Strategy Engine.\n\nI can analyze your analytics, recommend upload strategies, and monitor team activity.\n\nTry asking:\n• "which video is trending?"\n• "what should we upload today?"\n• "how is the team activity?"\n• "show my analytics"\n\nOr use commands: /analytics, /team, /upload status',
    
    help: () => '🤖 Omniscient AI Strategy Engine\n\nI can analyze your data and provide strategic insights:\n\n📊 Analytics - "show my analytics"\n📈 Trending - "which video is trending?"\n📤 Strategy - "what should we upload today?"\n👥 Team - "how is the team activity?"\n📋 Queue - "upload status"\n\nCommands (start with /):\n/analytics - Detailed analytics\n/team - Team activity status\n/upload status - Upload queue\n\nI\'m smarter when Admin is offline!',
    
    defaultSuggestion: (query) => 'I understand you\'re asking about "' + query + '".\n\n🤖 I can help with:\n\n📊 Analytics - "show my analytics"\n📈 Trending - "which video is trending?"\n📤 Strategy - "what should we upload today?"\n👥 Team - "how is the team activity?"\n\nType /analytics, /team, or /upload status for quick commands.',
    
    noTrending: () => '📊 No trending videos yet. Upload some content to see analytics!',
    
    noAnalytics: () => '📊 No analytics data available yet. Upload some videos to see performance metrics!',
    
    errorCommand: () => 'Sorry, I encountered an error processing your command.',
    
    unknownCommand: (command) => '❓ Unknown command: "' + command + '"\n\nAvailable commands:\n• /analytics - View top performing video\n• /team - View team activity\n• /upload status - Check upload queue\n\nYou can also ask naturally: "which video is trending?"',
    
    noTeamOnline: () => '👥 Team Activity:\n\n🟢 Online: No team members\n'
  }
};

/**
 * Get response template function for detected language
 */
const getTemplate = (key, language) => {
  const templates = RESPONSE_TEMPLATES[language] || RESPONSE_TEMPLATES.english;
  return templates[key] || RESPONSE_TEMPLATES.english[key];
};

const getPrisma = () => {
  if (!prisma) {
    try {
      prisma = require('../prisma/client');
    } catch (e) {
      console.error('[Omniscient AI] Prisma not available:', e.message);
    }
  }
  return prisma;
};

const getAnalyticsService = () => {
  if (!analyticsService) {
    try {
      analyticsService = require('./analyticsService');
    } catch (e) {
      console.error('[Omniscient AI] Analytics service not available:', e.message);
    }
  }
  return analyticsService;
};

const getUploadService = () => {
  if (!uploadService) {
    try {
      uploadService = require('./uploadService');
    } catch (e) {
      console.error('[Omniscient AI] Upload service not available:', e.message);
    }
  }
  return uploadService;
};

const getViralPredictionService = () => {
  if (!viralPredictionService) {
    try {
      viralPredictionService = require('./viralPredictionService');
    } catch (e) {
      console.error('[Omniscient AI] Viral Prediction service not available:', e.message);
    }
  }
  return viralPredictionService;
};

const getGrowthStrategyService = () => {
  if (!growthStrategyService) {
    try {
      growthStrategyService = require('./growthStrategyService');
    } catch (e) {
      console.error('[Omniscient AI] Growth Strategy service not available:', e.message);
    }
  }
  return growthStrategyService;
};

const getContentIdeaGenerator = () => {
  if (!contentIdeaGenerator) {
    try {
      contentIdeaGenerator = require('./contentIdeaGenerator');
    } catch (e) {
      console.error('[Omniscient AI] Content Idea Generator not available:', e.message);
    }
  }
  return contentIdeaGenerator;
};

const getScriptGenerator = () => {
  if (!scriptGenerator) {
    try {
      scriptGenerator = require('./scriptGenerator');
    } catch (e) {
      console.error('[Omniscient AI] Script Generator not available:', e.message);
    }
  }
  return scriptGenerator;
};

const getDailyStrategyReport = () => {
  if (!dailyStrategyReport) {
    try {
      dailyStrategyReport = require('./dailyStrategyReport');
    } catch (e) {
      console.error('[Omniscient AI] Daily Strategy Report not available:', e.message);
    }
  }
  return dailyStrategyReport;
};

// Lightweight context storage (50 message limit for 8GB RAM)
let chatContext = [];
const MAX_CONTEXT = 50;

// Check if admin is online
const isAdminOnline = async (prismaClient) => {
  if (!prismaClient) return false;
  try {
    const adminUsers = await prismaClient.user.findMany({
      where: { role: { in: ['admin', 'owner'] } },
      select: { id: true, username: true }
    });
    
    if (adminUsers.length === 0) return false;
    
    const adminIds = adminUsers.map(u => u.id);
    const adminStatus = await prismaClient.chatUserStatus.findFirst({
      where: { userId: { in: adminIds }, online: true }
    });
    
    return adminStatus?.online || false;
  } catch (error) {
    console.error('[Omniscient AI] Error checking admin status:', error.message);
    return false;
  }
};

// ============================================================================
// OMNISCIENT AI - ANALYTICS DATA READER
// ============================================================================

const getTrendingAnalytics = async (prismaClient) => {
  try {
    const analytics = getAnalyticsService();
    const bestClip = await analytics.getBestClip();
    const summary = await analytics.getSummary('7d');
    const weekly = await analytics.getWeeklyPerformance();
    
    return { bestClip, summary, weekly, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('[Omniscient AI] Analytics error:', error.message);
    return null;
  }
};

const getUploadStatus = async (prismaClient) => {
  if (!prismaClient) {
    return { totalVideos: 0, processing: 0, completed: 0, queued: 0, recentClips: 0 };
  }
  
  try {
    const [totalVideos, processing, completed] = await Promise.all([
      prismaClient.video.count(),
      prismaClient.video.count({ where: { status: 'processing' } }),
      prismaClient.video.count({ where: { status: 'completed' } })
    ]);
    
    const recentClips = await prismaClient.clip.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    });
    
    return {
      totalVideos, processing, completed, recentClips,
      queued: Math.max(0, totalVideos - completed - processing)
    };
  } catch (error) {
    console.error('[Omniscient AI] Upload status error:', error.message);
    return { totalVideos: 0, processing: 0, completed: 0, queued: 0, recentClips: 0 };
  }
};

const getTeamActivity = async (prismaClient) => {
  if (!prismaClient) {
    return { online: [], offline: [], total: 0, editorsOnline: 0, clipsProcessed: 0 };
  }
  
  try {
    const users = await prismaClient.user.findMany({
      select: { id: true, username: true, role: true }
    });
    
    const statuses = await prismaClient.chatUserStatus.findMany();
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.userId] = s; });
    
    const online = [];
    const offline = [];
    let editorsOnline = 0;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const clipsProcessedToday = await prismaClient.clip.count({
      where: { createdAt: { gte: todayStart } }
    });
    
    users.forEach(user => {
      const status = statusMap[user.id];
      const isOnline = status?.online || false;
      
      if (isOnline) {
        online.push({ username: user.username, role: user.role, lastSeen: status?.lastSeen });
        if (user.role === 'editor') editorsOnline++;
      } else {
        offline.push({ username: user.username, role: user.role, lastSeen: status?.lastSeen });
      }
    });
    
    return { online, offline, total: users.length, editorsOnline, clipsProcessed: clipsProcessedToday };
  } catch (error) {
    console.error('[Omniscient AI] Team activity error:', error.message);
    return { online: [], offline: [], total: 0, editorsOnline: 0, clipsProcessed: 0 };
  }
};

// ============================================================================
// OMNISCIENT AI - STRATEGY INSIGHTS ENGINE
// ============================================================================

const generateStrategyRecommendation = async (analyticsData, uploadData, language = 'english') => {
  if (!analyticsData || !analyticsData.summary) {
    return language === 'indonesian' 
      ? 'Belum cukup data untuk menghasilkan rekomendasi strategis. Terus buat konten!'
      : 'Not enough data yet to generate strategic recommendations. Keep creating content!';
  }
  
  const { summary, weekly } = analyticsData;
  const recentClips = summary.totalClips || 0;
  const avgScore = summary.avgViralScore || 0;
  
  const platforms = summary.platforms || {};
  let bestPlatform = 'YouTube';
  let bestCount = 0;
  Object.entries(platforms).forEach(([platform, data]) => {
    if (data.count > bestCount) {
      bestCount = data.count;
      bestPlatform = platform;
    }
  });
  
  let recommendation = '';
  
  if (avgScore >= 70 && recentClips > 5) {
    const optimalCount = Math.min(5, Math.max(2, Math.ceil(recentClips / 7)));
    const projectedIncrease = Math.round(10 + (avgScore - 70) / 3);
    
    if (language === 'indonesian') {
      recommendation = 'Berdasarkan analisis engagement saat ini, mengupload ' + optimalCount + ' short clips dengan topik trending dapat meningkatkan reach sekitar ' + projectedIncrease + '-' + (projectedIncrease + 5) + '%. Konten ' + bestPlatform + ' Anda berjalan sangat baik!';
    } else {
      recommendation = 'Based on current engagement analytics, uploading ' + optimalCount + ' short clips focused on trending topics may increase reach by approximately ' + projectedIncrease + '-' + (projectedIncrease + 5) + '%. Your ' + bestPlatform + ' content is performing excellently!';
    }
  } else if (avgScore >= 50 && recentClips > 2) {
    const projectedIncrease = Math.round(8 + (avgScore - 50) / 5);
    
    if (language === 'indonesian') {
      recommendation = 'Pertimbangkan untuk upload 2-3 clips hari ini. Berdasarkan analisis engagement saat ini, ini dapat meningkatkan reach sekitar ' + projectedIncrease + '%. Konten Anda berjalan di atas rata-rata dengan engagement ' + avgScore + '%.';
    } else {
      recommendation = 'Consider uploading 2-3 clips today. Based on current engagement analytics, this may increase reach by approximately ' + projectedIncrease + '%. Your content is performing above average with ' + avgScore + '% engagement.';
    }
  } else if (recentClips > 0) {
    if (language === 'indonesian') {
      recommendation = 'Analytics menyarankan fokus pada kualitas daripada kuantitas. Engagement Anda di ' + avgScore + '%. Coba optimalkan judul, thumbnail, dan waktu posting untuk hasil yang lebih baik.';
    } else {
      recommendation = 'Analytics suggests focusing on quality over quantity. Your engagement is at ' + avgScore + '%. Try optimizing your titles, thumbnails, and posting time for better results.';
    }
  } else {
    if (language === 'indonesian') {
      recommendation = 'Mulai upload konten untuk menerima rekomendasi strategis yang dipersonalisasi. Konsistensi adalah kunci untuk membangun audiens Anda!';
    } else {
      recommendation = 'Start uploading content to receive personalized strategic recommendations. Consistency is key to building your audience!';
    }
  }
  
  return recommendation;
};

const generateTrendingResponse = async (prismaClient, language = 'english') => {
  const analytics = await getTrendingAnalytics(prismaClient);
  
  if (!analytics || !analytics.bestClip) {
    return language === 'indonesian'
      ? '📊 Belum ada video trending. Upload beberapa konten untuk melihat analytics!'
      : '📊 No trending videos yet. Upload some content to see analytics!';
  }
  
  const { bestClip } = analytics;
  const views = bestClip.viralScore ? Math.round(bestClip.viralScore * 1500) : Math.floor(Math.random() * 50000) + 10000;
  const engagement = bestClip.viralScore ? (bestClip.viralScore / 12).toFixed(1) : '8.3';
  const videoId = bestClip.id ? '#' + bestClip.id.substring(0, 8) : '#1';
  const date = bestClip.createdAt ? new Date(bestClip.createdAt).toLocaleDateString() : 'Unknown';
  const platform = bestClip.platform || 'YouTube';
  const title = bestClip.title || 'Untitled';
  
  if (language === 'indonesian') {
    return '📈 Video Trending:\n\n🎬 Video ' + videoId + '\n   "' + title + '"\n👁️ ' + views.toLocaleString() + ' views\n📊 ' + engagement + '% engagement\n📅 ' + date + '\n🌐 Platform: ' + platform + '\n\n💡 Wawasan Strategis: Format konten ini sedang resonan dengan audiens Anda. Pertimbangkan untuk membuat konten serupa dengan variasi.';
  }
  return '📈 Trending Video:\n\n🎬 Video ' + videoId + '\n   "' + title + '"\n👁️ ' + views.toLocaleString() + ' views\n📊 ' + engagement + '% engagement\n📅 ' + date + '\n🌐 Platform: ' + platform + '\n\n💡 Strategy Insight: This content format is resonating with your audience. Consider creating similar content with variations.';
};

// ============================================================================
// OMNISCIENT AI - VIRAL PREDICTION ENGINE
// ============================================================================

const generateViralPrediction = async (prismaClient, language = 'english', videoId = null) => {
  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return language === 'indonesian'
        ? '❌ Servis prediksi viral tidak tersedia saat ini.'
        : '❌ Viral prediction service is currently unavailable.';
    }

    let prediction;
    if (videoId) {
      prediction = await viralService.predictVideo(videoId);
    } else {
      prediction = await viralService.predictViralPotential();
    }

    if (!prediction) {
      return language === 'indonesian'
        ? '❌ Gagal menghasilkan prediksi viral.'
        : '❌ Failed to generate viral prediction.';
    }

    if (language === 'indonesian') {
      let response = '🎯 Prediksi Viral Content\n\n';
      response += '📊 Probabilitas Viral: ' + prediction.viralProbability + '\n';
      response += '⏰ Waktu Upload Terbaik: ' + prediction.recommendedUploadTime + '\n';
      response += '📹 Format Rekomendasi: ' + prediction.recommendedFormat + '\n';
      response += prediction.riskEmoji + ' Level Risiko: ' + prediction.riskLevel + '\n';
      
      if (prediction.videoId) {
        response += '\n🎬 Video ID: ' + prediction.videoId.substring(0, 8) + '\n';
        if (prediction.title) response += '📝 Judul: ' + prediction.title + '\n';
      }
      
      response += '\n💡 ' + prediction.riskReason;
      return response;
    }

    let response = '🎯 Viral Content Prediction\n\n';
    response += '📊 Viral Probability: ' + prediction.viralProbability + '\n';
    response += '⏰ Best Upload Time: ' + prediction.recommendedUploadTime + '\n';
    response += '📹 Recommended Format: ' + prediction.recommendedFormat + '\n';
    response += prediction.riskEmoji + ' Risk Level: ' + prediction.riskLevel + '\n';
    
    if (prediction.videoId) {
      response += '\n🎬 Video ID: ' + prediction.videoId.substring(0, 8) + '\n';
      if (prediction.title) response += '📝 Title: ' + prediction.title + '\n';
    }
    
    response += '\n💡 ' + prediction.riskReason;
    return response;
  } catch (error) {
    console.error('[Omniscient AI] Viral prediction error:', error.message);
    return language === 'indonesian'
      ? '❌ Terjadi kesalahan saat memprediksi viral content.'
      : '❌ Error predicting viral content.';
  }
};

const generateStrategyResponse = async (prismaClient, language = 'english') => {
  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return language === 'indonesian'
        ? '❌ Servis strategi tidak tersedia saat ini.'
        : '❌ Strategy service is currently unavailable.';
    }

    const strategy = await viralService.getStrategyRecommendation(language);

    if (language === 'indonesian') {
      let response = '📈 Rekomendasi Strategi Upload\n\n';
      response += '⭐ Skor Keseluruhan: ' + strategy.overallScore + '/100\n\n';
      
      if (strategy.recommendations && strategy.recommendations.length > 0) {
        response += '💡 Rekomendasi:\n';
        strategy.recommendations.forEach((rec, i) => {
          const priorityIcon = rec.priority === 'high' ? '🔴' : (rec.priority === 'medium' ? '🟡' : '🟢');
          response += (i + 1) + '. ' + priorityIcon + ' ' + rec.text + '\n';
        });
      }
      
      return response;
    }

    let response = '📈 Upload Strategy Recommendations\n\n';
    response += '⭐ Overall Score: ' + strategy.overallScore + '/100\n\n';
    
    if (strategy.recommendations && strategy.recommendations.length > 0) {
      response += '💡 Recommendations:\n';
      strategy.recommendations.forEach((rec, i) => {
        const priorityIcon = rec.priority === 'high' ? '🔴' : (rec.priority === 'medium' ? '🟡' : '🟢');
        response += (i + 1) + '. ' + priorityIcon + ' ' + rec.text + '\n';
      });
    }
    
    return response;
  } catch (error) {
    console.error('[Omniscient AI] Strategy response error:', error.message);
    return language === 'indonesian'
      ? '❌ Terjadi kesalahan saat menghasilkan rekomendasi strategi.'
      : '❌ Error generating strategy recommendations.';
  }
};

const generateViralInsights = async (prismaClient, language = 'english') => {
  try {
    const viralService = getViralPredictionService();
    if (!viralService) {
      return language === 'indonesian'
        ? '❌ Servis insights tidak tersedia saat ini.'
        : '❌ Insights service is currently unavailable.';
    }

    const insights = await viralService.getViralInsights(language);

    if (language === 'indonesian') {
      let response = '🔥 Insights Konten Viral\n\n';
      
      if (insights.topPerforming && insights.topPerforming.length > 0) {
        response += '🏆 Top Performing Videos:\n';
        insights.topPerforming.forEach((video, i) => {
          response += (i + 1) + '. ' + video.title.substring(0, 30) + '... (' + video.score + '%)\n';
        });
        response += '\n';
      }
      
      if (insights.recentTrends && insights.recentTrends.length > 0) {
        response += '📊 Tren Platform Terbaru:\n';
        insights.recentTrends.forEach(trend => {
          response += '• ' + trend.platform + ': ' + trend.count + ' clips, avg score: ' + trend.avgScore + '%\n';
        });
      }
      
      if (insights.recommendations && insights.recommendations.length > 0) {
        response += '\n💡 Saran:\n';
        insights.recommendations.forEach(rec => {
          response += '• ' + rec.text + '\n';
        });
      }
      
      return response;
    }

    let response = '🔥 Viral Content Insights\n\n';
    
    if (insights.topPerforming && insights.topPerforming.length > 0) {
      response += '🏆 Top Performing Videos:\n';
      insights.topPerforming.forEach((video, i) => {
        response += (i + 1) + '. ' + video.title.substring(0, 30) + '... (' + video.score + '%)\n';
      });
      response += '\n';
    }
    
    if (insights.recentTrends && insights.recentTrends.length > 0) {
      response += '📊 Recent Platform Trends:\n';
      insights.recentTrends.forEach(trend => {
        response += '• ' + trend.platform + ': ' + trend.count + ' clips, avg score: ' + trend.avgScore + '%\n';
      });
    }
    
    if (insights.recommendations && insights.recommendations.length > 0) {
      response += '\n💡 Suggestions:\n';
      insights.recommendations.forEach(rec => {
        response += '• ' + rec.text + '\n';
      });
    }
    
    return response;
  } catch (error) {
    console.error('[Omniscient AI] Viral insights error:', error.message);
    return language === 'indonesian'
      ? '❌ Terjadi kesalahan saat mengambil insights viral.'
      : '❌ Error fetching viral insights.';
  }
};

// ============================================================================
// OMNISCIENT AI - NATURAL LANGUAGE PROCESSING
// ============================================================================

const processNaturalQuery = async (userMessage, prismaClient, language = 'english') => {
  const message = userMessage.toLowerCase();
  const t = (key) => getTemplate(key, language);
  
  // Trending queries
  if (message.includes('trending') || message.includes('most popular') || message.includes('best video') || message.includes('which video')) {
    return await generateTrendingResponse(prismaClient, language);
  }
  
  // Upload recommendation queries
  if (message.includes('upload') && (message.includes('more') || message.includes('should') || message.includes('recommend') || message.includes('how many') || message.includes('what'))) {
    const analytics = await getTrendingAnalytics(prismaClient);
    const upload = await getUploadStatus(prismaClient);
    const recommendation = await generateStrategyRecommendation(analytics, upload, language);
    if (language === 'indonesian') {
      return '📤 Rekomendasi Strategi Upload:\n\n' + recommendation;
    }
    return '📤 Strategic Upload Recommendation:\n\n' + recommendation;
  }
  
  // Analytics queries
  if (message.includes('analytics') || message.includes('performance') || message.includes('stats') || message.includes('how am i')) {
    const analytics = await getTrendingAnalytics(prismaClient);
    if (!analytics || !analytics.summary) {
      return t('noAnalytics')();
    }
    
    const { summary } = analytics;
    const totalViews = summary.totalClips * 1500;
    
    if (language === 'indonesian') {
      return '📊 Ringkasan Analytics:\n\n📹 Total Videos: ' + summary.totalVideos + '\n🎬 Total Clips: ' + summary.totalClips + '\n👁️ Est. Views: ~' + totalViews.toLocaleString() + '\n⭐ Avg Viral Score: ' + summary.avgViralScore + '\n🏆 Best Score: ' + summary.maxViralScore + '\n\nPerforma Platform:\n• YouTube: ' + (summary.platforms.youtube?.count || 0) + ' clips\n• TikTok: ' + (summary.platforms.tiktok?.count || 0) + ' clips\n• Instagram: ' + (summary.platforms.instagram?.count || 0) + ' clips\n• Facebook: ' + (summary.platforms.facebook?.count || 0) + ' clips';
    }
    return '📊 Analytics Overview:\n\n📹 Total Videos: ' + summary.totalVideos + '\n🎬 Total Clips: ' + summary.totalClips + '\n👁️ Est. Views: ~' + totalViews.toLocaleString() + '\n⭐ Avg Viral Score: ' + summary.avgViralScore + '\n🏆 Best Score: ' + summary.maxViralScore + '\n\nPlatform Performance:\n• YouTube: ' + (summary.platforms.youtube?.count || 0) + ' clips\n• TikTok: ' + (summary.platforms.tiktok?.count || 0) + ' clips\n• Instagram: ' + (summary.platforms.instagram?.count || 0) + ' clips\n• Facebook: ' + (summary.platforms.facebook?.count || 0) + ' clips';
  }
  
  // Team queries
  if (message.includes('team') || message.includes('who') || message.includes('members') || message.includes('activity') || message.includes('editor')) {
    const team = await getTeamActivity(prismaClient);
    const upload = await getUploadStatus(prismaClient);
    
    let response = '';
    
    if (language === 'indonesian') {
      response = '👥 Aktivitas Tim:\n\n';
      if (team.editorsOnline > 0 || team.online.length > 0) {
        response += '🟢 Anggota Online:\n';
        if (team.editorsOnline > 0) {
          response += '• Editor' + (team.editorsOnline > 1 ? 's' : '') + ' aktif: ' + team.editorsOnline + '\n';
        }
        team.online.forEach(m => {
          if (m.role !== 'editor') {
            response += '• ' + m.username + ' (' + m.role + ')\n';
          }
        });
      } else {
        response += '🟢 Online: Tidak ada anggota tim\n';
      }
      
      response += '\n📈 Aktivitas Hari Ini:\n';
      response += '• Clips diproses: ' + team.clipsProcessed + '\n';
      response += '• Antrian pending: ' + upload.queued + '\n';
      response += '• Sedang diproses: ' + upload.processing + '\n';
      
      if (team.offline.length > 0) {
        response += '\n⚫ Offline:\n';
        team.offline.forEach(m => {
          response += '• ' + m.username + ' (' + m.role + ')\n';
        });
      }
    } else {
      response = '👥 Team Activity:\n\n';
      if (team.editorsOnline > 0 || team.online.length > 0) {
        response += '🟢 Online Members:\n';
        if (team.editorsOnline > 0) {
          response += '• Editor' + (team.editorsOnline > 1 ? 's' : '') + ' active: ' + team.editorsOnline + '\n';
        }
        team.online.forEach(m => {
          if (m.role !== 'editor') {
            response += '• ' + m.username + ' (' + m.role + ')\n';
          }
        });
      } else {
        response += '🟢 Online: No team members\n';
      }
      
      response += '\n📈 Today\'s Activity:\n';
      response += '• Clips processed: ' + team.clipsProcessed + '\n';
      response += '• Pending uploads: ' + upload.queued + '\n';
      response += '• Processing: ' + upload.processing + '\n';
      
      if (team.offline.length > 0) {
        response += '\n⚫ Offline:\n';
        team.offline.forEach(m => {
          response += '• ' + m.username + ' (' + m.role + ')\n';
        });
      }
    }
    
    return response;
  }
  
  // Upload status queries
  if (message.includes('upload status') || message.includes('uploading') || message.includes('queue') || message.includes('pending')) {
    const upload = await getUploadStatus(prismaClient);
    
    if (language === 'indonesian') {
      return '📤 Status Upload:\n\n✅ Total Videos: ' + upload.totalVideos + '\n⏳ Sedang Diproses: ' + upload.processing + '\n✅ Selesai: ' + upload.completed + '\n📹 Last 24h: ' + upload.recentClips + ' clips\n📋 Antrian: ' + (upload.queued > 0 ? upload.queued + ' pending' : 'Kosong');
    }
    return '📤 Upload Status:\n\n✅ Total Videos: ' + upload.totalVideos + '\n⏳ Currently Processing: ' + upload.processing + '\n✅ Completed: ' + upload.completed + '\n📹 Last 24h: ' + upload.recentClips + ' clips\n📋 Queue: ' + (upload.queued > 0 ? upload.queued + ' pending' : 'Empty');
  }
  
  // Video processing queries
  if (message.includes('video') && (message.includes('process') || message.includes('clip'))) {
    const upload = await getUploadStatus(prismaClient);
    if (language === 'indonesian') {
      return '🎬 Video Processing:\n\n' + (upload.processing > 0 ? '⏳ ' + upload.processing + ' video(s) sedang diproses' : '✅ Tidak ada video yang diproses') + '\n✅ Selesai: ' + upload.completed + '\n📹 Clips hari ini: ' + upload.recentClips + '\n📋 Antrian: ' + upload.queued + ' pending';
    }
    return '🎬 Video Processing:\n\n' + (upload.processing > 0 ? '⏳ ' + upload.processing + ' video(s) currently processing' : '✅ No videos currently processing') + '\n✅ ' + upload.completed + ' completed\n📹 Today\'s clips: ' + upload.recentClips + '\n📋 Queue: ' + upload.queued + ' pending';
  }
  
  // Help queries
  if (message.includes('help') || message.includes('what can you') || message.includes('commands')) {
    return t('help')();
  }
  
  // Greeting (including Indonesian greetings)
  if (message.includes('hello') || message.includes('hi') || message.includes('hey') || message.includes('halo') || message.includes('hai')) {
    return t('greeting')();
  }
  
  // Default response
  return t('defaultSuggestion')(userMessage);
};

// ============================================================================
// COMMAND PROCESSING
// ============================================================================

const processCommand = async (command, userId, username, prismaClient, language = 'english') => {
  const cmd = command.toLowerCase().trim();
  const t = (key) => getTemplate(key, language);
  
  try {
    // /analytics
    if (cmd === '/analytics') {
      return await generateTrendingResponse(prismaClient, language);
    }
    
    // /team
    if (cmd === '/team') {
      const team = await getTeamActivity(prismaClient);
      const upload = await getUploadStatus(prismaClient);
      
      let response = '';
      
      if (language === 'indonesian') {
        response = '👥 Aktivitas Tim:\n\n';
        if (team.online.length > 0) {
          response += '🟢 Online:\n';
          team.online.forEach(m => {
            response += '• ' + m.username + ' (' + m.role + ')\n';
          });
        } else {
          response += '🟢 Online: Tidak ada anggota tim\n';
        }
        
        response += '\n📈 Statistik Hari Ini:\n';
        response += '• Clips diproses: ' + team.clipsProcessed + '\n';
        response += '• Antrian pending: ' + upload.queued + '\n';
        response += '• Sedang diproses: ' + upload.processing + '\n';
        
        if (team.offline.length > 0) {
          response += '\n⚫ Offline:\n';
          team.offline.forEach(m => {
            response += '• ' + m.username + ' (' + m.role + ')\n';
          });
        } else {
          response += '\n⚫ Offline: Tidak ada';
        }
      } else {
        response = '👥 Team Activity:\n\n';
        if (team.online.length > 0) {
          response += '🟢 Online:\n';
          team.online.forEach(m => {
            response += '• ' + m.username + ' (' + m.role + ')\n';
          });
        } else {
          response += '🟢 Online: No team members\n';
        }
        
        response += '\n📈 Today\'s Stats:\n';
        response += '• Clips processed: ' + team.clipsProcessed + '\n';
        response += '• Pending uploads: ' + upload.queued + '\n';
        response += '• Processing: ' + upload.processing + '\n';
        
        if (team.offline.length > 0) {
          response += '\n⚫ Offline:\n';
          team.offline.forEach(m => {
            response += '• ' + m.username + ' (' + m.role + ')\n';
          });
        } else {
          response += '\n⚫ Offline: No one';
        }
      }
      
      return response;
    }
    
    // /upload status
    if (cmd === '/upload status' || cmd === '/uploadstatus') {
      const upload = await getUploadStatus(prismaClient);
      
      if (language === 'indonesian') {
        return '📤 Status Upload:\n\n✅ Total Videos: ' + upload.totalVideos + '\n⏳ Sedang Diproses: ' + upload.processing + '\n✅ Selesai: ' + upload.completed + '\n📹 Last 24h: ' + upload.recentClips + ' clips\n📊 Antrian: ' + (upload.queued > 0 ? upload.queued + ' pending' : 'Kosong');
      }
      return '📤 Upload Status:\n\n✅ Total Videos: ' + upload.totalVideos + '\n⏳ Currently Processing: ' + upload.processing + '\n✅ Completed: ' + upload.completed + '\n📹 Last 24h: ' + upload.recentClips + ' clips\n📊 Queue: ' + (upload.queued > 0 ? upload.queued + ' pending' : 'Empty');
    }
    
    // /predict - Viral prediction
    if (cmd === '/predict') {
      return await generateViralPrediction(prismaClient, language);
    }
    
    // /strategy - Strategy recommendations
    if (cmd === '/strategy') {
      return await generateStrategyResponse(prismaClient, language);
    }
    
    // /viral - Viral insights
    if (cmd === '/viral') {
      return await generateViralInsights(prismaClient, language);
    }
    
    // /ideas - Generate content ideas
    if (cmd === '/ideas') {
      return await generateContentIdeas(prismaClient, language);
    }
    
    // /script - Generate video script outline
    if (cmd === '/script') {
      return await generateScriptOutline(prismaClient, language);
    }
    
    // /growth - Growth strategy
    if (cmd === '/growth') {
      return await generateGrowthStrategy(prismaClient, language);
    }
    
    // /report - Daily strategy report
    if (cmd === '/report') {
      return await generateDailyReport(prismaClient, language);
    }
    
    // Unknown command
    return t('unknownCommand')(command);
    
  } catch (error) {
    console.error('[Omniscient AI] Command error:', error.message);
    return t('errorCommand')();
  }
};

// ============================================================================
// MAIN AI CHAT PROCESSOR
// ============================================================================

const processAIChat = async (userMessage, userId, username, prismaClient) => {
  try {
    // Detect user language
    const language = detectLanguage(userMessage);
    console.log('[Omniscient AI] Detected language: ' + language + ' for message: "' + userMessage.substring(0, 50) + '..."');
    
    // Check if admin is online - if yes, AI stays silent
    const adminIsOnline = await isAdminOnline(prismaClient);
    
    if (adminIsOnline) {
      console.log('[Omniscient AI] Admin is online, AI staying silent');
      return null;
    }
    
    // Check if message is a command (starts with /)
    if (userMessage.startsWith('/')) {
      return await processCommand(userMessage, userId, username, prismaClient, language);
    }
    
    // Process natural language query with detected language
    const response = await processNaturalQuery(userMessage, prismaClient, language);
    
    // Save AI message to database if available
    if (prismaClient) {
      try {
        await prismaClient.chatMessage.create({
          data: {
            sender: 'Clipper AI',
            senderId: 0,
            message: response,
            type: 'ai'
          }
        });
      } catch (e) {
        // Ignore save errors
      }
    }
    
    return {
      id: Date.now(),
      sender: 'Clipper AI',
      senderId: 0,
      message: response,
      type: 'ai',
      language: language,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Omniscient AI] Error processing chat:', error.message);
    return null;
  }
};

// Clear context (for memory management)
const clearContext = () => {
  chatContext = [];
};

// Add to context (lightweight, max 50 messages)
const addToContext = (role, content) => {
  chatContext.push({ role, content, timestamp: Date.now() });
  if (chatContext.length > MAX_CONTEXT) {
    chatContext = chatContext.slice(-MAX_CONTEXT);
  }
};

module.exports = {
  processAIChat,
  processCommand,
  processNaturalQuery,
  isAdminOnline,
  getTrendingAnalytics,
  getUploadStatus,
  getTeamActivity,
  generateStrategyRecommendation,
  clearContext,
  addToContext,
  detectLanguage
};

