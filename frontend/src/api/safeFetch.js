/**
 * Safe Fetch Utility
 * Provides robust API calls with automatic token handling, retry logic, and error recovery
 * Never crashes React - always returns safe data
 */

// Get backend port from environment or use default
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 3001;
const API_BASE_URL = `http://localhost:${BACKEND_PORT}`;

// Dummy token for bypassing authentication
const DUMMY_TOKEN = "clipperai_bypass_token";

// Get token - use dummy token to bypass authentication
const getToken = () => {
  // Always return dummy token to bypass authentication
  return DUMMY_TOKEN;
};

// Default options for fetch
const defaultOptions = {
  retries: 2,
  retryDelay: 1000,
  timeout: 30000,
};

/**
 * Safe fetch wrapper with retry logic and token attachment
 * @param {string} url - API endpoint URL (can be relative like '/api/health')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Always returns { success: boolean, data: any, error: string }
 */
export const safeFetch = async (url, options = {}) => {
  const { retries, retryDelay, timeout, ...fetchOptions } = { ...defaultOptions, ...options };
  
  // Build full URL - handle both relative and absolute paths
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // Add token to headers
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchOptions.headers,
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError = null;
  
  // Retry loop
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle HTTP errors
      if (!response.ok) {
        // If 401, try to handle auth error gracefully
        if (response.status === 401) {
          return {
            success: false,
            data: null,
            error: 'Authentication failed. Please login again.',
            status: 401
          };
        }
        
        // Return error response but don't crash
        return {
          success: false,
          data: data.data || [],
          error: data.error || `HTTP error: ${response.status}`,
          status: response.status
        };
      }

      // Success - return data safely
      return {
        success: true,
        data: data.data || data,
        error: null,
        status: response.status
      };

    } catch (error) {
      lastError = error;
      
      // Handle abort error (timeout)
      if (error.name === 'AbortError') {
        console.warn(`[safeFetch] Request timeout for ${fullUrl}`);
      } else {
        console.warn(`[safeFetch] Attempt ${attempt + 1} failed:`, error.message);
      }

      // Wait before retry
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // All retries failed - return safe empty data
  clearTimeout(timeoutId);
  console.error(`[safeFetch] All retries failed for ${fullUrl}:`, lastError?.message);
  
  return {
    success: false,
    data: fetchOptions.method === 'GET' ? [] : null,
    error: lastError?.message || 'Network error. Please try again.',
    status: 0
  };
};

/**
 * Safe GET request
 */
export const safeGet = (url, options = {}) => {
  return safeFetch(url, { ...options, method: 'GET' });
};

/**
 * Safe POST request
 */
export const safePost = (url, data, options = {}) => {
  return safeFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Safe PUT request
 */
export const safePut = (url, data, options = {}) => {
  return safeFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Safe DELETE request
 */
export const safeDelete = (url, options = {}) => {
  return safeFetch(url, { ...options, method: 'DELETE' });
};

// Export base URL for direct fetch usage
export const getApiBaseUrl = () => API_BASE_URL;
export const getBackendPort = () => BACKEND_PORT;

export default safeFetch;
