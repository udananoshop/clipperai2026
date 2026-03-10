/**
 * LIVE AI STATE ENGINE
 * Singleton state for real-time AI processing updates
 * RAM safe - no memory leaks
 */

// Singleton state - persists while server runs
let liveState = {
  progress: 0,
  confidence: 0,
  predictions: 0,
  creditsUsed: 0,
  status: "idle", // "idle" | "processing" | "completed"
  currentMessage: "Ready for processing"
};

// Processing interval reference
let processingInterval = null;

// Status messages for processing
const processingMessages = [
  "Analyzing Video Pattern...",
  "Detecting Viral Segments...",
  "Optimizing Engagement Score...",
  "Generating Multi-Platform Clips...",
  "Finalizing Smart Render..."
];

/**
 * Get current live state (lightweight)
 */
function getLiveState() {
  return { ...liveState };
}

/**
 * Start new processing job
 * Initializes state and starts interval
 */
function startProcessing() {
  // Clear any existing interval first
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  
  // Reset state for new job
  liveState = {
    progress: 0,
    confidence: 5,
    predictions: 0,
    creditsUsed: 0,
    status: "processing",
    currentMessage: "Analyzing Video Pattern..."
  };
  
  // Start interval - 1500ms to 2000ms
  processingInterval = setInterval(() => {
    // Check if completed
    if (liveState.progress >= 100) {
      completeProcessing();
      return;
    }
    
    // Update progress
    const progressIncrement = Math.floor(Math.random() * (8 - 4 + 1)) + 4;
    liveState.progress = Math.min(liveState.progress + progressIncrement, 100);
    
    // Confidence follows progress + small random
    const confidenceIncrement = Math.floor(Math.random() * 10);
    liveState.confidence = Math.min(liveState.confidence + confidenceIncrement, 100);
    
    // Predictions increase
    const predIncrement = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
    liveState.predictions += predIncrement;
    
    // Credits increase
    const creditIncrement = Math.floor(Math.random() * (5 - 2 + 1)) + 2;
    liveState.creditsUsed += creditIncrement;
    
    // Update message every ~3 seconds (based on progress)
    const messageIndex = Math.floor(liveState.progress / 25) % processingMessages.length;
    liveState.currentMessage = processingMessages[messageIndex];
    
  }, 1500 + Math.floor(Math.random() * 500)); // 1500-2000ms
}

/**
 * Complete processing
 */
function completeProcessing() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  
  liveState.progress = 100;
  liveState.confidence = 100;
  liveState.status = "completed";
  liveState.currentMessage = "Processing Complete";
  
  // Auto-reset to idle after 3 seconds
  setTimeout(() => {
    if (liveState.status === "completed") {
      liveState.status = "idle";
      liveState.currentMessage = "Ready for processing";
    }
  }, 3000);
}

/**
 * Stop processing
 */
function stopProcessing() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  
  liveState.status = "idle";
  liveState.currentMessage = "Ready for processing";
}

/**
 * Reset state
 */
function resetState() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  
  liveState = {
    progress: 0,
    confidence: 0,
    predictions: 0,
    creditsUsed: 0,
    status: "idle",
    currentMessage: "Ready for processing"
  };
}

module.exports = {
  getLiveState,
  startProcessing,
  stopProcessing,
  resetState,
  completeProcessing
};
