const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Add the execution mode endpoint after the safeguard layer logs
const searchText = `// Log safeguard layer status
try {
  const resourceMonitor = require('./core/resourceMonitor');
  console.log('[System] Safeguard Layer: ENABLED');
  console.log(\`[System] Memory Threshold: \${resourceMonitor.config.MEMORY_CRITICAL_THRESHOLD}%\`);
  console.log(\`[System] CPU Threshold: \${resourceMonitor.config.CPU_CRITICAL_THRESHOLD}%\`);
} catch (err) {
  console.log('[System] Safeguard Layer: Disabled (not available)');
}`;

// Add the execution mode endpoint and logs
const replaceText = `// Log safeguard layer status
try {
  const resourceMonitor = require('./core/resourceMonitor');
  console.log('[System] Safeguard Layer: ENABLED');
  console.log(\`[System] Memory Threshold: \${resourceMonitor.config.MEMORY_CRITICAL_THRESHOLD}%\`);
  console.log(\`[System] CPU Threshold: \${resourceMonitor.config.CPU_CRITICAL_THRESHOLD}%\`);
} catch (err) {
  console.log('[System] Safeguard Layer: Disabled (not available)');
}

// OVERLORD PRO MODE - Final Phase - Adaptive Execution Endpoint
// GET /api/system/execution-mode
app.get('/api/system/execution-mode', (req, res) => {
  try {
    const processManager = require('./core/processManager');
    const concurrencyInfo = processManager.updateConcurrency();
    const mode = processManager.getExecutionMode();
    
    res.json({
      success: true,
      mode,
      concurrency: concurrencyInfo.concurrency,
      baseConcurrency: concurrencyInfo.baseConcurrency,
      cpuLoad: concurrencyInfo.cpuLoad,
      memoryUsage: concurrencyInfo.memoryUsage
    });
  } catch (err) {
    console.error('[System] Get execution mode error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get execution mode' });
  }
});

// Log adaptive execution status
try {
  const processManager = require('./core/processManager');
  const baseConcurrency = processManager.getMaxConcurrentJobs();
  console.log('[System] Adaptive Execution: ENABLED');
  console.log(\`[System] Base Concurrency: \${baseConcurrency}\`);
  processManager.updateConcurrency();
} catch (err) {
  console.log('[System] Adaptive Execution: Disabled (not available)');
}`;

serverJs = serverJs.replace(searchText, replaceText);
fs.writeFileSync('server.js', serverJs);
console.log('Execution mode endpoint added successfully');
