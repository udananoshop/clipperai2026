# Auto Self-Repair Bug Detection System - Implementation Plan

## Task List

- [x] Analyze project structure and understand existing error handling
- [x] Create bugDetectionService.js - Core bug detection engine
- [x] Create bugDetectionRoutes.js - API endpoints for bug detection
- [x] Update server.js - Hook into global error handlers
- [x] Update chat.js - Add /debug command support
- [ ] Update Dashboard.jsx - Optional: Add System Diagnostics panel (backend is fully functional)

## Status: COMPLETED

### Completed Components:

#### 1. Bug Detection Service (backend/services/bugDetectionService.js)
- Error parsing and classification with 9 pattern types
- Pattern matching for common issues (Prisma, undefined, imports, API)
- Fix suggestion generation
- In-memory cache (last 10 errors) - 8GB RAM optimized
- Diagnostic summary for AI chat

#### 2. Bug Detection Routes (backend/routes/bugDetection.js)
- GET /api/bugs - Get all detected errors
- GET /api/bugs/latest - Get latest error
- GET /api/bugs/count - Get error count
- GET /api/bugs/summary - Get diagnostic summary
- GET /api/bugs/type/:type - Get errors by type
- GET /api/bugs/file/:file - Get errors by file
- DELETE /api/bugs - Clear error cache
- POST /api/bugs/detect - Manual test endpoint

#### 3. Server Integration
- Hooked into process.on('uncaughtException')
- Hooked into process.on('unhandledRejection')
- Bug detection runs automatically on errors

#### 4. AI Chat Integration
- Added /debug command to chat routes
- Shows diagnostic summary in chat
- Works without modifying existing aiChatService

### Testing the System:
1. Start the backend: `cd backend && node server.js`
2. Test bug detection endpoints:
   - GET /api/bugs/count
   - GET /api/bugs/summary
3. Use /debug command in chat to see diagnostics

### Notes
- Lightweight implementation for 8GB RAM
- Does not modify existing services
- Last 10 errors cached in memory
- Auto-detects runtime errors

