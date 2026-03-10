// Test script for multilingual AI chat
const { detectLanguage } = require('./services/aiChatService');

console.log('=== Language Detection Tests ===\n');

// Test Indonesian messages
console.log('Indonesian tests:');
console.log('  "kamu bisa balas bahasa indonesia?" ->', detectLanguage('kamu bisa balas bahasa indonesia?'));
console.log('  "apa yang trending?" ->', detectLanguage('apa yang trending?'));
console.log('  "bagaimana kinerja tim hari ini?" ->', detectLanguage('bagaimana kinerja tim hari ini?'));
console.log('  "tolong jelaskan analytics" ->', detectLanguage('tolong jelaskan analytics'));
console.log('  "berapa total video?" ->', detectLanguage('berapa total video?'));

// Test English messages
console.log('\nEnglish tests:');
console.log('  "which video is trending?" ->', detectLanguage('which video is trending?'));
console.log('  "hello there" ->', detectLanguage('hello there'));
console.log('  "show my analytics" ->', detectLanguage('show my analytics'));
console.log('  "what should we upload?" ->', detectLanguage('what should we upload?'));

console.log('\n=== All tests completed ===');

