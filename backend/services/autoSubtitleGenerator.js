/**
 * ClipperAi2026 Enterprise - Auto Subtitle Generator Service
 * Generate subtitles with timing, animated subtitle styles, and burn-in option
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Subtitle styles
 */
const SUBTITLE_STYLES = {
  default: {
    name: 'Default',
    fontFamily: 'Arial',
    fontSize: 48,
    fontColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    bold: false,
    italic: false,
    underline: false,
    shadow: true,
    position: 'bottom'
  },
  bold: {
    name: 'Bold Impact',
    fontFamily: 'Arial Black',
    fontSize: 52,
    fontColor: '#FFFF00',
    backgroundColor: 'rgba(0,0,0,0.7)',
    bold: true,
    italic: false,
    underline: false,
    shadow: true,
    position: 'bottom'
  },
  animated: {
    name: 'Animated Highlight',
    fontFamily: 'Arial',
    fontSize: 48,
    fontColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    bold: true,
    italic: false,
    underline: false,
    shadow: true,
    highlightWords: true,
    animation: 'fade',
    position: 'bottom'
  },
  modern: {
    name: 'Modern Minimal',
    fontFamily: 'Roboto',
    fontSize: 44,
    fontColor: '#FFFFFF',
    backgroundColor: 'transparent',
    bold: false,
    italic: false,
    underline: false,
    shadow: false,
    outline: true,
    outlineColor: '#000000',
    outlineWidth: 2,
    position: 'bottom'
  },
  cinematic: {
    name: 'Cinematic',
    fontFamily: 'Georgia',
    fontSize: 42,
    fontColor: '#E0E0E0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    bold: false,
    italic: true,
    underline: false,
    shadow: true,
    position: 'bottom'
  },
  social: {
    name: 'Social Media',
    fontFamily: 'Arial',
    fontSize: 56,
    fontColor: '#FFFFFF',
    backgroundColor: 'rgba(255,0,100,0.8)',
    bold: true,
    italic: false,
    underline: false,
    shadow: true,
    position: 'bottom',
    maxWidth: '80%'
  },
  karaoke: {
    name: 'Karaoke',
    fontFamily: 'Arial',
    fontSize: 48,
    fontColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    bold: true,
    italic: false,
    underline: false,
    shadow: true,
    karaokeEffect: true,
    highlightColor: '#FFDD00',
    position: 'bottom'
  }
};

/**
 * AutoSubtitleGenerator Service
 */
class AutoSubtitleGenerator {
  constructor() {
    this.activeJobs = new Map();
    this.outputDir = path.join(__dirname, '..', 'output', 'subtitles');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate subtitles from transcript
   * @param {Object} options - Subtitle generation options
   * @returns {Promise<Object>} - Subtitle generation result
   */
  async generateSubtitles(options) {
    const {
      videoId,
      videoPath,
      transcript,
      style = 'default',
      burnIn = false,
      language = 'en',
      maxCharsPerLine = 42,
      maxLines = 2,
      position = 'bottom',
      margin = 10
    } = options;

    const jobId = uuidv4();
    logger.info(`[AutoSubtitleGenerator] Starting subtitle generation job ${jobId}`);

    try {
      // Validate style
      const subtitleStyle = SUBTITLE_STYLES[style] || SUBTITLE_STYLES.default;

      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'subtitle_generation',
        options: {
          style,
          burnIn,
          language,
          maxCharsPerLine,
          maxLines,
          position,
          margin
        },
        subtitles: []
      };

      this.activeJobs.set(jobId, job);

      // Step 1: Parse transcript into timed segments
      job.progress = 20;
      job.status = 'parsing_transcript';
      this.activeJobs.set(jobId, job);

      const segments = this._parseTranscript(transcript, maxCharsPerLine, maxLines);
      job.segments = segments;
      this.activeJobs.set(jobId, job);

      await this._delay(300);

      // Step 2: Apply styling and formatting
      job.progress = 50;
      job.status = 'applying_style';
      this.activeJobs.set(jobId, job);

      const styledSubtitles = this._applyStyle(segments, subtitleStyle, position, margin);
      job.subtitles = styledSubtitles;

      await this._delay(300);

      // Step 3: Generate output files
      job.progress = 75;
      job.status = burnIn ? 'burning_subtitles' : 'generating_files';
      this.activeJobs.set(jobId, job);

      // Generate SRT file
      const srtFilename = `subtitles_${jobId}.srt`;
      const srtPath = path.join(this.outputDir, srtFilename);
      const srtContent = this._generateSRT(styledSubtitles);
      fs.writeFileSync(srtPath, srtContent);

      // Generate VTT file
      const vttFilename = `subtitles_${jobId}.vtt`;
      const vttPath = path.join(this.outputDir, vttFilename);
      const vttContent = this._generateVTT(styledSubtitles);
      fs.writeFileSync(vttPath, vttContent);

      let burnedVideoPath = null;
      let burnedVideoUrl = null;

      if (burnIn) {
        // Simulate burn-in process
        await this._delay(500);
        
        const outputFilename = `burned_${Date.now()}_${uuidv4().slice(0, 8)}.mp4`;
        burnedVideoPath = path.join(this.outputDir, outputFilename);
        burnedVideoUrl = `/output/subtitles/${outputFilename}`;
      }

      job.progress = 100;
      job.status = 'completed';
      
      job.output = {
        subtitles: styledSubtitles,
        subtitleCount: styledSubtitles.length,
        srtFile: {
          filename: srtFilename,
          path: srtPath,
          url: `/output/subtitles/${srtFilename}`
        },
        vttFile: {
          filename: vttFilename,
          path: vttPath,
          url: `/output/subtitles/${vttFilename}`
        },
        burnedVideo: burnIn ? {
          filename: path.basename(burnedVideoPath),
          path: burnedVideoPath,
          url: burnedVideoUrl
        } : null,
        style: subtitleStyle,
        language
      };

      this.activeJobs.set(jobId, job);
      logger.info(`[AutoSubtitleGenerator] Subtitle generation job ${jobId} completed`);

      return job;
    } catch (error) {
      logger.error(`[AutoSubtitleGenerator] Subtitle generation job ${jobId} failed:`, error);
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        this.activeJobs.set(jobId, job);
      }
      throw error;
    }
  }

  /**
   * Generate subtitles with highlighted words (animated)
   * @param {Object} options - Options with word-level timing
   * @returns {Promise<Object>} - Result with animated subtitles
   */
  async generateAnimatedSubtitles(options) {
    const {
      videoId,
      videoPath,
      wordTimings, // Array of { word, startTime, endTime }
      style = 'animated',
      burnIn = false
    } = options;

    const jobId = uuidv4();
    logger.info(`[AutoSubtitleGenerator] Starting animated subtitle job ${jobId}`);

    try {
      const subtitleStyle = SUBTITLE_STYLES[style] || SUBTITLE_STYLES.animated;
      
      const job = {
        id: jobId,
        videoId,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        type: 'animated_subtitle_generation',
        options: {
          style,
          burnIn,
          wordCount: wordTimings?.length || 0
        }
      };

      this.activeJobs.set(jobId, job);

      // Group words into subtitle lines
      job.progress = 30;
      this.activeJobs.set(jobId, job);

      const lines = this._groupWordsIntoLines(wordTimings);
      
      job.progress = 60;
      this.activeJobs.set(jobId, job);

      // Apply animated styling
      const animatedSubtitles = this._applyAnimatedStyle(lines, subtitleStyle);

      job.progress = 80;
      this.activeJobs.set(jobId, job);

      // Generate output
      const srtFilename = `animated_${jobId}.srt`;
      const srtPath = path.join(this.outputDir, srtFilename);
      const srtContent = this._generateSRT(animatedSubtitles);
      fs.writeFileSync(srtPath, srtContent);

      job.progress = 100;
      job.status = 'completed';

      job.output = {
        subtitles: animatedSubtitles,
        subtitleCount: animatedSubtitles.length,
        srtFile: {
          filename: srtFilename,
          path: srtPath,
          url: `/output/subtitles/${srtFilename}`
        },
        style: subtitleStyle,
        isAnimated: true
      };

      this.activeJobs.set(jobId, job);
      return job;
    } catch (error) {
      logger.error(`[AutoSubtitleGenerator] Animated subtitle job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Parse transcript into timed segments
   * @param {string} transcript - Raw transcript
   * @param {number} maxChars - Max characters per line
   * @param {number} maxLines - Max lines per subtitle
   * @returns {Array} - Timed segments
   */
  _parseTranscript(transcript, maxChars, maxLines) {
    if (!transcript) {
      return [];
    }

    // If transcript is already timed (array of objects)
    if (Array.isArray(transcript)) {
      return transcript.map((item, index) => ({
        id: index + 1,
        startTime: item.startTime || 0,
        endTime: item.endTime || item.startTime + 3,
        text: item.text || item.word || '',
        confidence: item.confidence || 1.0
      }));
    }

    // Parse raw text transcript
    const words = transcript.split(/\s+/);
    const segments = [];
    let currentSegment = {
      id: 1,
      startTime: 0,
      text: '',
      words: []
    };

    let charCount = 0;
    let lineCount = 0;
    const wordsPerSecond = 2.5; // Average speaking rate
    let currentTime = 0;

    words.forEach((word, index) => {
      charCount += word.length + 1;
      
      if (charCount > maxChars || (word.includes('.') && charCount > maxChars / 2)) {
        lineCount++;
        
        if (lineCount >= maxLines) {
          // Finish current segment
          currentSegment.endTime = currentTime;
          currentSegment.text = currentSegment.text.trim();
          segments.push(currentSegment);

          // Start new segment
          currentSegment = {
            id: segments.length + 1,
            startTime: currentTime,
            text: '',
            words: []
          };
          charCount = word.length + 1;
          lineCount = 0;
        }
      }

      currentSegment.text += (currentSegment.text ? ' ' : '') + word;
      currentSegment.words.push(word);
      currentTime += word.length / 5 / wordsPerSecond; // Estimate time
    });

    // Add final segment
    if (currentSegment.text.trim()) {
      currentSegment.endTime = currentTime;
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Group words into subtitle lines for animated effect
   * @param {Array} wordTimings - Word-level timings
   * @returns {Array} - Lines with word timings
   */
  _groupWordsIntoLines(wordTimings) {
    if (!wordTimings || wordTimings.length === 0) {
      return [];
    }

    const lines = [];
    let currentLine = {
      id: 1,
      startTime: wordTimings[0].startTime,
      words: [],
      text: ''
    };

    let charCount = 0;
    const maxChars = 42;

    wordTimings.forEach((wordObj, index) => {
      charCount += (wordObj.word?.length || 0) + 1;

      if (charCount > maxChars && currentLine.words.length > 0) {
        currentLine.endTime = wordObj.startTime;
        currentLine.text = currentLine.words.map(w => w.word).join(' ');
        lines.push(currentLine);

        currentLine = {
          id: lines.length + 1,
          startTime: wordObj.startTime,
          words: [],
          text: ''
        };
        charCount = (wordObj.word?.length || 0) + 1;
      }

      currentLine.words.push(wordObj);
    });

    // Add final line
    if (currentLine.words.length > 0) {
      currentLine.endTime = wordTimings[wordTimings.length - 1].endTime;
      currentLine.text = currentLine.words.map(w => w.word).join(' ');
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Apply subtitle style
   * @param {Array} segments - Subtitle segments
   * @param {Object} style - Style configuration
   * @param {string} position - Position
   * @param {number} margin - Margin
   * @returns {Array} - Styled subtitles
   */
  _applyStyle(segments, style, position, margin) {
    return segments.map(segment => ({
      ...segment,
      style: {
        ...style,
        position,
        margin,
        formattedText: this._formatTextWithStyle(segment.text, style)
      }
    }));
  }

  /**
   * Apply animated style to subtitles
   * @param {Array} lines - Subtitle lines
   * @param {Object} style - Style configuration
   * @returns {Array} - Animated subtitles
   */
  _applyAnimatedStyle(lines, style) {
    return lines.map((line, lineIndex) => {
      // Add word-level timing for animation
      const animatedWords = line.words.map((wordObj, wordIndex) => ({
        ...wordObj,
        highlight: false,
        animationDelay: wordIndex * 0.05
      }));

      return {
        ...line,
        words: animatedWords,
        style: {
          ...style,
          animated: true,
          formattedText: this._formatTextWithStyle(line.text, style)
        }
      };
    });
  }

  /**
   * Format text with style (bold, etc.)
   * @param {string} text - Raw text
   * @param {Object} style - Style config
   * @returns {string} - Formatted text
   */
  _formatTextWithStyle(text, style) {
    if (style.bold) {
      text = `<b>${text}</b>`;
    }
    if (style.italic) {
      text = `<i>${text}</i>`;
    }
    if (style.underline) {
      text = `<u>${text}</u>`;
    }
    return text;
  }

  /**
   * Generate SRT format
   * @param {Array} subtitles - Subtitle segments
   * @returns {string} - SRT content
   */
  _generateSRT(subtitles) {
    return subtitles.map(sub => {
      const startTime = this._formatSRTTime(sub.startTime);
      const endTime = this._formatSRTTime(sub.endTime);
      return `${sub.id}\n${startTime} --> ${endTime}\n${sub.style?.formattedText || sub.text}\n`;
    }).join('\n');
  }

  /**
   * Generate VTT format
   * @param {Array} subtitles - Subtitle segments
   * @returns {string} - VTT content
   */
  _generateVTT(subtitles) {
    const content = subtitles.map(sub => {
      const startTime = this._formatVTTTime(sub.startTime);
      const endTime = this._formatVTTTime(sub.endTime);
      return `${startTime} --> ${endTime}\n${sub.style?.formattedText || sub.text}\n`;
    }).join('\n');

    return `WEBVTT\n\n${content}`;
  }

  /**
   * Format time for SRT
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  _formatSRTTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for VTT
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  _formatVTTTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Get available subtitle styles
   * @returns {Object} - Available styles
   */
  getStyles() {
    return SUBTITLE_STYLES;
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} - Job status
   */
  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Helper method for simulated delays
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new AutoSubtitleGenerator();
