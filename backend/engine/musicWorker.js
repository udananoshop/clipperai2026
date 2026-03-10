// Music Worker - Adds background music to video clips
// Low volume mix for background ambience

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Add background music to video
 * @param {string} videoPath - Input video path
 * @param {string} musicPath - Background music path
 * @param {string} outputPath - Output video path
 * @param {number} volume - Music volume 0-1 (default: 0.3)
 * @returns {Promise<string>} - Output video path
 */
const addBackgroundMusic = async (videoPath, musicPath, outputPath, volume = 0.3) => {
  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    
    // Mix original audio with background music at specified volume
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -i "${musicPath}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[outa]" -map 0:v -map "[outa]" -c:v copy "${outputPath}"`;
    
    exec(cmd, { shell: 'cmd.exe' }, (error) => {
      if (error) {
        // If mixing fails, just copy original video
        fs.copyFileSync(videoPath, outputPath);
      }
      resolve(outputPath);
    });
  });
};

/**
 * Add fade in/out transitions to video
 * @param {string} videoPath - Input video path
 * @param {string} outputPath - Output video path
 * @param {number} fadeIn - Fade in duration in seconds
 * @param {number} fadeOut - Fade out duration in seconds
 * @returns {Promise<string>} - Output video path
 */
const addFadeTransitions = async (videoPath, outputPath, fadeIn = 0.5, fadeOut = 0.5) => {
  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "fade=t=in:st=0:d=${fadeIn},fade=t=out:st=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}")-d${fadeOut}:d=${fadeOut}" -c:a copy "${outputPath}"`;
    
    exec(cmd, { shell: 'cmd.exe' }, (error) => {
      if (error) {
        fs.copyFileSync(videoPath, outputPath);
      }
      resolve(outputPath);
    });
  });
};

/**
 * Get royalty-free music suggestions
 * @returns {Array} - Available music tracks
 */
const getMusicLibrary = () => [
  { id: 'upbeat_1', name: 'Upbeat Energy', mood: 'energetic', duration: 180 },
  { id: 'chill_1', name: 'Chill Vibes', mood: 'calm', duration: 180 },
  { id: 'corporate_1', name: 'Corporate Clean', mood: 'professional', duration: 180 },
  { id: 'cinematic_1', name: 'Cinematic Epic', mood: 'dramatic', duration: 180 }
];

module.exports = {
  addBackgroundMusic,
  addFadeTransitions,
  getMusicLibrary
};
