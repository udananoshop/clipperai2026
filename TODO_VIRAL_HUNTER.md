# ViralHunterAI Implementation Plan

## Task Summary
Implement an autonomous viral content discovery system that automatically finds trending videos, downloads them, and sends them to the AI clip engine.

## Files to Create

### 1. Backend Services
- [ ] `backend/services/viralHunterService.js` - Fetches and ranks trending videos
- [ ] `backend/services/viralDownloaderService.js` - Downloads videos using yt-dlp
- [ ] `backend/services/viralScheduler.js` - Scheduler running every 30 minutes

### 2. Database Schema
- [ ] Add new Prisma models for viral tracking (ViralDiscovery, ViralDownload, ViralClip)

### 3. Backend Routes
- [ ] `backend/routes/viralHunter.js` - API endpoints for dashboard

### 4. Frontend
- [ ] `frontend/src/pages/ViralHunter.jsx` - New dashboard page
- [ ] Update `frontend/src/App.jsx` - Add route
- [ ] Update `frontend/src/components/Sidebar.jsx` - Add menu item

### 5. Server Integration
- [ ] Update `backend/server.js` - Mount routes and start scheduler

## Implementation Details

### viralHunterService.js
- Sources: YouTube trending, Reddit r/videos, r/tiktokcringe, r/interestingasfuck
- Rank by: viral potential score based on views, engagement, recency

### viralDownloaderService.js
- Use yt-dlp with command: `yt-dlp -f bestvideo+bestaudio --merge-output-format mp4`
- Save to: `backend/downloads/viral/`
- Max 2 concurrent downloads

### viralScheduler.js
- Run every 30 minutes
- Pick top 3 candidates
- Trigger autoClipTriggerService after download

### Constraints
- Max 2 downloads at same time
- Max 2 clip jobs at same time
- Optimized for 8GB RAM

## Follow-up Steps
1. Test the services individually
2. Verify the scheduler runs correctly
3. Check the frontend displays data properly
4. Monitor resource usage with 8GB constraint

