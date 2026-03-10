/**
 * Overlord AI Core - Test Script
 * Tests the new services and command parser
 */

console.log('Testing Overlord AI Core services...\n');

try {
  // Test CommandParser with various commands
  const commandParser = require('./services/commandParserService');
  
  console.log('=== Testing Command Parser ===\n');
  
  // Test cases from requirements
  const testCases = [
    { cmd: 'buat 10 clip', expected: 'clip_generation' },
    { cmd: 'generate video ideas', expected: 'content_ideas' },
    { cmd: 'buat caption viral', expected: 'caption_generation' },
    { cmd: 'buat hashtag youtube', expected: 'hashtag_generation' },
    { cmd: 'analyze video performance', expected: 'video_analysis' },
    { cmd: 'show analytics', expected: 'analytics' },
    { cmd: 'growth strategy', expected: 'growth_strategy' },
    { cmd: 'viral prediction', expected: 'viral_prediction' },
    { cmd: 'create 5 clips from video', expected: 'clip_generation' },
    { cmd: 'generate 20 ideas', expected: 'content_ideas' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    const result = commandParser.parseCommand(test.cmd);
    const status = result.task === test.expected ? '✓' : '✗';
    console.log(`${status} "${test.cmd}"`);
    console.log(`  Expected: ${test.expected}, Got: ${result.task}`);
    if (result.params) {
      console.log(`  Params:`, result.params);
    }
    if (result.task === test.expected) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  
  console.log('=== Testing Other Services ===\n');
  
  // Test ContentFactory
  const contentFactory = require('./services/contentFactoryService');
  console.log('✓ ContentFactory: module loaded');

  console.log('');
  
  // Test TaskExecution
  const taskExecutor = require('./services/taskExecutionService');
  console.log('✓ TaskExecutor: module loaded');

  console.log('');
  
  // Test VoiceCommand
  const voiceCommand = require('./services/voiceCommandService');
  console.log('✓ VoiceCommand: module loaded');

  console.log('');
  
  // Test OverlordCore
  const overlordCore = require('./services/overlordCoreService');
  console.log('✓ OverlordCore: module loaded');
  
  const status = overlordCore.getStatus();
  console.log('  Status:', status.status);
  console.log('  Features:', status.features.length);

  console.log('\n========================================');
  console.log('All Overlord AI Core services loaded successfully!');
  console.log('========================================\n');
  
} catch (error) {
  console.error('Error loading services:', error.message);
  process.exit(1);
}

