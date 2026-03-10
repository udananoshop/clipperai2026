/**
 * Smart Hook Engine
 * Detect top viral segments from transcript + audio metrics
 */

const KEYWORDS = ['tips', ' rahasia', ' cara ', ' mistake', ' error', ' salah', 'gagal', 'tips', 'hack', 'jual', 'uang', 'duit', 'sukses', 'berhasil', 'download', 'gratis', 'free'];

const EMOTION_WORDS = ['shock', 'gila', 'luar biasa', 'Amazing', 'incredible', 'wow', 'terkejut', 'takjub', 'haram', 'subhanallah', 'mashallah', 'astaghfirullah', 'kaget', '惊喜', '厉害', '无敌', '爆笑', '崩溃'];

function calculateHookScore(segment = {}) {
  const { text = '', audioLevel = 0, speechRate = 0, pauseBefore = 0 } = segment;
  
  const textLower = text.toLowerCase();
  
  const audioSpike = Math.min(1, audioLevel / 100);
  
  const keywordMatch = KEYWORDS.some(kw => textLower.includes(kw)) ? 1 : 0;
  
  const emotionDensity = EMOTION_WORDS.some(ew => textLower.includes(ew)) ? 1 : 0;
  
  const speechSpeedDelta = speechRate > 150 ? 1 : (speechRate > 120 ? 0.5 : 0);
  
  const patternBreak = pauseBefore > 2 ? 1 : (pauseBefore > 1 ? 0.5 : 0);
  
  const hookScore = 
    (audioSpike * 0.3) +
    (keywordMatch * 0.25) +
    (emotionDensity * 0.2) +
    (speechSpeedDelta * 0.15) +
    (patternBreak * 0.1);
  
  return Math.round(hookScore * 100) / 100;
}

function detectTopHooks(segments = []) {
  const scored = segments.map(seg => ({
    ...seg,
    hookScore: calculateHookScore(seg)
  }));
  
  const valid = scored.filter(seg => {
    const duration = seg.endTime - seg.startTime;
    return duration >= 5 && duration <= 20;
  });
  
  valid.sort((a, b) => b.hookScore - a.hookScore);
  
  return valid.slice(0, 3);
}

module.exports = {
  calculateHookScore,
  detectTopHooks,
  KEYWORDS,
  EMOTION_WORDS
};
