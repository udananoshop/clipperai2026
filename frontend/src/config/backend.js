/**
 * Global Backend URL Configuration
 * 
 * This module provides a centralized configuration for the backend server URL.
 * The frontend uses this to construct video URLs that point to the correct backend.
 * 
 * Usage:
 *   import { BACKEND_URL, getVideoUrl, getThumbnailUrl } from '@/config/backend';
 * 
 *   // For video URLs:
 *   const videoUrl = getVideoUrl(clip.filePath);
 * 
 *   // For thumbnail URLs:
 *   const thumbnailUrl = getThumbnailUrl(clip.thumbnailUrl);
 * 
 *   // Or directly:
 *   const videoUrl = BACKEND_URL + clip.filePath;
 */

// Get backend URL from environment or use default
// The Express backend runs on port 3001 by default
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/**
 * Construct a full video URL from a relative file path
 * @param {string|null} filePath - Relative path like "/output/tiktok/filename.mp4"
 * @returns {string|null} Full URL or null if no path provided
 */
export const getVideoUrl = (filePath) => {
  if (!filePath) return null;
  
  // If already a full URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Ensure path starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  
  // Combine with backend URL
  return `${BACKEND_URL}${normalizedPath}`;
};

/**
 * Get the appropriate video source URL from a clip object
 * Supports multiple field names used across the codebase
 * @param {Object} clip - Clip object with file information
 * @returns {string|null} Full video URL or null
 */
export const getClipVideoUrl = (clip) => {
  if (!clip) return null;
  
  // Try different field names
  const filePath = clip.filePath || clip.file_path || clip.url || clip.videoUrl;
  
  return getVideoUrl(filePath);
};

/**
 * Get thumbnail URL from clip object
 * @param {Object} clip - Clip object with thumbnail information
 * @returns {string|null} Full thumbnail URL or null
 */
export const getThumbnailUrl = (thumbnailPath) => {
  if (!thumbnailPath) return null;
  
  // If already a full URL, return as is
  if (thumbnailPath.startsWith('http')) {
    return thumbnailPath;
  }
  
  // Ensure path starts with /
  const normalizedPath = thumbnailPath.startsWith('/') ? thumbnailPath : `/${thumbnailPath}`;
  
  // Combine with backend URL
  return `${BACKEND_URL}${normalizedPath}`;
};

/**
 * Get thumbnail from clip object
 * @param {Object} clip - Clip object with thumbnail information
 * @returns {string|null} Full thumbnail URL or null
 */
export const getClipThumbnailUrl = (clip) => {
  if (!clip) return null;
  
  // Try different field names
  const thumbnailPath = clip.thumbnailUrl || clip.thumbnail || clip.thumbnail_path;
  
  return getThumbnailUrl(thumbnailPath);
};

export default BACKEND_URL;

