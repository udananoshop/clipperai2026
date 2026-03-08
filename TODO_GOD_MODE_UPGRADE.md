# OVERLORD AI GOD MODE & AUTO VIRAL CLIP FACTORY - IMPLEMENTATION PLAN

## Information Gathered

### Current System State:
1. **Backend Server** (backend/server.js): Already has static file serving for `/uploads`, `/output`, `/clips` - PART 1 already implemented
2. **Overlord Core Service** (backend/services/overlordCoreService.js): Main AI orchestrator with command processing
3. **Command Parser** (backend/services/commandParserService.js): Keyword-based NLP parser
4. **Task Execution** (backend/services/taskExecutionService.js): Task execution engine
5. **Frontend** (frontend/src/components/ai/OverlordFloatingAI.jsx): AI Control Center with chat and control tabs
6. **Dashboard** (frontend/src/pages/Dashboard.jsx): Already handles video URLs properly

### Existing Capabilities:
- Video upload and management
- Clip generation via autoClipEngine
- Content ideas, captions, hashtags generation
- System monitoring and repair
- Error analysis

---

## Plan Overview

### Files to CREATE:
1. `backend/services/aiGodMode.js` - GOD MODE capabilities
2. `backend/services/viralClipFactory.js` - Auto viral clip pipeline
3. `backend/services/sceneAnalyzer.js` - AI scene detection
4. `backend/services/viralCaptionService.js` - Viral caption generator
5. `backend/services/hashtagGenerator.js` - Hashtag generator
6. `backend/services/memoryOptimizer.js` - 8GB RAM memory manager

### Files to MODIFY:
1. `backend/services/commandParserService.js` - Add GOD MODE commands
2. `backend/services/taskExecutionService.js` - Handle new tasks
3. `backend/services/overlordCoreService.js` - Integrate GOD MODE
4. `frontend/src/components/ai/OverlordFloatingAI.jsx` - Add GOD MODE buttons
5. `frontend/src/api/api.js` - Add new API endpoints

---

## Implementation Steps

### Step 1: Create aiGodMode.js (New Service)
- System scan capability
- Auto fix errors
- Restart services
- Analyze logs
- Optimize memory
- Clean temp files
- Scan uploads folder
- Rebuild video index

### Step 2: Create viralClipFactory.js (New Service)
- Download video from URL
- Analyze scenes using sceneAnalyzer
- Detect highlights
- Generate 10-30 clips
- Generate captions for each clip
- Generate hashtags

### Step 3: Create sceneAnalyzer.js (New Service)
- Use FFmpeg scene detection
- Detect high motion segments
- Detect loud audio peaks
- Return timestamps for clipping

### Step 4: Create viralCaptionService.js (New Service)
- Generate YouTube Shorts captions
- Generate TikTok captions
- Generate Instagram captions

### Step 5: Create hashtagGenerator.js (New Service)
- Generate 10-20 viral hashtags
- Based on video topic analysis

### Step 6: Create memoryOptimizer.js (New Service)
- Limit FFmpeg concurrency
- Clean temp folder
- Reduce cache usage
- Release idle workers
- Auto-run when memory > threshold

### Step 7: Update commandParserService.js
- Add GOD MODE keywords:
  - "fix system"
  - "analyze server"
  - "optimize memory"
  - "scan errors"
  - "repair files"
  - "download video [url]"
  - "generate clips"
  - "create viral captions"
  - "generate hashtags"

### Step 8: Update taskExecutionService.js
- Handle new GOD MODE tasks
- Handle viral clip generation tasks

### Step 9: Update overlordCoreService.js
- Import and integrate aiGodMode
- Add GOD MODE quick actions

### Step 10: Update OverlordFloatingAI.jsx
- Add "Optimize Memory" button
- Add "Generate Viral Clips" button
- Add GOD MODE command buttons

### Step 11: Update api.js
- Add API calls for new services

---

## Testing Checklist
- [ ] Videos play in Dashboard
- [ ] GOD MODE commands work
- [ ] Viral clip factory generates clips
- [ ] Memory optimizer runs
- [ ] All existing features still work

