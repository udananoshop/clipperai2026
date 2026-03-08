/**
 * ClipperAI2026 - AI Engine Service
 * Frontend service layer for AI video processing operations
 * Connects to backend API at http://localhost:3001/api/ai
 */

const API_BASE_URL = "http://localhost:3001/api/ai";

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem("token");
};

/**
 * Make authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.log("Session expired");
      localStorage.removeItem("token");
      window.location.href = "/login";
      return null;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    return data;
  } catch (error) {
    console.error(`API request error: ${endpoint}`, error);
    throw error;
  }
};

/**
 * Generate automatic clip from video
 * @param {Object} options - Clip generation options
 * @param {string} options.videoId - Video ID
 * @param {string} options.videoPath - Path to video file
 * @param {number} options.startTime - Start time in seconds
 * @param {number} options.endTime - End time in seconds
 * @param {boolean} options.generateHighlights - Whether to generate highlights
 * @param {string} options.aspectRatio - Aspect ratio (e.g., '9:16', '16:9')
 * @returns {Promise<Object>} - Job object with ID and status
 */
export const generateClip = async (options) => {
  const { videoId, videoPath, startTime, endTime, generateHighlights, aspectRatio } = options;
  
  return apiRequest("/generate", {
    method: "POST",
    body: JSON.stringify({
      videoId,
      videoPath,
      startTime: startTime || 0,
      endTime,
      generateHighlights: generateHighlights !== false,
      aspectRatio: aspectRatio || "9:16",
    }),
  });
};

/**
 * Inject soundtrack into video
 * @param {Object} options - Soundtrack options
 * @param {string} options.videoPath - Path to video file
 * @param {string} options.soundtrackUrl - URL to soundtrack file
 * @param {number} options.soundtrackVolume - Volume level (0-1)
 * @param {number} options.fadeIn - Fade in duration in seconds
 * @param {number} options.fadeOut - Fade out duration in seconds
 * @returns {Promise<Object>} - Job object with ID and status
 */
export const injectSoundtrack = async (options) => {
  const { videoPath, soundtrackUrl, soundtrackVolume, fadeIn, fadeOut } = options;
  
  return apiRequest("/soundtrack", {
    method: "POST",
    body: JSON.stringify({
      videoPath,
      soundtrackUrl,
      soundtrackVolume: soundtrackVolume || 0.5,
      fadeIn: fadeIn || 0,
      fadeOut: fadeOut || 0,
    }),
  });
};

/**
 * Apply transitions between clips
 * @param {Object} options - Transition options
 * @param {Array} options.clips - Array of clip objects
 * @param {string} options.transitionType - Type of transition (fade, dissolve, wipe, etc.)
 * @param {number} options.transitionDuration - Duration in seconds
 * @returns {Promise<Object>} - Job object with ID and status
 */
export const applyTransitions = async (options) => {
  const { clips, transitionType, transitionDuration } = options;
  
  return apiRequest("/transitions", {
    method: "POST",
    body: JSON.stringify({
      clips,
      transitionType: transitionType || "fade",
      transitionDuration: transitionDuration || 0.5,
    }),
  });
};

/**
 * Apply watermark/logo overlay to video
 * @param {Object} options - Watermark options
 * @param {string} options.videoPath - Path to video file
 * @param {string} options.watermarkType - Type of watermark (logo, text)
 * @param {string} options.watermarkUrl - URL to watermark file
 * @param {string} options.watermarkPosition - Position (top-left, top-right, bottom-left, bottom-right)
 * @param {number} options.watermarkOpacity - Opacity level (0-1)
 * @param {string} options.watermarkSize - Size (small, medium, large)
 * @returns {Promise<Object>} - Job object with ID and status
 */
export const applyWatermark = async (options) => {
  const { 
    videoPath, 
    watermarkType, 
    watermarkUrl, 
    watermarkPosition, 
    watermarkOpacity, 
    watermarkSize 
  } = options;
  
  return apiRequest("/watermark", {
    method: "POST",
    body: JSON.stringify({
      videoPath,
      watermarkType: watermarkType || "logo",
      watermarkUrl,
      watermarkPosition: watermarkPosition || "bottom-right",
      watermarkOpacity: watermarkOpacity || 0.8,
      watermarkSize: watermarkSize || "medium",
    }),
  });
};

/**
 * Render final video with all effects
 * @param {Object} options - Render options
 * @param {string} options.videoPath - Path to video file
 * @param {string} options.preset - Render preset (fast, quality, balanced)
 * @param {Object} options.watermark - Watermark options
 * @param {Object} options.soundtrack - Soundtrack options
 * @param {Array} options.transitions - Array of transitions
 * @param {string} options.quality - Quality setting (low, medium, high)
 * @returns {Promise<Object>} - Job object with ID and status
 */
export const renderVideo = async (options) => {
  const { 
    videoPath, 
    preset, 
    watermark, 
    soundtrack, 
    transitions,
    quality 
  } = options;
  
  return apiRequest("/render", {
    method: "POST",
    body: JSON.stringify({
      videoPath,
      preset,
      watermark,
      soundtrack,
      transitions,
      quality: quality || "high",
    }),
  });
};

/**
 * Get job status by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job object with current status and progress
 */
export const getJobStatus = async (jobId) => {
  return apiRequest(`/job/${jobId}`, {
    method: "GET",
  });
};

/**
 * Get all active jobs
 * @returns {Promise<Object>} - Object containing array of active jobs
 */
export const getActiveJobs = async () => {
  return apiRequest("/jobs", {
    method: "GET",
  });
};

/**
 * Cancel a job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Result of cancellation
 */
export const cancelJob = async (jobId) => {
  return apiRequest(`/job/${jobId}`, {
    method: "DELETE",
  });
};

/**
 * Get available transition presets
 * @returns {Promise<Object>} - Object containing array of transition presets
 */
export const getTransitionPresets = async () => {
  return apiRequest("/presets/transitions", {
    method: "GET",
  });
};

/**
 * Get available soundtrack options
 * @returns {Promise<Object>} - Object containing array of soundtrack options
 */
export const getSoundtrackOptions = async () => {
  return apiRequest("/presets/soundtracks", {
    method: "GET",
  });
};

/**
 * Poll job status until completion
 * @param {string} jobId - Job ID
 * @param {Function} onProgress - Callback for progress updates
 * @param {number} interval - Polling interval in ms (default: 2000)
 * @param {number} maxAttempts - Maximum polling attempts (default: 150 = 5 minutes)
 * @returns {Promise<Object>} - Final job object
 */
export const pollJobStatus = async (jobId, onProgress, interval = 2000, maxAttempts = 150) => {
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        
        const response = await getJobStatus(jobId);
        
        if (!response || !response.job) {
          reject(new Error("Job not found"));
          return;
        }
        
        const job = response.job;
        
        if (onProgress) {
          onProgress(job);
        }
        
        if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
          resolve(job);
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error("Job polling timeout"));
          return;
        }
        
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
};

export default {
  generateClip,
  injectSoundtrack,
  applyTransitions,
  applyWatermark,
  renderVideo,
  getJobStatus,
  getActiveJobs,
  cancelJob,
  getTransitionPresets,
  getSoundtrackOptions,
  pollJobStatus,
};
