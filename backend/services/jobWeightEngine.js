/**
 * OVERLORD ELITE MODE - Phase 3
 * Intelligent Job Weighting Engine
 * 
 * Dynamic execution score system to determine which jobs should run first
 * No database writes - lightweight computation
 */

const logger = require('../utils/logger');

// Base priority weights
const BASE_PRIORITY_WEIGHTS = {
  high: 50,
  medium: 30,
  low: 10
};

// Constants
const MAX_AGING_BOOST = 20;
const AGING_BOOST_INTERVAL = 30000; // 30 seconds per boost point
const SYSTEM_LOAD_PENALTY_THRESHOLD_CPU = 80;
const SYSTEM_LOAD_PENALTY_THRESHOLD_MEM = 85;

/**
 * Calculate system load penalty based on current metrics
 * @param {Object} systemMetrics - CPU and memory usage
 * @returns {number} Penalty value (negative)
 */
function calculateSystemLoadPenalty(systemMetrics = {}) {
  const cpuUsage = systemMetrics.cpuUsage || 0;
  const memoryUsage = systemMetrics.memoryUsage || 0;
  
  let penalty = 0;
  
  if (cpuUsage > SYSTEM_LOAD_PENALTY_THRESHOLD_CPU) {
    penalty -= 15;
  }
  
  if (memoryUsage > SYSTEM_LOAD_PENALTY_THRESHOLD_MEM) {
    penalty -= 15;
  }
  
  return penalty;
}

/**
 * Calculate aging boost based on wait time
 * @param {number} waitTimeMs - Time job has been waiting in ms
 * @returns {number} Aging boost points (positive)
 */
function calculateAgingBoost(waitTimeMs) {
  if (!waitTimeMs || waitTimeMs <= 0) {
    return 0;
  }
  
  const boostPoints = Math.floor(waitTimeMs / AGING_BOOST_INTERVAL);
  return Math.min(boostPoints, MAX_AGING_BOOST);
}

/**
 * Get base priority weight
 * @param {string} priority - Job priority (high, medium, low)
 * @returns {number} Base weight
 */
function getBasePriorityWeight(priority) {
  return BASE_PRIORITY_WEIGHTS[priority] || BASE_PRIORITY_WEIGHTS.medium;
}

/**
 * Calculate execution score for a job
 * 
 * executionScore = 
 *   (basePriorityWeight * 2) +
 *   (aiFinalScore * 0.5) -
 *   (retryCount * 5) -
 *   (systemLoadPenalty) +
 *   (agingBoost)
 * 
 * @param {Object} job - Job object with priority, aiFinalScore, retryCount, startTime
 * @param {Object} systemMetrics - Current system metrics (cpuUsage, memoryUsage)
 * @returns {number} Execution score (higher = runs first)
 */
function calculateExecutionScore(job, systemMetrics = {}) {
  // Get base priority weight (multiplied by 2)
  const priority = job.priority || 'medium';
  const basePriorityWeight = getBasePriorityWeight(priority) * 2;
  
  // Get AI final score (fallback to 50 if undefined)
  const aiFinalScore = (job.aiFinalScore !== undefined) ? job.aiFinalScore : 50;
  const aiScoreComponent = aiFinalScore * 0.5;
  
  // Get retry penalty
  const retryCount = job.retryCount || 0;
  const retryPenalty = retryCount * 5;
  
  // Get system load penalty
  const systemLoadPenalty = calculateSystemLoadPenalty(systemMetrics);
  
  // Get aging boost
  const waitTimeMs = job.startTime ? (Date.now() - job.startTime) : 0;
  const agingBoost = calculateAgingBoost(waitTimeMs);
  
  // Calculate final score
  const score = basePriorityWeight + aiScoreComponent - retryPenalty + systemLoadPenalty + agingBoost;
  
  // Debug log
  if (job.jobId) {
    console.log(`[WeightEngine] Job ${job.jobId} score: ${score} (priority: ${basePriorityWeight}, ai: ${aiScoreComponent}, retry: -${retryPenalty}, load: ${systemLoadPenalty}, aging: +${agingBoost})`);
  }
  
  return score;
}

/**
 * Sort jobs by execution score (highest first)
 * @param {Array} jobList - Array of job objects
 * @param {Object} systemMetrics - Current system metrics
 * @returns {Array} Sorted job array (highest score first)
 */
function sortJobsByScore(jobList, systemMetrics = {}) {
  if (!Array.isArray(jobList) || jobList.length === 0) {
    return jobList;
  }
  
  // Calculate scores for all jobs
  const scoredJobs = jobList.map(job => ({
    job,
    score: calculateExecutionScore(job, systemMetrics)
  }));
  
  // Sort by score (highest first)
  scoredJobs.sort((a, b) => b.score - a.score);
  
  // Return sorted jobs
  return scoredJobs.map(item => item.job);
}

/**
 * Get job priority recommendation based on score
 * @param {number} score - Execution score
 * @returns {string} Priority recommendation
 */
function getPriorityRecommendation(score) {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

module.exports = {
  calculateExecutionScore,
  sortJobsByScore,
  getPriorityRecommendation,
  BASE_PRIORITY_WEIGHTS,
  MAX_AGING_BOOST,
  SYSTEM_LOAD_PENALTY_THRESHOLD_CPU,
  SYSTEM_LOAD_PENALTY_THRESHOLD_MEM
};
