/**
 * OVERLORD 8GB MEMORY STABILIZER HOOK
 * Non-destructive memory optimization
 * - Debounced fetch (500ms)
 * - Prevent parallel fetches
 * - Memory threshold monitoring (88%)
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const MEMORY_WARNING_THRESHOLD = 88; // 88% instead of 92%
const MEMORY_RESUME_THRESHOLD = 75;
const DEBOUNCE_DELAY = 500;

export const useMemoryStabilizer = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const fetchTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // Check memory usage
  const checkMemory = useCallback(() => {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      const used = memory.usedJSHeapSize;
      const total = memory.jsHeapSizeLimit;
      const percentage = (used / total) * 100;
      setMemoryUsage(percentage);
      
      // Pause at 88%, resume at 75%
      if (percentage > MEMORY_WARNING_THRESHOLD && !isPaused) {
        console.warn(`[MEMORY] High usage: ${percentage.toFixed(1)}% - Pausing intake`);
        setIsPaused(true);
      } else if (percentage < MEMORY_RESUME_THRESHOLD && isPaused) {
        console.log(`[MEMORY] Normalized: ${percentage.toFixed(1)}% - Resuming`);
        setIsPaused(false);
      }
      
      return percentage;
    }
    return 0;
  }, [isPaused]);

  // Debounced fetch wrapper
  const debouncedFetch = useCallback((fetchFn) => {
    const now = Date.now();
    
    // Prevent multiple parallel fetches
    if (isFetchingRef.current) {
      console.log('[MEMORY] Fetch already in progress, skipping');
      return;
    }
    
    // Debounce: only fetch if enough time has passed
    if (now - lastFetchTimeRef.current < DEBOUNCE_DELAY) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        lastFetchTimeRef.current = Date.now();
        isFetchingRef.current = true;
        fetchFn().finally(() => {
          isFetchingRef.current = false;
        });
      }, DEBOUNCE_DELAY);
      return;
    }
    
    // Immediate fetch
    lastFetchTimeRef.current = now;
    isFetchingRef.current = true;
    fetchFn().finally(() => {
      isFetchingRef.current = false;
    });
  }, []);

  // Memory check interval
  useEffect(() => {
    const interval = setInterval(() => {
      checkMemory();
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [checkMemory]);

  return {
    isPaused,
    memoryUsage,
    debouncedFetch,
    checkMemory,
    canFetch: !isPaused && !isFetchingRef.current
  };
};

export default useMemoryStabilizer;
