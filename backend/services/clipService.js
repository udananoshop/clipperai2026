const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class ClipService {
  constructor() {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
  }

  async createClip(inputPath, outputPath, startTime, duration, options = {}) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-preset fast',
          '-crf 22'
        ]);

      // Add resize options if specified
      if (options.width && options.height) {
        command.size(`${options.width}x${options.height}`);
      }

      // Add aspect ratio specific options
      if (options.aspectRatio === '9:16') {
        command.size('1080x1920').aspect('9:16');
      } else if (options.aspectRatio === '16:9') {
        command.size('1920x1080').aspect('16:9');
      }

      command
        .on('start', cmd => {
          console.log("FFMPEG START:", cmd);
        })
        .on('end', () => {
          console.log("FFMPEG FINISHED");
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          console.error("FFMPEG ERROR:", err);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  }

  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`FFprobe error: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration,
          width: videoStream.width,
          height: videoStream.height,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name
        });
      });
    });
  }

  async extractThumbnail(inputPath, outputPath, timestamp = 1) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x180'
        })
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', (err) => reject(new Error(`Thumbnail extraction error: ${err.message}`)));
    });
  }

  async mergeClips(clipPaths, outputPath) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      clipPaths.forEach(clipPath => {
        command.input(clipPath);
      });

      command
        .mergeToFile(outputPath, path.dirname(outputPath))
        .outputOptions(['-c copy'])
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', (err) => reject(new Error(`Merge error: ${err.message}`)));
    });
  }

  async addSubtitles(videoPath, subtitlePath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .input(subtitlePath)
        .output(outputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-c:s mov_text',
          '-preset fast'
        ])
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', (err) => reject(new Error(`Subtitle burn error: ${err.message}`)));
    });
  }
}

module.exports = new ClipService();
