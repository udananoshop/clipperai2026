// backend/services/renderProgress.js
// Simple render progress tracking

const progressMap = {};

module.exports = {
  set: function(videoId, percent) {
    progressMap[videoId] = percent;
  },
  
  get: function(videoId) {
    return progressMap[videoId] || 0;
  },
  
  clear: function(videoId) {
    delete progressMap[videoId];
  }
};
