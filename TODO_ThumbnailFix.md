# Thumbnail Fix Implementation Plan

## Task: Fix Video Previews and Thumbnails

### Steps:
- [ ] 1. Add thumbnail field to Prisma Schema
- [ ] 2. Create thumbnail generation service (FFmpeg)
- [ ] 3. Integrate thumbnail generation into clip pipeline
- [ ] 4. Update clip metadata response with videoUrl and thumbnailUrl
- [ ] 5. Update frontend components to use thumbnails
- [ ] 6. Test and verify

## Requirements:
- Use FFmpeg for thumbnail generation: `ffmpeg -i clip.mp4 -ss 00:00:01 -vframes 1 clip.jpg`
- Must remain safe for 8GB RAM systems (lightweight, no extra memory)
- DO NOT change existing clip generation logic

## Expected Result:
- All clips display thumbnails and can preview from:
  - Uploads
  - TikTok Clips
  - YouTube Clips
  - Instagram Clips
  - Facebook Clips

