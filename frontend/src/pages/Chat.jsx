import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Circle,
  Bot,
  Bell,
  BellOff,
  Wifi,
  WifiOff
} from 'lucide-react';

// Get backend port from environment or use default
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 3001;
const API_URL = `http://localhost:${BACKEND_PORT}/api`;
const SOCKET_URL = `http://localhost:${BACKEND_PORT}`;

// Dummy token for bypassing authentication
const DUMMY_TOKEN = "clipperai_bypass_token";

// Current user (simulated - in real app would come from auth)
const CURRENT_USER = {
  id: 1,
  username: 'Admin',
  role: 'admin'
};

// Team members with online status
const MOCK_TEAM_MEMBERS = [
  { id: 1, username: 'Admin', role: 'admin', online: true },
  { id: 2, username: 'Editor', role: 'editor', online: false },
  { id: 3, username: 'Viewer', role: 'viewer', online: false }
];

// API functions
const apiFetch = async (endpoint, options = {}) => {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DUMMY_TOKEN}`,
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'API unavailable' };
  }
};

// Memoized Team Member Item
const TeamMemberItem = memo(({ member, isSelected, onClick, isOnline }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
      isSelected 
        ? 'bg-purple-600/20 border border-purple-500/30' 
        : 'hover:bg-gray-800/50'
    }`}
  >
    <div className="relative">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
        {member.username.charAt(0).toUpperCase()}
      </div>
      <Circle 
        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
          isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'
        }`}
        fill="currentColor"
      />
    </div>
    <div className="flex-1 text-left">
      <div className="text-sm font-medium text-white">{member.username}</div>
      <div className="text-xs text-gray-500 capitalize">{member.role}</div>
    </div>
  </button>
));

TeamMemberItem.displayName = 'TeamMemberItem';

// Memoized Message Bubble with timestamp
const MessageBubble = memo(({ message, isOwn }) => {
  const isAI = message.type === 'ai';
  
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // More than 24 hours
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className={`px-4 py-2.5 rounded-2xl ${
          isAI
            ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30'
            : isOwn 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}>
          {isAI && (
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Clipper AI</span>
            </div>
          )}
          {!isOwn && !isAI && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-medium">{message.sender}</span>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
        </div>
        <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTimestamp(message.createdAt)}
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Main Chat Component
const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [teamMembers, setTeamMembers] = useState(MOCK_TEAM_MEMBERS);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  
  // Socket and connection states
  const [socketConnected, setSocketConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Check if user was previously at bottom
  const isAtBottom = useRef(true);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    let ws = null;

    const connectSocket = () => {
      try {
        ws = io(SOCKET_URL, {
          path: '/socket.io',
          transports: ['websocket'],  // Websocket only for 8GB RAM optimization
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
        });

        ws.on('connect', () => {
          console.log('[Chat] Socket connected');
          setSocketConnected(true);
          
          // Join chat room
          ws.emit('join_chat', { userId: CURRENT_USER.id });
        });

        ws.on('disconnect', () => {
          console.log('[Chat] Socket disconnected');
          setSocketConnected(false);
        });

        ws.on('chat_message', (data) => {
          // Don't add own messages again
          if (data.senderId !== CURRENT_USER.id) {
            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(m => m.id === data.id);
              if (exists) return prev;
              return [...prev, data];
            });
            
            // Show notification if not at bottom or notifications enabled
            if (!isAtBottom.current || !notificationsEnabled) {
              setUnreadCount(prev => prev + 1);
            }
          }
        });

        ws.on('typing', (data) => {
          if (data.userId !== CURRENT_USER.id) {
            setTyping(true);
            setTypingUser(data.username);
          }
        });

        ws.on('stop_typing', () => {
          setTyping(false);
          setTypingUser(null);
        });

        ws.on('user_status', (data) => {
          // Update team member status
          setTeamMembers(prev => prev.map(m => 
            m.id === data.userId ? { ...m, online: data.online } : m
          ));
        });

        ws.on('connect_error', (err) => {
          console.error('[Chat] Socket connection error:', err.message);
          setSocketConnected(false);
        });

        socketRef.current = ws;
      } catch (error) {
        console.error('[Chat] Failed to initialize socket:', error);
        // Fallback to polling if socket fails
      }
    };

    connectSocket();

    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, [notificationsEnabled]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [messages, scrollToBottom]);

  // Clear unread count when user scrolls to bottom
  useEffect(() => {
    if (isAtBottom.current) {
      setUnreadCount(0);
    }
  }, [isAtBottom.current]);

  // Load initial data
  useEffect(() => {
    const loadChatData = async () => {
      setLoading(true);
      try {
        // Try to fetch messages from API
        const messagesResult = await apiFetch('/chat/messages');
        if (messagesResult?.success && messagesResult.data?.length > 0) {
          setMessages(messagesResult.data);
        } else {
          // Use mock messages
          setMessages([
            { id: 1, sender: 'Editor', senderId: 2, message: 'Video 12 finished processing!', type: 'user', createdAt: new Date(Date.now() - 300000).toISOString() },
            { id: 2, sender: 'Clipper AI', senderId: 0, message: 'Great! Video #12 has been processed successfully with high viral score.', type: 'ai', createdAt: new Date(Date.now() - 240000).toISOString() },
            { id: 3, sender: 'Admin', senderId: 1, message: 'Good job team!', type: 'user', createdAt: new Date(Date.now() - 180000).toISOString() }
          ]);
        }

        // Try to fetch team members
        const teamResult = await apiFetch('/chat/team');
        if (teamResult?.success && teamResult.data?.length > 0) {
          setTeamMembers(teamResult.data);
        }
        
        // Fetch initial status
        const statusResult = await apiFetch('/chat/status');
        if (statusResult?.success && statusResult.data?.length > 0) {
          setTeamMembers(prev => prev.map(m => {
            const status = statusResult.data.find(s => s.userId === m.id);
            return status ? { ...m, online: status.online } : m;
          }));
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { 
        userId: CURRENT_USER.id, 
        username: CURRENT_USER.username 
      });
    }
  }, []);

  const handleStopTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop_typing', { 
        userId: CURRENT_USER.id 
      });
    }
  }, []);

  // Send message
  const handleSendMessage = useCallback(async (e) => {
    e?.preventDefault();
    
    if (!inputMessage.trim() || sending) return;
    
    const messageText = inputMessage.trim();
    setInputMessage('');
    setSending(true);
    
    // Stop typing indicator
    handleStopTyping();

    try {
      // Create user message
      const userMessage = {
        id: Date.now(),
        sender: CURRENT_USER.username,
        senderId: CURRENT_USER.id,
        message: messageText,
        type: 'user',
        createdAt: new Date().toISOString()
      };

      // Add message to UI immediately
      setMessages(prev => [...prev, userMessage]);

      // Send via socket if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('chat_message', userMessage);
      }

      // Also save to API for persistence
      await apiFetch('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          sender: CURRENT_USER.username,
          senderId: CURRENT_USER.id,
          message: messageText,
          type: 'user'
        })
      });

      // Check for AI commands
      if (messageText.startsWith('/')) {
        const commandResult = await apiFetch('/chat/command', {
          method: 'POST',
          body: JSON.stringify({
            command: messageText,
            userId: CURRENT_USER.id,
            username: CURRENT_USER.username
          })
        });

        if (commandResult?.success && commandResult?.data) {
          setMessages(prev => [...prev, commandResult.data]);
          if (socketRef.current?.connected) {
            socketRef.current.emit('chat_message', commandResult.data);
          }
        }
      } else {
        // Check if should trigger AI response (admin offline)
        const adminOnline = teamMembers.find(m => m.username.toLowerCase() === 'admin')?.online;
        
        if (!adminOnline) {
          setTyping(true);
          
          // Simulate AI typing delay
          setTimeout(async () => {
            try {
              const aiResult = await apiFetch('/chat/ai', {
                method: 'POST',
                body: JSON.stringify({
                  sender: CURRENT_USER.username,
                  senderId: CURRENT_USER.id,
                  message: messageText
                })
              });

              if (aiResult?.success && aiResult?.data) {
                setMessages(prev => [...prev, aiResult.data]);
                if (socketRef.current?.connected) {
                  socketRef.current.emit('chat_message', aiResult.data);
                }
              }
            } catch (error) {
              console.error('AI response error:', error);
            } finally {
              setTyping(false);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputMessage, sending, teamMembers, handleStopTyping]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((e) => {
    setInputMessage(e.target.value);
    
    // Throttle typing indicator
    if (e.target.value && !typing) {
      handleTyping();
    }
    
    // Stop typing after 1 second of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  }, [handleTyping, handleStopTyping]);

  const typingTimeoutRef = useRef(null);

  // Handle input key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Toggle notifications
  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => !prev);
    if (!notificationsEnabled) {
      setUnreadCount(0);
    }
  }, [notificationsEnabled]);

  // Get admin online status
  const adminOnline = teamMembers.find(m => m.username.toLowerCase() === 'admin')?.online;
  const onlineMembers = teamMembers.filter(m => m.online).length;

  return (
    <div className="min-h-screen relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 h-[calc(100vh-48px)] flex">
        {/* LEFT PANEL - Team Members */}
        <div className="w-72 bg-[#111827] border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Team</h2>
              <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                {onlineMembers} online
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Team members</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {teamMembers.map(member => (
              <TeamMemberItem
                key={member.id}
                member={member}
                isSelected={selectedMember?.id === member.id}
                onClick={() => setSelectedMember(member)}
                isOnline={member.online}
              />
            ))}
          </div>

          {/* AI Status */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50">
              <Bot className="w-4 h-4 text-purple-400" />
              <div className="flex-1">
                <div className="text-sm text-white">Clipper AI</div>
                <div className="text-xs text-gray-500">
                  {adminOnline ? 'Idle (Admin online)' : 'Active'}
                </div>
              </div>
              <Circle 
                className={`w-2 h-2 ${
                  adminOnline ? 'fill-gray-500 text-gray-500' : 'fill-green-500 text-green-500'
                }`}
                fill="currentColor"
              />
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Chat Conversation */}
        <div className="flex-1 flex flex-col bg-[#0b0f1a]">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-800 bg-[#111827]/50">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Team Chat</h2>
              
              {/* Connection Status */}
              <div className="ml-auto flex items-center gap-2">
                {socketConnected ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-xs">Reconnecting...</span>
                  </div>
                )}
                
                {/* Notification Toggle */}
                <button
                  onClick={toggleNotifications}
                  className="ml-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-4 h-4 text-gray-400" />
                  ) : (
                    <BellOff className="w-4 h-4 text-red-400" />
                  )}
                </button>
                
                {/* Unread Badge */}
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>No messages yet. Start a conversation!</p>
                <p className="text-xs mt-2">Use /analytics, /team, or /upload status for AI commands</p>
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence>
                  {messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.senderId === CURRENT_USER.id}
                    />
                  ))}
                </AnimatePresence>
                
                {/* Typing indicator */}
                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start mb-3"
                  >
                    <div className="px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* BOTTOM INPUT */}
          <div className="p-4 border-t border-gray-800 bg-[#111827]/50">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message... (use / for commands)"
                  disabled={sending}
                  className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </form>
            <div className="mt-2 text-xs text-gray-500">
              Commands: <span className="text-purple-400">/analytics</span> <span className="text-purple-400">/team</span> <span className="text-purple-400">/upload status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

