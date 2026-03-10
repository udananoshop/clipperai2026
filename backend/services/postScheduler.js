/**
 * POST SCHEDULER
 * Schedule content for best engagement times
 * 
 * Default schedule:
 * TikTok: 12:00, 18:00, 21:00
 * Instagram: 11:00, 19:00
 * YouTube Shorts: 13:00, 20:00
 * Facebook: 14:00, 21:00
 * 
 * Constraints:
 * - Max 2 concurrent scheduling jobs (8GB RAM)
 * - Queue clips automatically after generation
 */

// Platform-specific best engagement times (in hours, 24h format)
const PLATFORM_SCHEDULES = {
  tiktok: {
    bestTimes: [12, 18, 21], // 12:00, 18:00, 21:00
    timezone: 'UTC',
    description: 'TikTok optimal posting times'
  },
  instagram: {
    bestTimes: [11, 19], // 11:00, 19:00
    timezone: 'UTC',
    description: 'Instagram optimal posting times'
  },
  youtube: {
    bestTimes: [13, 20], // 13:00, 20:00
    timezone: 'UTC',
    description: 'YouTube Shorts optimal posting times'
  },
  facebook: {
    bestTimes: [14, 21], // 14:00, 21:00
    timezone: 'UTC',
    description: 'Facebook Reels optimal posting times'
  }
};

// Timezone offsets (can be customized)
const TIMEZONE_OFFSETS = {
  'UTC': 0,
  'EST': -5,
  'PST': -8,
  'CET': 1,
  'WIB': 7, // Indonesia
  'WIT': 9  // Japan/Korea
};

// In-memory queue for scheduled posts (can be persisted to DB)
let scheduledPosts = [];
let postIdCounter = Date.now();

// Utility functions
function generatePostId() {
  return `post_${++postIdCounter}_${Date.now()}`;
}

function getCurrentUTCHour() {
  return new Date().getUTCHours();
}

function addHoursToDate(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatTime(hour) {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function formatDateTime(date) {
  return date.toISOString().replace('T', ' ').substring(0, 16);
}

/**
 * Get the next best posting time for a platform
 * 
 * @param {string} platform - Platform name
 * @param {Date} fromDate - Starting date (default: now)
 * @returns {Date} Next best posting time
 */
function getNextBestTime(platform, fromDate = new Date()) {
  const schedule = PLATFORM_SCHEDULES[platform] || PLATFORM_SCHEDULES.tiktok;
  const bestTimes = schedule.bestTimes;
  
  let candidateTime = new Date(fromDate);
  candidateTime.setUTCMinutes(0, 0, 0);
  
  // Try to find the next best time today
  const currentHour = candidateTime.getUTCHours();
  
  for (const hour of bestTimes) {
    if (hour > currentHour) {
      candidateTime.setUTCHours(hour);
      return candidateTime;
    }
  }
  
  // If no time today, get the first time tomorrow
  candidateTime.setDate(candidateTime.getDate() + 1);
  candidateTime.setUTCHours(bestTimes[0]);
  
  return candidateTime;
}

/**
 * Get all available schedule slots for a platform
 * 
 * @param {string} platform - Platform name
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Available time slots
 */
function getScheduleSlots(platform, days = 7) {
  const schedule = PLATFORM_SCHEDULES[platform] || PLATFORM_SCHEDULES.tiktok;
  const bestTimes = schedule.bestTimes;
  const slots = [];
  
  const startDate = new Date();
  startDate.setUTCMinutes(0, 0, 0);
  
  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    
    for (const hour of bestTimes) {
      const slotTime = new Date(date);
      slotTime.setUTCHours(hour);
      
      // Only add future slots
      if (slotTime > new Date()) {
        slots.push({
          datetime: formatDateTime(slotTime),
          timestamp: slotTime.getTime(),
          platform,
          available: true
        });
      }
    }
  }
  
  return slots;
}

/**
 * Schedule a post for a specific platform
 * 
 * @param {Object} options - Post options
 * @param {string} options.clipId - Clip ID
 * @param {string} options.platform - Platform (tiktok, instagram, youtube, facebook)
 * @param {string} options.title - Post title
 * @param {string} options.caption - Post caption
 * @param {Array} options.hashtags - Hashtags
 * @param {string} options.scheduledTime - Optional specific time (ISO string)
 * @returns {Object} Scheduled post object
 */
function schedulePost(options = {}) {
  const {
    clipId,
    platform = 'tiktok',
    title = '',
    caption = '',
    hashtags = [],
    scheduledTime = null,
    status = 'pending'
  } = options;
  
  // Determine scheduled time
  let scheduleTime;
  if (scheduledTime) {
    scheduleTime = new Date(scheduledTime);
  } else {
    scheduleTime = getNextBestTime(platform);
  }
  
  const post = {
    id: generatePostId(),
    clipId,
    platform,
    title,
    caption,
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    scheduledTime: formatDateTime(scheduleTime),
    scheduledTimestamp: scheduleTime.getTime(),
    status, // pending, scheduled, posted, failed
    createdAt: new Date().toISOString(),
    postedAt: null,
    engagement: null
  };
  
  // Add to scheduled posts
  scheduledPosts.push(post);
  
  // Sort by scheduled time
  scheduledPosts.sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp);
  
  return post;
}

/**
 * Schedule posts for multiple platforms
 * 
 * @param {Object} options - Post options
 * @returns {Array} Array of scheduled posts
 */
function scheduleMultiPlatform(options = {}) {
  const { platforms = ['tiktok', 'instagram', 'youtube', 'facebook'], ...postOptions } = options;
  
  const posts = [];
  
  for (const platform of platforms) {
    const post = schedulePost({
      ...postOptions,
      platform
    });
    posts.push(post);
  }
  
  return posts;
}

/**
 * Get all scheduled posts
 * 
 * @param {Object} filters - Optional filters
 * @returns {Array} Scheduled posts
 */
function getScheduledPosts(filters = {}) {
  let posts = [...scheduledPosts];
  
  if (filters.platform) {
    posts = posts.filter(p => p.platform === filters.platform);
  }
  
  if (filters.status) {
    posts = posts.filter(p => p.status === filters.status);
  }
  
  if (filters.clipId) {
    posts = posts.filter(p => p.clipId === filters.clipId);
  }
  
  return posts;
}

/**
 * Get upcoming posts (pending/scheduled)
 * 
 * @param {number} limit - Number of posts to return
 * @returns {Array} Upcoming posts
 */
function getUpcomingPosts(limit = 10) {
  const now = Date.now();
  
  return scheduledPosts
    .filter(p => p.status === 'pending' || p.status === 'scheduled')
    .filter(p => p.scheduledTimestamp > now)
    .slice(0, limit);
}

/**
 * Get next post to be published
 * 
 * @returns {Object|null} Next post or null
 */
function getNextPost() {
  const now = Date.now();
  
  const next = scheduledPosts.find(p => 
    (p.status === 'pending' || p.status === 'scheduled') && 
    p.scheduledTimestamp > now
  );
  
  return next || null;
}

/**
 * Update post status
 * 
 * @param {string} postId - Post ID
 * @param {string} status - New status
 * @returns {Object|null} Updated post or null
 */
function updatePostStatus(postId, status) {
  const post = scheduledPosts.find(p => p.id === postId);
  
  if (post) {
    post.status = status;
    
    if (status === 'posted') {
      post.postedAt = new Date().toISOString();
    }
    
    return post;
  }
  
  return null;
}

/**
 * Cancel a scheduled post
 * 
 * @param {string} postId - Post ID
 * @returns {boolean} Success
 */
function cancelPost(postId) {
  const index = scheduledPosts.findIndex(p => p.id === postId);
  
  if (index !== -1) {
    scheduledPosts[index].status = 'cancelled';
    return true;
  }
  
  return false;
}

/**
 * Get posts due for publishing
 * 
 * @returns {Array} Posts ready to publish
 */
function getDuePosts() {
  const now = Date.now();
  
  return scheduledPosts.filter(p => 
    (p.status === 'pending' || p.status === 'scheduled') && 
    p.scheduledTimestamp <= now
  );
}

/**
 * Auto-queue clips after generation
 * 
 * @param {Object} clipData - Clip data from generation
 * @returns {Array} Scheduled posts
 */
function autoQueueClip(clipData) {
  const { clipId, title, caption, hashtags, platforms = ['tiktok', 'instagram', 'youtube', 'facebook'] } = clipData;
  
  // Generate viralScore if not provided (reuse from clip if available)
  const viralScore = clipData.viralScore || 70;
  
  // Get optimal times for each platform
  const posts = scheduleMultiPlatform({
    clipId,
    platforms,
    title,
    caption,
    hashtags,
    status: 'pending',
    viralScore
  });
  
  return posts;
}

/**
 * Get scheduler statistics
 * 
 * @returns {Object} Scheduler stats
 */
function getSchedulerStats() {
  const now = Date.now();
  
  const stats = {
    total: scheduledPosts.length,
    pending: scheduledPosts.filter(p => p.status === 'pending').length,
    scheduled: scheduledPosts.filter(p => p.status === 'scheduled').length,
    posted: scheduledPosts.filter(p => p.status === 'posted').length,
    failed: scheduledPosts.filter(p => p.status === 'failed').length,
    dueNow: scheduledPosts.filter(p => 
      (p.status === 'pending' || p.status === 'scheduled') && 
      p.scheduledTimestamp <= now
    ).length,
    byPlatform: {},
    nextPost: getNextPost()
  };
  
  // Count by platform
  for (const platform of Object.keys(PLATFORM_SCHEDULES)) {
    stats.byPlatform[platform] = scheduledPosts.filter(p => p.platform === platform).length;
  }
  
  return stats;
}

/**
 * Clear old posted entries
 * 
 * @param {number} keepDays - Number of days to keep
 * @returns {number} Number of entries removed
 */
function clearOldPosts(keepDays = 30) {
  const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
  
  const before = scheduledPosts.length;
  scheduledPosts = scheduledPosts.filter(p => 
    p.status !== 'posted' || 
    p.scheduledTimestamp > cutoff
  );
  
  return before - scheduledPosts.length;
}

/**
 * Process due posts (for cron job or interval)
 * 
 * @returns {Array} Posts that were processed
 */
function processDuePosts() {
  const duePosts = getDuePosts();
  const processed = [];
  
  for (const post of duePosts) {
    // Mark as scheduled (ready for publishing)
    post.status = 'scheduled';
    processed.push(post);
  }
  
  return processed;
}

/**
 * Get platform-specific schedule info
 * 
 * @param {string} platform - Platform name
 * @returns {Object} Schedule info
 */
function getPlatformSchedule(platform) {
  const schedule = PLATFORM_SCHEDULES[platform];
  
  if (!schedule) {
    return null;
  }
  
  return {
    platform,
    bestTimes: schedule.bestTimes.map(formatTime),
    nextBestTime: formatDateTime(getNextBestTime(platform)),
    description: schedule.description
  };
}

module.exports = {
  // Scheduling functions
  schedulePost,
  scheduleMultiPlatform,
  getScheduledPosts,
  getUpcomingPosts,
  getNextPost,
  updatePostStatus,
  cancelPost,
  getDuePosts,
  autoQueueClip,
  processDuePosts,
  
  // Utility functions
  getNextBestTime,
  getScheduleSlots,
  getSchedulerStats,
  clearOldPosts,
  getPlatformSchedule,
  
  // Configuration
  PLATFORM_SCHEDULES,
  TIMEZONE_OFFSETS
};

