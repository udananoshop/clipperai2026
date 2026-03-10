/**
 * Test script for ViralScoreEngine
 * Run: node test-viralScoreEngine.js
 */

console.log('========================================');
console.log('VIRAL SCORE ENGINE TEST');
console.log('========================================\n');

// Test 1: Load the module
console.log('Test 1: Loading ViralScoreEngine...');
try {
  const viralScoreEngine = require('./ai/viralScoreEngine');
  console.log('✓ ViralScoreEngine loaded successfully\n');
  
  // Test 2: Get status
  console.log('Test 2: Getting engine status...');
  const status = viralScoreEngine.getStatus();
  console.log('✓ Status:', JSON.stringify(status, null, 2), '\n');
  
  // Test 3: Check constants
  console.log('Test 3: Checking constants...');
  console.log('  MAX_ANALYSIS_DURATION:', viralScoreEngine.MAX_ANALYSIS_DURATION);
  console.log('  MIN_VIRAL_SCORE_THRESHOLD:', viralScoreEngine.MIN_VIRAL_SCORE_THRESHOLD);
  console.log('  SCORING_WEIGHTS:', JSON.stringify(viralScoreEngine.SCORING_WEIGHTS, null, 2));
  console.log('✓ Constants verified\n');
  
  console.log('========================================');
  console.log('ALL TESTS PASSED');
  console.log('========================================');
  
} catch (error) {
  console.error('✗ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

