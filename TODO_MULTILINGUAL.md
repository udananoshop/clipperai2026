# Multilingual AI Chat System Upgrade Plan

## Information Gathered
- Current file: `backend/services/aiChatService.js`
- Contains hardcoded English AI responses
- Has existing logic for:
  - Admin online detection (AI silent)
  - Admin offline (AI auto reply)
  - Command processing (/analytics, /team, /upload status)
  - Natural language processing for queries

## Plan: Add Multilingual Support to aiChatService.js

### 1. Add Language Detection Module
- Create `INDONESIAN_KEYWORDS` array: ["apa", "bagaimana", "kenapa", "bisa", "kamu", "tolong", "berapa"]
- Create `detectLanguage(message)` function that checks for Indonesian keywords
- Return detected language: 'indonesian' or 'english'

### 2. Create Response Templates
- Create `RESPONSE_TEMPLATES` object with both languages
- Templates needed:
  - Greeting
  - Help/Commands
  - Default suggestions
  - Error messages
  - All natural query responses

### 3. Modify Response Functions
- Pass detected language to all response generators
- Use template based on detected language

### 4. Keep Existing Logic Unchanged
- Admin online → AI silent (unchanged)
- Admin offline → AI auto reply (unchanged)
- All commands work identically

## Files to Edit
- `backend/services/aiChatService.js` - Main implementation

## Implementation Steps
1. Add language detection constants and function
2. Add response templates for both languages
3. Modify `processNaturalQuery` to use language detection
4. Modify `processCommand` to use language detection
5. Add language detection to `processAIChat` and pass to functions

## Testing
- Test Indonesian keywords detection
- Test English fallback
- Verify all responses work in both languages
- Verify admin online/offline logic unchanged

