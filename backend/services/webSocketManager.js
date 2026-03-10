/**
 * ClipperAi2026 Enterprise - WebSocket Manager
 * Real-time job tracking and notifications
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map(); // clientId -> { ws, userId, subscriptions }
    this.jobSubscriptions = new Map(); // jobId -> Set of clientIds
    
    this._setupWebSocketServer();
    logger.info('[WebSocket] Manager initialized');
  }

  /**
   * Setup WebSocket server
   * @private
   */
  _setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      
      this.clients.set(clientId, {
        ws,
        userId: null,
        subscriptions: new Set(),
        connectedAt: new Date().toISOString()
      });

      logger.info(`[WebSocket] Client ${clientId} connected`);

      // Send welcome message
      this._sendToClient(clientId, {
        type: 'connected',
        clientId,
        message: 'Connected to ClipperAi2026 real-time updates'
      });

      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this._handleMessage(clientId, data);
        } catch (error) {
          logger.error('[WebSocket] Message parse error:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this._handleDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`[WebSocket] Client ${clientId} error:`, error);
      });

      // Heartbeat to keep connection alive
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    // Error handling
    this.wss.on('error', (error) => {
      logger.error('[WebSocket] Server error:', error);
    });
  }

  /**
   * Handle incoming messages
   * @param {string} clientId - Client ID
   * @param {Object} data - Message data
   * @private
   */
  _handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'auth':
        // Authenticate client with user ID
        client.userId = data.userId;
        this._sendToClient(clientId, {
          type: 'authenticated',
          userId: data.userId
        });
        logger.info(`[WebSocket] Client ${clientId} authenticated as user ${data.userId}`);
        break;

      case 'subscribe':
        // Subscribe to job updates
        if (data.jobId) {
          this._subscribeToJob(clientId, data.jobId);
        }
        // Subscribe to user jobs
        if (data.userId) {
          client.userId = data.userId;
        }
        break;

      case 'unsubscribe':
        // Unsubscribe from job updates
        if (data.jobId) {
          this._unsubscribeFromJob(clientId, data.jobId);
        }
        break;

      case 'ping':
        this._sendToClient(clientId, { type: 'pong' });
        break;

      default:
        logger.warn(`[WebSocket] Unknown message type: ${data.type}`);
    }
  }

  /**
   * Handle client disconnect
   * @param {string} clientId - Client ID
   * @private
   */
  _handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from job subscriptions
      client.subscriptions.forEach((jobId) => {
        this._unsubscribeFromJob(clientId, jobId);
      });
      
      this.clients.delete(clientId);
      logger.info(`[WebSocket] Client ${clientId} disconnected`);
    }
  }

  /**
   * Subscribe client to job updates
   * @param {string} clientId - Client ID
   * @param {string} jobId - Job ID
   * @private
   */
  _subscribeToJob(clientId, jobId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.jobSubscriptions.has(jobId)) {
      this.jobSubscriptions.set(jobId, new Set());
    }
    
    this.jobSubscriptions.get(jobId).add(clientId);
    client.subscriptions.add(jobId);
    
    logger.info(`[WebSocket] Client ${clientId} subscribed to job ${jobId}`);
  }

  /**
   * Unsubscribe client from job updates
   * @param {string} clientId - Client ID
   * @param {string} jobId - Job ID
   * @private
   */
  _unsubscribeFromJob(clientId, jobId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(jobId);
    
    if (this.jobSubscriptions.has(jobId)) {
      this.jobSubscriptions.get(jobId).delete(clientId);
      if (this.jobSubscriptions.get(jobId).size === 0) {
        this.jobSubscriptions.delete(jobId);
      }
    }
    
    logger.info(`[WebSocket] Client ${clientId} unsubscribed from job ${jobId}`);
  }

  /**
   * Send message to specific client
   * @param {string} clientId - Client ID
   * @param {Object} data - Data to send
   * @private
   */
  _sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error(`[WebSocket] Send error to ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Broadcast job update to all subscribed clients
   * @param {string} jobId - Job ID
   * @param {Object} jobData - Job data
   */
  broadcastJobUpdate(jobId, jobData) {
    const subscribers = this.jobSubscriptions.get(jobId) || new Set();
    
    const message = {
      type: 'job_update',
      jobId,
      data: jobData,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach((clientId) => {
      this._sendToClient(clientId, message);
    });

    // Also broadcast to all authenticated users
    this.clients.forEach((client, clientId) => {
      if (client.userId && !subscribers.has(clientId)) {
        // User might want to see all their jobs
        this._sendToClient(clientId, message);
      }
    });

    logger.info(`[WebSocket] Broadcast job update for ${jobId} to ${subscribers.size} clients`);
  }

  /**
   * Broadcast job progress
   * @param {string} jobId - Job ID
   * @param {number} progress - Progress percentage
   * @param {string} status - Job status
   * @param {Object} additionalData - Additional data
   */
  broadcastJobProgress(jobId, progress, status, additionalData = {}) {
    const subscribers = this.jobSubscriptions.get(jobId) || new Set();
    
    const message = {
      type: 'job_progress',
      jobId,
      progress,
      status,
      ...additionalData,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach((clientId) => {
      this._sendToClient(clientId, message);
    });
  }

  /**
   * Broadcast job completion
   * @param {string} jobId - Job ID
   * @param {Object} result - Job result
   */
  broadcastJobComplete(jobId, result) {
    const subscribers = this.jobSubscriptions.get(jobId) || new Set();
    
    const message = {
      type: 'job_complete',
      jobId,
      result,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach((clientId) => {
      this._sendToClient(clientId, message);
    });

    // Clean up subscriptions
    this.jobSubscriptions.delete(jobId);
  }

  /**
   * Broadcast job error
   * @param {string} jobId - Job ID
   * @param {string} error - Error message
   */
  broadcastJobError(jobId, error) {
    const subscribers = this.jobSubscriptions.get(jobId) || new Set();
    
    const message = {
      type: 'job_error',
      jobId,
      error,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach((clientId) => {
      this._sendToClient(clientId, message);
    });
  }

  /**
   * Broadcast queue status update
   * @param {Object} queueStatus - Queue status
   */
  broadcastQueueStatus(queueStatus) {
    const message = {
      type: 'queue_status',
      data: queueStatus,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client, clientId) => {
      this._sendToClient(clientId, message);
    });
  }

  /**
   * Broadcast viral score update
   * @param {string} videoId - Video ID
   * @param {Object} scoreData - Score data
   */
  broadcastViralScore(videoId, scoreData) {
    const message = {
      type: 'viral_score',
      videoId,
      data: scoreData,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client, clientId) => {
      this._sendToClient(clientId, message);
    });
  }

  /**
   * Send notification to specific user
   * @param {number} userId - User ID
   * @param {Object} notification - Notification data
   */
  sendNotificationToUser(userId, notification) {
    const message = {
      type: 'notification',
      ...notification,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client, clientId) => {
      if (client.userId === userId) {
        this._sendToClient(clientId, message);
      }
    });
  }

  /**
   * Get connected clients count
   * @returns {number} - Number of connected clients
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Get active subscriptions count
   * @returns {number} - Number of job subscriptions
   */
  getSubscriptionCount() {
    return this.jobSubscriptions.size;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach((client, clientId) => {
      client.ws.close(1001, 'Server shutting down');
    });

    // Close server
    this.wss.close(() => {
      logger.info('[WebSocket] Server closed');
    });

    this.clients.clear();
    this.jobSubscriptions.clear();
  }
}

module.exports = WebSocketManager;
