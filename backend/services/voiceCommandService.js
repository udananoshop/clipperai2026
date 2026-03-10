/**
 * Voice Command Service
 * Overlord AI Core - Voice Command Handler
 * 
 * Handles voice command input
 * Note: Speech-to-text is primarily done client-side
 * This service provides server-side processing
 * Optimized for 8GB RAM
 */

// ============================================================================
// VOICE COMMAND PROCESSING
// ============================================================================

/**
 * Process voice command from client
 * The actual speech-to-text is done client-side using Web Speech API
 * This service processes and validates the transcribed text
 * 
 * @param {Object} voiceData - Voice command data
 * @param {string} voiceData.text - Transcribed text from client
 * @param {string} voiceData.language - Language code (en, id)
 * @param {number} voiceData.confidence - Confidence score from STT
 */
async function processVoiceCommand(voiceData) {
  try {
    const { text, language = 'en', confidence = 1.0 } = voiceData;

    if (!text || typeof text !== 'string') {
      return {
        success: false,
        error: 'No text provided',
        message: 'Could not understand the voice command'
      };
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return {
        success: false,
        error: 'Empty text',
        message: 'Voice command was empty'
      };
    }

    // Validate confidence if provided
    if (confidence < 0.5) {
      return {
        success: false,
        error: 'Low confidence',
        message: 'Could not understand clearly. Please try again.',
        suggestion: 'Speak more clearly or try a simpler command'
      };
    }

    // Parse the command using command parser
    const commandParser = require('./commandParserService');
    const parsedCommand = commandParser.parseCommand(trimmedText);

    // Execute the task
    const taskExecutor = require('./taskExecutionService');
    const result = await taskExecutor.executeTask(parsedCommand, { language });

    return {
      success: true,
      originalText: trimmedText,
      transcribedText: trimmedText,
      confidence,
      language,
      parsedCommand,
      taskResult: result,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[VoiceCommand] Process error:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Failed to process voice command'
    };
  }
}

/**
 * Validate voice input
 * @param {Object} voiceData - Voice data to validate
 */
function validateVoiceInput(voiceData) {
  const errors = [];

  if (!voiceData) {
    errors.push('No voice data provided');
    return { valid: false, errors };
  }

  if (!voiceData.text) {
    errors.push('No text transcription provided');
  }

  if (voiceData.text && voiceData.text.length > 500) {
    errors.push('Text too long (max 500 characters)');
  }

  const supportedLanguages = ['en', 'id', 'es', 'fr', 'de', 'zh', 'ja', 'ko'];
  if (voiceData.language && !supportedLanguages.includes(voiceData.language)) {
    errors.push(`Language not supported: ${voiceData.language}`);
  }

  if (voiceData.confidence !== undefined && (voiceData.confidence < 0 || voiceData.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get supported languages for voice commands
 */
function getSupportedLanguages() {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' }
  ];
}

/**
 * Get voice command tips
 */
function getVoiceCommandTips() {
  return [
    'Speak clearly and at a normal pace',
    'Use short, specific commands',
    'Example: "Generate 10 video ideas"',
    'Example: "Create viral caption"',
    'Example: "Show analytics"',
    'Make sure your microphone is working',
    'Reduce background noise for better recognition'
  ];
}

/**
 * Pre-process voice input (server-side enhancements)
 * @param {string} text - Raw transcribed text
 */
function preprocessVoiceText(text) {
  if (!text) return '';

  let processed = text.trim();

  // Fix common speech recognition errors
  const corrections = {
    'video ideas': 'video ideas',
    'clip generation': 'clip generation',
    'growth strategy': 'growth strategy',
    'viral prediction': 'viral prediction',
    'system diagnostics': 'system diagnostics',
    'youtube shorts': 'youtube shorts',
    'tiktok': 'tiktok',
    'instagram': 'instagram',
    'facebook': 'facebook'
  };

  // Apply corrections
  Object.entries(corrections).forEach(([key, value]) => {
    const regex = new RegExp(key, 'gi');
    processed = processed.replace(regex, value);
  });

  // Capitalize first letter
  processed = processed.charAt(0).toUpperCase() + processed.slice(1);

  return processed;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  processVoiceCommand,
  validateVoiceInput,
  getSupportedLanguages,
  getVoiceCommandTips,
  preprocessVoiceText
};

