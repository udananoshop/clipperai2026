# Prisma Field Fix - viral_score → viralScore

## Task
Fix Prisma field mismatch in viralPredictionService.js

## Files to Modify
- backend/services/viralPredictionService.js

## Field Mapping
- `viral_score` → `viralScore`

## Occurrences to Fix

### 1. getEngagementRate() function
- [x] `where: { viral_score: { not: null } }` → `where: { viralScore: { not: null } }`
- [x] `c.viral_score` → `c.viralScore`

### 2. getTrendingScore() function
- [x] First `select: { viral_score: true }` → `select: { viralScore: true }`
- [x] Second `select: { viral_score: true }` → `select: { viralScore: true }`
- [x] `c.viral_score` (2 occurrences) → `c.viralScore`

### 3. getRecommendedFormat() function
- [x] `_avg: { viral_score: true }` → `_avg: { viralScore: true }`
- [x] `stat._avg.viral_score` (2 occurrences) → `stat._avg.viralScore`

### 4. predictVideo() function
- [x] `select: { viral_score: true }` → `select: { viralScore: true }`
- [x] `clip.viral_score` (2 occurrences) → `clip.viralScore`

### 5. getViralInsights() function
- [x] `where: { viral_score: ... }` → `where: { viralScore: ... }`
- [x] `orderBy: { viral_score: 'desc' }` → `orderBy: { viralScore: 'desc' }`
- [x] `select: { viral_score: true }` → `select: { viralScore: true }`
- [x] `clip.viral_score` (multiple) → `clip.viralScore`
- [x] `select: { platform: true, viral_score: true }` → `select: { platform: true, viralScore: true }`
- [x] `clip.viral_score` → `clip.viralScore`

## Status
- [ ] Pending fix

