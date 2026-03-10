/**
 * TRENDING SERVICE - LOW RAM VERSION
 * Lightweight mock for trending functionality
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Mock trending data - very lightweight
const mockTrending = [
  { id: 1, title: 'Viral Challenge', score: 95, platform: 'tiktok' },
  { id: 2, title: 'Trending Topic', score: 88, platform: 'youtube' },
  { id: 3, title: 'Hot Reels', score: 82, platform: 'instagram' },
  { id: 4, title: 'Popular Post', score: 78, platform: 'facebook' },
  { id: 5, title: 'Trending Now', score: 75, platform: 'tiktok' }
];

// GET /api/trending
router.get('/', (req, res) => {
  try {
    // Try to get real data from statsAggregator first
    let stats = null;
    try {
      const statsAggregator = require('../services/statsAggregator');
      stats = statsAggregator.loadStats();
    } catch (e) {
      // Use mock if aggregator not available
    }
    
    // If we have real trending data, use it
    const trendingScore = stats?.trending || 70;
    const avgScore = stats?.avgScore || 70;
    
    // Create lightweight trending response
    const trendingItems = mockTrending.map(item => ({
      ...item,
      score: Math.min(item.score, trendingScore + 10),
      isLive: Math.random() > 0.7
    }));
    
    res.json({
      success: true,
      data: {
        trending: trendingItems,
        avgScore: avgScore,
        trendingScore: trendingScore,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Trending] Error:', error.message);
    res.json({
      success: true,
      data: {
        trending: mockTrending,
        avgScore: 70,
        trendingScore: 70,
        lastUpdated: new Date().toISOString()
      }
    });
  }
});

module.exports = router;
