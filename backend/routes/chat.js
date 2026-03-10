/**
 * Chat Routes - Team Chat + AI Assistant API
 * Lightweight implementation for 8GB RAM optimization
 * Includes Socket.IO support for real-time messaging
 */

const express = require('express');
const router = express.Router();

// Use existing Prisma client
let prisma;
try {
  prisma = require('../prisma/client');
} catch (e) {
  console.error('[Chat] Prisma client not available:', e.message);
}

const aiChatService = require('../services/aiChatService');

// ==================== REST API ENDPOINTS ====================

// GET /api/chat/messages - Get chat messages
router.get('/messages', async (req, res) => {
  try {
    if (!prisma) {
      return res.json({ success: true, data: [] });
    }
    
    // Get last 100 messages
    const messages = await prisma.chatMessage.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    
    // Reverse to show oldest first
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('[Chat] Error getting messages:', error.message);
    res.json({ success: true, data: [] });
  }
});

// POST /api/chat/send - Send a message
router.post('/send', async (req, res) => {
  try {
    const { sender, senderId, message, type = 'user' } = req.body;
    
    if (!sender || !message) {
      return res.status(400).json({ success: false, error: 'Missing sender or message' });
    }
    
    if (!prisma) {
      return res.json({ success: true, data: { id: Date.now(), sender, message, type } });
    }
    
    // Save message to database
    const savedMessage = await prisma.chatMessage.create({
      data: {
        sender,
        senderId: senderId || 1,
        message,
        type
      }
    });
    
    res.json({ success: true, data: savedMessage });
  } catch (error) {
    console.error('[Chat] Error sending message:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/chat/command - Process AI command
router.post('/command', async (req, res) => {
  try {
    const { command, userId, username } = req.body;
    
    if (!command) {
      return res.status(400).json({ success: false, error: 'Missing command' });
    }
    
    // Handle /debug command - Bug Detection System
    if (command.toLowerCase().startsWith('/debug')) {
      let bugDetectionService;
      try {
        bugDetectionService = require('../services/bugDetectionService');
      } catch (e) {
        return res.json({
          success: true,
          data: {
            id: Date.now(),
            sender: 'Clipper AI',
            senderId: 0,
            message: 'Bug detection service is not available.',
            type: 'ai'
          }
        });
      }
      
      const diagnostic = bugDetectionService.getDiagnosticSummary();
      let debugMessage = '';
      
      if (!diagnostic.hasErrors) {
        debugMessage = 'System Diagnostics: No bugs detected. System is running smoothly.';
      } else {
        const latest = diagnostic.latest;
        debugMessage = 'System Diagnostics: Bug detected - ' + latest.errorType + ' in ' + latest.file + '. Suggestion: ' + latest.suggestion;
      }
      
      return res.json({
        success: true,
        data: {
          id: Date.now(),
          sender: 'Clipper AI',
          senderId: 0,
          message: debugMessage,
          type: 'ai'
        }
      });
    }
    
    // Handle /repair command - AI Repair Suggestions
    if (command.toLowerCase().startsWith('/repair')) {
      let bugDetectionService;
      try {
        bugDetectionService = require('../services/bugDetectionService');
      } catch (e) {
        return res.json({
          success: true,
          data: {
            id: Date.now(),
            sender: 'Clipper AI',
            senderId: 0,
            message: 'AI Repair Service not available.',
            type: 'ai'
          }
        });
      }
      
      const diagnostic = bugDetectionService.getDiagnosticSummary();
      let repairMessage = '';
      
      if (!diagnostic.hasErrors) {
        repairMessage = 'AI Repair: No errors detected. System is healthy. Use /debug to check for hidden issues.';
      } else {
        const latest = diagnostic.latest;
        repairMessage = 'AI Repair Suggestions:\n\nDetected: ' + latest.errorType + '\nFile: ' + latest.file + '\nLine: ' + (latest.line || 'Unknown') + '\n\nSuggested Fix: ' + latest.suggestion;
        
        if (latest.errorType === 'Prisma Field Error') {
          repairMessage += '\n\nCommon Fixes: viral_score -> viralScore, created_at -> createdAt, user_id -> userId';
        }
      }
      
      return res.json({
        success: true,
        data: {
          id: Date.now(),
          sender: 'Clipper AI',
          senderId: 0,
          message: repairMessage,
          type: 'ai'
        }
      });
    }
    
    if (!prisma) {
      return res.json({ 
        success: true, 
        data: { 
          id: Date.now(), 
          sender: 'Clipper AI', 
          senderId: 0, 
          message: 'AI response (DB not available)',
          type: 'ai' 
        } 
      });
    }
    
    // Process command
    const response = await aiChatService.processCommand(command, userId || 1, username || 'User', prisma);
    
    // Save AI response to database
    if (response) {
      await prisma.chatMessage.create({
        data: {
          sender: response.sender,
          senderId: response.senderId,
          message: response.message,
          type: response.type
        }
      });
    }
    
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('[Chat] Error processing command:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/chat/status - Get user status (online/offline)
router.get('/status', async (req, res) => {
  try {
    if (!prisma) {
      return res.json({ 
        success: true, 
        data: [
          { userId: 1, username: 'Admin', online: true, lastSeen: new Date() },
          { userId: 2, username: 'Editor', online: false, lastSeen: new Date() }
        ] 
      });
    }
    
    const statuses = await prisma.chatUserStatus.findMany({
      orderBy: { username: 'asc' }
    });
    
    res.json({ success: true, data: statuses });
  } catch (error) {
    console.error('[Chat] Error getting status:', error.message);
    res.json({ 
      success: true, 
      data: [
        { userId: 1, username: 'Admin', online: true, lastSeen: new Date() },
        { userId: 2, username: 'Editor', online: false, lastSeen: new Date() }
      ] 
    });
  }
});

// POST /api/chat/status - Update user status
router.post('/status', async (req, res) => {
  try {
    const { userId, username, online } = req.body;
    
    if (!prisma) {
      return res.json({ success: true, data: { userId, username, online } });
    }
    
    const status = await prisma.chatUserStatus.upsert({
      where: { userId },
      update: { online, lastSeen: new Date() },
      create: { userId, username, online, lastSeen: new Date() }
    });
    
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('[Chat] Error updating status:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/chat/team - Get team members with online status
router.get('/team', async (req, res) => {
  try {
    if (!prisma) {
      return res.json({ 
        success: true, 
        data: [
          { id: 1, username: 'Admin', role: 'admin', online: true },
          { id: 2, username: 'Editor', role: 'editor', online: false },
          { id: 3, username: 'Viewer', role: 'viewer', online: false }
        ] 
      });
    }
    
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true }
    });
    
    const statuses = await prisma.chatUserStatus.findMany();
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.userId] = s; });
    
    const teamData = users.map(user => ({
      ...user,
      online: statusMap[user.id]?.online || false,
      lastSeen: statusMap[user.id]?.lastSeen || null
    }));
    
    res.json({ success: true, data: teamData });
  } catch (error) {
    console.error('[Chat] Error getting team:', error.message);
    res.json({ 
      success: true, 
      data: [
        { id: 1, username: 'Admin', role: 'admin', online: true },
        { id: 2, username: 'Editor', role: 'editor', online: false }
      ] 
    });
  }
});

// POST /api/chat/ai - Send message to AI
router.post('/ai', async (req, res) => {
  try {
    const { sender, senderId, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Missing message' });
    }
    
    if (!prisma) {
      return res.json({ 
        success: true, 
        data: { 
          id: Date.now(), 
          sender: 'Clipper AI', 
          senderId: 0, 
          message: 'AI response (DB not available)',
          type: 'ai' 
        } 
      });
    }
    
    const aiResponse = await aiChatService.processAIChat(message, senderId || 1, sender || 'User', prisma);
    
    res.json({ success: true, data: aiResponse });
  } catch (error) {
    console.error('[Chat] Error processing AI chat:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SOCKET.IO HANDLER ====================
const setupChatSocket = (io) => {
  const chatNamespace = io.of('/chat');
  
  chatNamespace.on('connection', (socket) => {
    console.log('[Chat] Client connected:', socket.id);
    
    let currentUser = null;
    
    socket.on('join_chat', (data) => {
      currentUser = {
        id: data.userId,
        username: data.username || 'User'
      };
      socket.join('chat_room');
      console.log('[Chat] User joined:', currentUser.username);
      
      socket.to('chat_room').emit('user_joined', {
        username: currentUser.username,
        userId: currentUser.id
      });
    });
    
    socket.on('chat_message', async (data) => {
      console.log('[Chat] Received message:', data.message?.substring(0, 50));
      
      chatNamespace.to('chat_room').emit('chat_message', data);
      
      if (data.message?.startsWith('/') && prisma) {
        try {
          const response = await aiChatService.processCommand(
            data.message,
            data.senderId,
            data.sender,
            prisma
          );
          
          if (response) {
            chatNamespace.to('chat_room').emit('chat_message', response);
          }
        } catch (error) {
          console.error('[Chat] Command error:', error.message);
        }
      }
      else if (prisma) {
        try {
          const adminIsOnline = await aiChatService.isAdminOnline(prisma);
          
          if (!adminIsOnline) {
            chatNamespace.to('chat_room').emit('typing', {
              userId: 0,
              username: 'Clipper AI'
            });
            
            const aiResponse = await aiChatService.processAIChat(
              data.message,
              data.senderId,
              data.sender,
              prisma
            );
            
            if (aiResponse) {
              setTimeout(() => {
                chatNamespace.to('chat_room').emit('stop_typing', {});
                chatNamespace.to('chat_room').emit('chat_message', aiResponse);
              }, 500);
            }
          }
        } catch (error) {
          console.error('[Chat] AI response error:', error.message);
        }
      }
    });
    
    socket.on('typing', (data) => {
      socket.to('chat_room').emit('typing', data);
    });
    
    socket.on('stop_typing', (data) => {
      socket.to('chat_room').emit('stop_typing', data);
    });
    
    socket.on('user_status', async (data) => {
      if (prisma) {
        try {
          await prisma.chatUserStatus.upsert({
            where: { userId: data.userId },
            update: { online: data.online, lastSeen: new Date() },
            create: { userId: data.userId, username: data.username, online: data.online, lastSeen: new Date() }
          });
        } catch (e) {}
      }
      socket.to('chat_room').emit('user_status', data);
    });
    
    socket.on('disconnect', () => {
      console.log('[Chat] Client disconnected:', socket.id);
      
      if (currentUser) {
        socket.to('chat_room').emit('user_left', {
          username: currentUser.username,
          userId: currentUser.id
        });
        
        if (prisma) {
          prisma.chatUserStatus.upsert({
            where: { userId: currentUser.id },
            update: { online: false, lastSeen: new Date() },
            create: { userId: currentUser.id, username: currentUser.username, online: false, lastSeen: new Date() }
          }).catch(() => {});
        }
      }
    });
  });
  
  console.log('[Chat] Socket.IO namespace setup complete');
};

module.exports = router;
module.exports.setupChatSocket = setupChatSocket;
module.exports.aiChatService = aiChatService;

