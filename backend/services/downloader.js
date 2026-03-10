const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const PLATFORMS = {
  youtube: /youtube\.com|youtu\.be/,
  tiktok: /tiktok\.com/,
  instagram: /instagram\.com/,
  facebook: /facebook\.com|fb\.watch/
};

const ERROR_PATTERNS = [
  { pattern: /private video|video is private|this video is private/i, reason: 'PRIVATE_VIDEO' },
  { pattern: /sign in to confirm your age|age restricted|age restriction/i, reason: 'AGE_RESTRICTED' },
  { pattern: /this video is unavailable|video unavailable|removed by|deleted video/i, reason: 'UNAVAILABLE' },
  { pattern: /unsupported url|unsupported website/i, reason: 'UNSUPPORTED' },
  { pattern: /login|sign in|authentication required/i, reason: 'LOGIN_REQUIRED' }
];

function detectPlatform(url) {
  for (const [platform, regex] of Object.entries(PLATFORMS)) {
    if (regex.test(url)) {
      return platform;
    }
  }
  return 'unknown';
}

function detectError(stderr) {
  if (!stderr) return null;
  
  for (const { pattern, reason } of ERROR_PATTERNS) {
    if (pattern.test(stderr)) {
      return reason;
    }
  }
  return 'DOWNLOAD_FAILED';
}

function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'INVALID_URL' };
  }

  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, reason: 'INVALID_PROTOCOL' };
    }
    
    const platform = detectPlatform(url);
    if (platform === 'unknown') {
      return { valid: false, reason: 'UNSUPPORTED' };
    }

    return { valid: true, platform };
  } catch {
    return { valid: false, reason: 'INVALID_URL' };
  }
}

function downloadVideo(url, options = {}) {
  return new Promise((resolve, reject) => {
    // Validate URL first
    const validation = validateUrl(url);
    if (!validation.valid) {
      resolve({ success: false, reason: validation.reason });
      return;
    }

    const platform = validation.platform;
    const ytDlpPath = process.env.YTDLP_PATH || 'yt-dlp';
    
    const outputPath = path.join(UPLOADS_DIR, '%(title)s.%(ext)s');
    
    const args = [
      '-f', 'mp4',
      '-o', outputPath,
      '--no-warnings',
      '--no-check-certificate',
      url
    ];

    console.log(`[Downloader] Starting download: ${url}`);

    const proc = spawn(ytDlpPath, args, {
      shell: 'cmd.exe',
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve({ success: false, reason: 'TIMEOUT' });
    }, 180000); // 3 minute timeout

    proc.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        const errorReason = detectError(stderr);
        console.log(`[Downloader] Error detected: ${errorReason}`);
        resolve({ success: false, reason: errorReason || 'DOWNLOAD_FAILED' });
        return;
      }

      // Find the downloaded file
      const files = fs.readdirSync(UPLOADS_DIR);
      const latestFile = files
        .filter(f => f.endsWith('.mp4'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(UPLOADS_DIR, a));
          const statB = fs.statSync(path.join(UPLOADS_DIR, b));
          return statB.mtime - statA.mtime;
        })[0];

      if (latestFile) {
        const filePath = path.join(UPLOADS_DIR, latestFile);
        const stats = fs.statSync(filePath);
        
        // Extract title from filename
        const title = latestFile.replace('.mp4', '').replace(/_/g, ' ');

        resolve({
          success: true,
          filePath: filePath,
          filename: latestFile,
          title: title,
          size: stats.size,
          platform: platform
        });
      } else {
        resolve({ success: false, reason: 'FILE_NOT_FOUND' });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[Downloader] Process error:', err.message);
      
      if (err.message.includes('ENOENT')) {
        resolve({ success: false, reason: 'YTDLP_NOT_FOUND' });
      } else {
        resolve({ success: false, reason: 'DOWNLOAD_FAILED' });
      }
    });
  });
}

module.exports = {
  downloadVideo,
  validateUrl,
  detectPlatform,
  ERROR_REASONS: {
    PRIVATE_VIDEO: 'PRIVATE_VIDEO',
    AGE_RESTRICTED: 'AGE_RESTRICTED',
    UNAVAILABLE: 'UNAVAILABLE',
    UNSUPPORTED: 'UNSUPPORTED',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    INVALID_URL: 'INVALID_URL',
    TIMEOUT: 'TIMEOUT',
    YTDLP_NOT_FOUND: 'YTDLP_NOT_FOUND',
    DOWNLOAD_FAILED: 'DOWNLOAD_FAILED'
  }
};
