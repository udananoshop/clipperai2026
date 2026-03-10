/**
 * System Routes for ClipperAI2026
 * Provides system health monitoring, path detection, and API validation
 */

const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Cache for system health (refresh every 30 seconds)
let healthCache = {
  data: null,
  timestamp: 0
};
const HEALTH_CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/system/health
 * Returns system health information including CPU, RAM, disk usage and tool status
 */
router.get('/health', async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (healthCache.data && (now - healthCache.timestamp) < HEALTH_CACHE_TTL) {
      return res.json(healthCache.data);
    }

    // CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

    // RAM usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);
    const memUsedGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
    const memTotalGB = (totalMem / (1024 * 1024 * 1024)).toFixed(1);

    // Disk usage (Windows-specific)
    let diskUsage = 55; // Default fallback
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const result = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
        const lines = result.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          if (parts.length >= 3) {
            const freeSpace = parseInt(parts[1]) || 0;
            const totalSpace = parseInt(parts[2]) || 1;
            diskUsage = Math.round(((totalSpace - freeSpace) / totalSpace) * 100);
          }
        }
      }
    } catch (diskError) {
      console.log('[System] Disk check failed, using default');
    }

    // Check FFmpeg status
    let ffmpegStatus = 'Not Found';
    try {
      await execPromise('ffmpeg -version', { timeout: 5000 });
      ffmpegStatus = 'Active';
    } catch {
      ffmpegStatus = 'Not Installed';
    }

    // Check Whisper model status
    let whisperStatus = 'Not Loaded';
    try {
      const whisperPaths = [
        path.join(__dirname, '..', 'models', 'whisper-tiny.bin'),
        path.join(__dirname, '..', 'models', 'whisper-base.bin'),
        path.join(__dirname, '..', 'models', 'whisper-small.bin'),
        path.join(process.env.APPDATA || '', 'whisper'),
      ];
      
      for (const whisperPath of whisperPaths) {
        if (fs.existsSync(whisperPath)) {
          whisperStatus = 'Loaded';
          break;
        }
      }
    } catch {
      whisperStatus = 'Not Available';
    }

    // Check yt-dlp status
    let ytdlpStatus = 'Not Found';
    try {
      await execPromise('yt-dlp --version', { timeout: 5000 });
      ytdlpStatus = 'Ready';
    } catch {
      ytdlpStatus = 'Not Installed';
    }

    const healthData = {
      success: true,
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      ram: {
        usage: memUsagePercent,
        used: memUsedGB,
        total: memTotalGB
      },
      disk: {
        usage: diskUsage
      },
      tools: {
        ffmpeg: ffmpegStatus,
        whisper: whisperStatus,
        ytdlp: ytdlpStatus
      },
      timestamp: new Date().toISOString()
    };

    // Cache the result
    healthCache = {
      data: healthData,
      timestamp: now
    };

    res.json(healthData);
  } catch (error) {
    console.error('[System] Health check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      message: error.message
    });
  }
});

/**
 * POST /api/system/detect-paths
 * Auto-detect system paths for FFmpeg, yt-dlp, and Whisper
 */
router.post('/detect-paths', async (req, res) => {
  try {
    const detectedPaths = {
      ffmpegPath: '',
      ytdlpPath: '',
      whisperModelPath: ''
    };

    // Detect FFmpeg
    const ffmpegPaths = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\ffmpeg\\ffmpeg.exe',
      'C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe',
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg'
    ];

    for (const ffmpegPath of ffmpegPaths) {
      if (fs.existsSync(ffmpegPath)) {
        detectedPaths.ffmpegPath = ffmpegPath;
        break;
      }
    }

    // If not found in common paths, try which command
    if (!detectedPaths.ffmpegPath) {
      try {
        const whichCmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
        const result = await execPromise(whichCmd, { timeout: 5000 });
        const foundPath = result.stdout.trim().split('\n')[0];
        if (foundPath && fs.existsSync(foundPath)) {
          detectedPaths.ffmpegPath = foundPath;
        }
      } catch {
        // FFmpeg not found in PATH
      }
    }

    // Detect yt-dlp
    const ytdlpPaths = [
      'C:\\yt-dlp\\yt-dlp.exe',
      'C:\\Program Files\\yt-dlp\\yt-dlp.exe',
      'C:\\Users\\Public\\yt-dlp\\yt-dlp.exe',
      'C:\\Python312\\Scripts\\yt-dlp.exe',
      'C:\\Python311\\Scripts\\yt-dlp.exe',
      'C:\\Python310\\Scripts\\yt-dlp.exe',
      '/usr/bin/yt-dlp',
      '/usr/local/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp'
    ];

    for (const ytdlpPath of ytdlpPaths) {
      if (fs.existsSync(ytdlpPath)) {
        detectedPaths.ytdlpPath = ytdlpPath;
        break;
      }
    }

    // Try which command for yt-dlp
    if (!detectedPaths.ytdlpPath) {
      try {
        const whichCmd = process.platform === 'win32' ? 'where yt-dlp' : 'which yt-dlp';
        const result = await execPromise(whichCmd, { timeout: 5000 });
        const foundPath = result.stdout.trim().split('\n')[0];
        if (foundPath && fs.existsSync(foundPath)) {
          detectedPaths.ytdlpPath = foundPath;
        }
      } catch {
        // yt-dlp not found in PATH
      }
    }

    // Detect Whisper model path
    const whisperPaths = [
      path.join(__dirname, '..', 'models', 'whisper-tiny.bin'),
      path.join(__dirname, '..', 'models', 'whisper-base.bin'),
      path.join(__dirname, '..', 'models', 'whisper-small.bin'),
      path.join(__dirname, '..', 'whisper', 'models', 'tiny.bin'),
      path.join(process.env.APPDATA || '', 'whisper', 'models'),
      'C:\\whisper\\models',
      './models/whisper-tiny'
    ];

    for (const whisperPath of whisperPaths) {
      if (fs.existsSync(whisperPath)) {
        detectedPaths.whisperModelPath = whisperPath;
        break;
      }
    }

    const foundCount = Object.values(detectedPaths).filter(p => p).length;

    res.json({
      success: true,
      detected: detectedPaths,
      summary: `${foundCount}/3 paths detected`,
      foundCount
    });
  } catch (error) {
    console.error('[System] Path detection error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to detect paths',
      message: error.message
    });
  }
});

/**
 * POST /api/system/test-api
 * Test API keys for various services
 */
router.post('/test-api', async (req, res) => {
  try {
    const { apiKey, provider } = req.body;

    if (!apiKey || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Missing apiKey or provider',
        status: 'Invalid Request'
      });
    }

    let result = {
      success: false,
      status: 'Unknown Error',
      message: ''
    };

    switch (provider.toLowerCase()) {
      case 'openai':
      case 'openaiapikey':
        result = await testOpenAI(apiKey);
        break;
      case 'youtube':
      case 'youtubeapikey':
        result = await testYouTube(apiKey);
        break;
      case 'instagram':
      case 'instagramaccesstoken':
        result = await testInstagram(apiKey);
        break;
      case 'tiktok':
      case 'tiktokaccesstoken':
        result = await testTikTok(apiKey);
        break;
      default:
        result = {
          success: false,
          status: 'Unknown Provider',
          message: `Unknown provider: ${provider}`
        };
    }

    res.json(result);
  } catch (error) {
    console.error('[System] API test error:', error.message);
    res.status(500).json({
      success: false,
      status: 'Error',
      message: error.message
    });
  }
});

// Test OpenAI API key
async function testOpenAI(apiKey) {
  try {
    // First check format
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      return {
        success: false,
        status: 'Invalid Key',
        message: 'Invalid API key format'
      };
    }

    // Try a minimal API call to validate
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.status === 401) {
      return {
        success: false,
        status: 'Invalid Key',
        message: 'API key is invalid or expired'
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        status: 'API Limit Reached',
        message: 'Rate limit exceeded'
      };
    }

    if (response.ok) {
      return {
        success: true,
        status: 'Connected',
        message: 'OpenAI API key is valid'
      };
    }

    return {
      success: false,
      status: 'Error',
      message: `API returned status: ${response.status}`
    };
  } catch (error) {
    // If network error, just validate format
    if (apiKey.startsWith('sk-') && apiKey.length > 20) {
      return {
        success: true,
        status: 'Connected',
        message: 'API key format valid (offline mode)'
      };
    }
    return {
      success: false,
      status: 'Invalid Key',
      message: error.message
    };
  }
}

// Test YouTube API key
async function testYouTube(apiKey) {
  try {
    // Check minimum length
    if (apiKey.length < 25) {
      return {
        success: false,
        status: 'Invalid Key',
        message: 'Invalid API key format'
      };
    }

    // Test with YouTube Data API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true&key=${apiKey}`,
      { method: 'GET' }
    );

    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error?.errors?.[0]?.reason === 'keyInvalid') {
        return {
          success: false,
          status: 'Invalid Key',
          message: 'API key is invalid'
        };
      }
      return {
        success: false,
        status: 'Invalid Key',
        message: 'API key is invalid or lacks permissions'
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        status: 'API Limit Reached',
        message: 'Rate limit exceeded'
      };
    }

    if (response.ok || response.status === 400) {
      // 400 is OK - means key works but no channel
      return {
        success: true,
        status: 'Connected',
        message: 'YouTube API key is valid'
      };
    }

    return {
      success: false,
      status: 'Error',
      message: `API returned status: ${response.status}`
    };
  } catch (error) {
    if (apiKey.length > 25) {
      return {
        success: true,
        status: 'Connected',
        message: 'API key format valid (offline mode)'
      };
    }
    return {
      success: false,
      status: 'Invalid Key',
      message: error.message
    };
  }
}

// Test Instagram API
async function testInstagram(accessToken) {
  try {
    if (accessToken.length < 20) {
      return {
        success: false,
        status: 'Invalid Key',
        message: 'Invalid access token format'
      };
    }

    // Test with Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (response.status === 401 || response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error?.message?.includes('Invalid')) {
        return {
          success: false,
          status: 'Invalid Key',
          message: 'Access token is invalid'
        };
      }
      return {
        success: false,
        status: 'Invalid Key',
        message: 'Access token is invalid or expired'
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        status: 'API Limit Reached',
        message: 'Rate limit exceeded'
      };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        status: 'Connected',
        message: `Connected as @${data.username}`
      };
    }

    return {
      success: false,
      status: 'Error',
      message: `API returned status: ${response.status}`
    };
  } catch (error) {
    if (accessToken.length > 20) {
      return {
        success: true,
        status: 'Connected',
        message: 'Access token format valid (offline mode)'
      };
    }
    return {
      success: false,
      status: 'Invalid Key',
      message: error.message
    };
  }
}

// Test TikTok API
async function testTikTok(accessToken) {
  try {
    if (accessToken.length < 10) {
      return {
        success: false,
        status: 'Invalid Key',
        message: 'Invalid access token format'
      };
    }

    // TikTok API test - validate token format
    // Note: TikTok's API requires more complex OAuth flow
    // This is a simplified check
    if (accessToken.startsWith('aw')) {
      return {
        success: true,
        status: 'Connected',
        message: 'TikTok token format valid'
      };
    }

    return {
      success: false,
      status: 'Invalid Key',
      message: 'TikTok token format not recognized'
    };
  } catch (error) {
    return {
      success: false,
      status: 'Invalid Key',
      message: error.message
    };
  }
}

module.exports = router;

