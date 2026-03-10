/**
 * CONTENT QUEUE
 * In-memory queue system for managing content posts
 * 
 * Structure:
 * - clipId
 * - platform
 * - title
 * - caption
 * - hashtags
 * - scheduledTime
 * - status
 * 
 * Statuses:
 * - pending
 * - scheduled
 * - posted
 * 
 * Constraints (8GB RAM):
 * - Max 2 concurrent scheduling jobs
 */

// Queue storage
let contentQueue = [];
let queueIdCounter = Date.now();

// Queue configuration
const CONFIG = {
  maxConcurrentJobs: 2,
  maxQueueSize: 1000,
  autoCleanupDays: 7
};

// Active jobs tracking
let activeJobs = new Map();
let completedJobs = [];

// Generate unique queue ID
function generateQueueId() {
  return `queue_${++queueIdCounter}_${Date.now()}`;
}

/**
 * Add content to the queue
 * 
 * @param {Object} content - Content to add
 * @returns {Object} Queued content
 */
function addToQueue(content) {
  const {
    clipId,
    platform,
    title = '',
    caption = '',
    hashtags = [],
    scheduledTime = null,
    metadata = {}
  } = content;
  
  // Check queue size limit
  if (contentQueue.length >= CONFIG.maxQueueSize) {
    // Remove oldest completed entries
    cleanupOldEntries();
    
    if (contentQueue.length >= CONFIG.maxQueueSize) {
      throw new Error('Queue is full. Please try again later.');
    }
  }
  
  const queuedItem = {
    id: generateQueueId(),
    clipId,
    platform,
    title,
    caption,
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    scheduledTime,
    status: 'pending', // pending, scheduled, posted, failed
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt: scheduledTime ? new Date(scheduledTime).toISOString() : null,
    postedAt: null,
    metadata
  };
  
  contentQueue.push(queuedItem);
  
  return queuedItem;
}

/**
 * Get queue contents with optional filters
 * 
 * @param {Object} filters - Filter options
 * @returns {Array} Queue contents
 */
function getQueue(filters = {}) {
  let queue = [...contentQueue];
  
  if (filters.status) {
    queue = queue.filter(item => item.status === filters.status);
  }
  
  if (filters.platform) {
    queue = queue.filter(item => item.platform === filters.platform);
  }
  
  if (filters.clipId) {
    queue = queue.filter(item => item.clipId === filters.clipId);
  }
  
  // Sort by created date (newest first)
  queue.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  if (filters.limit) {
    queue = queue.slice(0, filters.limit);
  }
  
  return queue;
}

/**
 * Get item by ID
 * 
 * @param {string} id - Queue item ID
 * @returns {Object|null} Queue item or null
 */
function getQueueItem(id) {
  return contentQueue.find(item => item.id === id) || null;
}

/**
 * Update queue item
 * 
 * @param {string} id - Queue item ID
 * @param {Object} updates - Updates to apply
 * @returns {Object|null} Updated item or null
 */
function updateQueueItem(id, updates) {
  const index = contentQueue.findIndex(item => item.id === id);
  
  if (index === -1) {
    return null;
  }
  
  contentQueue[index] = {
    ...contentQueue[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  return contentQueue[index];
}

/**
 * Update item status
 * 
 * @param {string} id - Queue item ID
 * @param {string} status - New status
 * @returns {Object|null} Updated item or null
 */
function updateStatus(id, status) {
  const updates = { status };
  
  if (status === 'posted') {
    updates.postedAt = new Date().toISOString();
  }
  
  return updateQueueItem(id, updates);
}

/**
 * Remove item from queue
 * 
 * @param {string} id - Queue item ID
 * @returns {boolean} Success
 */
function removeFromQueue(id) {
  const index = contentQueue.findIndex(item => item.id === id);
  
  if (index === -1) {
    return false;
  }
  
  contentQueue.splice(index, 1);
  return true;
}

/**
 * Get pending items
 * 
 * @param {string} platform - Optional platform filter
 * @returns {Array} Pending items
 */
function getPendingItems(platform = null) {
  let items = contentQueue.filter(item => item.status === 'pending');
  
  if (platform) {
    items = items.filter(item => item.platform === platform);
  }
  
  return items;
}

/**
 * Get scheduled items (ready to post)
 * 
 * @returns {Array} Scheduled items
 */
function getScheduledItems() {
  const now = new Date();
  
  return contentQueue.filter(item => {
    if (item.status !== 'pending' && item.status !== 'scheduled') {
      return false;
    }
    
    if (!item.scheduledTime) {
      return true;
    }
    
    return new Date(item.scheduledTime) <= now;
  });
}

/**
 * Get posted items
 * 
 * @param {number} limit - Limit results
 * @returns {Array} Posted items
 */
function getPostedItems(limit = 50) {
  return contentQueue
    .filter(item => item.status === 'posted')
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    .slice(0, limit);
}

/**
 * Get queue statistics
 * 
 * @returns {Object} Queue stats
 */
function getQueueStats() {
  const now = new Date();
  
  const stats = {
    total: contentQueue.length,
    pending: contentQueue.filter(item => item.status === 'pending').length,
    scheduled: contentQueue.filter(item => item.status === 'scheduled').length,
    posted: contentQueue.filter(item => item.status === 'posted').length,
    failed: contentQueue.filter(item => item.status === 'failed').length,
    byPlatform: {},
    nextUpload: null,
    activeJobs: activeJobs.size
  };
  
  // Count by platform
  const platforms = ['tiktok', 'instagram', 'youtube', 'facebook'];
  for (const platform of platforms) {
    stats.byPlatform[platform] = contentQueue.filter(
      item => item.platform === platform && item.status !== 'posted'
    ).length;
  }
  
  // Get next scheduled upload
  const nextItem = contentQueue
    .filter(item => item.status === 'pending' && item.scheduledTime)
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))[0];
  
  if (nextItem) {
    stats.nextUpload = {
      id: nextItem.id,
      platform: nextItem.platform,
      scheduledTime: nextItem.scheduledTime,
      timeUntil: Math.max(0, new Date(nextItem.scheduledTime) - now)
    };
  }
  
  return stats;
}

/**
 * Start processing a queue item
 * 
 * @param {string} id - Queue item ID
 * @returns {Object|null} Processing item or null
 */
function startProcessing(id) {
  // Check concurrent job limit
  if (activeJobs.size >= CONFIG.maxConcurrentJobs) {
    return { error: 'Max concurrent jobs reached', code: 'MAX_JOBS' };
  }
  
  const item = contentQueue.find(item => item.id === id);
  
  if (!item) {
    return { error: 'Item not found', code: 'NOT_FOUND' };
  }
  
  if (item.status === 'posted') {
    return { error: 'Already posted', code: 'ALREADY_POSTED' };
  }
  
  // Mark as scheduled (processing)
  updateStatus(id, 'scheduled');
  
  // Track active job
  activeJobs.set(id, {
    startTime: Date.now(),
    item
  });
  
  return { success: true, item };
}

/**
 * Complete processing
 * 
 * @param {string} id - Queue item ID
 * @param {boolean} success - Whether processing was successful
 * @returns {Object|null} Completed item or null
 */
function completeProcessing(id, success = true) {
  activeJobs.delete(id);
  
  const newStatus = success ? 'posted' : 'failed';
  
  return updateStatus(id, newStatus);
}

/**
 * Cancel processing
 * 
 * @param {string} id - Queue item ID
 * @returns {Object|null} Cancelled item or null
 */
function cancelProcessing(id) {
  activeJobs.delete(id);
  return updateStatus(id, 'pending');
}

/**
 * Get active jobs
 * 
 * @returns {Array} Active jobs
 */
function getActiveJobs() {
  return Array.from(activeJobs.entries()).map(([id, job]) => ({
    id,
    startTime: job.startTime,
    duration: Date.now() - job.startTime,
    item: job.item
  }));
}

/**
 * Clean up old completed entries
 * 
 * @param {number} keepDays - Days to keep
 * @returns {number} Number of entries removed
 */
function cleanupOldEntries(keepDays = CONFIG.autoCleanupDays) {
  const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
  
  const before = contentQueue.length;
  
  contentQueue = contentQueue.filter(item => {
    if (item.status === 'posted') {
      const postedAt = new Date(item.postedAt).getTime();
      return postedAt > cutoff;
    }
    return true;
  });
  
  return before - contentQueue.length;
}

/**
 * Clear entire queue
 * 
 * @returns {number} Number of items cleared
 */
function clearQueue() {
  const count = contentQueue.length;
  contentQueue = [];
  return count;
}

/**
 * Get queue item by clip ID
 * 
 * @param {string} clipId - Clip ID
 * @returns {Array} Queue items for this clip
 */
function getItemsByClipId(clipId) {
  return contentQueue.filter(item => item.clipId === clipId);
}

/**
 * Reschedule an item
 * 
 * @param {string} id - Queue item ID
 * @param {string} newTime - New scheduled time
 * @returns {Object|null} Updated item or null
 */
function rescheduleItem(id, newTime) {
  return updateQueueItem(id, {
    scheduledTime: newTime,
    status: 'pending'
  });
}

/**
 * Retry a failed item
 * 
 * @param {string} id - Queue item ID
 * @returns {Object|null} Updated item or null
 */
function retryItem(id) {
  const item = contentQueue.find(item => item.id === id);
  
  if (!item || item.status !== 'failed') {
    return null;
  }
  
  return updateStatus(id, 'pending');
}

/**
 * Bulk add items to queue
 * 
 * @param {Array} items - Items to add
 * @returns {Array} Added items
 */
function bulkAdd(items) {
  const added = [];
  
  for (const item of items) {
    try {
      const queued = addToQueue(item);
      added.push(queued);
    } catch (error) {
      console.error('Error adding item to queue:', error.message);
    }
  }
  
  return added;
}

/**
 * Get next available slot for a platform
 * 
 * @param {string} platform - Platform name
 * @returns {Object|null} Next slot or null
 */
function getNextSlot(platform) {
  const pending = contentQueue
    .filter(item => item.platform === platform && item.status !== 'posted')
    .sort((a, b) => new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0));
  
  if (pending.length === 0) {
    return null;
  }
  
  return {
    item: pending[0],
    queuePosition: 1,
    totalInQueue: pending.length
  };
}

module.exports = {
  // Queue operations
  addToQueue,
  getQueue,
  getQueueItem,
  updateQueueItem,
  updateStatus,
  removeFromQueue,
  
  // Status queries
  getPendingItems,
  getScheduledItems,
  getPostedItems,
  getItemsByClipId,
  
  // Processing
  startProcessing,
  completeProcessing,
  cancelProcessing,
  getActiveJobs,
  
  // Management
  getQueueStats,
  cleanupOldEntries,
  clearQueue,
  rescheduleItem,
  retryItem,
  bulkAdd,
  getNextSlot,
  
  // Configuration
  CONFIG
};

