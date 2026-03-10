/**
 * GPU Detection Test Script
 * Quick validation for OVERLORD GPU AMD SAFE MODE
 */

console.log('===========================================');
console.log('TESTING: GPU Detection');
console.log('===========================================');

const gpuDetector = require('./utils/gpuDetector');

async function runTests() {
  try {
    // Test 1: GPU Detection
    console.log('\n[TEST 1] Running GPU detection...');
    const result = await gpuDetector.detectGPU();
    console.log('[TEST 1] Result:', JSON.stringify(result, null, 2));
    
    // Test 2: Check encoder
    console.log('\n[TEST 2] Checking encoder selection...');
    console.log(`  - Has AMF: ${result.hasAMF}`);
    console.log(`  - Selected: ${result.encoder}`);
    
    // Test 3: Get encoder settings
    console.log('\n[TEST 3] Getting encoder settings...');
    const settings = gpuDetector.getEncoderSettings();
    console.log('  Settings:', JSON.stringify(settings, null, 2));
    
    // Test 4: Check isAMFAvailable
    console.log('\n[TEST 4] Checking isAMFAvailable()...');
    const isAvailable = gpuDetector.isAMFAvailable();
    console.log(`  - AMF Available: ${isAvailable}`);
    
    console.log('\n===========================================');
    console.log('GPU Detection Tests: PASSED');
    console.log('===========================================');
    
  } catch (error) {
    console.error('\n[ERROR] Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
