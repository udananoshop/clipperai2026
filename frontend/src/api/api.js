// Get backend port from environment or use default
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 3001;
const API_URL = `http://localhost:${BACKEND_PORT}/api`;

// Fallback response for backend unavailability (used by Service Watchdog)
const FALLBACK_RESPONSE = {
  status: "recovering",
  message: "backend restarting"
};

// Dummy token for bypassing authentication
const DUMMY_TOKEN = "clipperai_bypass_token";

// Abort controller for cleanup
let currentAbortController = null;

// Safe API fetch with AbortController support - bypasses authentication
export const apiFetch = async (endpoint, options = {}) => {
  // Cancel any pending request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  
  currentAbortController = new AbortController();
  // Always use dummy token to bypass authentication
  const token = DUMMY_TOKEN;

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: currentAbortController.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
      },
    });

    // Don't redirect on return null 401 - just to prevent crashes
    if (res.status === 401) {
      console.log("API returned 401 but continuing (auth bypassed)");
      return { success: false, error: "Auth bypassed" };
    }

    // Handle empty responses gracefully
    const text = await res.text();
    if (!text) {
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log("Request cancelled");
    } else {
      console.error("API Error:", error);
    }
    // Return safe fallback instead of null to prevent crashes
    // Return the watchdog fallback response for frontend safe mode
    return { 
      success: false, 
      error: "API unavailable",
      ...FALLBACK_RESPONSE
    };
  } finally {
    currentAbortController = null;
  }
};

// Safe API call wrapper - prevents crashes
export async function safeCall(fn, fallback = null) {
  try {
    const result = await fn();
    return result;
  } catch (err) {
    console.error('API Error:', err);
    return fallback;
  }
}

// Export the API URL for use in other components
export const getApiUrl = () => API_URL;
export const getBackendPort = () => BACKEND_PORT;

// =====================================================
// TEAM API METHODS
// =====================================================

// Get all team members
export const getTeamMembers = async (page = 1, limit = 50) => {
  return apiFetch(`/team/members?page=${page}&limit=${limit}`);
};

// Get a specific team member
export const getTeamMember = async (id) => {
  return apiFetch(`/team/member/${id}`);
};

// Update member role
export const updateMemberRole = async (id, role) => {
  return apiFetch(`/team/member/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
};

// Update member permissions
export const updateMemberPermissions = async (id, permissions) => {
  return apiFetch(`/team/member/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions })
  });
};

// Remove member
export const removeMember = async (id) => {
  return apiFetch(`/team/member/${id}`, {
    method: 'DELETE'
  });
};

// Invite team member
export const inviteTeamMember = async (email, role = 'viewer') => {
  return apiFetch('/team/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role })
  });
};

// =====================================================
// SYSTEM API METHODS - Health, Path Detection, API Testing
// =====================================================

// Get system health information (CPU, RAM, Disk, FFmpeg, Whisper, yt-dlp)
export const getSystemHealth = async () => {
  return apiFetch('/system/health');
};

// Auto-detect system paths (FFmpeg, yt-dlp, Whisper)
export const detectPaths = async () => {
  return apiFetch('/system/detect-paths', {
    method: 'POST'
  });
};

// Test API key for a specific provider
export const testApiKey = async (apiKey, provider) => {
  return apiFetch('/system/test-api', {
    method: 'POST',
    body: JSON.stringify({ apiKey, provider })
  });
};

// =====================================================
// OVERLORD AI CORE API METHODS
// =====================================================

// Process a text command
export const overlordCommand = async (command, options = {}) => {
  return apiFetch('/overlord/command', {
    method: 'POST',
    body: JSON.stringify({ command, ...options })
  });
};

// Process a voice command (transcribed text)
export const overlordVoice = async (text, options = {}) => {
  return apiFetch('/overlord/voice', {
    method: 'POST',
    body: JSON.stringify({ text, ...options })
  });
};

// Get Overlord AI status
export const overlordStatus = async () => {
  return apiFetch('/overlord/status');
};

// Get command history
export const overlordHistory = async (limit = 10) => {
  return apiFetch(`/overlord/history?limit=${limit}`);
};

// Clear command history
export const overlordClearHistory = async () => {
  return apiFetch('/overlord/clear-history', {
    method: 'POST'
  });
};

// Quick action: Generate content ideas
export const overlordQuickIdeas = async (count = 10, language = 'en') => {
  return apiFetch(`/overlord/quick/ideas?count=${count}&language=${language}`);
};

// Quick action: Generate caption
export const overlordQuickCaption = async (style = 'viral', language = 'en') => {
  return apiFetch(`/overlord/quick/caption?style=${style}&language=${language}`);
};

// Quick action: Generate hashtags
export const overlordQuickHashtags = async (count = 15, language = 'en') => {
  return apiFetch(`/overlord/quick/hashtags?count=${count}&language=${language}`);
};

// Quick action: Get analytics
export const overlordQuickAnalytics = async (timeframe = '30d') => {
  return apiFetch(`/overlord/quick/analytics?timeframe=${timeframe}`);
};

// Quick action: Get viral prediction
export const overlordQuickViral = async () => {
  return apiFetch('/overlord/quick/viral');
};

// Quick action: Get growth strategy
export const overlordQuickStrategy = async (language = 'en') => {
  return apiFetch(`/overlord/quick/strategy?language=${language}`);
};

// Set device mode for adaptive processing
export const overlordSetDeviceMode = async (mode) => {
  return apiFetch('/overlord/device-mode', {
    method: 'POST',
    body: JSON.stringify({ mode })
  });
};

// =====================================================
// OVERLORD AI DIRECTOR - SYSTEM MONITOR API
// =====================================================

// Get comprehensive system status
export const overlordSystemStatus = async () => {
  return apiFetch('/overlord/system/status');
};

// Get quick system status
export const overlordSystemQuick = async () => {
  return apiFetch('/overlord/system/quick');
};

// Get system repair suggestions
export const overlordSystemSuggestions = async () => {
  return apiFetch('/overlord/system/suggestions');
};

// =====================================================
// OVERLORD AI DIRECTOR - SYSTEM REPAIR API
// =====================================================

// Scan uploads directory
export const overlordRepairScan = async () => {
  return apiFetch('/overlord/system/repair/scan', {
    method: 'POST'
  });
};

// Rebuild video index
export const overlordRepairRebuild = async () => {
  return apiFetch('/overlord/system/repair/rebuild', {
    method: 'POST'
  });
};

// Clean temp files
export const overlordRepairClean = async () => {
  return apiFetch('/overlord/system/repair/clean', {
    method: 'POST'
  });
};

// Restart FFmpeg jobs
export const overlordRepairFFmpeg = async () => {
  return apiFetch('/overlord/system/repair/ffmpeg', {
    method: 'POST'
  });
};

// Refresh cache
export const overlordRepairRefreshCache = async () => {
  return apiFetch('/overlord/system/repair/refresh-cache', {
    method: 'POST'
  });
};

// Run full system repair
export const overlordRepairFull = async () => {
  return apiFetch('/overlord/system/repair/full', {
    method: 'POST'
  });
};

// Run quick repair
export const overlordRepairQuick = async () => {
  return apiFetch('/overlord/system/repair/quick', {
    method: 'POST'
  });
};

// Get repair suggestions
export const overlordRepairSuggestions = async () => {
  return apiFetch('/overlord/system/repair/suggestions');
};

// =====================================================
// OVERLORD AI DIRECTOR - ERROR ANALYSIS API
// =====================================================

// Get error analysis summary
export const overlordErrors = async () => {
  return apiFetch('/overlord/system/errors');
};

// Get error count
export const overlordErrorsCount = async () => {
  return apiFetch('/overlord/system/errors/count');
};

// Get recent errors
export const overlordErrorsRecent = async (count = 20) => {
  return apiFetch(`/overlord/system/errors/recent?count=${count}`);
};

// =====================================================
// OVERLORD AI DIRECTOR - PIPELINE API
// =====================================================

// Get pipeline status
export const overlordPipelineStatus = async () => {
  return apiFetch('/overlord/pipeline/status');
};

// Get pipeline templates
export const overlordPipelineTemplates = async () => {
  return apiFetch('/overlord/pipeline/templates');
};

// Run pipeline
export const overlordPipelineRun = async (taskType, params = {}) => {
  return apiFetch('/overlord/pipeline/run', {
    method: 'POST',
    body: JSON.stringify({ taskType, params })
  });
};

// Cancel pipeline
export const overlordPipelineCancel = async () => {
  return apiFetch('/overlord/pipeline/cancel', {
    method: 'POST'
  });
};

// Get pipeline history
export const overlordPipelineHistory = async (limit = 10) => {
  return apiFetch(`/overlord/pipeline/history?limit=${limit}`);
};
