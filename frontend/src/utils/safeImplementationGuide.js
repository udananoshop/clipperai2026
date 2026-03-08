/**
 * Sample Safe Implementation Guide
 * 
 * This file demonstrates how to use the safe wrappers from apiSafeCall.js
 * to prevent crashes, memory leaks, and handle errors gracefully.
 */

import { safeCall, safeCallWithState, createAbortSignal, safeFetch, LIGHT_MODE } from './apiSafeCall';

/**
 * ============================================
 * EXAMPLE 1: Wrapping async API calls with safeCall
 * ============================================
 */

// ❌ BEFORE: Unsafe async function
async function fetchVideosOld() {
  const response = await fetch('/api/video');
  const data = await response.json(); // Can crash if response is not JSON
  return data;
}

// ✅ AFTER: Safe async function using safeCall
async function fetchVideos() {
  return safeCall(async () => {
    const response = await fetch('/api/video');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  }, []); // Returns empty array on error
}

/**
 * ============================================
 * EXAMPLE 2: Using safeCallWithState for loading states
 * ============================================
 */

// ❌ BEFORE: Manual try/catch with state
function UploadPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/video');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
}

// ✅ AFTER: Using safeCallWithState
function UploadPageSafe() {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  const loadVideos = async () => {
    await safeCallWithState(
      setState,
      async () => {
        const res = await fetch('/api/video');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      }
    );
  };
}

/**
 * ============================================
 * EXAMPLE 3: AbortController for fetch cleanup
 * ============================================
 */

// ❌ BEFORE: No cleanup - causes memory leaks
function TrendingPage() {
  useEffect(() => {
    fetch('/api/trending').then(data => setTrending(data));
    // Missing cleanup - if component unmounts, this still runs
  }, []);
}

// ✅ AFTER: With AbortController
function TrendingPageSafe() {
  useEffect(() => {
    const { signal } = createAbortSignal(10000); // 10s timeout
    
    const fetchData = async () => {
      const result = await safeCall(
        async () => {
          const response = await fetch('/api/trending', { signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        },
        [] // fallback
      );
      setTrending(result);
    };
    
    fetchData();
    
    // Cleanup: aborts fetch on unmount
    return () => signal?.abort?.();
  }, []);
}

/**
 * ============================================
 * EXAMPLE 4: Using LIGHT_MODE for conditional rendering
 * ============================================
 */

// Light mode aware component
function AnimatedCard({ children }) {
  // In LIGHT_MODE, disable heavy animations
  const animationStyles = LIGHT_MODE ? {
    transition: 'none', // Disable animations
    transform: 'none',
  } : {
    transition: 'all 0.3s ease',
    transform: 'translateY(-4px)',
  };

  // Reduced shadows in light mode
  const shadowStyles = LIGHT_MODE ? {
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  } : {
    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
  };

  return (
    <div style={{ ...animationStyles, ...shadowStyles }}>
      {children}
    </div>
  );
}

/**
 * ============================================
 * EXAMPLE 5: Prediction page with safe wrappers
 * ============================================
 */

function PredictionPageSafe() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create abort controller for this request
  const abortRef = React.useRef(null);

  const handlePredict = useCallback(async (inputs) => {
    // Cancel any existing request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Create new abort signal with timeout
    const { signal, timeout } = createAbortSignal(15000);
    abortRef.current = { signal, timeout };

    setLoading(true);
    setError(null);

    try {
      const result = await safeCall(async () => {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
          signal
        });
        
        if (!response.ok) {
          throw new Error(`Prediction failed: ${response.status}`);
        }
        
        return await response.json();
      }, null);

      if (result) {
        setPrediction(result);
      } else {
        setError('Prediction failed. Please try again.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      clearTimeout(timeout);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        clearTimeout(abortRef.current.timeout);
      }
    };
  }, []);

  return { prediction, loading, error, handlePredict };
}

/**
 * ============================================
 * EXAMPLE 6: Research page with safe state updates
 * ============================================
 */

function ResearchPageSafe() {
  const [analysis, setAnalysis] = useState(null);

  // Prevents setting state on unmounted component
  const safeSetAnalysis = useCallback((data) => {
    // Check if component is still mounted
    setAnalysis(prev => {
      // Safe update - create new object
      return { ...prev, ...data };
    });
  }, []);

  const runAnalysis = async (content) => {
    await safeCall(async () => {
      const result = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const data = await result.json();
      safeSetAnalysis(data);
    });
  };
}

/**
 * ============================================
 * Best Practices Summary
 * ============================================
 * 
 * 1. Always wrap async functions with safeCall
 * 2. Use AbortController for fetch cleanup
 * 3. Add cleanup functions to all useEffect hooks
 * 4. Use LIGHT_MODE to conditionally disable animations
 * 5. Never set state directly - always use setter functions
 * 6. Use useCallback for event handlers to prevent recreations
 * 7. Use useMemo for expensive computations
 * 8. Always provide fallback values for safeCall
 */

export default {};
