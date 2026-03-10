/**
 * Command Parser Service
 * Overlord AI Core - Natural Language Command Parser
 * 
 * Converts natural language commands into structured tasks
 * Supports English and Indonesian commands
 * Uses keyword matching for intent detection
 */

// ============================================================================
// KEYWORD DEFINITIONS (English + Indonesian)
// ============================================================================

const TASK_KEYWORDS = {
  // Clip generation keywords
  clip_generation: {
    en: ['clip', 'clips', 'create clip', 'generate clip', 'make clip', 'video clip', 'extract clip'],
    id: ['clip', 'clips', 'buat clip', 'buat klip', 'buat video', 'buat video clip', 'klip', 'buat', 'ekstrak clip', 'generate clip', 'bikin clip'],
    extractCount: true,
    priority: 10
  },

  // Content ideas keywords
  content_ideas: {
    en: ['idea', 'ideas', 'video idea', 'content idea', 'generate idea', 'what should i create', 'content ideas', 'video ideas'],
    id: ['ide', 'ideas', 'ide video', 'ide konten', 'buat ide', 'ide apa', 'video ideas', 'content ideas', 'ide menarik'],
    extractCount: true,
    priority: 9
  },

  // Caption generation keywords
  caption_generation: {
    en: ['caption', 'captions', 'viral caption', 'create caption', 'write caption', 'generate caption'],
    id: ['caption', 'buat caption', 'caption viral', 'caption yang viral', 'buat deskripsi', 'deskripsi video'],
    extractStyle: true,
    priority: 9
  },

  // Hashtag generation keywords
  hashtag_generation: {
    en: ['hashtag', 'hashtags', 'tags', 'generate hashtags', 'create hashtags', 'give me hashtags'],
    id: ['hashtag', 'hashtags', 'tag', 'buat hashtag', 'generate hashtag', 'buat tags', 'tags youtube', 'hashtag youtube'],
    priority: 9
  },

  // Video analysis keywords
  video_analysis: {
    en: ['analyze', 'analysis', 'analyze video', 'analyze performance', 'check video', 'check performance', 'video analysis', 'performance'],
    id: ['analisa', 'analisis', 'cek video', 'cek performa', 'periksa video', 'analisa video', 'analisa performa', 'performa video'],
    priority: 8
  },

  // Analytics keywords
  analytics: {
    en: ['analytics', 'statistics', 'stats', 'show analytics', 'performance report', 'dashboard'],
    id: ['analytics', 'statistik', 'stats', 'tampilkan analytics', 'laporan performa', 'dashboard', 'data statistik'],
    priority: 8
  },

  // Upload keywords
  upload: {
    en: ['upload', 'post', 'publish', 'upload to', 'post to', 'publish to'],
    id: ['upload', 'posting', 'publikasi', 'upload ke', 'posting ke', 'publikasi ke', 'unggah'],
    extractPlatform: true,
    priority: 7
  },

  // Growth strategy keywords
  growth_strategy: {
    en: ['growth', 'strategy', 'grow', 'improve', 'growth strategy', 'how to grow'],
    id: ['growth', 'strategi', 'tumbuh', 'berkembang', 'strategi growth', 'cara grow', 'tips pertumbuhan', 'strategi berkembang'],
    priority: 7
  },

  // Viral prediction keywords
  viral_prediction: {
    en: ['viral', 'viral prediction', 'predict viral', 'viral potential', 'will it go viral', 'trending'],
    id: ['viral', 'prediksi viral', 'bakal viral', 'potensial viral', 'trending', 'bakal trending'],
    priority: 7
  },

  // System diagnostics keywords (Self-Repair)
  system_diagnostics: {
    en: ['diagnostics', 'system check', 'system status', 'health check', 'system health', 'system diagnostics', 'diagnose system'],
    id: ['diagnosa', 'cek sistem', 'status sistem', 'kesehatan sistem', 'cek kesehatan', 'diagnosa sistem'],
    priority: 10
  },

  // SELF-REPAIR keywords - Fix last error
  self_repair_fix: {
    en: ['fix system', 'repair system', 'fix errors', 'system fix', 'repair errors', 'auto fix', 'fix last error', 'repair last error'],
    id: ['perbaiki sistem', 'repair sistem', 'perbaiki error', 'auto perbaiki', 'perbaiki error terakhir'],
    priority: 10
  },

  // SELF-REPAIR keywords - Show patches
  self_repair_patches: {
    en: ['show patches', 'list patches', 'view patches', 'patch history'],
    id: ['tampilkan patches', 'lihat patches', 'riwayat patches'],
    priority: 10
  },

  // SELF-REPAIR keywords - Rollback
  self_repair_rollback: {
    en: ['rollback', 'rollback last patch', 'undo last patch', 'revert patch'],
    id: ['rollback', 'kembalikan patch', 'undo patch', 'batalkan patch'],
    priority: 10
  },

  // GOD MODE keywords - System Scan
  god_mode_scan: {
    en: ['analyze server', 'scan system', 'system scan', 'check system', 'analyze errors', 'system analyze'],
    id: ['analisa server', 'scan sistem', 'cek sistem', 'analisa error'],
    priority: 10
  },

  // GOD MODE keywords - Memory Optimize
  god_mode_optimize: {
    en: ['optimize memory', 'memory optimize', 'clear memory', 'free memory', 'memory cleanup'],
    id: ['optimasi memory', 'bersihkan memory', 'bebas memory'],
    priority: 10
  },

  // GOD MODE keywords - Download Video
  download_video: {
    en: ['download video', 'download from url', 'get video', 'fetch video'],
    id: ['download video', 'unduh video', 'ambil video'],
    extractUrl: true,
    priority: 10
  },

  // GOD MODE keywords - Viral Clips
  generate_viral_clips: {
    en: ['generate viral clips', 'create viral clips', 'make viral clips', 'auto clip factory', 'viral clip factory'],
    id: ['buat viral clip', 'generate viral clip', 'buat clip viral'],
    extractCount: true,
    priority: 10
  },

  // Subtitle generation keywords
  subtitle_generation: {
    en: ['subtitle', 'subtitles', 'caption', 'generate subtitle', 'add subtitle', 'create subtitle'],
    id: ['subtitle', 'subtitles', 'buat subtitle', 'tambah subtitle', 'subtitle Indonesia', 'buat terjemahan'],
    priority: 6
  },

  // Music/soundtrack keywords
  music: {
    en: ['music', 'soundtrack', 'background music', 'add music', 'add sound', 'audio'],
    id: ['musik', 'soundtrack', 'musik latar', 'tambah musik', 'tambah sound', 'audio', 'lagu'],
    priority: 5
  },

  // Export keywords
  export: {
    en: ['export', 'download', 'export to', 'download clips', 'convert', 'youtube shorts', 'tiktok', 'instagram'],
    id: ['export', 'download', 'ekspor', 'unduh', 'export ke', 'download klip', 'youtube shorts', 'tiktok', 'instagram', 'konversi'],
    priority: 5
  },

  // Help keywords
  help: {
    en: ['help', 'help me', 'what can you do', 'commands', 'list commands', 'show commands'],
    id: ['tolong', 'bantuan', 'apa yang kamu bisa', 'commands', 'fitur', 'lihat commands'],
    priority: 4
  },

  // Status keywords
  status: {
    en: ['status', 'how are you', 'are you there', 'system status'],
    id: ['status', 'apa kabar', 'kamu ada', 'status sistem'],
    priority: 3
  }
};

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Extract number from command
 */
function extractNumber(command) {
  const numberPatterns = [
    /(\d+)\s*(clip|clips|idea|ideas|hashtag|hashtags)/i,
    /(\d+)\s+(clip|clips|idea|ideas|hashtag|hashtags)/i,
    /(\d+)/,
    /sepuluh/gi, /ten/gi,
    /dua puluh/gi, /twenty/gi,
    /lima/gi, /five/gi,
    /dua/gi, /two/gi,
    /tiga/gi, /three/gi
  ];
  
  for (const pattern of numberPatterns) {
    const match = command.match(pattern);
    if (match) {
      if (match[1]) return parseInt(match[1]);
      const word = match[0].toLowerCase();
      if (word.includes('sepuluh') || word.includes('ten')) return 10;
      if (word.includes('dua puluh') || word.includes('twenty')) return 20;
      if (word.includes('lima') || word.includes('five')) return 5;
      if (word.includes('dua') || word.includes('two')) return 2;
      if (word.includes('tiga') || word.includes('three')) return 3;
    }
  }
  return null;
}

/**
 * Extract platform from command
 */
function extractPlatform(command) {
  const platforms = {
    youtube: ['youtube', 'yt', 'yt shorts'],
    tiktok: ['tiktok', 'tt'],
    instagram: ['instagram', 'ig', 'reels'],
    facebook: ['facebook', 'fb']
  };
  
  const lowerCmd = command.toLowerCase();
  
  for (const [platform, keywords] of Object.entries(platforms)) {
    for (const keyword of keywords) {
      if (lowerCmd.includes(keyword)) {
        return platform;
      }
    }
  }
  
  return null;
}

/**
 * Extract style from command (viral, default, professional)
 */
function extractStyle(command) {
  const styles = {
    viral: ['viral', 'trending', 'hits', 'populer'],
    professional: ['professional', 'pro', 'business', 'formal'],
    default: ['default', 'normal', 'biasa']
  };
  
  const lowerCmd = command.toLowerCase();
  
  for (const [style, keywords] of Object.entries(styles)) {
    for (const keyword of keywords) {
      if (lowerCmd.includes(keyword)) {
        return style;
      }
    }
  }
  
  return 'viral'; // Default to viral
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Parse a natural language command
 * @param {string} command - The natural language command
 * @returns {Object} Parsed command with task type and parameters
 */
function parseCommand(command) {
  if (!command || typeof command !== 'string') {
    return {
      success: false,
      error: 'Invalid command',
      task: null
    };
  }

  const trimmedCommand = command.trim().toLowerCase();
  
  // Try to match keywords for each task type
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [taskType, config] of Object.entries(TASK_KEYWORDS)) {
    const score = calculateMatchScore(trimmedCommand, config);
    
    if (score > highestScore) {
      highestScore = score;
      
      // Extract parameters based on task type
      let params = {};
      
      if (config.extractCount) {
        const count = extractNumber(trimmedCommand);
        params.count = count || 10;
      }
      
      if (config.extractPlatform) {
        const platform = extractPlatform(trimmedCommand);
        params.platform = platform || 'youtube';
      }
      
      if (config.extractStyle) {
        params.style = extractStyle(trimmedCommand);
      }
      
      // Add default params based on task type
      switch (taskType) {
        case 'clip_generation':
          params.source = 'video';
          break;
        case 'content_ideas':
          params.type = 'video_ideas';
          break;
        case 'caption_generation':
          params.type = 'caption';
          break;
        case 'hashtag_generation':
          params.count = params.count || 15;
          break;
        case 'video_analysis':
        case 'analytics':
          params.type = 'analysis';
          params.timeframe = '30d';
          break;
        case 'growth_strategy':
        case 'viral_prediction':
        case 'system_diagnostics':
        case 'subtitle_generation':
        case 'music':
        case 'export':
        case 'upload':
        case 'help':
        case 'status':
          // Default params already set
          break;
      }
      
      bestMatch = {
        task: taskType,
        params,
        confidence: Math.min(0.95, score / 10)
      };
    }
  }

  // If no good match found, return general task
  if (!bestMatch || highestScore < 1) {
    return {
      success: true,
      task: 'general',
      params: {
        query: trimmedCommand,
        type: 'general'
      },
      originalCommand: command,
      confidence: 0.3
    };
  }

  return {
    success: true,
    ...bestMatch,
    originalCommand: command
  };
}

/**
 * Calculate match score for a task based on keyword matching
 */
function calculateMatchScore(command, config) {
  let score = 0;
  
  // Check English keywords
  if (config.en) {
    for (const keyword of config.en) {
      if (command.includes(keyword.toLowerCase())) {
        score += 3;
        // Bonus for exact match
        if (command === keyword.toLowerCase()) {
          score += 2;
        }
        // Bonus for multi-word match
        if (command.includes(keyword.toLowerCase()) && keyword.includes(' ')) {
          score += 1;
        }
      }
    }
  }
  
  // Check Indonesian keywords
  if (config.id) {
    for (const keyword of config.id) {
      if (command.includes(keyword.toLowerCase())) {
        score += 3;
        // Bonus for exact match
        if (command === keyword.toLowerCase()) {
          score += 2;
        }
        // Bonus for multi-word match
        if (command.includes(keyword.toLowerCase()) && keyword.includes(' ')) {
          score += 1;
        }
      }
    }
  }
  
  // Priority bonus
  if (config.priority) {
    score += config.priority * 0.1;
  }
  
  return score;
}

/**
 * Get available commands for help
 */
function getAvailableCommands() {
  return Object.keys(TASK_KEYWORDS).map(task => ({
    task,
    example: getExampleCommand(task),
    description: getTaskDescription(task)
  }));
}

/**
 * Get example command for a task
 */
function getExampleCommand(taskType) {
  const examples = {
    clip_generation: 'create 10 clips from this video',
    content_ideas: 'generate 20 video ideas',
    caption_generation: 'create viral caption',
    hashtag_generation: 'generate hashtags',
    video_analysis: 'analyze video performance',
    upload: 'upload to youtube',
    analytics: 'show analytics',
    growth_strategy: 'growth strategy',
    viral_prediction: 'viral prediction',
    system_diagnostics: 'system diagnostics',
    subtitle_generation: 'generate subtitles',
    music: 'add background music',
    export: 'export for youtube shorts',
    help: 'help',
    status: 'status'
  };
  
  // Add Indonesian examples
  const idExamples = {
    clip_generation: 'buat 10 clip dari video ini',
    content_ideas: 'generate 20 ide video',
    caption_generation: 'buat caption viral',
    hashtag_generation: 'buat hashtag youtube',
    video_analysis: 'analisa performa video',
    analytics: 'tampilkan analytics',
    growth_strategy: 'strategi growth',
    viral_prediction: 'prediksi viral',
    system_diagnostics: 'cek sistem',
    help: 'bantuan',
    status: 'status'
  };
  
  return `${examples[taskType]} | ${idExamples[taskType] || ''}`;
}

/**
 * Get task description
 */
function getTaskDescription(taskType) {
  const descriptions = {
    clip_generation: 'Generate clips from a video | Buat clip dari video',
    content_ideas: 'Generate content ideas | Buat ide konten',
    caption_generation: 'Create viral captions | Buat caption viral',
    hashtag_generation: 'Generate hashtags | Buat hashtag',
    video_analysis: 'Analyze video performance | Analisa performa video',
    upload: 'Upload content to platforms | Upload konten ke platform',
    analytics: 'View analytics and statistics | Lihat analytics dan statistik',
    growth_strategy: 'Get growth strategy recommendations | Dapatkan rekomendasi strategi growth',
    viral_prediction: 'Predict viral potential | Prediksi potensi viral',
    system_diagnostics: 'Run system diagnostics | Jalankan diagnosa sistem',
    subtitle_generation: 'Generate subtitles | Buat subtitle',
    music: 'Add background music | Tambah musik latar',
    export: 'Export clips for specific platforms | Ekspor clip untuk platform tertentu',
    help: 'Show available commands | Tampilkan commands yang tersedia',
    status: 'Check AI assistant status | Cek status AI assistant'
  };
  return descriptions[taskType] || 'Custom task';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  parseCommand,
  getAvailableCommands,
  TASK_KEYWORDS,
  extractNumber,
  extractPlatform,
  extractStyle
};

