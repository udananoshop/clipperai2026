# Video Playback Fix - TODO List

## Issue: Generated clips cannot be played in dashboard

## Root Cause Analysis:
- Backend saved clips to `backend/output/{platform}/` folder
- Express has static serving for `/output` and `/clips`
- API was returning full URLs incorrectly instead of relative paths
- Frontend didn't properly construct video URLs for clips

## Fix Plan:

### Step 1: Fix backend/routes/clips.js ✅
- [x] Changed to return relative paths like `/output/platform/filename.mp4`
- [x] Removed full URL construction that was breaking

### Step 2: Fix backend/routes/upload.js ✅
- [x] Changed to return relative paths

### Step 3: Fix frontend/ClipPreviewModal.jsx ✅
- [x] Added BACKEND_URL helper to prepend to relative paths
- [x] Added proper video URL construction from clip.filePath, clip.file_path, or clip.url
- [x] Added native video controls

### Step 4: Testing
- Verify API returns correct relative paths like `/output/platform/filename.mp4`
- Verify video player can load clips

## Summary of Changes:
1. **backend/routes/clips.js**: Now returns relative paths (`/output/filename.mp4`) instead of full URLs
2. **backend/routes/upload.js**: Same fix - returns relative paths
3. **frontend/src/components/ClipPreviewModal.jsx**: 
   - Added `BACKEND_URL` constant
   - Added `constructVideoUrl()` helper function
   - Uses `videoUrl` for video src instead of raw clip.filePath
   - Added native video controls

