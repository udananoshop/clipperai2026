/**
 * MultiPlatformFormatter GPU Integration Test
 * Tests the GPU functions that are exported separately
 */

console.log('===========================================');
console.log('TESTING: MultiPlatformFormatter GPU Integration');
console.log('===========================================');

// Import both the singleton and the GPU functions
const formatter = require('./services/multiPlatformFormatter');
const { getSafeBitrate, buildFFmpegSettings, logGPUStatus, SAFE_BITRATE_PROFILES } = require('./services/multiPlatformFormatter');

async function runTests() {
  try {
    // Test 1: Get safe bitrate
    console.log('\n[TEST 1] Getting safe bitrate...');
    const bitrate = getSafeBitrate('youtube_landscape', 1080);
    console.log(`  - YouTube 1080p: ${bitrate}k`);
    
    const bitrate720 = getSafeBitrate('tiktok', 720);
    console.log(`  - TikTok 720p: ${bitrate720}k`);
    
    // Test 2: Build FFmpeg settings (GPU mode)
    console.log('\n[TEST 2] Building FFmpeg settings (GPU mode)...');
    const gpuSettings = buildFFmpegSettings({
      platform: 'youtube_landscape',
      height: 1080,
      memoryMode: 'normal'
    });
    console.log('  GPU Settings:', JSON.stringify(gpuSettings, null, 2));
    
    // Test 3: Build FFmpeg settings (CPU fallback mode)
    console.log('\n[TEST 3] Building FFmpeg settings (CPU fallback)...');
    const cpuSettings = buildFFmpegSettings({
      platform: 'tiktok',
      height: 720,
      memoryMode: 'low'  // Force CPU mode
    });
    console.log('  CPU Settings:', JSON.stringify(cpuSettings, null, 2));
    
    // Test 4: Log GPU status
    console.log('\n[TEST 4] Logging GPU status...');
    logGPUStatus();
    
    // Test 5: Check SAFE_BITRATE_PROFILES
    console.log('\n[TEST 5] Safe Bitrate Profiles...');
    console.log('  YouTube:', SAFE_BITRATE_PROFILES.youtube);
    console.log('  TikTok:', SAFE_BITRATE_PROFILES.tiktok);
    console.log('  Instagram:', SAFE_BITRATE_PROFILES.instagram);
    
    // Test 6: Verify singleton still works
    console.log('\n[TEST 6] Checking singleton still works...');
    const specs = formatter.getPlatformSpecs();
    console.log('  - getPlatformSpecs():', Object.keys(specs).length, 'platforms');
    
    console.log('\n===========================================');
    console.log('MultiPlatformFormatter Tests: PASSED');
    console.log('===========================================');
    
  } catch (error) {
    console.error('\n[ERROR] Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
