/**
 * Smart Branding Watermark Engine
 * Protect content branding
 */

const BRAND_TEMPLATES = [
  '⚡ @{name}',
  '🔥 {name} Official',
  '🎬 by {name}',
  '✨ {name} TV',
  '📱 {name} Channel',
  '★ {name} Studio',
  '► {name} Media',
  '◆ {name} Production'
];

function calculateSafeWatermarkPosition(aspectRatio = '9:16') {
  const positions = {
    '9:16': { x: 0.9, y: 0.9, opacity: 0.85, scale: 0.12 },
    '1:1': { x: 0.1, y: 0.9, opacity: 0.85, scale: 0.12 },
    '16:9': { x: 0.9, y: 0.1, opacity: 0.85, scale: 0.10 },
    '4:3': { x: 0.9, y: 0.1, opacity: 0.85, scale: 0.10 },
    'vertical': { x: 0.9, y: 0.9, opacity: 0.85, scale: 0.12 },
    'square': { x: 0.1, y: 0.9, opacity: 0.85, scale: 0.12 },
    'landscape': { x: 0.9, y: 0.1, opacity: 0.85, scale: 0.10 }
  };
  
  return positions[aspectRatio] || positions['9:16'];
}

function generateBrandTag(channelName = '') {
  if (!channelName) return '⚡ @ClipperPro';
  
  const clean = channelName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const formatted = clean.replace(/\s+/g, '');
  
  const template = BRAND_TEMPLATES[Math.floor(Math.random() * BRAND_TEMPLATES.length)];
  
  return template.replace('{name}', formatted);
}

function getWatermarkConfig(channelName = '', aspectRatio = '9:16') {
  const position = calculateSafeWatermarkPosition(aspectRatio);
  const tag = generateBrandTag(channelName);
  
  return {
    position,
    tag,
    channelName
  };
}

module.exports = {
  calculateSafeWatermarkPosition,
  generateBrandTag,
  getWatermarkConfig,
  BRAND_TEMPLATES
};
