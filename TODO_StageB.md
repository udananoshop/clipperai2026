# OVERLORD STAGE B - IMPLEMENTATION TODO

## Task: Scene + Emotion AI Enhancement

### 1. Enhance sceneEmotionEngine.js
- [ ] Add FFmpeg scene change detection (select='gt(scene,0.35)')
- [ ] Add FFmpeg audio energy detection (volumedetect)
- [ ] Implement emotion score formula: (sceneChange * 30) + (audioEnergy * 0.5) + (speechPresence * 20)
- [ ] Add segment filtering rules (ignore <2.5s, boost 5-30s, keep top 5-8)
- [ ] Add [StageB] logging prefix

### 2. Modify autoClipEngine.js
- [ ] Inject sceneEmotionEngine.analyze() BEFORE SmartCut V3
- [ ] If segments found: use those segments
- [ ] If no segments: fallback to SmartCut V3 (DO NOT remove fallback)
- [ ] Add [StageB] logging
- [ ] Add 2-second cooldown between renders
- [ ] Ensure 8GB RAM safety (single job processing)

### 3. Testing
- [ ] Verify console shows "[StageB] Scene detection active"
- [ ] Verify console shows "[StageB] Emotion AI active"
- [ ] Verify SmartCut V3 still works as fallback
- [ ] Verify clips don't cut mid-sentence
