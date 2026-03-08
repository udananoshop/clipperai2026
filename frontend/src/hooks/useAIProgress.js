/**
 * Custom hook for AI Progress WebSocket Connection
 * Handles real-time progress updates from backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Get WebSocket URL from environment or use default
const getWebSocketURL = () => {
  return import.meta.env.VITE_WS_URL || 
    (import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:3001') + '/ws';
};

export const useAIProgress = (jobId, options = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('starting');
  const [status, setStatus] = useState('pending');
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const wsRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const heartbeatRef = useRef(null);

  // Calculate estimated time remaining
  const calculateEstimatedTime = useCallback((currentProgress, currentStatus) => {
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      return null;
    }

    // Base estimation: ~50 seconds for full process
    const totalEstimatedSeconds = 50;
    const remainingPercentage = 100 - currentProgress;
    const estimatedSeconds = Math.round((remainingPercentage / 100) * totalEstimatedSeconds);
    
    return estimatedSeconds;
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Check if this message is for our job
      if (jobId && data.jobId !== jobId) {
        return;
      }

      // Handle different message types
      switch (data.type) {
        case 'ai-progress':
        case 'job_progress':
          setProgress(data.progress || 0);
          setStep(data.step || 'processing');
          setStatus(data.status || 'processing');
          setEstimatedTime(calculateEstimatedTime(data.progress, data.status));
          
          if (onProgress) {
            onProgress(data);
          }
          break;

        case 'job_complete':
        case 'completed':
          setProgress(100);
          setStep('completed');
          setStatus('completed');
          setResult(data.result || data);
          setEstimatedTime(null);
          
          if (onComplete) {
            onComplete(data.result || data);
          }
          break;

        case 'job_error':
        case 'error':
          setStatus('failed');
          setError(data.error || 'Unknown error');
          
          if (onError) {
            onError(data.error);
          }
          break;

        case 'connected':
          setIsConnected(true);
          setConnectionError(null);
          reconnectCountRef.current = 0;
          break;

        case 'pong':
          // Heartbeat response
          break;

        default:
          // Handle other message types
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }
          if (data.status) {
            setStatus(data.status);
          }
          if (data.step) {
            setStep(data.step);
          }
      }
    } catch (err) {
      console.error('[useAIProgress] Error parsing message:', err);
    }
  }, [jobId, onProgress, onComplete, onError, calculateEstimatedTime]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = getWebSocketURL();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[useAIProgress] Connected to WebSocket');
        setIsConnected(true);
        setConnectionError(null);
        reconnectCountRef.current = 0;

        // Subscribe to job updates if jobId provided
        if (jobId) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            jobId: jobId
          }));
        }

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (err) => {
        console.error('[useAIProgress] WebSocket error:', err);
        setConnectionError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('[useAIProgress] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }

        // Auto-reconnect if not a normal closure
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          console.log(`[useAIProgress] Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[useAIProgress] Connection error:', err);
      setConnectionError(err.message);
    }
  }, [jobId, handleMessage, reconnectAttempts, reconnectInterval]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Subscribe to a specific job
  const subscribeToJob = useCallback((newJobId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && newJobId) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        jobId: newJobId
      }));
    }
  }, []);

  // Unsubscribe from a job
  const unsubscribeFromJob = useCallback((targetJobId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && targetJobId) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        jobId: targetJobId
      }));
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setProgress(0);
    setStep('starting');
    setStatus('pending');
    setEstimatedTime(null);
    setResult(null);
    setError(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && jobId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [jobId, autoConnect, connect, disconnect]);

  // Return hook API
  return {
    // State
    progress,
    step,
    status,
    estimatedTime,
    result,
    error,
    isConnected,
    connectionError,
    
    // Actions
    connect,
    disconnect,
    subscribeToJob,
    unsubscribeFromJob,
    reset,
    
    // Helpers
    isProcessing: status === 'processing' || status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
  };
};

export default useAIProgress;
