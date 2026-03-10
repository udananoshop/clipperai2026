/**
 * OVERLORD PRO MODE - Phase 2
 * Task Distributor - Lightweight Distributed Job Distribution
 * 
 * Responsibilities:
 * - Distribute jobs across registered nodes
 * - Simple round-robin logic
 * - Fallback to local execution if no nodes available
 * - Async-safe operations
 * 
 * No external dependencies (no Redis, no message queues)
 */

const logger = require('../utils/logger');

// Round-robin index tracker (atomic-safe via JavaScript single-threaded nature)
let roundRobinIndex = 0;

/**
 * Get next node using round-robin
 * @param {Array} nodes - Available nodes
 * @returns {Object|null} Selected node or null
 */
function getNextNodeRoundRobin(nodes) {
  if (!nodes || nodes.length === 0) {
    return null;
  }
  
  const node = nodes[roundRobinIndex % nodes.length];
  roundRobinIndex++;
  
  return node;
}

/**
 * Reset round-robin index
 */
function resetRoundRobin() {
  roundRobinIndex = 0;
}

/**
 * Task Distributor API
 */
const taskDistributor = {
  /**
   * Distribute a job to an available node
   * @param {Object} job - Job object
   * @param {Array} nodes - Available nodes
   * @returns {Object} Distribution result
   */
  distributeJob(job, nodes = []) {
    const jobId = job.id || job.jobId || 'unknown';
    
    // Get active nodes
    let availableNodes = nodes;
    
    // If no nodes provided, try to get from nodeRegistry
    if (!nodes || nodes.length === 0) {
      try {
        const nodeRegistry = require('./nodeRegistry');
        availableNodes = nodeRegistry.getActiveNodes();
      } catch (err) {
        // NodeRegistry not available
        availableNodes = [];
      }
    }
    
    // Fallback: No nodes available - execute locally
    if (availableNodes.length === 0) {
      logger.warn('No nodes available for job, executing locally', { jobId });
      
      return {
        success: true,
        jobId,
        distributed: false,
        executionMode: 'local',
        reason: 'no_nodes_available',
        node: null
      };
    }
    
    // Select node using round-robin
    const selectedNode = getNextNodeRoundRobin(availableNodes);
    
    if (!selectedNode) {
      logger.warn('Failed to select node for job, executing locally', { jobId });
      
      return {
        success: true,
        jobId,
        distributed: false,
        executionMode: 'local',
        reason: 'node_selection_failed',
        node: null
      };
    }
    
    // Job distributed to remote node
    logger.info('Job distributed to node', {
      jobId,
      nodeId: selectedNode.nodeId,
      availableNodes: availableNodes.length
    });
    
    console.log(`[TaskDistributor] Job ${jobId} distributed to ${selectedNode.nodeId}`);
    
    return {
      success: true,
      jobId,
      distributed: true,
      executionMode: 'distributed',
      node: {
        nodeId: selectedNode.nodeId,
        capabilities: selectedNode.metadata?.capabilities || []
      },
      nodeCount: availableNodes.length
    };
  },
  
  /**
   * Check if distributed mode is available
   * @returns {Object} Availability status
   */
  isDistributedModeAvailable() {
    try {
      const nodeRegistry = require('./nodeRegistry');
      const nodeCount = nodeRegistry.getActiveNodeCount();
      
      return {
        available: nodeCount > 0,
        nodeCount,
        mode: nodeCount > 0 ? 'distributed' : 'local'
      };
    } catch (err) {
      return {
        available: false,
        nodeCount: 0,
        mode: 'local',
        reason: 'node_registry_unavailable'
      };
    }
  },
  
  /**
   * Get distribution statistics
   * @returns {Object} Stats object
   */
  getStats() {
    const availability = this.isDistributedModeAvailable();
    
    return {
      mode: availability.mode,
      nodeCount: availability.nodeCount,
      roundRobinIndex,
      distributedEnabled: process.env.ENABLE_DISTRIBUTED_MODE === 'true'
    };
  },
  
  /**
   * Reset distributor state
   */
  reset() {
    resetRoundRobin();
  }
};

module.exports = taskDistributor;
