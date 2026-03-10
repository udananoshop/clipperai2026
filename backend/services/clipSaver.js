/**
 * OVERLORD CLIP SAVER SERVICE
 * Saves generated clips to SQLite database
 * Lightweight and safe for 8GB RAM
 */

const db = require('../database');

/**
 * Save clip to database after successful generation
 * @param {Object} clipData - Clip information to save
 * @param {string} clipData.title - Clip title
 * @param {string} clipData.filename - Clip filename
 * @param {string} clipData.platform - Platform (youtube, tiktok, etc.)
 * @param {number} clipData.duration - Clip duration in seconds
 * @param {number} clipData.score - Viral score
 * @param {string} clipData.thumbnailUrl - Thumbnail URL (optional)
 * @param {string} clipData.filePath - Full file path to video (optional, for thumbnail generation)
 * @returns {Promise<number>} - Inserted clip ID
 */
async function saveClip(clipData) {
  try {
    const { title, filename, platform, duration, score, thumbnailUrl, filePath } = clipData;
    
    // Safety check: ensure required fields exist
    if (!filename) {
      console.log('[CLIP SAVE] Skipped: no filename');
      return null;
    }

    // Generate thumbnail if not provided but filePath exists
    let finalThumbnailUrl = thumbnailUrl;
    if (!finalThumbnailUrl && filePath) {
      try {
        const thumbnailService = require('./thumbnailService');
        const fs = require('fs');
        
        // Check if video file exists
        if (fs.existsSync(filePath)) {
          const clipDir = require('path').dirname(filePath);
          const thumbPath = await thumbnailService.generateThumbnail(filePath, clipDir, {
            width: 320,
            quality: 3,
            timestamp: '00:00:01'
          });
          
          if (thumbPath) {
            // Convert to relative path for storage
            finalThumbnailUrl = require('path').relative(
              require('path').join(__dirname, '..'),
              thumbPath
            ).replace(/\\/g, '/');
            console.log('[CLIP SAVE] Generated thumbnail:', finalThumbnailUrl);
          }
        }
      } catch (thumbError) {
        console.log('[CLIP SAVE] Thumbnail generation skipped:', thumbError.message);
      }
    }

    // Insert into clips table
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO clips (title, filename, platform, duration, score, thumbnail_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          title || 'Untitled Clip',
          filename,
          platform || 'local',
          duration || 0,
          score || 0,
          finalThumbnailUrl || null
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ lastID: this.lastID });
          }
        }
      );
    });

    console.log(`[CLIP SAVE] Saved: ${filename} (ID: ${result.lastID})`);
    return result.lastID;
  } catch (error) {
    // Don't crash - just log error
    console.log('[CLIP SAVE] Error:', error.message);
    return null;
  }
}

/**
 * Get all saved clips
 * @returns {Promise<Array>} - Array of clips
 */
async function getClips() {
  try {
    const clips = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM clips ORDER BY created_at DESC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    return clips;
  } catch (error) {
    console.log('[CLIP SAVE] GetClips Error:', error.message);
    return [];
  }
}

module.exports = {
  saveClip,
  getClips
};
