# Thumbnail Support & Preview Implementation Plan

## Summary
Add thumbnail support and preview functionality without modifying existing clip generation logic.

## Current State Analysis

### What Already Exists:
1. ✅ FFmpeg thumbnail generation service (`backend/services/thumbnailService.js`)
2. ✅ Thumbnail field in Prisma schema (`Video.thumbnailUrl`, `Clip.thumbnailUrl`)
3. ✅ Thumbnail generation in clipSaver.js
4. ✅ Video preview modal (`ClipPreviewModal.jsx`)
5. ✅ Backend URL config with thumbnail helpers

### What Needs Fixing:
1. ❌ API routes don't return saved thumbnailUrl from database
2. ❌ Frontend doesn't display thumbnails in cards
3. ❌ Dashboard videos don't show thumbnails or preview

## Implementation Plan

### Phase 1: Fix Backend API Responses
- [ ] 1.1 Update `/api/upload/clips` route to return saved thumbnailUrl
- [ ] 1.2 Update `/api/clips` route to include thumbnailUrl in responses
- [ ] 1.3 Update `/api/library/clips` route to return thumbnailUrl

### Phase 2: Ensure Thumbnail Generation
- [ ] 2.1 Verify clipSaver is called during clip creation
- [ ] 2.2 Add fallback thumbnail generation in API routes
- [ ] 2.3 Add batch thumbnail generation endpoint for existing clips

### Phase 3: Frontend Thumbnail Display
- [ ] 3.1 Fix UploadCenter ClipCard to display thumbnails properly
- [ ] 3.2 Add thumbnails to Dashboard VideoCard components
- [ ] 3.3 Ensure thumbnail error handling with fallbacks

### Phase 4: Video Preview Functionality
- [ ] 4.1 Ensure video URLs are correctly passed to ClipPreviewModal
- [ ] 4.2 Add click-to-preview on Dashboard VideoCards
- [ ] 4.3 Fix any video path resolution issues

## Files to Modify:

### Backend:
1. `backend/routes/upload.js` - Fix /clips endpoint
2. `backend/routes/clips.js` - Add thumbnailUrl to responses  
3. `backend/routes/library.js` - Ensure thumbnailUrl in clips response

### Frontend:
1. `frontend/src/pages/UploadCenter.jsx` - Fix thumbnail display
2. `frontend/src/pages/Dashboard.jsx` - Add thumbnail cards and preview
3. `frontend/src/components/ClipCardMemo.jsx` - Check thumbnail support
4. `frontend/src/components/ClipPreviewModal.jsx` - Verify preview works

## Testing:
- Generate test clip
- Verify thumbnail appears in UploadCenter
- Verify preview modal opens on click
- Verify Dashboard videos have thumbnails

## Constraints:
- Do NOT modify existing clip generation logic
- Only extend the pipeline
- Must remain safe for 8GB RAM systems (already optimized in thumbnailService)

