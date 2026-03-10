/**
 * Processing Status Middleware
 * Stores video processing status in memory Map
 * No database changes - pure in-memory storage
 */

// In-memory Map to store video processing status
const processingStatusMap = new Map();

/**
 * ProcessingStatus - singleton object to manage video processing states
 */
const ProcessingStatus = {
  /**
   * Set processing status for a video
   * @param {number|string} videoId 
   * @param {string} status - 'processing' | 'ready' | 'failed'
   */
  setStatus(videoId, status) {
    const key = String(videoId);
    processingStatusMap.set(key, {
      status,
      timestamp: Date.now()
    });
  },

  /**
   * Get processing status for a video
   * @param {number|string} videoId 
   * @returns {string} status - 'processing' | 'ready' | 'failed'
   */
  getStatus(videoId) {
    const key = String(videoId);
    const data = processingStatusMap.get(key);
    
    if (!data) {
      // Default to 'ready' if no status found (video already processed)
      return 'ready';
    }
    
    return data.status;
  },

  markProcessing(videoId) {
    this.setStatus(videoId, 'processing');
  },

  markReady(videoId) {
    this.setStatus(videoId, 'ready');
  },

  markFailed(videoId) {
    this.setStatus(videoId, 'failed');
  },

  getAllStatuses() {
    return Object.fromEntries(processingStatusMap);
  },

  clearStatus(videoId) {
    const key = String(videoId);
    processingStatusMap.delete(key);
  }
};

/**
 * Express middleware to get processing status
 */
const getProcessingStatus = (req, res) => {
  try {
    const { id } = req.params;
    const status = ProcessingStatus.getStatus(id);
    
    res.json({
      success: true,
      data: {
        videoId: id,
        status,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    // Never crash - return safe default
    res.json({
      success: true,
      data: {
        videoId: req.params.id,
        status: 'ready',
        timestamp: Date.now()
      }
    });
  }
};

// Export as function for middleware usage (required for app.use())
module.exports = getProcessingStatus;

// Also attach ProcessingStatus for direct usage
module.exports.ProcessingStatus = ProcessingStatus;
