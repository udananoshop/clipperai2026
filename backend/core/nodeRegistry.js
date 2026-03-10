/**
 * OVERLORD PRO MODE - Phase 2
 * Node Registry - In-Memory Distributed Node Tracking
 * 
 * Responsibilities:
 * - Register/unregister nodes
 * - Track active nodes with heartbeats
 * - Auto-remove inactive nodes after timeout (60s)
 * - No external dependencies (no Redis)
 * 
 * Optimized for: Ryzen 3 (8GB RAM)
 */

const logger = require('../utils/logger');

// Node registry storage
const nodes = new Map();

// Configuration
const NODE_TIMEOUT_MS = parseInt(process.env.NODE_TIMEOUT_MS) || 60000; // 60s default
const HEARTBEAT_INTERVAL = parseInt(process.env.NODE_HEARTBEAT_INTERVAL) || 30000; // 30s

// Node Registry API
const nodeRegistry = {
  /**
   * Register a new node
   * @param {string} nodeId - Unique node identifier
   * @param {Object} metadata - Node metadata (capabilities, etc.)
   * @returns {Object} Registration result
   */
  registerNode(nodeId, metadata = {}) {
    const now = Date.now();
    
    // Check if node already registered
    if (nodes.has(nodeId)) {
      const existingNode = nodes.get(nodeId);
      existingNode.lastHeartbeat = now;
      existingNode.metadata = { ...existingNode.metadata, ...metadata };
      
      logger.info('Node heartbeat updated', { nodeId });
      
      return {
        success: true,
        nodeId,
        status: 'heartbeat_updated',
        activeNodes: nodes.size
      };
    }
    
    // Register new node
    const node = {
      nodeId,
      registeredAt: now,
      lastHeartbeat: now,
      metadata: {
        ...metadata,
        capabilities: metadata.capabilities || ['local-execution']
      },
      status: 'active'
    };
    
    nodes.set(nodeId, node);
    
    logger.info('Node registered', {
      nodeId,
      activeNodes: nodes.size,
      capabilities: node.metadata.capabilities
    });
    
    console.log(`[NodeRegistry] Node registered: ${nodeId} (${nodes.size} active)`);
    
    return {
      success: true,
      nodeId,
      status: 'registered',
      activeNodes: nodes.size
    };
  },
  
  /**
   * Unregister a node
   * @param {string} nodeId - Node identifier
   * @returns {Object} Unregistration result
   */
  unregisterNode(nodeId) {
    if (!nodes.has(nodeId)) {
      return {
        success: false,
        reason: 'node_not_found'
      };
    }
    
    nodes.delete(nodeId);
    
    logger.info('Node unregistered', { nodeId, activeNodes: nodes.size });
    console.log(`[NodeRegistry] Node unregistered: ${nodeId} (${nodes.size} active)`);
    
    return {
      success: true,
      nodeId,
      activeNodes: nodes.size
    };
  },
  
  /**
   * Update node heartbeat
   * @param {string} nodeId - Node identifier
   * @returns {Object} Heartbeat result
   */
  heartbeat(nodeId) {
    const node = nodes.get(nodeId);
    
    if (!node) {
      return {
        success: false,
        reason: 'node_not_found'
      };
    }
    
    node.lastHeartbeat = Date.now();
    node.status = 'active';
    
    return {
      success: true,
      nodeId,
      lastHeartbeat: node.lastHeartbeat
    };
  },
  
  /**
   * Get all active nodes
   * @returns {Array} Active nodes list
   */
  getActiveNodes() {
    const now = Date.now();
    const activeNodes = [];
    
    for (const [nodeId, node] of nodes) {
      // Check if node is still responsive
      const timeSinceHeartbeat = now - node.lastHeartbeat;
      
      if (timeSinceHeartbeat > NODE_TIMEOUT_MS) {
        // Node timed out - remove it
        nodes.delete(nodeId);
        logger.warn('Node removed due to timeout', { nodeId, timeSinceHeartbeat });
        console.log(`[NodeRegistry] Node timeout: ${nodeId}`);
        continue;
      }
      
      activeNodes.push({
        nodeId: node.nodeId,
        registeredAt: node.registeredAt,
        lastHeartbeat: node.lastHeartbeat,
        status: node.status,
        metadata: node.metadata,
        responseTimeMs: timeSinceHeartbeat
      });
    }
    
    return activeNodes;
  },
  
  /**
   * Get node count
   * @returns {number} Active node count
   */
  getActiveNodeCount() {
    return this.getActiveNodes().length;
  },
  
  /**
   * Get specific node info
   * @param {string} nodeId - Node identifier
   * @returns {Object|null} Node info or null
   */
  getNode(nodeId) {
    const node = nodes.get(nodeId);
    
    if (!node) {
      return null;
    }
    
    return {
      nodeId: node.nodeId,
      registeredAt: node.registeredAt,
      lastHeartbeat: node.lastHeartbeat,
      status: node.status,
      metadata: node.metadata
    };
  },
  
  /**
   * Get registry status
   * @returns {Object} Status object
   */
  getStatus() {
    const activeNodes = this.getActiveNodes();
    
    return {
      totalNodes: nodes.size,
      activeNodes: activeNodes.length,
      nodes: activeNodes,
      config: {
        nodeTimeoutMs: NODE_TIMEOUT_MS,
        heartbeatIntervalMs: HEARTBEAT_INTERVAL
      }
    };
  },
  
  /**
   * Clean up all nodes (for testing)
   * @returns {number} Number of nodes cleared
   */
  clearAll() {
    const count = nodes.size;
    nodes.clear();
    return count;
  }
};

// Periodic cleanup of inactive nodes
let cleanupInterval = null;

/**
 * Start periodic cleanup
 */
function startCleanup() {
  if (cleanupInterval) {
    return;
  }
  
  cleanupInterval = setInterval(() => {
    const before = nodes.size;
    nodeRegistry.getActiveNodes(); // This triggers cleanup
    const after = nodes.size;
    
    if (before !== after) {
      console.log(`[NodeRegistry] Cleanup: ${before - after} nodes removed`);
    }
  }, HEARTBEAT_INTERVAL);
  
  console.log(`[NodeRegistry] Cleanup started (interval: ${HEARTBEAT_INTERVAL}ms)`);
}

/**
 * Stop periodic cleanup
 */
function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[NodeRegistry] Cleanup stopped');
  }
}

module.exports = {
  nodeRegistry,
  startCleanup,
  stopCleanup,
  getActiveNodes: () => nodeRegistry.getActiveNodes(),
  getActiveNodeCount: () => nodeRegistry.getActiveNodeCount()
};
