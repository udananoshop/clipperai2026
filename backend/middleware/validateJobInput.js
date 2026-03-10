/**
 * OVERLORD Phase 3 - Job Input Validation Middleware
 * Validates required job fields before processing
 */

/**
 * Validate job creation input
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function validateJobInput(req, res, next) {
  const { videoPath, videoId } = req.body;

  // Check for required fields
  if (!videoPath && !videoId) {
    return res.status(400).json({
      success: false,
      message: 'Either videoPath or videoId is required'
    });
  }

  // Additional validation for videoId
  if (videoId !== undefined) {
    if (typeof videoId !== 'number' || videoId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'videoId must be a positive number'
      });
    }
  }

  // Validate videoPath if provided
  if (videoPath !== undefined) {
    if (typeof videoPath !== 'string' || videoPath.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'videoPath must be a non-empty string'
      });
    }
  }

  // If all validations pass, continue
  next();
}

/**
 * Validate job update input
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function validateJobUpdate(req, res, next) {
  const allowedFields = ['status', 'priority', 'priority_level', 'progress'];
  const updates = Object.keys(req.body);

  // Check if there are any valid updates
  const hasValidUpdate = updates.some(field => allowedFields.includes(field));
  
  if (!hasValidUpdate) {
    return res.status(400).json({
      success: false,
      message: `No valid fields to update. Allowed: ${allowedFields.join(', ')}`
    });
  }

  // Validate status if provided
  if (req.body.status) {
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`
      });
    }
  }

  // Validate priority if provided
  if (req.body.priority || req.body.priority_level) {
    const validPriorities = ['high', 'medium', 'low'];
    const priority = req.body.priority || req.body.priority_level;
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed: ${validPriorities.join(', ')}`
      });
    }
  }

  // Validate progress if provided
  if (req.body.progress !== undefined) {
    const progress = Number(req.body.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'progress must be a number between 0 and 100'
      });
    }
  }

  // If all validations pass, continue
  next();
}

/**
 * Validate job ID parameter
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function validateJobId(req, res, next) {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: 'Job ID is required'
    });
  }

  // Allow UUID format or numeric ID
  const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId) || 
                    /^\d+$/.test(jobId);

  if (!isValidId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid job ID format'
    });
  }

  next();
}

module.exports = {
  validateJobInput,
  validateJobUpdate,
  validateJobId
};
