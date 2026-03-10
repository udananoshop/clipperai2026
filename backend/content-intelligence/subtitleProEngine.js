/**
 * Subtitle Pro Engine
 * Generate styled subtitle metadata
 */

const QUESTION_WORDS = ['apa', 'bagaimana', 'kenapa', 'siapa', 'dimana', 'kapan', 'mengapa', 'how', 'what', 'why', 'who', 'when', 'where', '?', '?'];

const POWER_WORDS = ['secret', 'rahasia', 'shock', 'gagal', '90%', '100%', 'tips', 'hack', 'jitu', 'ampuh', 'super', 'gila', 'luar biasa', 'tak terduga', 'hidden', 'revealed', 'finally', 'finally'];

const EMOTION_WORDS = ['bangga', 'sedih', 'marah', 'takut', 'happy', 'sad', 'angry', 'fear', 'love', 'hate', 'excited', 'amazing', 'terrible', 'horrible', 'wow', 'omg', 'wah', ' Subhanallah', 'mashallah', 'astaghfirullah'];

function analyzeTextStyle(word = '') {
  const lower = word.toLowerCase().trim();
  
  if (QUESTION_WORDS.some(q => lower.includes(q))) {
    return { word, color: 'blue', emphasis: false };
  }
  
  if (POWER_WORDS.some(p => lower.includes(p))) {
    return { word, color: 'yellow', emphasis: true };
  }
  
  if (EMOTION_WORDS.some(e => lower.includes(e))) {
    return { word, color: 'red', emphasis: true };
  }
  
  return { word, color: 'white', emphasis: false };
}

function generateAnimatedSubtitle(transcript = '') {
  if (!transcript) return [];
  
  const words = transcript.split(/\s+/);
  return words.map(analyzeTextStyle);
}

function autoLineBreak(words = [], maxWordsPerLine = 6) {
  if (!words || words.length === 0) return [];
  
  const result = [];
  const wordList = Array.isArray(words) ? words : transcript.split(/\s+/);
  
  if (wordList.length <= maxWordsPerLine) {
    return [wordList.join(' ')];
  }
  
  let currentLine = [];
  
  for (let i = 0; i < wordList.length; i++) {
    currentLine.push(wordList[i]);
    
    if (currentLine.length >= maxWordsPerLine) {
      if (i < wordList.length - 1) {
        result.push(currentLine.join(' '));
        currentLine = [];
      }
    }
  }
  
  if (currentLine.length > 0) {
    if (currentLine.length === 1 && result.length > 0) {
      const lastLine = result[result.length - 1].split(' ');
      if (lastLine.length > 1) {
        lastLine.pop();
        result[result.length - 1] = lastLine.join(' ');
        currentLine = [wordList[wordList.length - 1]];
      }
    }
    result.push(currentLine.join(' '));
  }
  
  return result;
}

module.exports = {
  analyzeTextStyle,
  generateAnimatedSubtitle,
  autoLineBreak,
  QUESTION_WORDS,
  POWER_WORDS,
  EMOTION_WORDS
};
