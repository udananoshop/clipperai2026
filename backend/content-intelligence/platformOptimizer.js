/**
 * Platform Format Optimizer
 * Return best export settings per platform
 */

function getPlatformConfig(platform = 'tiktok') {
  const configs = {
    tiktok: {
      platform: 'tiktok',
      aspectRatio: '9:16',
      durationLimit: 60,
      captionStyle: 'big_center',
      subtitlePosition: 'middle',
      watermarkSafeZone: true,
      maxFileSize: '287MB',
      format: 'mp4',
      codec: 'h264',
      audioBitrate: '128kbps'
    },
    youtube_shorts: {
      platform: 'youtube_shorts',
      aspectRatio: '9:16',
      durationLimit: 60,
      captionStyle: 'clean_bottom',
      subtitlePosition: 'bottom',
      watermarkSafeZone: true,
      maxFileSize: '512MB',
      format: 'mp4',
      codec: 'h264',
      audioBitrate: '128kbps'
    },
    instagram_reels: {
      platform: 'instagram_reels',
      aspectRatio: '9:16',
      durationLimit: 90,
      captionStyle: 'standard',
      subtitlePosition: 'bottom',
      watermarkSafeZone: true,
      maxFileSize: '650MB',
      format: 'mp4',
      codec: 'h264',
      audioBitrate: '128kbps'
    },
    instagram: {
      platform: 'instagram',
      aspectRatio: '1:1',
      durationLimit: 60,
      captionStyle: 'standard',
      subtitlePosition: 'bottom',
      watermarkSafeZone: false,
      maxFileSize: '650MB',
      format: 'mp4',
      codec: 'h264',
      audioBitrate: '128kbps'
    },
    facebook: {
      platform: 'facebook',
      aspectRatio: '1:1',
      durationLimit: 180,
      captionStyle: 'standard',
      subtitlePosition: 'bottom',
      watermarkSafeZone: false,
      maxFileSize: '1GB',
      format: 'mp4',
      codec: 'h264',
      audioBitrate: '128kbps'
    },
    youtube: {
      platform: 'youtube',
      aspectRatio: '16:9',
      durationLimit: 600,
      captionStyle: 'standard',
      subtitlePosition: 'bottom',
      watermarkSafeZone: false,
      maxFileSize: '2GB',
      format: 'mp4',
      codec: 'h264',
      audioBitrate: '192kbps'
    }
  };
  
  return configs[platform] || configs.tiktok;
}

module.exports = {
  getPlatformConfig
};
