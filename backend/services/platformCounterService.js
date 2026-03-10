const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// Flat platform folders
const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook'];

// Count video files in a directory
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir)
      .filter(function(f) { return f.endsWith('.mp4'); })
      .length;
  } catch {
    return 0;
  }
}

// Get platform counts from flat folders
function getPlatformCounts() {
  const counts = { youtube: 0, tiktok: 0, instagram: 0, facebook: 0, total: 0 };
  
  PLATFORMS.forEach(function(platform) {
    const dir = path.join(OUTPUT_DIR, platform);
    const count = countFiles(dir);
    counts[platform] = count;
    counts.total += count;
  });
  
  return counts;
}

// Get total videos (sum of all platform files)
function getTotalVideos() {
  return getPlatformCounts().total;
}

// Get files for a specific platform
function getPlatformFiles(platform) {
  const files = [];
  const dir = path.join(OUTPUT_DIR, platform);
  
  if (!fs.existsSync(dir)) return files;
  
  try {
    const dirFiles = fs.readdirSync(dir);
    dirFiles.forEach(function(f) {
      if (f.endsWith('.mp4')) {
        files.push({ name: f, path: '/output/' + platform + '/' + f });
      }
    });
  } catch (e) {
    // ignore
  }
  
  return files;
}

module.exports = { 
  getPlatformCounts: getPlatformCounts, 
  getPlatformFiles: getPlatformFiles, 
  getTotalVideos: getTotalVideos,
  PLATFORMS: PLATFORMS 
};
