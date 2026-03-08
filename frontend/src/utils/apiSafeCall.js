// Light mode performance flag - global constant
export const LIGHT_MODE = true;

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

// Safe async wrapper with loading state
export async function safeCallWithState(setState, fn, loadingState = true) {
  try {
    if (loadingState) setState(prev => ({ ...prev, loading: true, error: null }));
    const result = await fn();
    if (loadingState) setState(prev => ({ ...prev, loading: false, data: result }));
    return result;
  } catch (err) {
    console.error('API Error:', err);
    if (loadingState) setState(prev => ({ ...prev, loading: false, error: err.message || 'An error occurred' }));
    return null;
  }
}

// Abort controller helper for fetch cleanup
export function createAbortSignal(timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, timeout };
}

// Safe fetch wrapper
export async function safeFetch(url, options = {}) {
  const { timeout = 10000, ...fetchOptions } = options;
  const { signal, timeout: clearTimeout } = createAbortSignal(timeout);
  
  try {
    const response = await fetch(url, { ...fetchOptions, signal });
    clearTimeout();
    return response;
  } catch (err) {
    clearTimeout();
    if (err.name === 'AbortError') {
      console.warn('Request timeout');
    } else {
      console.error('Fetch error:', err);
    }
    return null;
  }
}

// Safe localStorage wrapper
export const safeLocalStorage = {
  get: (key, fallback = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (err) {
      console.warn('localStorage get error:', err);
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('localStorage set error:', err);
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn('localStorage remove error:', err);
      return false;
    }
  }
};

// Light mode aware styles
export const lightModeStyles = LIGHT_MODE ? {
  // Reduced animations
  animation: 'none',
  // Reduced shadows
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  // Reduced blur
  backdropFilter: 'none',
  // Lighter gradients
  background: 'solid colors only',
} : {
  // Full animations
  animation: 'allowed',
  // Full shadows
  boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
  // Full blur
  backdropFilter: 'blur(20px)',
  // Full gradients
  background: 'gradients allowed',
};

export default { LIGHT_MODE, safeCall, safeCallWithState, createAbortSignal, safeFetch, safeLocalStorage, lightModeStyles };
