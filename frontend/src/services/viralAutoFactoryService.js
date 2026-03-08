/**
 * Viral Auto Factory Service
 * API client for the automated content generation pipeline
 */

import axios from 'axios';

const API_BASE = '/api/viral-auto-factory';

/**
 * Get current status of the Viral Auto Factory
 */
export async function getStatus() {
  try {
    const response = await axios.get(`${API_BASE}/status`);
    return response.data;
  } catch (error) {
    console.error('[ViralAutoFactory] Status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get metrics from the Viral Auto Factory
 */
export async function getMetrics() {
  try {
    const response = await axios.get(`${API_BASE}/metrics`);
    return response.data;
  } catch (error) {
    console.error('[ViralAutoFactory] Metrics error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start the Viral Auto Factory
 */
export async function start() {
  try {
    const response = await axios.post(`${API_BASE}/start`);
    return response.data;
  } catch (error) {
    console.error('[ViralAutoFactory] Start error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Stop the Viral Auto Factory
 */
export async function stop() {
  try {
    const response = await axios.post(`${API_BASE}/stop`);
    return response.data;
  } catch (error) {
    console.error('[ViralAutoFactory] Stop error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger manual discovery
 */
export async function triggerDiscovery() {
  try {
    const response = await axios.post(`${API_BASE}/trigger`);
    return response.data;
  } catch (error) {
    console.error('[ViralAutoFactory] Trigger error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getStatus,
  getMetrics,
  start,
  stop,
  triggerDiscovery
};
