const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

class SubtitleService {
  constructor() {
    this.whisperPath = process.env.WHISPER_PATH || 'whisper'; // Assuming whisper is installed
    this.model = process.env.WHISPER_MODEL || 'tiny';
  }

  async generateSubtitles(videoPath, language = 'en') {
    try {
      const outputDir = path.dirname(videoPath);
      const baseName = path.basename(videoPath, path.extname(videoPath));
      const subtitlePath = path.join(outputDir, `${baseName}.srt`);

      // Use whisper for offline subtitle generation
      const command = `${this.whisperPath} "${videoPath}" --model ${this.model} --language ${language} --output_format srt --output_dir "${outputDir}"`;

      await execAsync(command);

      // Read the generated subtitle file
      const subtitleContent = fs.readFileSync(subtitlePath, 'utf8');

      return {
        success: true,
        subtitlePath,
        content: subtitleContent,
        language
      };
    } catch (error) {
      console.error('Error generating subtitles:', error);
      throw new Error(`Subtitle generation failed: ${error.message}`);
    }
  }

  async translateSubtitles(subtitleContent, targetLanguage) {
    // In a real implementation, this would use a translation service
    // For now, return the original content with a note
    return {
      originalLanguage: 'en',
      targetLanguage,
      translatedContent: subtitleContent,
      note: 'Translation service not implemented - returning original'
    };
  }

  async burnSubtitles(videoPath, subtitlePath, outputPath) {
    try {
      const command = `ffmpeg -i "${videoPath}" -vf "subtitles=${subtitlePath}" -c:a copy "${outputPath}"`;

      await execAsync(command);

      return {
        success: true,
        outputPath
      };
    } catch (error) {
      console.error('Error burning subtitles:', error);
      throw new Error(`Subtitle burning failed: ${error.message}`);
    }
  }

  parseSRT(content) {
    const subtitles = [];
    const blocks = content.trim().split('\n\n');

    blocks.forEach(block => {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0]);
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
        if (timeMatch) {
          const startTime = this.srtTimeToSeconds(timeMatch[1]);
          const endTime = this.srtTimeToSeconds(timeMatch[2]);
          const text = lines.slice(2).join(' ');

          subtitles.push({
            index,
            startTime,
            endTime,
            text
          });
        }
      }
    });

    return subtitles;
  }

  srtTimeToSeconds(timeString) {
    const [hours, minutes, seconds] = timeString.replace(',', '.').split(':');
    return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
  }

  secondsToSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.replace('.', ',').padStart(6, '0')}`;
  }

  createSRTContent(subtitles) {
    return subtitles.map(sub => {
      return `${sub.index}\n${this.secondsToSRTTime(sub.startTime)} --> ${this.secondsToSRTTime(sub.endTime)}\n${sub.text}\n`;
    }).join('\n');
  }
}

module.exports = new SubtitleService();
